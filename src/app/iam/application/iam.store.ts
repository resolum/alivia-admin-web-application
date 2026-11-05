import { inject, Injectable } from '@angular/core';
import { ADMINISTRATOR_ROLES, AccountActivation, emailOf, PasswordReset, isTokenAlive, roleOf, SignInCommand, SignUpCommand, SUBSCRIPTION_MANAGER_ROLE, TECHNICIAN_ROLE } from '../domain/sign-in.command';
import { IamApi } from '../infrastructure/iam.api';

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);
  isAuthenticated(): boolean { return isTokenAlive(this.api.accessToken()); }
  /** True with a live access token, or after renewing an expired one with the refresh token. */
  async ensureSession(): Promise<boolean> { return this.isAuthenticated() || (await this.api.refresh() && this.isAuthenticated()); }
  isTechnician(): boolean { return roleOf(this.api.accessToken()) === TECHNICIAN_ROLE; }
  isSubscriptionManager(): boolean { return roleOf(this.api.accessToken()) === SUBSCRIPTION_MANAGER_ROLE; }
  isAdministrator(): boolean { return ADMINISTRATOR_ROLES.includes(roleOf(this.api.accessToken()) ?? ''); }
  /** Email of the signed-in user, shown in the portal sidebar. */
  currentEmail(): string | null { return emailOf(this.api.accessToken()); }
  /** Where a signed-in user lands: each staff role in its portal; a role with no portal is denied. */
  homeUrl(): string {
    if (this.isTechnician()) return '/technician/home';
    if (this.isSubscriptionManager()) return '/commercial/home';
    if (this.isAdministrator()) return '/hcm/contracts';
    return '/access-denied';
  }
  /** Name shown in the sidebar; null when the account has no staff profile (the administrator). */
  staffName(): Promise<string | null> { return this.api.staffName(); }
  signIn(command: SignInCommand, remember = false): Promise<void> { return this.api.signIn(command, remember); }
  signUp(command: SignUpCommand): Promise<string> { return this.api.signUp(command); }
  resendVerification(email: string): Promise<void> { return this.api.resendVerification(email); }
  signOut(): void { this.api.signOut(); }
  getActivation(token: string): Promise<AccountActivation> { return this.api.getActivation(token); }
  activate(token: string, password: string): Promise<void> { return this.api.activate(token, password); }
  requestPasswordRecovery(email: string): Promise<void> { return this.api.requestPasswordRecovery(email); }
  getPasswordReset(token: string): Promise<PasswordReset> { return this.api.getPasswordReset(token); }
  resetPassword(token: string, password: string): Promise<void> { return this.api.resetPassword(token, password); }
}
