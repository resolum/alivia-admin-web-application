import { computed, inject, Injectable, signal } from '@angular/core';
import { Contract } from '../domain/contract.entity';
import { SaveWorkSchedule, WorkSchedule, WorkScheduleFilters, WorkScheduleSummary } from '../domain/work-schedule.entity';
import { HcmApi, HcmApiError } from '../infrastructure/hcm.api';

const EMPTY_SUMMARY: WorkScheduleSummary = { totalSchedules: 0, employeesWithSchedule: 0, averageWeeklyHours: 0 };

@Injectable({ providedIn: 'root' })
export class WorkSchedulesStore {
  private readonly api = inject(HcmApi);
  private readonly schedulesState = signal<WorkSchedule[]>([]);
  private readonly selectedState = signal<WorkSchedule | null>(null);
  private readonly openContractsState = signal<Contract[]>([]);
  private readonly contractSchedulesState = signal<WorkSchedule[]>([]);
  readonly summary = signal<WorkScheduleSummary>(EMPTY_SUMMARY);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<WorkScheduleFilters>({ search: '', role: 'ALL', status: 'ALL', page: 0, size: 8 });
  readonly schedules = this.schedulesState.asReadonly();
  readonly selected = this.selectedState.asReadonly();
  /** Pending or active contracts of the business: a schedule is always configured inside one of them. */
  readonly openContracts = this.openContractsState.asReadonly();
  readonly contractSchedules = this.contractSchedulesState.asReadonly();
  readonly hasActiveFilters = computed(() => {
    const filters = this.filters();
    return filters.search.trim().length > 0 || filters.role !== 'ALL' || filters.status !== 'ALL';
  });

  async loadSchedules(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const [page, summary] = await Promise.all([this.api.listWorkSchedules(this.filters()), this.api.getWorkScheduleSummary()]);
      this.schedulesState.set(page.content); this.totalElements.set(page.totalElements); this.totalPages.set(page.totalPages);
      this.summary.set(summary);
    }
    catch (error) {
      if (error instanceof HcmApiError && error.status === 404) {
        this.schedulesState.set([]); this.totalElements.set(0); this.totalPages.set(0); this.summary.set(EMPTY_SUMMARY);
      } else this.error.set(error instanceof Error ? error.message : 'Ocurrió un error');
    }
    finally { this.loading.set(false); }
  }

  async selectSchedule(employeeId: number, workScheduleId: number): Promise<void> {
    this.error.set(null);
    try { this.selectedState.set(await this.api.getWorkSchedule(employeeId, workScheduleId)); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar el horario'); }
  }

  /** Opens the detail drawer with the row already loaded in the list. */
  showDetail(schedule: WorkSchedule): void { this.selectedState.set(schedule); }
  closeDetail(): void { this.selectedState.set(null); }

  async loadOpenContracts(): Promise<void> {
    try {
      const page = await this.api.listContracts({ search: '', status: 'ALL', modality: 'ALL', page: 0, size: 100 });
      this.openContractsState.set(page.content.filter(contract => contract.status === 'ACTIVE' || contract.status === 'PENDING'));
    }
    catch (error) { this.openContractsState.set([]); this.error.set(error instanceof Error ? error.message : 'No se pudieron consultar los contratos'); }
  }

  async loadContractSchedules(contractId: number): Promise<void> {
    try { this.contractSchedulesState.set(await this.api.listContractWorkSchedules(contractId)); }
    catch { this.contractSchedulesState.set([]); }
  }

  setFilters(filters: Partial<WorkScheduleFilters>): void {
    this.filters.update(current => ({ ...current, ...filters, page: filters.page ?? 0 }));
    void this.loadSchedules();
  }

  clearFilters(): void { this.setFilters({ search: '', role: 'ALL', status: 'ALL' }); }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.filters.update(current => ({ ...current, page }));
    void this.loadSchedules();
  }

  async createSchedule(employeeId: number, contractId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    return this.api.createWorkSchedule(employeeId, contractId, input);
  }
  async updateSchedule(employeeId: number, workScheduleId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    return this.api.updateWorkSchedule(employeeId, workScheduleId, input);
  }
  async deactivateSchedule(employeeId: number, workScheduleId: number): Promise<WorkSchedule> {
    return this.api.deactivateWorkSchedule(employeeId, workScheduleId);
  }
}
