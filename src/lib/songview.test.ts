import { describe, it, expect } from 'vitest';
import { songviewSearchUrl } from './songview';

describe('songviewSearchUrl', () => {
  it('builds an ISWC search URL when ISWC is provided', () => {
    const url = songviewSearchUrl('T-123456789-0', 'Midnight Bass');
    expect(url).toContain('Main_Search_Text=T-123456789-0');
    expect(url).toContain('Main_Search=ISWC');
    expect(url).toContain('Search_Type=all');
  });

  it('falls back to title search when ISWC is null', () => {
    const url = songviewSearchUrl(null, 'Midnight Bass');
    expect(url).toContain('Main_Search_Text=Midnight%20Bass');
    expect(url).toContain('Main_Search=Title');
  });

  it('url-encodes special characters in titles', () => {
    const url = songviewSearchUrl(null, 'Song (Remix) & More');
    expect(url).toContain('Song%20(Remix)%20%26%20More');
  });

  it('handles empty title gracefully', () => {
    const url = songviewSearchUrl(null, '');
    expect(url).toContain('Main_Search_Text=');
    expect(url).toContain('Main_Search=Title');
  });

  it('prefers ISWC over title when both are available', () => {
    const url = songviewSearchUrl('T-123456789-0', 'Midnight Bass');
    expect(url).toContain('Main_Search=ISWC');
    expect(url).not.toContain('Main_Search=Title');
  });

  it('uses the BMI repertoire endpoint', () => {
    const url = songviewSearchUrl(null, 'test');
    expect(url).toMatch(/^https:\/\/repertoire\.bmi\.com\/Search\/Search/);
  });
});
