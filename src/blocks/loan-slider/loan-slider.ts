import { html, render, TemplateResult } from 'lit';

import { cleanUpBlock } from 'Utils/cleanUpBlock';
import { readBlockConfig } from '../../app/tasks/readBlockConfig';

import './loan-slider.scss';

interface LoanSliderConfig {
  min: number;
  max: number;
  step: number;
  initial: number;
  currency: string;
  ctaLabel: string;
  title: string;
  helper: string;
}

interface LoanSliderState {
  amount: number;
  pan: string;
  panTouched: boolean;
  showResult: boolean;
}

const PAN_THRESHOLD = 50000;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const snapToStep = (value: number, min: number, step: number): number => {
  const stepped = Math.round((value - min) / step) * step + min;
  return Number.isFinite(stepped) ? stepped : value;
};

const formatAmount = (value: number, locale = 'en-IN'): string => {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
};

const template = (config: LoanSliderConfig, state: LoanSliderState): TemplateResult => {
  const amountLabel = `${config.currency}${formatAmount(state.amount)}`;
  const isPanRequired = state.amount > PAN_THRESHOLD;
  const isPanValid = PAN_REGEX.test(state.pan);
  const showPanError = isPanRequired && state.panTouched && !isPanValid;
  const panValue = state.pan;

  if (state.showResult) {
    return html`<div class="loan-slider loan-slider--result">
      <div class="loan-slider__result">
        <h2>${config.title}</h2>
        <p class="loan-slider__result-label">Your selected loan amount is</p>
        <div class="loan-slider__result-amount">${amountLabel}</div>
      </div>
    </div>`;
  }

  return html`<div class="loan-slider">
    <div class="loan-slider__header">
      <h2>${config.title}</h2>
      <p>${config.helper}</p>
    </div>
    <div class="loan-slider__amount">
      <label class="loan-slider__label" for="loan-slider-input">Loan amount</label>
      <div class="loan-slider__input-row">
        <span class="loan-slider__currency">${config.currency}</span>
        <input
          id="loan-slider-input"
          class="loan-slider__number"
          type="number"
          inputmode="numeric"
          min="${config.min}"
          max="${config.max}"
          step="${config.step}"
          .value=${String(state.amount)}
          aria-label="Loan amount"
        />
      </div>
      <input
        class="loan-slider__range"
        type="range"
        min="${config.min}"
        max="${config.max}"
        step="${config.step}"
        .value=${String(state.amount)}
        aria-label="Loan amount slider"
      />
      <div class="loan-slider__limits">
        <span>${config.currency}${formatAmount(config.min)}</span>
        <span>${config.currency}${formatAmount(config.max)}</span>
      </div>
    </div>
    ${isPanRequired
      ? html`<div class="loan-slider__pan" role="group" aria-label="PAN details">
          <div class="loan-slider__notice" role="status">
            Loans above ${config.currency}${formatAmount(PAN_THRESHOLD)} require PAN details.
          </div>
          <label class="loan-slider__label" for="loan-slider-pan">PAN number</label>
          <input
            id="loan-slider-pan"
            class="loan-slider__pan-input"
            type="text"
            inputmode="text"
            maxlength="10"
            placeholder="ABCDE1234F"
            .value=${panValue}
            aria-invalid=${showPanError ? 'true' : 'false'}
            aria-describedby="loan-slider-pan-error"
          />
          <div
            id="loan-slider-pan-error"
            class="loan-slider__pan-error"
            data-visible=${showPanError ? 'true' : 'false'}
          >
            Enter a valid PAN in the format ABCDE1234F.
          </div>
        </div>`
      : ''}
    <button class="loan-slider__cta" type="button" aria-label="Submit loan amount">
      ${config.ctaLabel}
    </button>
  </div>`;
};

export default function (block: HTMLElement) {
  const rawConfig = readBlockConfig(block) as Record<string, string>;
  const getValue = (keys: string[] | string, fallback: string): string => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      const value = rawConfig[key];
      if (typeof value === 'string' && value.trim().length) {
        return value.trim();
      }
    }
    return fallback;
  };

  const config: LoanSliderConfig = {
    min: toNumber(getValue('min', '10000'), 10000),
    max: toNumber(getValue('max', '200000'), 200000),
    step: toNumber(getValue('step', '1000'), 1000),
    initial: toNumber(getValue('initial', '50000'), 50000),
    currency: getValue('currency', '₹'),
    ctaLabel: getValue(['ctalabel', 'cta-label'], 'Continue'),
    title: getValue('title', 'Choose your loan amount'),
    helper: getValue('helper', 'Use the slider or type an amount.'),
  };

  config.min = Math.min(config.min, config.max);
  config.max = Math.max(config.min, config.max);
  config.step = config.step > 0 ? config.step : 1000;

  const normalizeAmount = (value: number): number => {
    const snapped = snapToStep(value, config.min, config.step);
    return clamp(snapped, config.min, config.max);
  };

  const state: LoanSliderState = {
    amount: normalizeAmount(config.initial),
    pan: '',
    panTouched: false,
    showResult: false,
  };

  const update = () => {
    render(template(config, state), block);

    const amountInput = block.querySelector<HTMLInputElement>('.loan-slider__number');
    const rangeInput = block.querySelector<HTMLInputElement>('.loan-slider__range');
    const panInput = block.querySelector<HTMLInputElement>('.loan-slider__pan-input');
    const ctaButton = block.querySelector<HTMLButtonElement>('.loan-slider__cta');

    if (amountInput) {
      amountInput.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const value = Number(target.value);
        if (!Number.isFinite(value)) return;
        state.amount = normalizeAmount(value);
        update();
      });
    }

    if (rangeInput) {
      rangeInput.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const value = Number(target.value);
        if (!Number.isFinite(value)) return;
        state.amount = normalizeAmount(value);
        update();
      });
    }

    if (panInput) {
      panInput.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        state.pan = target.value.toUpperCase();
        update();
      });

      panInput.addEventListener('blur', () => {
        state.panTouched = true;
        update();
      });
    }

    if (ctaButton) {
      ctaButton.addEventListener('click', () => {
        const panRequired = state.amount > PAN_THRESHOLD;
        const panValid = PAN_REGEX.test(state.pan);
        if (panRequired && !panValid) {
          state.panTouched = true;
          update();
          return;
        }
        state.showResult = true;
        update();
      });
    }
  };

  cleanUpBlock(block);
  update();
}
