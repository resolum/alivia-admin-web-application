import { inject, Injectable } from '@angular/core';
import { AccountActivation, isTokenAlive, roleOf, SignInCommand, TECHNICIAN_ROLE } from '../domain/sign-in.command';
import { IamApi } from '../infrastructure/iam.api';

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);
  isAuthenticated(): boolean { return isTokenAlive(this.api.accessToken()); }
  isTechnician(): boolean { return roleOf(this.api.accessToken()) === TECHNICIAN_ROLE; }
  /** Where a signed-in user lands: technicians in their portal, everyone else in the administration. */
  homeUrl(): string { return this.isTechnician() ? '/technician/my-day' : '/hcm/contracts'; }
  signIn(command: SignInCommand): Promise<void> { return this.api.signIn(command); }
  signOut(): void { this.api.signOut(); }
  getActivation(token: string): Promise<AccountActivation> { return this.api.getActivation(token); }
  activate(token: string, password: string): Promise<void> { return this.api.activate(token, password); }
}
