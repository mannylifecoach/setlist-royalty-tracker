import { describe, it, expect } from 'vitest';
import { normalizeTitle, similarity, findBestMatch } from './fuzzy-match';

// ---------------------------------------------------------------------------
// normalizeTitle
// ---------------------------------------------------------------------------
describe('normalizeTitle', () => {
  it('lowercases', () => {
    expect(normalizeTitle('Bohemian Rhapsody')).toBe('bohemian rhapsody');
  });

  it('strips (feat. …)', () => {
    expect(normalizeTitle('Lace It (feat. Ben Harper)')).toBe('lace it');
  });

  it('strips (ft. …)', () => {
    expect(normalizeTitle('Song (ft. Someone)')).toBe('song');
  });

  it('strips (Live …)', () => {
    expect(normalizeTitle('Blinding Lights (Live at Wembley)')).toBe('blinding lights');
  });

  it('strips (Acoustic)', () => {
    expect(normalizeTitle('Creep (Acoustic)')).toBe('creep');
  });

  it('strips (Remix …)', () => {
    expect(normalizeTitle('Blinding Lights (DaHeala Remix)')).toBe('blinding lights');
  });

  it('strips (Remastered …)', () => {
    expect(normalizeTitle('Song (Remastered 2024)')).toBe('song');
  });

  it('removes accents/diacritics', () => {
    expect(normalizeTitle('Café del Mar')).toBe('cafe del mar');
  });

  it('removes punctuation', () => {
    expect(normalizeTitle("Don't Stop Me Now")).toBe('dont stop me now');
  });

  it('collapses whitespace', () => {
    expect(normalizeTitle('  The   Song  ')).toBe('the song');
  });

  it('handles multiple tags at once', () => {
    expect(normalizeTitle('Song (feat. X) (Live) (Remastered 2023)')).toBe('song');
  });
});

// ---------------------------------------------------------------------------
// similarity
// ---------------------------------------------------------------------------
describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('returns 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1);
  });

  it('handles single-char difference', () => {
    // "dont stop" vs "don stop" → distance 1, length 9 → 1 - 1/9 ≈ 0.889
    const score = similarity('dont stop', 'don stop');
    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// findBestMatch
// ---------------------------------------------------------------------------
describe('findBestMatch', () => {
  const catalog = new Map([
    [normalizeTitle('Blinding Lights'), { id: '1', title: 'Blinding Lights' }],
    [normalizeTitle("Don't Start Now"), { id: '2', title: "Don't Start Now" }],
    [normalizeTitle('Café del Mar'), { id: '3', title: 'Café del Mar' }],
    [normalizeTitle('Lace It'), { id: '4', title: 'Lace It' }],
    [normalizeTitle('Rumble'), { id: '5', title: 'Rumble' }],
  ]);

  it('exact normalized match', () => {
    const result = findBestMatch('Blinding Lights', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe('Blinding Lights');
    expect(result!.method).toBe('exact');
    expect(result!.score).toBe(1.0);
  });

  it('matches with feat. tag stripped', () => {
    const result = findBestMatch('Lace It (feat. Ben Harper)', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe('Lace It');
    expect(result!.method).toBe('exact');
  });

  it('matches with (Live) tag stripped', () => {
    const result = findBestMatch('Blinding Lights (Live at Coachella)', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe('Blinding Lights');
    expect(result!.method).toBe('exact');
  });

  it('matches across accent differences', () => {
    const result = findBestMatch('Cafe del Mar', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe('Café del Mar');
    expect(result!.method).toBe('exact');
  });

  it('matches across punctuation differences (Don\'t vs Dont)', () => {
    const result = findBestMatch('Dont Start Now', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe("Don't Start Now");
    expect(result!.method).toBe('exact');
  });

  it('fuzzy matches minor typos', () => {
    // "Bliding Lights" — one missing letter
    const result = findBestMatch('Bliding Lights', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe('Blinding Lights');
    expect(result!.method).toBe('fuzzy');
    expect(result!.score).toBeGreaterThanOrEqual(0.85);
  });

  it('fuzzy matches minor spelling variation', () => {
    // "Dont Start Nw" vs "Don't Start Now" — one missing letter in a longer title
    const result = findBestMatch('Dont Start Nw', catalog);
    expect(result).not.toBeNull();
    expect(result!.match.title).toBe("Don't Start Now");
    expect(result!.method).toBe('fuzzy');
  });

  it('rejects completely different titles', () => {
    const result = findBestMatch('Watermelon Sugar', catalog);
    expect(result).toBeNull();
  });

  it('rejects partial matches below threshold', () => {
    // "Lights" is too short/different from "Blinding Lights"
    const result = findBestMatch('Lights', catalog);
    expect(result).toBeNull();
  });
});
