import { toCamelCase } from '../../utils/toCamelCase';
import { toClassName } from '../../utils/toClassName';
import './form.css';

type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface FieldConfig {
  type?: string;
  field?: string;
  label?: string;
  help?: string;
  required?: string;
  default?: string;
  placeholder?: string;
  options?: string;
  conditional?: string;
  value?: string;
  pattern?: string;
  maxlength?: string;
  inputmode?: string;
}

type FieldList = FieldConfig[];

/**
 * Creates an HTML element with an optional class name
 * @param {string} tag - HTML tag name
 * @param {string} [className] - Optional CSS class name
 * @returns {HTMLElement} Created element
 */
function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

/**
 * Generates a camelCase ID from a name and optional option
 * @param {string} name - Base name for the ID
 * @param {string} [option] - Optional value to append to the ID
 * @returns {string} Generated camelCase ID
 */
function generateId(name: string, option: string | null = null): string {
  const id = toCamelCase(name);
  return option ? `${id}-${toCamelCase(option)}` : id;
}

/**
 * Creates a help text paragraph with a unique ID
 * @param {string} text - Help text content
 * @param {string} inputId - ID of the associated input field
 * @returns {HTMLParagraphElement} Help text element
 */
function writeHelpText(text: string, inputId: string): HTMLParagraphElement {
  const help = createElement('p', 'field-help-text');
  help.textContent = text;
  help.id = `${inputId}-help`;
  return help;
}

/**
 * Creates a label or legend element
 * @param {string} text - Label text content
 * @param {string} [type='label'] - Either 'label' or 'legend'
 * @param {string} [id] - ID of the associated input (for 'label' type only)
 * @param {boolean} [required] - Whether the field is required
 * @returns {HTMLElement} Label or legend element
 */
function buildLabel(
  text: string,
  type: 'label' | 'legend' = 'label',
  id: string | null = null,
  required = false,
): HTMLElement {
  const label = createElement(type);
  label.textContent = text;
  if (id && type === 'label') label.setAttribute('for', id);
  if (required) label.dataset.required = 'true';
  return label;
}

/**
 * Creates an input element with specified attributes
 * @param {Object} field - Field configuration object
 * @returns {HTMLInputElement} Input element
 */
function buildInput(field: FieldConfig): HTMLInputElement {
  const {
    type,
    field: fieldName,
    required,
    default: defaultValue,
    placeholder,
    pattern,
    maxlength,
    inputmode,
  } = field;

  const input = createElement('input');
  input.type = type || 'text';
  input.id = generateId(fieldName || 'field');
  input.name = input.id;
  input.required = required === 'true';
  if (defaultValue) input.value = defaultValue;
  if (placeholder) input.placeholder = placeholder;
  if (pattern) input.pattern = pattern;
  if (maxlength) input.maxLength = Number(maxlength);
  if (inputmode) input.inputMode = inputmode as HTMLInputElement['inputMode'];
  return input;
}

/**
 * Creates a textarea element
 * @param {Object} field - Field configuration object
 * @returns {HTMLTextAreaElement} Textarea element
 */
function buildTextArea(field: FieldConfig): HTMLTextAreaElement {
  const {
    field: fieldName, required, default: defaultValue, placeholder,
  } = field;

  const textarea = createElement('textarea');
  textarea.id = generateId(fieldName || 'field');
  textarea.name = textarea.id;
  textarea.required = required === 'true';
  textarea.rows = 5;
  if (defaultValue) textarea.value = defaultValue;
  if (placeholder) textarea.placeholder = placeholder;
  return textarea;
}

/**
 * Creates a radio/checkbox input for an option
 * @param {Object} field - Field configuration object
 * @param {string} option - Option value
 * @returns {HTMLInputElement} Radio/checkbox input
 */
function buildOptionInput(field: FieldConfig, option: string): HTMLInputElement {
  const {
    type, field: fieldName, default: defaultValue, required,
  } = field;
  const id = generateId(fieldName || 'field', option);

  const input = createElement('input');
  input.type = type || 'text';
  input.id = id;
  input.name = generateId(fieldName || 'field');
  input.value = option;
  input.checked = option === defaultValue;
  input.required = required === 'true';

  return input;
}

/**
 * Creates a fieldset containing radio/checkbox options
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLFieldSetElement} Fieldset containing options
 */
function buildOptions(field: FieldConfig, controlled: string | null): HTMLFieldSetElement | null {
  const {
    type, options, label, required,
  } = field;
  if (!options) return null;

  const fieldset = createElement('fieldset', `form-field ${type}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    fieldset.dataset.controller = controller;
    fieldset.dataset.condition = controlled;
  }
  fieldset.append(buildLabel(label || '', 'legend', null, required === 'true'));

  options.split(',').forEach((o) => {
    const option = o.trim();
    const input = buildOptionInput(field, option);
    const span = createElement('span');
    const labelEl = buildLabel(option, 'label', input.id);
    labelEl.prepend(input, span);
    fieldset.append(labelEl);
  });

  return fieldset;
}

/**
 * Fetches select options from a remote URL
 * @param {URL} url - URL to fetch options from
 * @returns {Promise<Array<HTMLOptionElement>>} Array of option elements
 */
async function buildOptionsFromUrl(url: URL): Promise<HTMLOptionElement[]> {
  const resp = await fetch(url);
  const { data } = (await resp.json()) as { data: Array<{ option?: string; value?: string }> };
  const options = data.map((o) => {
    const { option, value } = o;
    const optionEl = createElement('option');
    if (option && value) {
      optionEl.value = value;
      optionEl.textContent = option;
    } else if (option && !value) {
      optionEl.value = option;
      optionEl.textContent = option;
    } else if (value && !option) {
      optionEl.value = value;
      optionEl.textContent = value;
    }
    return optionEl;
  });
  return options;
}

/**
 * Creates a select dropdown field
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLElement} Wrapper div containing select element
 */
function buildSelect(field: FieldConfig, controlled: string | null): HTMLElement | null {
  const {
    type, options, field: fieldName, label, required, placeholder,
  } = field;
  if (!options) return null;

  const wrapper = createElement('div', `form-field ${(type || 'text')}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }
  wrapper.append(buildLabel(label || '', 'label', generateId(fieldName || 'field'), required === 'true'));

  const select = createElement('select');
  select.id = generateId(fieldName || 'field');
  select.name = select.id;
  select.required = required === 'true';
  wrapper.append(select);

  if (placeholder) {
    const placeholderOption = createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    select.append(placeholderOption);
  }

  try {
    const url = new URL(options);
    buildOptionsFromUrl(url).then((os) => {
      select.append(...os);
    });
  } catch (error) {
    options.split(',').forEach((o) => {
      const option = o.trim();
      const optionEl = createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      select.append(optionEl);
    });
  }

  return wrapper;
}

/**
 * Creates a toggle switch field (styled checkbox)
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLElement} Wrapper div containing toggle switch
 */
function buildToggle(field: FieldConfig, controlled: string | null): HTMLElement {
  const {
    label, required, default: defaultValue,
  } = field;

  const wrapper = createElement('div', 'form-field toggle-field');
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }

  const input = buildOptionInput({ ...field, type: 'checkbox' }, defaultValue || 'true');
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-checked', String(input.checked));

  input.addEventListener('change', () => {
    input.setAttribute('aria-checked', String(input.checked));
  });

  const span = createElement('span');
  const labelEl = buildLabel(label || '', 'label', input.id, required === 'true');
  labelEl.prepend(input, span);
  wrapper.append(labelEl);

  return wrapper;
}

/**
 * Creates a button element
 * @param {Object} field - Field configuration object
 * @returns {HTMLButtonElement} Button element
 */
function buildButton(field: FieldConfig): HTMLButtonElement {
  const { type, label } = field;
  const button = createElement('button');
  button.className = 'button';
  button.type = (type as 'button' | 'submit' | 'reset') || 'button';
  button.textContent = label || '';
  if (type === 'reset') button.classList.add('secondary');
  return button;
}

/**
 * Toggles visibility of conditional fields based on the selected input
 * @param {Event} e - Change event
 * @param {Map} controllerConfig - Map of controller names to controlled fields
 */
function toggleConditional(e: Event, controllerConfig: Map<string, FormControlElement[]>) {
  const { target } = e;
  const controller = (target as HTMLInputElement).name;
  // check if this is a controlling input
  if (controllerConfig.has(controller)) {
    const inputs = [...(controllerConfig.get(controller) || [])];
    inputs.forEach((i) => {
      const field = i.closest('.form-field') as HTMLElement;
      const { condition } = field.dataset;
      const conditionMet = condition
        ? condition.includes(toClassName((target as HTMLInputElement).value))
        : false;
      field.setAttribute('aria-hidden', String(!conditionMet));

      // toggle required and tabindex based on visibility
      if (conditionMet) {
        if (i.dataset.originalRequired === 'true') {
          i.setAttribute('required', '');
        }
        i.removeAttribute('tabindex');
      } else {
        i.removeAttribute('required');
        i.setAttribute('tabindex', '-1'); // remove from tab order when hidden
      }
    });
  }
}

/**
 * Sets initial visibility of conditional fields based on default values.
 * @param {HTMLFormElement} form - Form element
 * @param {Map} controllerConfig - Map of controller names to controlled fields.
 */
function initConditionals(form: HTMLFormElement, controllerConfig: Map<string, FormControlElement[]>) {
  // for each controller, find its current value and apply conditions
  controllerConfig.forEach((controlledInputs, controller) => {
    // find the controlling input - could be radio/checkbox or select
    let controllerValue: string | null = null;
    const checked = form.querySelector(`[name="${controller}"]:checked`) as HTMLInputElement | null;
    const select = form.querySelector(`select[name="${controller}"]`) as HTMLSelectElement | null;

    if (checked) {
      controllerValue = checked.value;
    } else if (select) {
      controllerValue = select.value;
    }

    if (controllerValue) {
      const safeValue = controllerValue;
      // set correct visibility for each controlled field
      controlledInputs.forEach((input) => {
        const field = input.closest('.form-field') as HTMLElement;
        const { condition } = field.dataset;
        const conditionMet = condition ? condition.includes(toClassName(safeValue)) : false;
        field.setAttribute('aria-hidden', String(!conditionMet));

        // store original required state and toggle based on visibility
        if (input.hasAttribute('required')) {
          // store original required state if not already stored
          if (!input.dataset.originalRequired) {
            input.dataset.originalRequired = 'true';
          }

          if (!conditionMet) {
            input.removeAttribute('required');
          }
        }

        // remove from tab order when hidden
        if (conditionMet) {
          input.removeAttribute('tabindex');
        } else {
          input.setAttribute('tabindex', '-1');
        }
      });
    } else {
      // if no input is checked, hide all controlled fields
      controlledInputs.forEach((input) => {
        const field = input.closest('.form-field') as HTMLElement;
        field.setAttribute('aria-hidden', 'true');

        // remove required attribute when hidden
        if (input.hasAttribute('required')) {
          // store original required state if not already stored
          if (!input.dataset.originalRequired) {
            input.dataset.originalRequired = 'true';
          }
          input.removeAttribute('required');
        }

        // remove from tab order when hidden
        input.setAttribute('tabindex', '-1');
      });
    }
  });
}

/**
 * Sets up conditional field visibility and ARIA relationships
 * @param {HTMLFormElement} form - Form element
 */
function enableConditionals(form: HTMLFormElement) {
  // find controlled fields
  const controlled = [...form.querySelectorAll<HTMLElement>('[data-controller]')];

  // create a map of controller names to controlled fields
  const controllerConfig = new Map<string, FormControlElement[]>();

  controlled.forEach((c) => {
    const input = c.querySelector('input, textarea, select') as FormControlElement | null;
    const { controller } = c.dataset;

    // add to controller map
    if (!input) return;
    if (!controller) return;
    if (!controllerConfig.has(controller)) controllerConfig.set(controller, []);
    (controllerConfig.get(controller) || []).push(input);

    // set up aria relationships
    if (input && input.id) {
      // find the controlling input(s)
      const controllerInputs = form.querySelectorAll(`[name="${controller}"]`);

      // set aria-controls on controlling inputs
      controllerInputs.forEach((controllerInput) => {
        // get existing aria-controls or initialize empty
        const existingControls = controllerInput.getAttribute('aria-controls') || '';
        const controlsArray = existingControls.split(' ').filter((ec) => ec);

        // add this input's id if not already present
        if (!controlsArray.includes(input.id)) {
          controlsArray.push(input.id);
        }

        // update aria-controls attribute
        controllerInput.setAttribute('aria-controls', controlsArray.join(' '));

        // set aria-controlledby on the controlled input
        input.setAttribute('aria-controlledby', controllerInput.id);
      });
    }
  });

  // initialize conditional visibility
  initConditionals(form, controllerConfig);

  // add single event listener for ALL controlling inputs
  form.addEventListener('change', (e) => {
    toggleConditional(e, controllerConfig);
  });
}

/**
 * Enables or disables all form elements
 * @param {HTMLFormElement} form - Form element
 * @param {boolean} [disabled=true] - Whether to disable the form
 */
function toggleForm(form: HTMLFormElement, disabled = true) {
  [...form.elements].forEach((el) => {
    const control = el as FormControlElement;
    if (control && 'disabled' in control) {
      control.disabled = disabled;
    }
  });
}

/**
 * Generates form submission payload from form elements
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Payload object with form data
 */
function generatePayload(form: HTMLFormElement): Record<string, string> {
  const payload = {};
  [...form.elements].forEach((field) => {
    const typedField = field as HTMLInputElement;
    if (typedField.name && !typedField.disabled) {
      if (typedField.type === 'radio') {
        if (typedField.checked) payload[typedField.name] = typedField.value;
      } else if (typedField.type === 'checkbox') {
        if (typedField.checked) {
          payload[typedField.name] = payload[typedField.name]
            ? `${payload[typedField.name]},${typedField.value}`
            : typedField.value;
        }
      } else {
        payload[typedField.name] = typedField.value;
      }
    }
  });
  return payload;
}

/**
 * Handles form submission
 * @param {HTMLFormElement} form - Form element to submit
 * @returns {Promise<void>}
 */
async function handleSubmit(form: HTMLFormElement): Promise<void> {
  try {
    const payload = generatePayload(form);
    toggleForm(form);
    if (!form.dataset.action) throw new Error('Missing form action');
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    toggleForm(form, false);
  }
}

/**
 * Sets up form submission handler
 * @param {HTMLFormElement} form - Form element
 * @param {string} submit - Submit URL
 * @param {Array<Object>} fields - Array of field configurations
 */
function enableSubmission(form: HTMLFormElement, submit: string, fields: FieldList) {
  form.dataset.action = submit;
  const confirmation = fields.find((f) => f.type === 'confirmation');
  if (confirmation) {
    form.dataset.confirmation = confirmation.label || confirmation.default;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const valid = form.reportValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalid = form.querySelector(':invalid:not(fieldset)') as HTMLElement | null;
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.setAttribute('aria-invalid', 'true');
      }
    }
  });

  // clear aria-invalid on field change
  form.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target?.hasAttribute('aria-invalid')) {
      if (target.validity.valid) {
        target.removeAttribute('aria-invalid');
      }
    }
  });
}

/**
 * Creates a form field based on field configuration
 * @param {Object} field - Field configuration object
 * @returns {HTMLElement} Form field element (fieldset, div, or button)
 */
function buildField(field: FieldConfig): HTMLElement {
  const {
    type, label, help, field: fieldName, conditional,
  } = field;
  const controlled = conditional || null;
  const safeFieldName = fieldName || 'field';

  if (type === 'hidden') {
    return buildInput(field);
  }

  // submit/reset buttons stand alone
  if (type === 'submit' || type === 'reset') {
    return buildButton(field);
  }

  // radio/checkbox groups get a fieldset
  if (type === 'radio' || type === 'checkbox') {
    const fieldset = buildOptions(field, controlled);
    if (fieldset && help) {
      const helpText = writeHelpText(help, generateId(safeFieldName));
      fieldset.append(helpText);
    }
    return fieldset || createElement('div');
  }

  if (type === 'toggle') {
    const toggle = buildToggle(field, controlled);
    if (help) {
      const helpText = writeHelpText(help, generateId(safeFieldName));
      toggle.append(helpText);
    }
    return toggle;
  }

  if (type === 'select') {
    const select = buildSelect(field, controlled);
    if (select && help) {
      const helpText = writeHelpText(help, generateId(safeFieldName));
      select.append(helpText);
    }
    return select || createElement('div');
  }

  // inputs and textareas get a wrapper div
  const wrapper = createElement('div', `form-field ${type}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }
  const inputId = generateId(safeFieldName);
  wrapper.append(buildLabel(label || '', 'label', inputId, field.required === 'true'));

  // create help text first to get id
  let helpText: HTMLParagraphElement | undefined;
  if (help) {
    helpText = writeHelpText(help, inputId);
    wrapper.append(helpText);
  }

  const input = type === 'textarea' ? buildTextArea(field) : buildInput(field);

  if (type === 'textarea') {
    wrapper.append(input);
  } else if (wrapper.firstChild) {
    wrapper.insertBefore(input, wrapper.firstChild.nextSibling);
  } else {
    wrapper.append(input);
  }

  if (helpText) input.setAttribute('aria-describedby', helpText.id);

  return wrapper;
}

/**
 * Creates a complete form from field configurations
 * @param {Array<Object>} fields - Array of field configurations
 * @returns {HTMLFormElement} Complete form element
 */
function buildForm(fields: FieldList, submit?: string): HTMLFormElement {
  const form = createElement('form');
  form.setAttribute('novalidate', '');

  // group buttons at the end
  const buttons: FieldConfig[] = [];

  fields.forEach((field) => {
    if (field.type === 'submit' || field.type === 'reset') {
      buttons.push(field);
    } else if (field.type !== 'confirmation') {
      form.append(buildField(field));
    }
  });

  // add buttons in a wrapper (if any)
  if (buttons.length) {
    const buttonWrapper = createElement('div', 'button-wrapper');
    buttons.forEach((button) => buttonWrapper.append(buildField(button)));
    form.append(buttonWrapper);
  }

  enableConditionals(form);

  if (submit) enableSubmission(form, submit, fields);

  return form;
}

function getFormConfigValue(fields: FieldList, name: string, fallback = ''): string {
  const entry = fields.find((field) => field.field === name);
  if (!entry) return fallback;
  if (entry.default) return entry.default;
  if (entry.value) return entry.value;
  return fallback;
}

function initOtpBehavior(form: HTMLFormElement, fields: FieldList) {
  const otpFieldName = 'otp';
  const resendTimerSeconds = 30;
  const resendLimit = 3;
  const otpErrorThreshold = 0;
  const resendLimitMessage = getFormConfigValue(
    fields,
    'resendLimitMessage',
    'Resend OTP limit exhausted.',
  );
  const otpErrorRedirect = '';
  const resendLabel = 'Resend OTP';
  const resendLoaderLabel = 'Resend available in';
  const otpSuccessRedirect = '/thank-you';
  const otpRetryMessage = 'Invalid OTP. Please try again.';

  const otpInput = form.querySelector(`input[name="${toCamelCase(otpFieldName)}"]`) as HTMLInputElement | null;
  if (!otpInput) return;
  const mobileInput = form.querySelector('input[name="mobile"]') as HTMLInputElement | null;

  const otpField = otpInput.closest('.form-field') as HTMLElement | null;
  if (!otpField) return;

  const resendWrapper = createElement('div', 'otp-resend');
  const loader = createElement('div', 'otp-resend__loader');
  const loaderText = createElement('span', 'otp-resend__loader-text');
  const timerText = createElement('span', 'otp-resend__timer');
  loader.append(loaderText, timerText);

  const resendButton = createElement('button', 'otp-resend__button');
  resendButton.type = 'button';
  resendButton.textContent = resendLabel;

  const limitMessage = createElement('div', 'otp-resend__message');
  limitMessage.textContent = resendLimitMessage;

  resendWrapper.append(loader, resendButton, limitMessage);
  otpField.append(resendWrapper);

  const otpRetry = createElement('div', 'otp-verify__message');
  otpRetry.textContent = otpRetryMessage;
  otpRetry.style.display = 'none';
  otpField.append(otpRetry);

  let resendCount = 0;
  let timerId: number | undefined;
  let timerStarted = false;

  const setVisibility = (state: 'loading' | 'ready' | 'limit') => {
    loader.style.display = state === 'loading' ? 'flex' : 'none';
    resendButton.style.display = state === 'ready' ? 'inline-flex' : 'none';
    limitMessage.style.display = state === 'limit' ? 'block' : 'none';
  };

  const resetVisibility = () => {
    loader.style.display = 'none';
    resendButton.style.display = 'none';
    limitMessage.style.display = 'none';
  };

  const startTimer = (duration: number) => {
    if (timerStarted) return;
    timerStarted = true;
    let remaining = Number.isFinite(duration) ? duration : 0;
    loaderText.textContent = resendLoaderLabel;
    setVisibility('loading');

    const tick = () => {
      timerText.textContent = ` ${remaining}s`;
      if (remaining <= 0) {
        if (timerId !== undefined) {
          window.clearInterval(timerId);
        }
        timerId = undefined;
        setVisibility('ready');
      }
      remaining -= 1;
    };

    tick();
    timerId = window.setInterval(tick, 1000);
  };

  resetVisibility();

  if (mobileInput) {
    const maybeStartTimer = () => {
      const digitsOnly = mobileInput.value.replace(/\D/g, '');
      if (digitsOnly.length >= 10) startTimer(resendTimerSeconds);
    };
    mobileInput.addEventListener('input', maybeStartTimer);
    maybeStartTimer();
  } else {
    startTimer(resendTimerSeconds);
  }

  resendButton.addEventListener('click', () => {
    resendCount += 1;
    if (resendCount > resendLimit) {
      setVisibility('limit');
      return;
    }

    form.dispatchEvent(new CustomEvent('otp:resend', { bubbles: true }));
    startTimer(resendTimerSeconds);
  });

  let otpErrorCount = 0;

  form.addEventListener('submit', () => {
    if (otpInput && !otpInput.checkValidity()) {
      otpErrorCount += 1;
      if (otpErrorThreshold && otpErrorCount >= otpErrorThreshold && otpErrorRedirect) {
        window.location.href = otpErrorRedirect;
      }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    otpRetry.style.display = 'none';

    const valid = form.reportValidity();
    if (!valid) {
      const firstInvalid = form.querySelector(':invalid:not(fieldset)') as HTMLElement | null;
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.setAttribute('aria-invalid', 'true');
      }
      return;
    }

    if (otpInput.value === '12345') {
      window.location.href = otpSuccessRedirect;
    } else {
      otpRetry.style.display = 'block';
      otpInput.focus();
    }
  });
}

/**
 * Initializes form block with data from JSON endpoint
 * @param {HTMLElement} block - Form block element
 */
export default function decorate(block: HTMLElement) {
  block.style.visibility = 'hidden';
  const configFields: FieldList = [];
  block.querySelectorAll<HTMLTableRowElement>('tr').forEach((row) => {
    const cells = row.querySelectorAll<HTMLTableCellElement>('td, th');
    if (cells.length >= 2) {
      const key = cells[0].textContent?.trim() || '';
      const value = cells[1].textContent?.trim() || '';
      if (key) {
        configFields.push({
          field: key,
          type: 'hidden',
          default: value,
        });
      }
    }
  });

  const staticFields: FieldList = [
    {
      field: 'firstName',
      type: 'text',
      label: 'First name',
      placeholder: 'Enter first name',
      required: 'true',
    },
    {
      field: 'lastName',
      type: 'text',
      label: 'Last name',
      placeholder: 'Enter last name',
      required: 'true',
    },
    {
      field: 'mobile',
      type: 'tel',
      label: 'Mobile number',
      placeholder: 'Enter mobile number',
      required: 'true',
      inputmode: 'numeric',
      maxlength: '10',
      pattern: '\\\\d{10}',
    },
    {
      field: 'otp',
      type: 'text',
      label: 'OTP',
      placeholder: 'Enter OTP',
      required: 'true',
    },
    {
      field: 'submit',
      type: 'submit',
      label: 'Verify OTP',
    },
  ];

  const form = buildForm(staticFields);
  initOtpBehavior(form, configFields);
  block.replaceChildren(form);
  block.removeAttribute('style');
}
