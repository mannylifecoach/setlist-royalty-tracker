// BMI Live DOM selectors — label-based strategy from real DOM inspection (2026-04-05)
// IDs contain dynamic GUIDs that change per session — never rely on them.
// Use labels, placeholders, name attributes, and tag+type+index as stable selectors.

export interface FieldSelector {
  label?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  tag: 'INPUT' | 'SELECT' | 'BUTTON';
  type?: string;
  index?: number;
}

export const FIELD_MAP: Record<string, FieldSelector> = {
  // Step 1 — Details
  bandPerformer:   { label: 'Band/Performer', tag: 'SELECT' },
  eventName:       { placeholder: 'Event name', tag: 'INPUT' },
  eventType:       { label: 'Event type', tag: 'SELECT' },
  startDate:       { tag: 'INPUT', type: 'date', index: 0 },
  startTime:       { id: '_time', tag: 'SELECT', index: 0 },
  startAmPm:       { id: '_ampm', tag: 'SELECT', index: 0 },
  endDate:         { tag: 'INPUT', type: 'date', index: 1 },
  endTime:         { id: '_time', tag: 'SELECT', index: 1 },
  endAmPm:         { id: '_ampm', tag: 'SELECT', index: 1 },
  eventPromoter:   { placeholder: 'Event promoter', tag: 'INPUT' },
  attendance:      { label: 'Attendance', tag: 'SELECT' },
  ticketCharge:    { name: 'coverChargeInd', tag: 'INPUT', type: 'checkbox' },

  // Step 1 — Venue
  previousVenues:  { label: 'Previously performed venues', tag: 'SELECT' },
  venueState:      { label: 'State', tag: 'SELECT' },
  venueCity:       { label: 'City', tag: 'SELECT' },
  venueName:       { label: 'Venue name', tag: 'INPUT' },

  // Step 2 — Setlist
  songSearch:      { id: 'tbSongSearch', tag: 'INPUT' },
  showRecents:     { name: 'showRecentsOnTop', tag: 'INPUT', type: 'checkbox' },
} as const;

/**
 * Find a DOM element using the label-based field selector strategy.
 * Priority: id > name > label > placeholder > tag+type+index
 */
export function findField(field: FieldSelector): HTMLElement | null {
  // 1. Try stable ID (only tbSongSearch, _time, _ampm are known stable)
  if (field.id) {
    if (field.index !== undefined) {
      const matches = document.querySelectorAll<HTMLElement>(`#${field.id}`);
      if (matches[field.index]) return matches[field.index];
      // IDs with _time/_ampm appear multiple times — also try querySelectorAll
      const byPartialId = document.querySelectorAll<HTMLElement>(`[id="${field.id}"]`);
      if (byPartialId[field.index]) return byPartialId[field.index];
    } else {
      const el = document.getElementById(field.id);
      if (el) return el;
    }
  }

  // 2. Try name attribute
  if (field.name) {
    const el = document.querySelector<HTMLElement>(
      `${field.tag.toLowerCase()}[name="${field.name}"]`
    );
    if (el) return el;
  }

  // 3. Try label text — find <label> containing text, then resolve its `for` or adjacent element
  if (field.label) {
    const labels = document.querySelectorAll('label');
    for (const lbl of labels) {
      if (lbl.textContent?.trim() === field.label) {
        // Try for= attribute
        const forId = lbl.getAttribute('for');
        if (forId) {
          const el = document.getElementById(forId);
          if (el) return el;
        }
        // Try adjacent/sibling/parent element matching the tag
        const parent = lbl.closest('.e-control-wrapper, .e-float-input, .form-group, [class*="field"]');
        if (parent) {
          const el = parent.querySelector<HTMLElement>(field.tag.toLowerCase());
          if (el) return el;
        }
        // Try next sibling
        const next = lbl.nextElementSibling;
        if (next?.tagName === field.tag) return next as HTMLElement;
        const nested = next?.querySelector<HTMLElement>(field.tag.toLowerCase());
        if (nested) return nested;
      }
    }

    // Syncfusion uses e-label-top / e-float-text spans as labels
    const sfLabels = document.querySelectorAll('.e-label-top, .e-float-text, [class*="label"]');
    for (const lbl of sfLabels) {
      if (lbl.textContent?.trim() === field.label) {
        const wrapper = lbl.closest('.e-control-wrapper, .e-float-input, [class*="field"]');
        if (wrapper) {
          const el = wrapper.querySelector<HTMLElement>(field.tag.toLowerCase());
          if (el) return el;
        }
      }
    }
  }

  // 4. Try placeholder
  if (field.placeholder) {
    const el = document.querySelector<HTMLElement>(
      `${field.tag.toLowerCase()}[placeholder="${field.placeholder}"]`
    );
    if (el) return el;
  }

  // 5. Fallback: tag + type + index
  if (field.type && field.index !== undefined) {
    const matches = document.querySelectorAll<HTMLElement>(
      `${field.tag.toLowerCase()}[type="${field.type}"]`
    );
    if (matches[field.index]) return matches[field.index];
  }

  return null;
}
