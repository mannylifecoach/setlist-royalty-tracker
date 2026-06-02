// SESAC affiliate-portal selectors — affiliates.sesac.com "Live Performance
// Registration" wizard. The portal is Angular + Angular Material + Kendo UI.
// Framework ids are auto-generated and UNSTABLE (app-form-field-15, mat-radio-11,
// k-<guid>), so — exactly like bmi-selectors.ts vs Syncfusion — we locate Step 1
// fields by their <label> text and Step 2 search inputs by placeholder, never by id.
//
// Source of truth: Projects/SRT Beta - SESAC DOM Inspection Results.md (captured
// 2026-06-01 from a live affiliate session).

export interface SesacFieldSelector {
  /** Associated <label> text (resolved via for= or wrapping mat-form-field). */
  label?: string;
  /** Placeholder attribute — Step 2 search inputs carry no <label>. */
  placeholder?: string;
  tag: 'INPUT' | 'SELECT' | 'TEXTAREA';
}

// ----- Step 1 · Performance Details -----
// Cascading reveal: setting Country unhides the venue block; picking a venue in
// "Name of Venue" unhides Street Address + City + State. Date is a Kendo
// datepicker with no <label> association (see SESAC_SELECTORS.datePickerInput).
export const STEP1_FIELDS: Record<string, SesacFieldSelector> = {
  artistName: { label: 'Artist/Performer Name', tag: 'INPUT' },
  country: { label: 'Country', tag: 'SELECT' },
  venueName: { label: 'Name of Venue', tag: 'INPUT' }, // mat-autocomplete
  venueAddress: { label: 'Street Address of Venue', tag: 'INPUT' }, // mat-autocomplete
  venueCity: { label: 'City', tag: 'INPUT' },
  venueState: { label: 'State/Province', tag: 'SELECT' },
  venueCapacity: { label: 'Venue Capacity', tag: 'SELECT' },
  attendees: { label: 'Number of Attendees', tag: 'SELECT' },
} as const;

// ----- Step 2 · Song Selection -----
// Inputs here have no id and no <label> — only placeholders.
export const STEP2_FIELDS: Record<string, SesacFieldSelector> = {
  songSearch: { placeholder: 'Song Search (Use Song # or Keyword)', tag: 'INPUT' },
  setListSearch: { placeholder: 'Set List Search', tag: 'INPUT' },
  setListName: { placeholder: 'Set List Name', tag: 'INPUT' },
} as const;

// ----- Class / text locators for non-labelled controls -----
export const SESAC_SELECTORS = {
  // Kendo DatePicker visible input ("Date of Live Performance").
  datePickerInput: 'input.k-input',
  // Catalog song tiles in the Step 2 drag-drop dual-list.
  songItem: '.song-item',
  songItemValue: '.song-item-value',
  // Material radio / checkbox labels (text used to locate the control).
  headlineLabel: 'Headline Act',
  supportingLabel: 'Supporting Act',
  feeCheckboxLabel: 'Check this box if an admission fee was charged',
  // Move-selected-song button text (Material icon-button shows literal text 'arrow_right').
  moveRightIcon: 'arrow_right',
  // Save the in-progress set list.
  saveSetListButtonText: 'Save As New Set List',
  // Material autocomplete overlay (panel + options) — rendered in the cdk overlay.
  autocompletePanel:
    '.mat-autocomplete-panel, .mat-mdc-autocomplete-panel, .cdk-overlay-pane .mat-autocomplete-panel',
  autocompleteOption: 'mat-option, .mat-option, .mat-mdc-option',
} as const;

// Combined map used by the "every selector resolves against a fixture" test.
export const ALL_SESAC_FIELD_MAPS = {
  step1: STEP1_FIELDS,
  step2: STEP2_FIELDS,
} as const;

// ----- Resolver -----

/**
 * Resolve a SESAC field by label (Step 1) or placeholder (Step 2).
 * Priority for labels: <label for=id> → wrapping mat-form-field/field → adjacent.
 * Never relies on the element's own id (auto-generated, unstable).
 */
export function findSesacField<T extends HTMLElement = HTMLElement>(
  field: SesacFieldSelector,
  root: ParentNode = document
): T | null {
  const tag = field.tag.toLowerCase();

  // Placeholder-based (Step 2).
  if (field.placeholder) {
    const el = root.querySelector<T>(`${tag}[placeholder="${cssEscapeAttr(field.placeholder)}"]`);
    if (el) return el;
  }

  // Label-based (Step 1).
  if (field.label) {
    const target = field.label.trim().toLowerCase();

    // 1. <label> elements — match text, resolve via for= or wrapping container.
    for (const lbl of Array.from(root.querySelectorAll('label'))) {
      if ((lbl.textContent || '').trim().toLowerCase() !== target) continue;
      const forId = lbl.getAttribute('for');
      if (forId) {
        const byId = (root as Document | Element).querySelector?.(`#${cssEscapeId(forId)}`) as T | null;
        if (byId) return byId;
        const docById = document.getElementById(forId) as T | null;
        if (docById) return docById;
      }
      const wrapper = lbl.closest(
        'mat-form-field, .mat-form-field, .mat-mdc-form-field, .form-group, [class*="field"]'
      );
      const inWrapper = wrapper?.querySelector<T>(tag);
      if (inWrapper) return inWrapper;
      const sib = lbl.nextElementSibling;
      if (sib?.tagName === field.tag) return sib as unknown as T;
      const nested = sib?.querySelector<T>(tag);
      if (nested) return nested;
    }

    // 2. <mat-label> spans (Material renders the field label here).
    for (const lbl of Array.from(root.querySelectorAll('mat-label, .mat-form-field-label, [class*="label"]'))) {
      if ((lbl.textContent || '').trim().toLowerCase() !== target) continue;
      const wrapper = lbl.closest('mat-form-field, .mat-form-field, .mat-mdc-form-field, [class*="field"]');
      const inWrapper = wrapper?.querySelector<T>(tag);
      if (inWrapper) return inWrapper;
    }
  }

  return null;
}

// ----- Value setters -----

/**
 * Set value on a text input (incl. Material autocomplete trigger + Kendo date
 * input) and fire input/change/blur so Angular's value accessor + Kendo's
 * MVVM pick it up. Uses the native setter so React/Angular's tracked value
 * is bypassed correctly (same pattern as bmi/ascap fillers).
 */
export function setSesacInputValue(el: HTMLElement, value: string): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
  return false;
}

/**
 * Select an <option> by value, then visible text (case-insensitive), then
 * partial text — covers SESAC's range dropdowns ("1,000-2,999") and the
 * Country/State selects.
 */
export function setSesacSelectValue(el: HTMLSelectElement, value: string): boolean {
  const target = value.trim().toLowerCase();
  const byValue = Array.from(el.options).find(
    (o) => o.value.toLowerCase() === target || (o.textContent || '').trim().toLowerCase() === target
  );
  const pick =
    byValue ||
    Array.from(el.options).find((o) => (o.textContent || '').trim().toLowerCase().includes(target));
  if (!pick) return false;
  el.value = pick.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/**
 * Click a Material radio button identified by its label text. Material hides
 * the real <input> (cdk-visually-hidden) and binds on the host element, so we
 * click the enclosing <mat-radio-button>/<label>, not the raw input.
 */
export function clickMatRadioByLabel(labelText: string, root: ParentNode = document): boolean {
  const target = labelText.trim().toLowerCase();
  // Prefer the <input> whose associated/contained label matches, then click its host.
  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'))) {
    const labelEl =
      (input.id && root.querySelector(`label[for="${cssEscapeAttr(input.id)}"]`)) ||
      input.closest('label') ||
      input.closest('mat-radio-button');
    const text = (labelEl?.textContent || '').trim().toLowerCase();
    if (text === target || text.includes(target)) {
      const host = input.closest('mat-radio-button') as HTMLElement | null;
      const clickable = (host?.querySelector<HTMLElement>('label, .mat-radio-label, .mdc-label')) || host || input;
      clickable.click();
      return true;
    }
  }
  // Fallback: a <mat-radio-button> whose text matches.
  for (const host of Array.from(root.querySelectorAll<HTMLElement>('mat-radio-button'))) {
    if ((host.textContent || '').trim().toLowerCase().includes(target)) {
      host.click();
      return true;
    }
  }
  return false;
}

/**
 * Toggle a Material checkbox identified by its label text to `checked`. Like
 * the radio, the real input is hidden and binds on the host, so we click the
 * host/label only when the desired state differs from the current state.
 */
export function setMatCheckboxByLabel(labelText: string, checked: boolean, root: ParentNode = document): boolean {
  const target = labelText.trim().toLowerCase();
  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) {
    const host = input.closest('mat-checkbox') as HTMLElement | null;
    const labelEl =
      (input.id && root.querySelector(`label[for="${cssEscapeAttr(input.id)}"]`)) ||
      input.closest('label') ||
      host;
    const text = (labelEl?.textContent || '').trim().toLowerCase();
    if (text === target || text.includes(target)) {
      if (input.checked === checked) return true;
      const clickable = (host?.querySelector<HTMLElement>('label, .mat-checkbox-label, .mdc-label')) || host || input;
      clickable.click();
      return true;
    }
  }
  return false;
}

/** Find a <button> (or icon-button) whose visible/icon text matches `text`. */
export function findButtonByText(text: string, root: ParentNode = document): HTMLButtonElement | null {
  const target = text.trim().toLowerCase();
  return (
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === target
    ) ?? null
  );
}

/**
 * Find a Material icon-button by the icon ligature it renders (e.g. 'arrow_right').
 * Material icon-buttons show the ligature as the <mat-icon> textContent.
 */
export function findMatIconButton(iconText: string, root: ParentNode = document): HTMLButtonElement | null {
  const target = iconText.trim().toLowerCase();
  for (const btn of Array.from(root.querySelectorAll<HTMLButtonElement>('button'))) {
    const icon = btn.querySelector('mat-icon, .mat-icon');
    if (icon && (icon.textContent || '').trim().toLowerCase() === target) return btn;
    if ((btn.textContent || '').trim().toLowerCase() === target) return btn;
  }
  return null;
}

// Minimal CSS escaping for attribute selectors (avoid pulling in CSS.escape,
// which exists in the browser but keeps unit tests DOM-free).
function cssEscapeAttr(s: string): string {
  return s.replace(/(["\\])/g, '\\$1');
}
function cssEscapeId(s: string): string {
  return s.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}
