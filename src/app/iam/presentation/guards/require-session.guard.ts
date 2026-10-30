import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from '../../application/iam.store';

/** Sends visitors without a valid session to the sign-in page. */
export const requireSession: CanActivateFn = (_route, state) => {
  if (inject(IamStore).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** The administration portal is not for technicians or subscription managers: they go to their own. */
export const requireAdministration: CanActivateFn = () => {
  const iam = inject(IamStore);
  return iam.isTechnician() || iam.isSubscriptionManager() ? inject(Router).parseUrl(iam.homeUrl()) : true;
};

/** The technician portal is only for field technicians. */
export const requireTechnician: CanActivateFn = () => {
  const iam = inject(IamStore);
  return iam.isTechnician() ? true : inject(Router).parseUrl(iam.homeUrl());
};

/** The commercial portal is only for subscription managers. */
export const requireSubscriptionManager: CanActivateFn = () => {
  const iam = inject(IamStore);
  return iam.isSubscriptionManager() ? true : inject(Router).parseUrl(iam.homeUrl());
};
