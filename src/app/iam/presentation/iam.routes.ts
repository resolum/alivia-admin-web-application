import { Routes } from '@angular/router';
import { ActivateAccount } from './views/activate-account/activate-account';
import { SignIn } from './views/sign-in/sign-in';

export const IAM_ROUTES: Routes = [{ path: '', component: SignIn }];
export const ACTIVATION_ROUTES: Routes = [{ path: '', component: ActivateAccount }];
