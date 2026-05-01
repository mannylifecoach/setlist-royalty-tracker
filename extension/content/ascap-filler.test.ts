// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fillAscapPerformance,
  fillAscapSetlist,
  convertHourTo24,
  formatPerfDate,
  calculateSetDurationMinutes,
  setlistNameFor,
  type AscapEventInput,
} from './ascap-filler';

// Build a Performance-Add-style DOM with the same field IDs/classes the
// captured fixture exposes. We don't load the JSON fixture into JSDOM directly
// because the dump format is a flat element list (no parent/child structure)
// — but the SELECTORS the filler uses are validated against that fixture in
// ascap-selectors.test.ts. Here we focus on orchestration: did the filler
// touch the right inputs/selects/buttons in the right order with the right
// values?

function buildPerformanceAddDom(opts: {
  setlistOptions?: string[];
  perfTypeOptions?: string[];
  perfStartHourOptions?: string[];
  hasSetlistDropdown?: boolean;
} = {}) {
  const {
    setlistOptions = [],
    perfTypeOptions = ['CNCRT', 'FSTVL', 'CFUNC', 'LISTM'],
    perfStartHourOptions = Array.from({ length: 24 }, (_, i) => String(i)),
    hasSetlistDropdown = true,
  } = opts;

  document.body.innerHTML = `
    <input id="searchVenueName" class="searchVenueName" type="text" />
    <select id="state-territory" class="searchVenueState selectpicker">
      <option value="">--</option>
      <option value="CA">CA</option>
      <option value="NY">NY</option>
    </select>
    <button class="js-search-venues-button">Search</button>

    <input id="perfArtistName" class="perfArtistName" type="text" />
    <select id="perfTypeCode" class="perfTypeCode selectpicker">
      ${perfTypeOptions.map((v) => `<option value="${v}">${v}</option>`).join('')}
    </select>
    <input id="perfDate" class="perfDate" type="text" />
    <input id="duration" class="duration" type="number" />
    <select id="perfStartHours" class="perfStartHours selectpicker">
      ${perfStartHourOptions.map((v) => `<option value="${v}">${v}</option>`).join('')}
    </select>
    <select id="perfStartMinutes" class="perfStartMinutes selectpicker">
      <option value="0">00</option>
      <option value="15">15</option>
      <option value="30">30</option>
      <option value="45">45</option>
    </select>
    <input id="numPerfViews" class="liveStreamViews" type="number" />
    <input id="feeCharged" type="checkbox" />
    <input id="advanceTickets" type="checkbox" />
    ${
      hasSetlistDropdown
        ? `<select class="setlist selectpicker">
            <option value="">--</option>
            ${setlistOptions
              .map((name) => `<option value="${name}">${name}</option>`)
              .join('')}
          </select>`
        : ''
    }
  `;
}

function buildVenueResults(matches: { name: string; address: string }[]) {
  const container = document.createElement('div');
  container.className = 'list venue-results';
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const row = document.createElement('div');
    row.className = 'list--item';
    row.innerHTML = `
      <div class="list--item--title"><h6>${m.name}</h6></div>
      <div class="list--item--subtitle"><h6>${m.address}</h6></div>
      <button data-index="${i}" class="btn btn-select selectVenue">Select</button>
    `;
    container.appendChild(row);
  }
  // ASCAP renders the Add New Venue button alongside results so the user can
  // create a new venue even when the search returned non-matching results.
  const addNew = document.createElement('button');
  addNew.className = 'btn btn-add-venue addNewVenue';
  addNew.textContent = 'Add New Venue';
  container.appendChild(addNew);
  document.body.appendChild(container);
}

function buildVenueEmptyResults() {
  const container = document.createElement('div');
  container.className = 'list venue-results';
  container.innerHTML = `
    <button class="btn btn-add-venue addNewVenue">Add New Venue</button>
  `;
  document.body.appendChild(container);
}

function buildVenueDetailFields() {
  // Inserted into the same body when the user opens "Add New Venue".
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <input id="venueName" class="venueName saveOnFocus" type="text" />
    <input id="addressLine1" class="addressLine1 saveOnFocus" type="text" />
    <input id="city" class="city saveOnFocus" type="text" />
    <select id="stateCde" class="stateCde show-tick selectpicker">
      <option value="CA">CA</option>
      <option value="NY">NY</option>
    </select>
    <input id="postalCode" class="postalCode saveOnFocus" type="text" />
    <select id="country" class="country show-tick selectpicker">
      <option value="US">USA</option>
      <option value="CA">CANADA</option>
    </select>
  `;
  document.body.appendChild(wrap);
}

function buildSetlistAddDom() {
  document.body.innerHTML = `
    <input class="setlistName" type="text" />
    <input class="coverWorkTitle" type="text" />
    <input class="coverPerfArtist" type="text" />
    <a class="addSetlistWorks" href="#">Add Works</a>
    <button class="copySetlist">Copy</button>
    <button class="saveSetlist">Save</button>
    <button class="cancelSetlist">Cancel</button>
  `;
}

function buildWorksCatalog() {
  // Catalog modal that ASCAP renders after Add Works is clicked.
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <input class="workTitle" type="text" />
    <input class="workId" type="text" />
    <button class="search-apply">Search</button>
  `;
  document.body.appendChild(wrap);
}

const baseEvent: AscapEventInput = {
  artistName: 'Manny',
  eventDate: '2026-04-15',
  venueName: 'The Independent',
  venueAddress: '628 Divisadero St',
  venueCity: 'San Francisco',
  venueState: 'CA',
  venueCountry: 'US',
  venueZip: '94117',
  startTimeHour: '8:00',
  startTimeAmPm: 'PM',
  perfType: 'CNCRT',
  ticketFee: true,
  advanceTickets: false,
  liveStreamViews: null,
  songs: [
    { performanceId: 'p1', title: 'Midnight Bass', ascapWorkId: 'A-1', durationSeconds: 213 },
    { performanceId: 'p2', title: 'Sunrise', ascapWorkId: null, durationSeconds: 187 },
  ],
};

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

// ---------- Pure helpers ----------

describe('convertHourTo24', () => {
  it('converts 12-hour AM to 24-hour', () => {
    expect(convertHourTo24('8:00', 'AM')).toBe(8);
    expect(convertHourTo24('12:00', 'AM')).toBe(0);
  });
  it('converts 12-hour PM to 24-hour', () => {
    expect(convertHourTo24('8:00', 'PM')).toBe(20);
    expect(convertHourTo24('12:00', 'PM')).toBe(12);
  });
  it('handles lowercase am/pm', () => {
    expect(convertHourTo24('9:00', 'pm')).toBe(21);
  });
  it('returns null for null/empty', () => {
    expect(convertHourTo24(null, 'PM')).toBeNull();
    expect(convertHourTo24('', 'PM')).toBeNull();
  });
  it('returns null for non-numeric', () => {
    expect(convertHourTo24('xyz', 'PM')).toBeNull();
  });
});

describe('formatPerfDate', () => {
  it('reformats YYYY-MM-DD → MM/DD/YYYY', () => {
    expect(formatPerfDate('2026-04-15')).toBe('04/15/2026');
  });
  it('returns input unchanged when not in expected format', () => {
    expect(formatPerfDate('not-a-date')).toBe('not-a-date');
  });
});

describe('calculateSetDurationMinutes', () => {
  it('sums per-song seconds and rounds to minutes', () => {
    // 213 + 187 = 400 → 7 minutes (rounded)
    expect(calculateSetDurationMinutes(baseEvent.songs)).toBe(7);
  });
  it('defaults to 60 when no song has duration', () => {
    expect(
      calculateSetDurationMinutes([
        { performanceId: 'a', title: 'a', ascapWorkId: null, durationSeconds: null },
      ])
    ).toBe(60);
  });
  it('rounds up for partial minutes', () => {
    expect(
      calculateSetDurationMinutes([
        { performanceId: 'a', title: 'a', ascapWorkId: null, durationSeconds: 31 },
      ])
    ).toBe(1);
  });
});

describe('setlistNameFor', () => {
  it('builds a deterministic setlist name', () => {
    expect(setlistNameFor({ artistName: 'Manny', eventDate: '2026-04-15' })).toBe(
      'Manny - 2026-04-15'
    );
  });
});

// ---------- Performance Add orchestration ----------

describe('fillAscapPerformance — venue search match', () => {
  it('clicks Select on the matching venue row when results contain the target', async () => {
    buildPerformanceAddDom({ setlistOptions: ['Manny - 2026-04-15'] });

    // Mock querySelector for the venue-results container so the poll resolves
    // immediately. We render results synchronously via DOM mutation right after
    // the search button is clicked.
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const originalClick = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueResults([
        { name: 'The Independent', address: '628 Divisadero St San Francisco CA' },
      ]);
      originalClick();
    };

    const selectSpy = vi.fn();
    // Wire the click handler before fillAscapPerformance runs so the spy
    // captures the click on the result row's Select button.
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.selectVenue')) selectSpy();
    });

    const results = await fillAscapPerformance(baseEvent);
    const venueStep = results.find((r) => r.step === 'venue-search');
    expect(venueStep?.ok).toBe(true);
    expect(venueStep?.detail).toContain('The Independent');
    expect(selectSpy).toHaveBeenCalled();
  });

  it('falls back to Add New Venue when no result matches the venue name', async () => {
    buildPerformanceAddDom();
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueResults([
        { name: 'Some Other Venue', address: '123 Wrong St' },
      ]);
      orig();
    };

    let addNewClicked = false;
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.addNewVenue')) {
        addNewClicked = true;
        // Simulate the new-venue address form rendering after the click.
        buildVenueDetailFields();
      }
    });

    const results = await fillAscapPerformance(baseEvent);
    expect(addNewClicked).toBe(true);
    const venueStep = results.find((r) => r.step === 'venue-search');
    expect(venueStep?.ok).toBe(true);
    expect(venueStep?.detail?.toLowerCase()).toContain('new');
    // Address fields populated from the event data
    expect(document.querySelector<HTMLInputElement>('input#addressLine1')!.value).toBe('628 Divisadero St');
    expect(document.querySelector<HTMLInputElement>('input#city')!.value).toBe('San Francisco');
    expect(document.querySelector<HTMLInputElement>('input#postalCode')!.value).toBe('94117');
  });

  it('uses Add New Venue path when search returns empty results (no rows, only Add button)', async () => {
    buildPerformanceAddDom();
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueEmptyResults();
      orig();
    };
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.addNewVenue')) buildVenueDetailFields();
    });

    const results = await fillAscapPerformance(baseEvent);
    const venueStep = results.find((r) => r.step === 'venue-search');
    expect(venueStep?.ok).toBe(true);
  });

  it('skips venue search entirely when venue name is missing', async () => {
    buildPerformanceAddDom();
    const event = { ...baseEvent, venueName: null };
    const results = await fillAscapPerformance(event);
    const venueStep = results.find((r) => r.step === 'venue-search')!;
    expect(venueStep.ok).toBe(false);
    expect(venueStep.detail?.toLowerCase()).toContain('skip');
  });
});

describe('fillAscapPerformance — performance details', () => {
  beforeEach(() => {
    buildPerformanceAddDom({ setlistOptions: ['Manny - 2026-04-15'] });
    // Make the venue search resolve to "no results" so we can test the detail
    // fill independent of the venue branching.
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueEmptyResults();
      orig();
    };
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.addNewVenue')) buildVenueDetailFields();
    });
  });

  it('fills artist name, perf date, duration, start hour from the event', async () => {
    await fillAscapPerformance(baseEvent);
    expect(document.querySelector<HTMLInputElement>('input#perfArtistName')!.value).toBe('Manny');
    expect(document.querySelector<HTMLInputElement>('input#perfDate')!.value).toBe('04/15/2026');
    // Sum 213+187 = 400 / 60 = 7 (rounded)
    expect(document.querySelector<HTMLInputElement>('input#duration')!.value).toBe('7');
    expect(document.querySelector<HTMLSelectElement>('select#perfStartHours')!.value).toBe('20');
  });

  it('fills perf type, defaulting to CNCRT', async () => {
    await fillAscapPerformance({ ...baseEvent, perfType: undefined });
    expect(document.querySelector<HTMLSelectElement>('select#perfTypeCode')!.value).toBe('CNCRT');
  });

  it('toggles fee + advance checkboxes per the event flags', async () => {
    await fillAscapPerformance({ ...baseEvent, ticketFee: true, advanceTickets: true });
    expect(document.querySelector<HTMLInputElement>('input#feeCharged')!.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input#advanceTickets')!.checked).toBe(true);
  });

  it('fills numPerfViews only for LISTM perfType', async () => {
    await fillAscapPerformance({ ...baseEvent, perfType: 'LISTM', liveStreamViews: 1234 });
    expect(document.querySelector<HTMLInputElement>('input#numPerfViews')!.value).toBe('1234');
  });

  it('does NOT fill numPerfViews for non-LISTM perfType', async () => {
    await fillAscapPerformance({ ...baseEvent, perfType: 'CNCRT', liveStreamViews: 999 });
    expect(document.querySelector<HTMLInputElement>('input#numPerfViews')!.value).toBe('');
  });
});

describe('fillAscapPerformance — setlist dropdown', () => {
  it('selects the matching setlist when present', async () => {
    buildPerformanceAddDom({ setlistOptions: ['Other - 2025-12-01', 'Manny - 2026-04-15'] });
    document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!.click = () => {
      // Skip venue branching for this test
    };
    const results = await fillAscapPerformance(baseEvent);
    const setlistStep = results.find((r) => r.step === 'setlist')!;
    expect(setlistStep.ok).toBe(true);
    expect(setlistStep.detail).toContain('Manny - 2026-04-15');
    expect(document.querySelector<HTMLSelectElement>('select.setlist')!.value).toBe(
      'Manny - 2026-04-15'
    );
  });

  it('reports missing setlist with actionable detail', async () => {
    buildPerformanceAddDom({ setlistOptions: ['Other - 2025-12-01'] });
    document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!.click = () => {};
    const results = await fillAscapPerformance(baseEvent);
    const setlistStep = results.find((r) => r.step === 'setlist')!;
    expect(setlistStep.ok).toBe(false);
    expect(setlistStep.detail).toContain('create one first');
  });

  it('reports dropdown not present', async () => {
    buildPerformanceAddDom({ hasSetlistDropdown: false });
    document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!.click = () => {};
    const results = await fillAscapPerformance(baseEvent);
    const setlistStep = results.find((r) => r.step === 'setlist')!;
    expect(setlistStep.ok).toBe(false);
    expect(setlistStep.detail).toContain('not present');
  });
});

// ---------- Setlist Add orchestration ----------

describe('fillAscapSetlist', () => {
  it('fills setlist name and clicks Add Works', async () => {
    buildSetlistAddDom();
    let addWorksClicked = false;
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        addWorksClicked = true;
        buildWorksCatalog();
      });

    const results = await fillAscapSetlist(baseEvent);
    expect(document.querySelector<HTMLInputElement>('input.setlistName')!.value).toBe(
      'Manny - 2026-04-15'
    );
    expect(addWorksClicked).toBe(true);
    expect(results.find((r) => r.step === 'setlist-name')?.ok).toBe(true);
  });

  it('searches by ASCAP work id when available, falls back to title otherwise', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => buildWorksCatalog());

    // Capture every search-apply click + the input value at that moment.
    const searches: string[] = [];
    document.body.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.search-apply')) {
        const workIdVal = document.querySelector<HTMLInputElement>('input.workId')?.value;
        const titleVal = document.querySelector<HTMLInputElement>('input.workTitle')?.value;
        searches.push(workIdVal ? `id:${workIdVal}` : `title:${titleVal}`);
      }
    });

    const results = await fillAscapSetlist(baseEvent);

    // First song has ASCAP work id A-1, second has none → title fallback.
    expect(searches).toContain('id:A-1');
    expect(searches.some((s) => s.startsWith('title:Sunrise'))).toBe(true);
    // Each per-song step recorded
    expect(results.filter((r) => r.step.startsWith('song-search:')).length).toBe(2);
  });

  it('reports add-works button missing cleanly without throwing', async () => {
    document.body.innerHTML = `<input class="setlistName" type="text" />`;
    const results = await fillAscapSetlist(baseEvent);
    const addStep = results.find((r) => r.step === 'add-works')!;
    expect(addStep.ok).toBe(false);
  });
});
