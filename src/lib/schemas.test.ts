import { describe, it, expect } from 'vitest';
import { onboardingSchema, updateSettingsSchema } from './schemas';

describe('onboardingSchema', () => {
  const validInput = {
    firstName: 'Manny',
    lastName: 'Alboroto',
    country: 'US',
    city: 'Honolulu',
    stageName: 'Fred Again..',
    pro: 'bmi' as const,
    capabilities: ['write', 'perform'] as const,
    referralSource: 'friend or referral',
  };

  it('accepts a fully-filled valid submission', () => {
    const result = onboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Manny');
      expect(result.data.capabilities).toEqual(['write', 'perform']);
    }
  });

  it('accepts submission with only required fields', () => {
    const minimal = {
      firstName: 'Jane',
      lastName: 'Doe',
      country: 'US',
      stageName: 'Jane Doe',
      capabilities: ['dj' as const],
    };
    const result = onboardingSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects submission with no capabilities', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      capabilities: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects submission with invalid capability value', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      capabilities: ['write', 'not-a-real-capability'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects submission with missing first name', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects submission with missing stage name', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      stageName: '',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace on names', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      firstName: '  Manny  ',
      lastName: '  Alboroto  ',
      stageName: '  Fred Again..  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Manny');
      expect(result.data.lastName).toBe('Alboroto');
      expect(result.data.stageName).toBe('Fred Again..');
    }
  });

  it('allows null city', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      city: null,
    });
    expect(result.success).toBe(true);
  });

  it('allows missing pro (not yet registered)', () => {
    const { pro: _pro, ...withoutPro } = validInput;
    void _pro;
    const result = onboardingSchema.safeParse(withoutPro);
    expect(result.success).toBe(true);
  });

  it('accepts international PROs', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      country: 'GB',
      pro: 'prs',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all five capability values', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      capabilities: ['write', 'perform', 'dj', 'produce', 'publish'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects submission with empty string country', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      country: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateSettingsSchema', () => {
  it('accepts partial updates', () => {
    const result = updateSettingsSchema.safeParse({ firstName: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts capabilities update', () => {
    const result = updateSettingsSchema.safeParse({
      capabilities: ['dj', 'produce'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update object', () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('allows international pro update', () => {
    const result = updateSettingsSchema.safeParse({ pro: 'socan' });
    expect(result.success).toBe(true);
  });
});
