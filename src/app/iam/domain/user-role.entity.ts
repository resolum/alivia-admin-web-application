/** Responsibilities an administrator can grant from the business portal (US-17). */
export type UserRole = 'ADMIN' | 'TECH' | 'SUBSCRIPTION_MANAGER' | 'CLEANING' | 'RELATIVE' | 'CAREGIVER';
export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';

export interface UserAccount { id: string; email: string; fullName: string; status: UserStatus; roles: UserRole[]; }

export interface Capability { code: string; label: string; }
export interface GrantedCapability extends Capability { grantedBy: UserRole[]; }

const CAPABILITIES = {
  manageStaff: { code: 'MANAGE_STAFF', label: 'Gestionar empleados, contratos y horarios' },
  manageRoles: { code: 'MANAGE_ROLES', label: 'Asignar y retirar responsabilidades' },
  managePlans: { code: 'MANAGE_PLANS', label: 'Gestionar planes y suscripciones' },
  reviewHiring: { code: 'REVIEW_HIRING', label: 'Revisar contrataciones de hogares' },
  viewHouseholds: { code: 'VIEW_HOUSEHOLDS', label: 'Consultar hogares y sus miembros' },
  viewMetrics: { code: 'VIEW_METRICS', label: 'Consultar métricas del negocio' },
  technicalOrders: { code: 'TECHNICAL_ORDERS', label: 'Atender órdenes de evaluación e instalación' },
  maintainDevices: { code: 'MAINTAIN_DEVICES', label: 'Instalar y mantener dispositivos' },
  ownSchedule: { code: 'OWN_SCHEDULE', label: 'Consultar su horario laboral' },
  manageHousehold: { code: 'MANAGE_HOUSEHOLD', label: 'Gestionar la suscripción de su hogar' },
  careAgenda: { code: 'CARE_AGENDA', label: 'Consultar la agenda de cuidado' },
  medication: { code: 'MEDICATION', label: 'Registrar la administración de medicamentos' },
  incidents: { code: 'INCIDENTS', label: 'Reportar incidencias de dispositivos' },
} satisfies Record<string, Capability>;

export const ROLE_CATALOG: Record<UserRole, { label: string; scope: 'Negocio' | 'Hogar'; capabilities: Capability[] }> = {
  ADMIN: { label: 'Administrador del negocio', scope: 'Negocio', capabilities: [CAPABILITIES.manageStaff, CAPABILITIES.manageRoles, CAPABILITIES.managePlans, CAPABILITIES.viewHouseholds, CAPABILITIES.viewMetrics] },
  TECH: { label: 'Técnico o instalador', scope: 'Negocio', capabilities: [CAPABILITIES.technicalOrders, CAPABILITIES.maintainDevices, CAPABILITIES.viewHouseholds, CAPABILITIES.ownSchedule] },
  SUBSCRIPTION_MANAGER: { label: 'Responsable de planes y suscripciones', scope: 'Negocio', capabilities: [CAPABILITIES.managePlans, CAPABILITIES.reviewHiring, CAPABILITIES.viewHouseholds, CAPABILITIES.ownSchedule] },
  CLEANING: { label: 'Personal de limpieza', scope: 'Negocio', capabilities: [CAPABILITIES.ownSchedule] },
  RELATIVE: { label: 'Cliente responsable (familiar)', scope: 'Hogar', capabilities: [CAPABILITIES.manageHousehold, CAPABILITIES.careAgenda, CAPABILITIES.incidents] },
  CAREGIVER: { label: 'Cuidador', scope: 'Hogar', capabilities: [CAPABILITIES.careAgenda, CAPABILITIES.medication, CAPABILITIES.incidents] },
};

export const USER_ROLES = Object.keys(ROLE_CATALOG) as UserRole[];

export const userStatusLabel: Record<UserStatus, string> = { ACTIVE: 'Activa', PENDING_VERIFICATION: 'Pendiente de validación', SUSPENDED: 'Suspendida' };

const HOUSEHOLD_REASON = 'El personal del negocio y los clientes de un hogar usan accesos separados.';
// shortcut: the backend owns these rules and answers 409 on its own; this copy only explains the rejection before the request.
const INCOMPATIBLE: [UserRole, UserRole, string][] = [
  ['TECH', 'SUBSCRIPTION_MANAGER', 'Quien evalúa e instala en un hogar no puede aprobar su suscripción.'],
  ...(['ADMIN', 'TECH', 'SUBSCRIPTION_MANAGER', 'CLEANING'] as const).flatMap(staff =>
    (['RELATIVE', 'CAREGIVER'] as const).map(household => [staff, household, HOUSEHOLD_REASON] as [UserRole, UserRole, string])),
];

/** Why `adding` cannot join `current`, or null when the combination is allowed. */
export function incompatibility(current: readonly UserRole[], adding: UserRole): string | null {
  for (const [a, b, reason] of INCOMPATIBLE) {
    const other = a === adding ? b : b === adding ? a : null;
    if (other && current.includes(other)) return `${ROLE_CATALOG[adding].label} no es compatible con ${ROLE_CATALOG[other].label}. ${reason}`;
  }
  return null;
}

/** Union of the capabilities of every role, each listed once with the roles that grant it. */
export function capabilitiesOf(roles: readonly UserRole[]): GrantedCapability[] {
  const granted = new Map<string, GrantedCapability>();
  for (const role of USER_ROLES.filter(item => roles.includes(item))) {
    for (const capability of ROLE_CATALOG[role].capabilities) {
      const entry = granted.get(capability.code) ?? { ...capability, grantedBy: [] };
      entry.grantedBy.push(role);
      granted.set(capability.code, entry);
    }
  }
  return [...granted.values()];
}
