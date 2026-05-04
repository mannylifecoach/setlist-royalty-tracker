// ASCAP DOM selectors — class-based strategy from real DOM inspection (2026-04-24).
// ASCAP uses jQuery + bootstrap-select + Materialize CSS with stable class names
// (no dynamic GUIDs on classes), so plain CSS selectors are reliable.
//
// Source of truth: Projects/SRT Beta - ASCAP DOM Inspection Results.md
// Raw fixtures: .ascap_*.json sidecars in Projects/.

export const WORK_REG_FIELDS = {
  // Title
  workTitle: 'input.autoSearchTitle.Title',

  // Recording (accordion, optional)
  recordingArtist: 'input.RecordingArtistNameInput',
  recordingTitle: 'input.RecordTitle',
  isrc: 'input.ISRC',
  releaseDate: 'input.ReleaseDate',

  // Performed (accordion, optional)
  performerName: 'input.performedInput',

  // Performance Time (accordion, optional)
  durationHmsInput: 'input.duration',

  // Footer
  recaptcha: 'textarea#g-recaptcha-response-100000',
} as const;

// Writer rows repeat. Filler scopes these queries to the specific row container.
export const WRITER_ROW_FIELDS = {
  writerName: 'input.WriterName',
  writerFirstName: 'input.WriterFirstName',
  writerLastName: 'input.WriterLastName',
  writerIpiHidden: 'input.IpiNameNumber',
  writerSocietySelect: 'select#WriterSociety',
  writerRoleSelect: 'select#WritersRole',
  writerShareExpanded: 'input.WriterShare.ExpandedWriterShare',
  writerShareCollapsed: 'input.WriterShare.CollapsedWriterShare',
  writerAuthCheckbox: 'input.AuthoritativeWriterBox',
  writerHasNoPublisher: 'input.ThisWriterhasNoPublisher',
} as const;

// Publisher rows repeat similarly. Note ASCAP's misspelling of "Original" → "Orignal".
export const PUBLISHER_ROW_FIELDS = {
  publisherName: 'input.PublisherName',
  originalPublisherName: 'input.OrignalPublisherName',
  publisherIpiHidden: 'input.IpiNameNumber',
  publisherSocietySelect: 'select#PublisherSociety',
  publisherTerritorySelect: 'select#OrignalPublisherTerritory',
  publisherShareExpanded: 'input[name="pubShare"]',
  publisherCollection: 'input.OrignalPublisherCollection',
  publisherAuthCheckbox: 'input.AuthoritativePublisherBox',
} as const;

export const SETLIST_ADD_FIELDS = {
  setlistName: 'input.setlistName',
  coverWorkTitle: 'input.coverWorkTitle',
  coverPerfArtist: 'input.coverPerfArtist',
  addWorksButton: 'a.addSetlistWorks',
  addCoversButton: 'a.addSetlistCovers',
  copyButton: 'button.copySetlist',
  saveButton: 'button.saveSetlist',
  cancelButton: 'button.cancelSetlist',
  recaptcha: 'textarea#g-recaptcha-response-100000',
} as const;

export const PERF_ADD_FIELDS = {
  // Venue search (top of form)
  searchVenueName: 'input#searchVenueName.searchVenueName',
  searchVenueState: 'select#state-territory.searchVenueState',
  venueSearchButton: 'button.js-search-venues-button',

  // Performance details
  perfArtistName: 'input#perfArtistName.perfArtistName',
  perfTypeCode: 'select#perfTypeCode.perfTypeCode',
  perfDate: 'input#perfDate.perfDate',
  duration: 'input#duration.duration',
  perfStartHours: 'select#perfStartHours.perfStartHours',
  perfStartMinutes: 'select#perfStartMinutes.perfStartMinutes',
  numPerfViews: 'input#numPerfViews.liveStreamViews',
  feeChargedCheckbox: 'input#feeCharged',
  advanceTicketsCheckbox: 'input#advanceTickets',
  setlistDropdown: 'select.setlist.selectpicker',
  savePerformanceButton: 'button.savePerformance',
  submitPerformanceButton: 'button.submitPerformance',
  recaptcha: 'textarea#g-recaptcha-response-100000',
} as const;

// Inline venue search results render directly under the Performance form
// (not a modal). Container: div.list.venue-results
export const VENUE_RESULTS_FIELDS = {
  resultsContainer: 'div.list.venue-results',
  resultRow: '.list--item',
  resultVenueName: '.list--item--title h6',
  resultAddress: '.list--item--subtitle h6',
  selectVenueButton: 'button.selectVenue',
  addNewVenueButton: 'button.addNewVenue',
} as const;

// SAME selectors used for both "selected venue from search" and "manually-added new venue".
export const VENUE_DETAIL_FIELDS = {
  venueName: 'input#venueName.venueName',
  addressLine1: 'input#addressLine1.addressLine1',
  city: 'input#city.city',
  stateCde: 'select#stateCde.stateCde',
  postalCode: 'input#postalCode.postalCode',
  country: 'select#country.country',
} as const;

// Add Works inside Setlist Add — full ASCAP catalog search with optional filters.
// Cleanest path for filler: pass workId if SRT has it; otherwise fuzzy by title.
export const WORKS_CATALOG_SEARCH_FIELDS = {
  workTitle: 'input.workTitle',
  publisher: 'input.publisher',
  writer: 'input.writer',
  performer: 'input.performer',
  workId: 'input.workId',
  submitterWorkId: 'input.submitterWorkId',
  ipiNumber: 'input.ipiNumber',
  searchApplyButton: 'button.search-apply',
  moreOptionsLink: 'a.more-options-button',
} as const;

// All FIELD_MAPs combined — used for the "validate every selector against a fixture" test.
export const ALL_FIELD_MAPS = {
  workReg: WORK_REG_FIELDS,
  writerRow: WRITER_ROW_FIELDS,
  publisherRow: PUBLISHER_ROW_FIELDS,
  setlistAdd: SETLIST_ADD_FIELDS,
  perfAdd: PERF_ADD_FIELDS,
  venueResults: VENUE_RESULTS_FIELDS,
  venueDetail: VENUE_DETAIL_FIELDS,
  worksCatalogSearch: WORKS_CATALOG_SEARCH_FIELDS,
} as const;

// ----- Helpers -----

// jQuery is loaded by ASCAP's own page. Access it via window so we can integrate
// with bootstrap-select's `selectpicker` plugin without bundling our own jQuery.
// JQueryChain is the object returned by `$(el)` — both `selectpicker` and
// `trigger` return another JQueryChain so calls can be chained as
// `$(el).selectpicker('val', x).trigger('change')`.
type JQueryChain = {
  selectpicker: (cmd: string, val?: unknown) => JQueryChain;
  trigger: (evt: string) => JQueryChain;
};
type JQueryLike = (el: Element) => JQueryChain;

function getJQuery(): JQueryLike | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (typeof window !== 'undefined' ? (window as any) : {}) as Record<string, JQueryLike>;
  return w.jQuery || w.$ || null;
}

// Set value on a plain input + fire input/change/blur. Use this for non-typeahead,
// non-selectpicker fields. ASCAP's `.saveOnFocus` / `.saveOnFocusOut` classes
// persist on blur — we fire blur explicitly so the draft sticks.
export function setInputValueAscap(el: HTMLElement, value: string): boolean {
  if (el instanceof HTMLInputElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
  if (el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// Set value on a `<select>`. If it carries `.selectpicker`, also call
// `$(el).selectpicker('val', value)` so the visible bootstrap-select button
// label updates — plain `.value = ...` only updates the underlying option,
// not the rendered widget. Safe no-op when jQuery isn't on the page.
export function setBootstrapSelectValue(
  el: HTMLSelectElement,
  value: string
): boolean {
  // Try matching by option value first, then by visible label (case-insensitive).
  const option = Array.from(el.options).find(
    (o) =>
      o.value === value ||
      o.textContent?.trim().toLowerCase() === value.toLowerCase()
  );
  if (!option) return false;
  el.value = option.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));

  if (el.classList.contains('selectpicker')) {
    const $ = getJQuery();
    if ($) {
      try {
        $(el).selectpicker('val', option.value).trigger('change');
      } catch {
        // jQuery present but selectpicker plugin missing — fall back to plain change.
      }
    }
  }
  return true;
}

// Fill a jQuery typeahead input (Writer Name, Publisher Name, Venue Name).
// Pattern: set value → fire input → wait for dropdown to populate → click matching
// suggestion. The suggestion populates hidden companion fields automatically
// (e.g. WriterIPI, partyId) so no separate fill needed.
//
// Returns true if a matching suggestion was clicked. Returns false if no
// suggestion appeared within the timeout — caller can fall back to manual
// fields (WriterFirstName/WriterLastName, addressLine1, etc.).
export async function fillJqueryTypeahead(
  el: HTMLInputElement,
  value: string,
  options: {
    suggestionContainerSelector?: string;
    suggestionItemSelector?: string;
    matchTimeoutMs?: number;
    matchPredicate?: (item: Element) => boolean;
  } = {}
): Promise<boolean> {
  const {
    suggestionContainerSelector = '.tt-menu, .typeahead, .ui-autocomplete',
    suggestionItemSelector = '.tt-suggestion, li.ui-menu-item, .typeahead-item',
    matchTimeoutMs = 1500,
    matchPredicate,
  } = options;

  // Set + fire events. jQuery typeaheads usually listen on input/keyup.
  setInputValueAscap(el, value);
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  // Poll for the suggestion dropdown to render with content.
  const start = Date.now();
  while (Date.now() - start < matchTimeoutMs) {
    const container = document.querySelector(suggestionContainerSelector);
    if (container) {
      const items = Array.from(container.querySelectorAll(suggestionItemSelector));
      if (items.length > 0) {
        const target = matchPredicate ? items.find(matchPredicate) : items[0];
        if (target instanceof HTMLElement) {
          target.click();
          return true;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

// Set a checkbox's checked state and fire change. ASCAP uses Materialize-style
// checkboxes with no special widget refresh needed.
export function setCheckbox(el: HTMLInputElement, checked: boolean): boolean {
  if (el.checked === checked) return true;
  el.checked = checked;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// Click a button identified by visible text — used for SAVE/SUBMIT/CANCEL on
// Work Registration (no distinguishing class) and any other text-only controls.
export function clickButtonByText(text: string, root: ParentNode = document): boolean {
  const buttons = Array.from(root.querySelectorAll('button'));
  const match = buttons.find(
    (b) => b.textContent?.trim().toLowerCase() === text.toLowerCase()
  );
  if (match) {
    match.click();
    return true;
  }
  return false;
}

// Plain wrapper for selector lookup with optional row-level scoping (writer/publisher rows).
export function findAscapField<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document
): T | null {
  return root.querySelector<T>(selector);
}
