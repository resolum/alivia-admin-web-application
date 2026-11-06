import { Routes } from '@angular/router';
import { guestOnly } from './guards/require-session.guard';
import { AccessDenied } from './views/access-denied/access-denied';
import { ActivateAccount } from './views/activate-account/activate-account';
import { ForgotPassword } from './views/forgot-password/forgot-password';
import { SignIn } from './views/sign-in/sign-in';
import { SignUp } from './views/sign-up/sign-up';
import { UserRoles } from './views/user-roles/user-roles';

export const IAM_ROUTES: Routes = [{ path: '', component: SignIn, canActivate: [guestOnly] }];
export const SIGN_UP_ROUTES: Routes = [{ path: '', component: SignUp, canActivate: [guestOnly] }];
export const ACCESS_DENIED_ROUTES: Routes = [{ path: '', component: AccessDenied }];
export const ACTIVATION_ROUTES: Routes = [{ path: '', component: ActivateAccount }];
export const FORGOT_PASSWORD_ROUTES: Routes = [{ path: '', component: ForgotPassword }];
/** Same page as the activation, fed by the password recovery link. */
export const RESET_PASSWORD_ROUTES: Routes = [{ path: '', component: ActivateAccount, data: { mode: 'reset' } }];
/** Inside the administration shell. */
export const USER_ROLES_ROUTES: Routes = [{ path: '', component: UserRoles, data: { breadcrumb: [{ label: 'Configuración' }, { label: 'Usuarios y responsabilidades' }] } }];
