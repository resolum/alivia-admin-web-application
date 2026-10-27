import { inject, Injectable } from '@angular/core';
import { AccountActivation, isTokenAlive, SignInCommand } from '../domain/sign-in.command';
import { IamApi } from '../infrastructure/iam.api';

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);
  isAuthenticated(): boolean { return isTokenAlive(this.api.accessToken()); }
  signIn(command: SignInCommand): Promise<void> { return this.api.signIn(command); }
  signOut(): void { this.api.signOut(); }
  getActivation(token: string): Promise<AccountActivation> { return this.api.getActivation(token); }
  activate(token: string, password: string): Promise<void> { return this.api.activate(token, password); }
}
