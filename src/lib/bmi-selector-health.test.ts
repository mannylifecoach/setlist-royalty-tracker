import { describe, it, expect } from 'vitest';
import {
  resolveFieldInFixture,
  loadBmiStepFixture,
  runBmiSelectorHealthCheck,
  type FixtureEl,
} from './bmi-selector-health';

describe('resolveFieldInFixture (test infrastructure)', () => {
  const fixture: FixtureEl[] = [
    { t: 'INPUT', tp: 'text', id: 'tbSongSearch', n: '', cls: '', p: '' },
    { t: 'INPUT', tp: 'text', id: 'foo', n: 'myname', cls: '', p: 'placeholder text' },
    { t: 'SELECT', tp: 'select-one', id: 'sel1', n: '', cls: '', lb: ['Band/Performer'] },
    { t: 'SELECT', tp: 'select-one', id: '_time', n: '', cls: '' },
    { t: 'SELECT', tp: 'select-one', id: '_time', n: '', cls: '' },
    { t: 'INPUT', tp: 'date', id: 'd1', n: '', cls: '' },
    { t: 'INPUT', tp: 'date', id: 'd2', n: '', cls: '' },
  ];

  it('resolves by id', () => {
    expect(resolveFieldInFixture({ id: 'tbSongSearch', tag: 'INPUT' }, fixture)?.id).toBe('tbSongSearch');
  });

  it('resolves by id + index when id is repeated', () => {
    const a = resolveFieldInFixture({ id: '_time', tag: 'SELECT', index: 0 }, fixture);
    const b = resolveFieldInFixture({ id: '_time', tag: 'SELECT', index: 1 }, fixture);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it('resolves by name with tag scoping', () => {
    expect(resolveFieldInFixture({ name: 'myname', tag: 'INPUT' }, fixture)?.n).toBe('myname');
    expect(resolveFieldInFixture({ name: 'myname', tag: 'SELECT' }, fixture)).toBeNull();
  });

  it('resolves by label with tag scoping', () => {
    expect(resolveFieldInFixture({ label: 'Band/Performer', tag: 'SELECT' }, fixture)?.id).toBe('sel1');
  });

  it('resolves by placeholder', () => {
    expect(resolveFieldInFixture({ placeholder: 'placeholder text', tag: 'INPUT' }, fixture)?.id).toBe('foo');
  });

  it('falls back to tag + type + index', () => {
    expect(resolveFieldInFixture({ tag: 'INPUT', type: 'date', index: 0 }, fixture)?.id).toBe('d1');
    expect(resolveFieldInFixture({ tag: 'INPUT', type: 'date', index: 1 }, fixture)?.id).toBe('d2');
  });

  it('returns null when no match exists', () => {
    expect(resolveFieldInFixture({ label: 'No Such Label', tag: 'SELECT' }, fixture)).toBeNull();
  });
});

describe('loadBmiStepFixture', () => {
  it('loads step1 fixture from extension/__fixtures__', () => {
    const fixture = loadBmiStepFixture('step1');
    expect(Array.isArray(fixture)).toBe(true);
    expect(fixture.length).toBeGreaterThan(0);
  });

  it('loads step2 fixture from extension/__fixtures__', () => {
    const fixture = loadBmiStepFixture('step2');
    expect(Array.isArray(fixture)).toBe(true);
    expect(fixture.length).toBeGreaterThan(0);
  });
});

describe('runBmiSelectorHealthCheck (end-to-end against real fixtures)', () => {
  it('returns healthy when all FIELD_MAP entries resolve', () => {
    const result = runBmiSelectorHealthCheck();
    expect(result.status).toBe('healthy');
    expect(result.failures).toEqual([]);
    expect(result.resolvedFields).toBe(result.totalFields);
  });

  it('reports total field count + checked-at timestamp', () => {
    const result = runBmiSelectorHealthCheck();
    expect(result.totalFields).toBeGreaterThan(10);
    expect(result.fixtureCapturedDate).toBe('2026-04-24');
    expect(() => new Date(result.checkedAt)).not.toThrow();
  });
});
