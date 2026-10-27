import { computed, inject, Injectable, signal } from '@angular/core';
import { Contract, ContractFilters, CreateContract, EmployeeOption, UpdateContract } from '../domain/contract.entity';
import { HcmApi, HcmApiError } from '../infrastructure/hcm.api';

@Injectable({ providedIn: 'root' })
export class HcmStore {
  private readonly api = inject(HcmApi);
  private readonly contractsState = signal<Contract[]>([]);
  private readonly selectedState = signal<Contract | null>(null);
  private readonly employeesState = signal<EmployeeOption[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<ContractFilters>({ search: '', status: 'ALL', modality: 'ALL', page: 0, size: 10 });
  readonly contracts = this.contractsState.asReadonly();
  readonly selected = this.selectedState.asReadonly();
  readonly employees = this.employeesState.asReadonly();
  readonly hasActiveFilters = computed(() => {
    const filters = this.filters();
    return filters.search.trim().length > 0 || filters.status !== 'ALL' || filters.modality !== 'ALL';
  });
  readonly summary = computed(() => {
    const contracts = this.contractsState();
    return {
      total: this.totalElements(),
      active: contracts.filter(item => item.status === 'ACTIVE').length,
      pending: contracts.filter(item => item.status === 'PENDING').length,
      expired: contracts.filter(item => item.status === 'EXPIRED').length,
    };
  });

  async loadContracts(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const page = await this.api.listContracts(this.filters());
      this.contractsState.set(page.content); this.totalElements.set(page.totalElements); this.totalPages.set(page.totalPages);
    }
    catch (error) {
      if (error instanceof HcmApiError && error.status === 404) {
        this.contractsState.set([]); this.totalElements.set(0); this.totalPages.set(0);
      } else this.error.set(error instanceof Error ? error.message : 'Ocurrió un error');
    }
    finally { this.loading.set(false); }
  }

  async selectContract(employeeId: number, contractId: number): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.selectedState.set(await this.api.getContract(employeeId, contractId)); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar el contrato'); }
    finally { this.loading.set(false); }
  }

  async loadEmployees(): Promise<void> {
    try { this.employeesState.set(await this.api.listEmployees()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudieron consultar los empleados'); }
  }

  setFilters(filters: Partial<ContractFilters>): void {
    this.filters.update(current => ({ ...current, ...filters, page: filters.page ?? 0 }));
    void this.loadContracts();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.filters.update(current => ({ ...current, page }));
    void this.loadContracts();
  }

  async saveContract(input: CreateContract): Promise<Contract> { return this.api.createContract(input); }
  async updateContract(employeeId: number, contractId: number, input: UpdateContract): Promise<Contract> {
    return this.api.updateContract(employeeId, contractId, input);
  }
}
