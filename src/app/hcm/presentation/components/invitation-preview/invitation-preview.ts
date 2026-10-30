import { Component, input } from '@angular/core';

/**
 * Reference preview of the invitation email. The real email is the "account-invitation" template
 * of the backend's Communications context; keep both texts in step.
 */
@Component({ selector: 'app-invitation-preview', templateUrl: './invitation-preview.html', styleUrl: './invitation-preview.css' })
export class InvitationPreview {
  readonly fullName = input('');
  readonly roleLabel = input('');
  readonly email = input('');
  readonly expirationHours = input(48);
}
