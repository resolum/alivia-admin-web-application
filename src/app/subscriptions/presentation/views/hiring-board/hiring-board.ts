import { Component, inject, OnInit } from '@angular/core';
import { HiringStore } from '../../../application/hiring.store';
import { HIRING_STAGES, HiringRequest, HiringStage, holdExpiresInDays, paymentState, timeAgo } from '../../../domain/hiring-request.entity';
import { formatAmount } from '../../../domain/plan.entity';

/** Board that follows each hiring from the plan choice to the active service. */
@Component({ selector: 'app-hiring-board', templateUrl: './hiring-board.html', styleUrl: './hiring-board.css' })
export class HiringBoard implements OnInit {
  protected readonly store = inject(HiringStore);
  protected readonly stages = HIRING_STAGES;
  protected readonly state = paymentState; protected readonly timeAgo = timeAgo; protected readonly expiresIn = holdExpiresInDays;
  ngOnInit(): void { void this.store.load(); }

  protected search(event: Event): void { this.store.setFilters({ search: (event.target as HTMLInputElement).value }); }
  protected stage(event: Event): void { this.store.setFilters({ stage: (event.target as HTMLSelectElement).value as HiringStage | 'ALL' }); }
  protected attention(event: Event): void { this.store.setFilters({ attention: (event.target as HTMLSelectElement).value as 'ALL' | 'ONLY' }); }

  /** "Plan Base" -> "Base" for the small badge. */
  protected planBadge(request: HiringRequest): string { return request.planName.replace(/^Plan\s+/i, ''); }
  protected held(request: HiringRequest): string | null {
    return request.paymentStatus === 'PREAUTHORIZED' && request.heldAmount !== null ? `Retenido ${formatAmount(request.heldAmount, request.currency)}` : null;
  }
  protected plural(count: number, one: string, many: string): string { return `${count} ${count === 1 ? one : many}`; }
}
