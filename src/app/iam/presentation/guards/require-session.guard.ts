import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from '../../application/iam.store';

/** Sends visitors without a valid (or renewable) session to the sign-in page. */
export const requireSession: CanActivateFn = async (_route, state) => {
  const iam = inject(IamStore); const router = inject(Router);
  if (await iam.ensureSession()) return true;
  return router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** A signed-in user who opens the sign-in page goes straight to their portal. */
export const guestOnly: CanActivateFn = () => {
  const iam = inject(IamStore);
  return iam.isAuthenticated() ? inject(Router).parseUrl(iam.homeUrl()) : true;
};

/** The administration portal is only for business administrators; other staff go to their own portal or are denied. */
export const requireAdministration: CanActivateFn = () => {
  const iam = inject(IamStore);
  return iam.isAdministrator() ? true : inject(Router).parseUrl(iam.homeUrl());
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
