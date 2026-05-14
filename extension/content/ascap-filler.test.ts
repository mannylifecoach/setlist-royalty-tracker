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

// v1.3.3 — fillPerfDetails now calls chrome.storage + chrome.runtime for the
// saveOnFocus CDP path. Stub both before each test; tests can override per-case.
beforeEach(() => {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ advancedFillEnabled: true }),
      },
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  });
});

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
  // Verified live against ASCAP 2026-05-13: when ASCAP's venue search returns
  // 1+ results, the Add New Venue button is NOT rendered — it only appears in
  // the empty-state container (see buildVenueEmptyResults). The original
  // fixture (pre-2026-05-13) incorrectly appended addNewVenue here.
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
  // Catalog page that ASCAP SPA-navigates to after Add Works is clicked.
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <input class="workTitle" type="text" />
    <input class="workId" type="text" />
    <button class="search-apply">Search</button>
    <button class="js-add-to-setlist">Add to Setlist</button>
  `;
  document.body.appendChild(wrap);
}

// v1.3.3 — appends a results table to the works catalog. The auto-picker
// looks for `tr.is-selectable` rows with a status badge (`td.jsPillWrapper`)
// and prefers "Accepted" over "Possible Match" over no-label.
type CatalogResultRow = { name: string; workId: string; status?: string };
function buildWorksCatalogResults(rows: CatalogResultRow[]) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.className = 'is-selectable';
    tr.innerHTML = `
      <td><input class="c-checkbox__input" type="checkbox" /></td>
      <td>${r.name}</td>
      ${r.status ? `<td class="jsPillWrapper">${r.status}</td>` : '<td></td>'}
      <td>${r.workId}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  document.body.appendChild(table);
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

  it('clicks Select on a substring-matching venue (chain venue case from 2026-05-13)', async () => {
    // Live-caught 2026-05-13 in Tiffany's session: SRT typed "House of Blues"
    // and ASCAP returned "House of Blues - Orlando". The old exact-equal check
    // missed it; the v1.3.2 substring fallback should now select it.
    buildPerformanceAddDom();
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueResults([
        { name: 'House of Blues - Orlando', address: '1490 EAST BUENA VISTA DRIVE' },
      ]);
      orig();
    };
    let selectClicked = false;
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.selectVenue')) selectClicked = true;
    });
    const event: AscapEventInput = { ...baseEvent, venueName: 'House of Blues' };
    const results = await fillAscapPerformance(event);
    const venueStep = results.find((r) => r.step === 'venue-search');
    expect(venueStep?.ok).toBe(true);
    expect(selectClicked).toBe(true);
  });

  it('prefers exact match over substring match when both exist', async () => {
    // If ASCAP returns both "House of Blues" and "House of Blues - Orlando",
    // the exact match should win (pass 1 of the 2-pass matcher).
    buildPerformanceAddDom();
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueResults([
        { name: 'House of Blues - Orlando', address: '1490 EAST BUENA VISTA DRIVE' },
        { name: 'House of Blues', address: '329 N Dearborn St' },
      ]);
      orig();
    };
    const selectedRowIndexes: string[] = [];
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.selectVenue')) {
        const idx = t.getAttribute('data-index');
        if (idx) selectedRowIndexes.push(idx);
      }
    });
    const event: AscapEventInput = { ...baseEvent, venueName: 'House of Blues' };
    await fillAscapPerformance(event);
    expect(selectedRowIndexes).toEqual(['1']); // row 1 is the exact match
  });

  it('reports user-actionable error when results exist but none match (no Add New Venue button)', async () => {
    // Live-confirmed 2026-05-13: when ASCAP returns 1+ results that don't
    // match, Add New Venue button is NOT rendered. The filler surfaces an
    // actionable detail message instead of trying a missing fallback.
    buildPerformanceAddDom();
    const searchBtn = document.querySelector<HTMLButtonElement>('button.js-search-venues-button')!;
    const orig = searchBtn.click.bind(searchBtn);
    searchBtn.click = () => {
      buildVenueResults([
        { name: 'Completely Different Venue', address: '999 Nowhere Ln' },
      ]);
      orig();
    };
    const results = await fillAscapPerformance(baseEvent);
    const venueStep = results.find((r) => r.step === 'venue-search');
    expect(venueStep?.ok).toBe(false);
    expect(venueStep?.detail?.toLowerCase()).toContain('manually');
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
    // v1.3.3 — perfArtistName is now routed through the chrome.debugger CDP
    // path (background sets the value via Input.dispatchKeyEvent). In the
    // happy-dom test env we mock chrome.runtime.sendMessage and assert the
    // call was made with the right selector + value; the actual DOM mutation
    // happens in the real browser via CDP. Non-saveOnFocus fields (date,
    // duration, start hours) still use the legacy path and DO mutate DOM.
    const sendMessageMock = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    await fillAscapPerformance(baseEvent);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'CDP_TYPE_INTO_FIELD',
      selector: 'input#perfArtistName.perfArtistName',
      value: 'Manny',
    });
    expect(document.querySelector<HTMLInputElement>('input#perfDate')!.value).toBe('04/15/2026');
    // Sum 213+187 = 400 / 60 = 7 (rounded)
    expect(document.querySelector<HTMLInputElement>('input#duration')!.value).toBe('7');
    expect(document.querySelector<HTMLSelectElement>('select#perfStartHours')!.value).toBe('20');
  });

  it('falls back gracefully when CDP background is unavailable (e.g. DevTools open)', async () => {
    // Mock background returning a failure — filler should report ok:false
    // with an actionable detail message rather than throwing.
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Another debugger is already attached to this tab',
    });
    const results = await fillAscapPerformance(baseEvent);
    const artistStep = results.find((r) => r.step === 'artist-name');
    expect(artistStep?.ok).toBe(false);
    expect(artistStep?.detail).toContain('Another debugger');
  });

  it('skips CDP path entirely when user disabled advanced fill in settings', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      advancedFillEnabled: false,
    });
    const sendMessageMock = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const results = await fillAscapPerformance(baseEvent);
    const artistStep = results.find((r) => r.step === 'artist-name');
    expect(artistStep?.ok).toBe(false);
    expect(artistStep?.detail).toContain('manually');
    // Background should never have been called for the CDP path
    const cdpCalls = sendMessageMock.mock.calls.filter(
      (c) => c[0]?.type === 'CDP_TYPE_INTO_FIELD'
    );
    expect(cdpCalls).toHaveLength(0);
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
  // Single-song event for the auto-pick happy paths. baseEvent has 2 songs;
  // multi-song auto-add isn't supported in v1.3.3 (each Add to Setlist nav
  // back exits the catalog page — see test "multi-song degrades gracefully").
  const singleSongEvent: AscapEventInput = {
    ...baseEvent,
    songs: [{ performanceId: 'p1', title: 'Karma', ascapWorkId: '895000147', durationSeconds: 213 }],
  };

  it('fills setlist name and clicks Add Works', async () => {
    buildSetlistAddDom();
    let addWorksClicked = false;
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        addWorksClicked = true;
        buildWorksCatalog();
        // Provide a result row so auto-pick succeeds quickly (otherwise we
        // wait the full 3s timeout, slowing the test suite).
        buildWorksCatalogResults([{ name: 'Karma', workId: '895000147', status: 'Accepted' }]);
      });

    const results = await fillAscapSetlist(singleSongEvent);
    expect(document.querySelector<HTMLInputElement>('input.setlistName')!.value).toBe(
      'Manny - 2026-04-15'
    );
    expect(addWorksClicked).toBe(true);
    expect(results.find((r) => r.step === 'setlist-name')?.ok).toBe(true);
  });

  it('auto-picks the "Accepted" row over "Possible Match" rows (live-confirmed 2026-05-14)', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        buildWorksCatalog();
        // 3 KARMA rows mirroring Tiffany's actual ASCAP catalog results.
        buildWorksCatalogResults([
          { name: 'KARMA', workId: '918737427', status: 'Possible Match' },
          { name: 'KARMA', workId: '907556952', status: 'Possible Match' },
          { name: 'KARMA', workId: '895000147', status: 'Accepted' },
        ]);
      });
    let addToSetlistClicked = false;
    document.body.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).matches('button.js-add-to-setlist')) {
        addToSetlistClicked = true;
      }
    });

    const results = await fillAscapSetlist(singleSongEvent);
    const songStep = results.find((r) => r.step === 'song-search:Karma');
    expect(songStep?.ok).toBe(true);
    expect(songStep?.detail).toContain('Accepted');
    expect(songStep?.detail).toContain('895000147');
    expect(addToSetlistClicked).toBe(true);
  });

  it('falls back to "Possible Match" when no Accepted row exists', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        buildWorksCatalog();
        buildWorksCatalogResults([
          { name: 'KARMA', workId: '918737427', status: 'Possible Match' },
          { name: 'KARMA', workId: '907556952', status: 'Possible Match' },
        ]);
      });

    const results = await fillAscapSetlist(singleSongEvent);
    const songStep = results.find((r) => r.step === 'song-search:Karma');
    expect(songStep?.ok).toBe(true);
    expect(songStep?.detail).toContain('Possible Match');
  });

  it('reports failure when search returns no rows within timeout', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        buildWorksCatalog();
        // No buildWorksCatalogResults → empty results → auto-pick times out.
        // Note: test takes ~3s due to the timeout. Acceptable for one test.
      });

    const results = await fillAscapSetlist(singleSongEvent);
    const songStep = results.find((r) => r.step === 'song-search:Karma');
    expect(songStep?.ok).toBe(false);
    expect(songStep?.detail).toContain('No results');
  }, 6000);

  it('searches by ASCAP work id when available, falls back to title otherwise', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        buildWorksCatalog();
        buildWorksCatalogResults([{ name: 'Midnight Bass', workId: '900000001', status: 'Accepted' }]);
      });

    // Capture the search-apply click + the input value at that moment.
    const searches: string[] = [];
    document.body.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('button.search-apply')) {
        const workIdVal = document.querySelector<HTMLInputElement>('input.workId')?.value;
        const titleVal = document.querySelector<HTMLInputElement>('input.workTitle')?.value;
        searches.push(workIdVal ? `id:${workIdVal}` : `title:${titleVal}`);
      }
    });

    const event: AscapEventInput = {
      ...baseEvent,
      songs: [{ performanceId: 'p1', title: 'Midnight Bass', ascapWorkId: 'A-1', durationSeconds: 213 }],
    };
    await fillAscapSetlist(event);

    // Song has ASCAP work id A-1 → searches by ID, not title.
    expect(searches).toContain('id:A-1');
  });

  it('re-fills setlist name after the Add Works round-trip (SPA nav back)', async () => {
    buildSetlistAddDom();
    document
      .querySelector<HTMLAnchorElement>('a.addSetlistWorks')!
      .addEventListener('click', () => {
        buildWorksCatalog();
        buildWorksCatalogResults([{ name: 'Karma', workId: '895000147', status: 'Accepted' }]);
      });
    // Simulate ASCAP's SPA navigation back to /setlist/add after Add to
    // Setlist click: empty the setlist name + rebuild the setlist DOM at
    // that moment so the filler's re-fill step finds the input again.
    document.body.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).matches('button.js-add-to-setlist')) {
        // Tick → click happens → fire setTimeout to simulate nav latency.
        setTimeout(() => {
          buildSetlistAddDom(); // re-render the /setlist/add page (clears name)
        }, 50);
      }
    });

    const results = await fillAscapSetlist(singleSongEvent);
    const refillStep = results.find((r) => r.step === 'setlist-name-refill');
    expect(refillStep?.ok).toBe(true);
    // Name input should have been re-populated after the nav.
    expect(document.querySelector<HTMLInputElement>('input.setlistName')?.value).toBe(
      'Manny - 2026-04-15'
    );
  });

  it('reports add-works button missing cleanly without throwing', async () => {
    document.body.innerHTML = `<input class="setlistName" type="text" />`;
    const results = await fillAscapSetlist(baseEvent);
    const addStep = results.find((r) => r.step === 'add-works')!;
    expect(addStep.ok).toBe(false);
  });
});
