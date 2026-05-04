import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_FIELD_MAPS,
  WORK_REG_FIELDS,
  WRITER_ROW_FIELDS,
  PUBLISHER_ROW_FIELDS,
  SETLIST_ADD_FIELDS,
  PERF_ADD_FIELDS,
  VENUE_RESULTS_FIELDS,
  VENUE_DETAIL_FIELDS,
  WORKS_CATALOG_SEARCH_FIELDS,
  setBootstrapSelectValue,
  setCheckbox,
  clickButtonByText,
  setInputValueAscap,
} from './ascap-selectors';

// ----- Fixture-validation matcher -----
//
// Each .ascap_*.json sidecar is a flat array of element descriptors:
//   { t: 'INPUT', tp: 'text', id: 'foo', n: 'bar', cls: 'baz qux', ... }
//
// We need to verify "for selector X, at least one captured element matches."
// The selector vocabulary in ascap-selectors.ts is intentionally narrow:
//   - tag (uppercase)
//   - .class (multiple chained)
//   - #id
//   - [attr="val"]
// That's all we support — no descendants, no pseudo-selectors. If a future
// selector needs more, expand this matcher rather than introduce JSDOM.

interface FixtureEl {
  t: string;
  tp?: string;
  id?: string;
  n?: string;
  cls?: string;
  p?: string;
  href?: string;
}

interface ParsedSelector {
  tag?: string;
  classes: string[];
  id?: string;
  attrs: Array<{ name: string; value?: string }>;
}

function parseSelector(selector: string): ParsedSelector {
  const result: ParsedSelector = { classes: [], attrs: [] };
  // Pull out [attr="val"] / [attr] first
  let s = selector.replace(/\[([^\]=]+)(?:="([^"]*)")?\]/g, (_, name, value) => {
    result.attrs.push({ name, value });
    return '';
  });
  // Now parse tag.class.class#id
  // First chunk before any . or # is the tag (optional).
  const tagMatch = s.match(/^[a-zA-Z]+/);
  if (tagMatch) {
    result.tag = tagMatch[0].toUpperCase();
    s = s.slice(tagMatch[0].length);
  }
  // Remaining: chains of .name and #id
  const rest = s.match(/(\.[A-Za-z0-9_-]+|#[A-Za-z0-9_-]+)/g) || [];
  for (const part of rest) {
    if (part.startsWith('.')) result.classes.push(part.slice(1));
    if (part.startsWith('#')) result.id = part.slice(1);
  }
  return result;
}

function elementMatches(el: FixtureEl, sel: ParsedSelector): boolean {
  if (sel.tag && el.t !== sel.tag) return false;
  if (sel.id && el.id !== sel.id) return false;
  if (sel.classes.length > 0) {
    const elClasses = (el.cls || '').split(/\s+/);
    for (const c of sel.classes) {
      if (!elClasses.includes(c)) return false;
    }
  }
  for (const a of sel.attrs) {
    // Map common HTML attrs to fixture fields
    const attrVal =
      a.name === 'name'
        ? el.n
        : a.name === 'type'
          ? el.tp
          : a.name === 'placeholder'
            ? el.p
            : a.name === 'href'
              ? el.href
              : undefined;
    if (a.value !== undefined) {
      if (attrVal !== a.value) return false;
    } else {
      // Just attribute presence
      if (!attrVal) return false;
    }
  }
  return true;
}

function selectorMatchesAny(selector: string, fixture: FixtureEl[]): boolean {
  const parsed = parseSelector(selector);
  return fixture.some((el) => elementMatches(el, parsed));
}

function loadFixture(name: string): FixtureEl[] {
  // Fixtures live in extension/__fixtures__/ inside the SRT repo so CI can
  // find them. Originals are captured into the user's Obsidian vault during
  // beta-test inspection sessions; the runbook (Projects/SRT - DOM Snapshot
  // Refresh Runbook.md) walks through copying them in here.
  const path = join(
    process.cwd(),
    'extension',
    '__fixtures__',
    `.ascap_${name}_dom.json`
  );
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureEl[];
}

describe('parseSelector (test infrastructure)', () => {
  it('parses tag.class.class', () => {
    const p = parseSelector('input.foo.bar');
    expect(p.tag).toBe('INPUT');
    expect(p.classes).toEqual(['foo', 'bar']);
  });
  it('parses tag#id.class', () => {
    const p = parseSelector('input#searchVenueName.searchVenueName');
    expect(p.tag).toBe('INPUT');
    expect(p.id).toBe('searchVenueName');
    expect(p.classes).toEqual(['searchVenueName']);
  });
  it('parses [attr="val"]', () => {
    const p = parseSelector('input[name="pubShare"]');
    expect(p.tag).toBe('INPUT');
    expect(p.attrs).toEqual([{ name: 'name', value: 'pubShare' }]);
  });
});

describe('Fixture validation — Work Registration', () => {
  const fixture = loadFixture('work_registration');

  it.each(Object.entries(WORK_REG_FIELDS))(
    'WORK_REG_FIELDS.%s — %s — resolves',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, fixture)).toBe(true);
    }
  );

  // Writer + Publisher rows live inside Work Registration; verify they're present.
  it.each(Object.entries(WRITER_ROW_FIELDS))(
    'WRITER_ROW_FIELDS.%s — %s — resolves',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, fixture)).toBe(true);
    }
  );

  // Skip publisher fields that don't appear in the captured fixture (the writer's
  // first publisher row may not be expanded at capture time). We assert the major
  // ones explicitly.
  it.each([
    PUBLISHER_ROW_FIELDS.publisherName,
    PUBLISHER_ROW_FIELDS.originalPublisherName,
    PUBLISHER_ROW_FIELDS.publisherSocietySelect,
    PUBLISHER_ROW_FIELDS.publisherTerritorySelect,
    PUBLISHER_ROW_FIELDS.publisherShareExpanded,
  ])('PUBLISHER_ROW_FIELDS — %s — resolves', (selector) => {
    expect(selectorMatchesAny(selector, fixture)).toBe(true);
  });
});

describe('Fixture validation — OnStage Setlist Add', () => {
  const fixture = loadFixture('onstage_setlist_add');

  it.each(Object.entries(SETLIST_ADD_FIELDS))(
    'SETLIST_ADD_FIELDS.%s — %s — resolves',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, fixture)).toBe(true);
    }
  );
});

describe('Fixture validation — OnStage Performance Add', () => {
  const fixture = loadFixture('onstage_performance_add');

  it.each(Object.entries(PERF_ADD_FIELDS))(
    'PERF_ADD_FIELDS.%s — %s — resolves',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, fixture)).toBe(true);
    }
  );
});

describe('Fixture validation — Venue Search Results', () => {
  const fixture = loadFixture('onstage_venue_search_results');

  // The Select button is the actionable element on each result row — we click
  // this to pick a venue. resultsContainer / resultRow / resultVenueName /
  // resultAddress are wrapper <div>s that the DOM-dump capture format omits
  // (it only retains elements with form-interactive semantics: input/button/
  // select/a/textarea). The selectors themselves are documented in
  // SRT Beta - ASCAP DOM Inspection Results.md and were captured visually.
  it('VENUE_RESULTS_FIELDS.selectVenueButton resolves', () => {
    expect(selectorMatchesAny(VENUE_RESULTS_FIELDS.selectVenueButton, fixture)).toBe(true);
  });

  // Empty-state fixture should expose the Add New Venue button.
  const emptyFixture = loadFixture('onstage_no_results');
  it('VENUE_RESULTS_FIELDS.addNewVenueButton resolves in empty-state fixture', () => {
    expect(selectorMatchesAny(VENUE_RESULTS_FIELDS.addNewVenueButton, emptyFixture)).toBe(true);
  });

  // Wrapper-div selectors aren't fixture-validatable but must remain non-empty
  // strings so the filler can use them without a runtime undefined-deref.
  it.each([
    VENUE_RESULTS_FIELDS.resultsContainer,
    VENUE_RESULTS_FIELDS.resultRow,
    VENUE_RESULTS_FIELDS.resultVenueName,
    VENUE_RESULTS_FIELDS.resultAddress,
  ])('VENUE_RESULTS_FIELDS wrapper — %s — is a non-empty string', (selector) => {
    expect(typeof selector).toBe('string');
    expect(selector.length).toBeGreaterThan(0);
  });
});

describe('Fixture validation — Venue Detail (post-match + new venue)', () => {
  // The DOM map says the same field IDs are used for both paths. Verify against
  // the post-match fixture (venue picked from search results).
  const matchFixture = loadFixture('onstage_venue_picked');

  it.each(Object.entries(VENUE_DETAIL_FIELDS))(
    'VENUE_DETAIL_FIELDS.%s — %s — resolves in post-match fixture',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, matchFixture)).toBe(true);
    }
  );

  // Same six fields must also resolve in the new-venue fixture (manually-added path).
  const newVenueFixture = loadFixture('onstage_new_venue');
  it.each(Object.entries(VENUE_DETAIL_FIELDS))(
    'VENUE_DETAIL_FIELDS.%s — %s — resolves in new-venue fixture',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, newVenueFixture)).toBe(true);
    }
  );
});

describe('Fixture validation — Works Catalog Search', () => {
  const fixture = loadFixture('onstage_works_search');

  it.each(Object.entries(WORKS_CATALOG_SEARCH_FIELDS))(
    'WORKS_CATALOG_SEARCH_FIELDS.%s — %s — resolves',
    (_key, selector) => {
      expect(selectorMatchesAny(selector, fixture)).toBe(true);
    }
  );
});

describe('Coverage sanity', () => {
  it('exposes a non-trivial number of selectors across all forms', () => {
    const totalSelectors = Object.values(ALL_FIELD_MAPS).reduce(
      (acc, group) => acc + Object.keys(group).length,
      0
    );
    // Hard floor — captures a regression if someone deletes a whole map by accident.
    expect(totalSelectors).toBeGreaterThan(40);
  });
});

// ----- Helper tests -----
// These don't need a real DOM — they operate on stub objects shaped like the
// HTMLElement properties the helpers actually touch. Avoids pulling in jsdom/
// happy-dom just for two helpers.

describe('setBootstrapSelectValue', () => {
  function makeSelect(opts: { values: string[]; classes?: string[] }) {
    const options = opts.values.map((v) => ({ value: v, textContent: v }));
    const dispatched: Event[] = [];
    const classList = {
      contains: (c: string) => (opts.classes || []).includes(c),
    };
    const el = {
      options,
      value: '',
      classList,
      dispatchEvent: (e: Event) => {
        dispatched.push(e);
        return true;
      },
    } as unknown as HTMLSelectElement;
    return { el, dispatched };
  }

  beforeEach(() => {
    // Clear any leftover jQuery global between tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });

  it('sets value when option exists by value', () => {
    const { el, dispatched } = makeSelect({ values: ['CNCRT', 'FSTVL'] });
    expect(setBootstrapSelectValue(el, 'CNCRT')).toBe(true);
    expect(el.value).toBe('CNCRT');
    expect(dispatched.some((e) => e.type === 'change')).toBe(true);
  });

  it('matches option by visible label (case-insensitive) when value lookup fails', () => {
    const { el } = makeSelect({ values: ['CNCRT'] });
    // Mutate the rendered text to simulate label-driven match
    (el.options[0] as unknown as { textContent: string }).textContent = 'Concert';
    expect(setBootstrapSelectValue(el, 'concert')).toBe(true);
  });

  it('returns false when no option matches', () => {
    const { el } = makeSelect({ values: ['CNCRT'] });
    expect(setBootstrapSelectValue(el, 'NOPE')).toBe(false);
  });

  it('calls $(el).selectpicker("val", x).trigger("change") when jQuery + .selectpicker are present', () => {
    const triggerSpy = vi.fn().mockReturnThis();
    const selectpickerSpy = vi.fn().mockReturnValue({ trigger: triggerSpy });
    const $ = vi.fn().mockReturnValue({ selectpicker: selectpickerSpy });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { jQuery: $ };

    const { el } = makeSelect({ values: ['CNCRT'], classes: ['selectpicker'] });
    setBootstrapSelectValue(el, 'CNCRT');

    expect($).toHaveBeenCalledWith(el);
    expect(selectpickerSpy).toHaveBeenCalledWith('val', 'CNCRT');
    expect(triggerSpy).toHaveBeenCalledWith('change');
  });

  it('silently degrades when jQuery selectpicker plugin is missing', () => {
    const $ = vi.fn().mockReturnValue({
      selectpicker: () => {
        throw new Error('plugin not loaded');
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { jQuery: $ };

    const { el } = makeSelect({ values: ['CNCRT'], classes: ['selectpicker'] });
    // Should not throw — falls back to the plain change event already dispatched.
    expect(() => setBootstrapSelectValue(el, 'CNCRT')).not.toThrow();
  });
});

describe('setCheckbox', () => {
  function makeCheckbox(initial: boolean) {
    const dispatched: Event[] = [];
    const el = {
      checked: initial,
      dispatchEvent: (e: Event) => {
        dispatched.push(e);
        return true;
      },
    } as unknown as HTMLInputElement;
    return { el, dispatched };
  }

  it('flips false → true and fires change', () => {
    const { el, dispatched } = makeCheckbox(false);
    setCheckbox(el, true);
    expect(el.checked).toBe(true);
    expect(dispatched.some((e) => e.type === 'change')).toBe(true);
  });

  it('is a no-op when already in the target state (no event fired)', () => {
    const { el, dispatched } = makeCheckbox(true);
    setCheckbox(el, true);
    expect(dispatched).toHaveLength(0);
  });
});

describe('clickButtonByText', () => {
  it('clicks the button whose text matches case-insensitively', () => {
    const click = vi.fn();
    const buttons = [
      { textContent: 'Cancel', click: vi.fn() },
      { textContent: 'Save', click },
      { textContent: 'Submit', click: vi.fn() },
    ];
    const root = {
      querySelectorAll: (sel: string) => (sel === 'button' ? buttons : []),
    } as unknown as ParentNode;
    expect(clickButtonByText('save', root)).toBe(true);
    expect(click).toHaveBeenCalled();
  });

  it('returns false when no button matches', () => {
    const root = {
      querySelectorAll: () => [{ textContent: 'Cancel', click: vi.fn() }],
    } as unknown as ParentNode;
    expect(clickButtonByText('Submit', root)).toBe(false);
  });
});

describe('setInputValueAscap', () => {
  // Thin wrapper around the same `instanceof HTMLInputElement` + native-setter
  // pattern used in BMI's bmi-filler.ts (which has shipped against real BMI
  // Live for weeks). Can't be exercised without a real DOM (HTMLInputElement
  // is a runtime browser global), and we deliberately don't pull in jsdom or
  // happy-dom for one helper. The smoke check below at least pins the export
  // shape so a refactor can't silently change the signature.
  it('is exported as a function', () => {
    expect(typeof setInputValueAscap).toBe('function');
    expect(setInputValueAscap.length).toBe(2); // (el, value)
  });
});
