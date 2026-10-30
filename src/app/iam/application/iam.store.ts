import { inject, Injectable } from '@angular/core';
import { AccountActivation, emailOf, isTokenAlive, roleOf, SignInCommand, SUBSCRIPTION_MANAGER_ROLE, TECHNICIAN_ROLE } from '../domain/sign-in.command';
import { IamApi } from '../infrastructure/iam.api';

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);
  isAuthenticated(): boolean { return isTokenAlive(this.api.accessToken()); }
  isTechnician(): boolean { return roleOf(this.api.accessToken()) === TECHNICIAN_ROLE; }
  isSubscriptionManager(): boolean { return roleOf(this.api.accessToken()) === SUBSCRIPTION_MANAGER_ROLE; }
  /** Email of the signed-in user, shown in the portal sidebar. */
  currentEmail(): string | null { return emailOf(this.api.accessToken()); }
  /** Where a signed-in user lands: each staff role in its portal, administrators in the general one. */
  homeUrl(): string {
    if (this.isTechnician()) return '/technician/home';
    if (this.isSubscriptionManager()) return '/commercial/home';
    return '/hcm/contracts';
  }
  /** Name shown in the sidebar; null when the account has no staff profile (the administrator). */
  staffName(): Promise<string | null> { return this.api.staffName(); }
  signIn(command: SignInCommand): Promise<void> { return this.api.signIn(command); }
  signOut(): void { this.api.signOut(); }
  getActivation(token: string): Promise<AccountActivation> { return this.api.getActivation(token); }
  activate(token: string, password: string): Promise<void> { return this.api.activate(token, password); }
}
