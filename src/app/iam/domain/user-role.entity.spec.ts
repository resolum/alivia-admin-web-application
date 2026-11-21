import { capabilitiesOf, incompatibility } from './user-role.entity';

describe('user roles', () => {
  it('gives a single role only its own capabilities', () => {
    expect(capabilitiesOf(['CLEANING']).map(capability => capability.code)).toEqual(['OWN_SCHEDULE']);
    expect(capabilitiesOf([])).toEqual([]);
  });

  it('combines compatible roles without repeating a capability', () => {
    const granted = capabilitiesOf(['ADMIN', 'SUBSCRIPTION_MANAGER']);
    const codes = granted.map(capability => capability.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(granted.find(capability => capability.code === 'MANAGE_PLANS')?.grantedBy).toEqual(['ADMIN', 'SUBSCRIPTION_MANAGER']);
  });

  it('keeps the capabilities of the other roles when one is withdrawn', () => {
    const before = capabilitiesOf(['RELATIVE', 'CAREGIVER']).map(capability => capability.code);
    const after = capabilitiesOf(['CAREGIVER']).map(capability => capability.code);
    expect(after).toEqual(expect.arrayContaining(['CARE_AGENDA', 'MEDICATION', 'INCIDENTS']));
    expect(after).not.toContain('MANAGE_HOUSEHOLD');
    expect(before).toContain('MANAGE_HOUSEHOLD');
  });

  it('explains incompatible combinations in both directions', () => {
    expect(incompatibility(['TECH'], 'SUBSCRIPTION_MANAGER')).toContain('no puede aprobar su suscripción');
    expect(incompatibility(['SUBSCRIPTION_MANAGER'], 'TECH')).toContain('Técnico o instalador no es compatible');
    expect(incompatibility(['RELATIVE'], 'ADMIN')).toContain('accesos separados');
    expect(incompatibility(['RELATIVE'], 'CAREGIVER')).toBeNull();
    expect(incompatibility(['ADMIN'], 'TECH')).toBeNull();
  });
});
