import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from '../../application/iam.store';

/** Sends visitors without a valid session to the sign-in page. */
export const requireSession: CanActivateFn = (_route, state) => {
  if (inject(IamStore).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
