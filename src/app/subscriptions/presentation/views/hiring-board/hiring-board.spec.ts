import { TestBed } from '@angular/core/testing';
import { HiringStore } from '../../../application/hiring.store';
import { hiringRequest } from '../../../domain/hiring-request.entity.spec';
import { HiringRequestsApi } from '../../../infrastructure/hiring-requests.api';
import { HiringBoard } from './hiring-board';

describe('HiringBoard', () => {
  it('places the requests in their stage and filters them', async () => {
    const api = { listHiringRequests: vi.fn().mockResolvedValue([
      hiringRequest(),
      hiringRequest({ id: 'd2', code: 'SOL-00000205', paymentStatus: 'PAYMENT_REJECTED', heldAmount: null }),
    ]) };
    TestBed.configureTestingModule({ providers: [{ provide: HiringRequestsApi, useValue: api }] });
    const fixture = TestBed.createComponent(HiringBoard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(HiringStore);

    expect(element.querySelectorAll('.column')).toHaveLength(4);
    expect(element.querySelectorAll('.column')[0]!.querySelectorAll('.request')).toHaveLength(2);
    expect(element.textContent).toContain('Retenido S/ 99');
    expect(store.summary()).toEqual({ newRequests: 2, preauthorized: 1, attention: 1 });

    const select = element.querySelectorAll('select')[1]!;
    select.value = 'ONLY'; select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(store.filtered().map(request => request.id)).toEqual(['d2']);
    element.querySelector<HTMLButtonElement>('.link')!.click();
    const search = element.querySelector('input')!;
    search.value = 'zzz'; search.dispatchEvent(new Event('input'));
    const stage = element.querySelectorAll('select')[0]!;
    stage.value = 'INSTALLATION'; stage.dispatchEvent(new Event('change'));
    expect(store.filtered()).toHaveLength(0);
  });

  it('reports a list that cannot be loaded', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: HiringRequestsApi, useValue: { listHiringRequests: vi.fn().mockRejectedValue(new Error('caído')) } }] });
    const store = TestBed.inject(HiringStore);
    await store.load();
    expect(store.error()).toBe('caído');
  });
});
