import { environment } from '../../../environments/environment.generated';

// Values come from .env through scripts/generate-env.mjs; .env.example lists them.
export const API_BASE_URL = environment.API_BASE_URL;
export const API_PATHS = {
  signIn: environment.API_AUTH_SIGN_IN_PATH,
  signUp: environment.API_AUTH_SIGN_UP_PATH,
  resendVerification: environment.API_AUTH_RESEND_VERIFICATION_PATH,
  activation: environment.API_AUTH_ACTIVATION_PATH,
  activate: environment.API_AUTH_ACTIVATE_PATH,
  refresh: environment.API_AUTH_REFRESH_PATH,
  logout: environment.API_AUTH_LOGOUT_PATH,
  passwordRecovery: environment.API_AUTH_PASSWORD_RECOVERY_PATH,
  passwordReset: environment.API_AUTH_PASSWORD_RESET_PATH,
  users: environment.API_USERS_PATH,
  employees: environment.API_EMPLOYEES_PATH,
  contracts: environment.API_CONTRACTS_PATH,
  workSchedules: environment.API_WORK_SCHEDULES_PATH,
  staffProfiles: environment.API_STAFF_PROFILES_PATH,
  plans: environment.API_PLANS_PATH,
  hiringRequests: environment.API_HIRING_REQUESTS_PATH,
  technicalOrders: environment.API_TECHNICAL_ORDERS_PATH,
  servicedHomes: environment.API_SERVICED_HOMES_PATH,
} as const;
export const ACCESS_TOKEN_KEY = 'alivia.iam.access-token';
/** Kept next to the access token; in localStorage when the user chose "Recordarme en este equipo". */
export const REFRESH_TOKEN_KEY = 'alivia.iam.refresh-token';
/** Business of the signed-in user, saved at sign-in next to the access token. */
export const BUSINESS_ID_KEY = 'alivia.iam.business-id';
/** Staff profile of the signed-in user (technicians and managers), used to show their name. */
export const PROFILE_ID_KEY = 'alivia.iam.profile-id';

/** The signed-in user's business, or null when the session does not carry one. */
export function currentBusinessId(): number | null {
  if (typeof window === 'undefined') return null;
  const value = Number(window.sessionStorage.getItem(BUSINESS_ID_KEY) ?? window.localStorage.getItem(BUSINESS_ID_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}
