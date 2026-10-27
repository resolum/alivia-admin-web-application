import { inject, Injectable } from '@angular/core';
import { isTokenAlive, SignInCommand } from '../domain/sign-in.command';
import { IamApi } from '../infrastructure/iam.api';

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);
  isAuthenticated(): boolean { return isTokenAlive(this.api.accessToken()); }
  signIn(command: SignInCommand): Promise<void> { return this.api.signIn(command); }
  signOut(): void { this.api.signOut(); }
}
