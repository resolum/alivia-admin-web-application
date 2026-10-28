import { environment } from '../../../environments/environment.generated';

// Values come from .env through scripts/generate-env.mjs; .env.example lists them.
export const API_BASE_URL = environment.API_BASE_URL;
export const API_PATHS = {
  signIn: environment.API_AUTH_SIGN_IN_PATH,
  activation: environment.API_AUTH_ACTIVATION_PATH,
  activate: environment.API_AUTH_ACTIVATE_PATH,
  employees: environment.API_EMPLOYEES_PATH,
  contracts: environment.API_CONTRACTS_PATH,
  workSchedules: environment.API_WORK_SCHEDULES_PATH,
} as const;
export const ACCESS_TOKEN_KEY = 'alivia.iam.access-token';
/** Business of the signed-in user, saved at sign-in next to the access token. */
export const BUSINESS_ID_KEY = 'alivia.iam.business-id';

/** The signed-in user's business, or null when the session does not carry one. */
export function currentBusinessId(): number | null {
  if (typeof window === 'undefined') return null;
  const value = Number(window.sessionStorage.getItem(BUSINESS_ID_KEY) ?? window.localStorage.getItem(BUSINESS_ID_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}
