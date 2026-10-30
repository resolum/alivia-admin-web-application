import { inject, Injectable } from '@angular/core';
import { API_PATHS } from '../../shared/infrastructure/api.config';
import { Contract, ContractFilters, ContractPage, CreateContract, EmployeeOption, UpdateContract } from '../domain/contract.entity';
import { EmployeesApi } from './employees.api';
import { HcmHttpClient } from './hcm-http.client';

type ContractResponse = Omit<Contract, 'employeeName'>;

@Injectable({ providedIn: 'root' })
export class ContractsApi {
  private readonly http = inject(HcmHttpClient);
  private readonly employees = inject(EmployeesApi);

  async listContracts(filters: ContractFilters): Promise<ContractPage> {
    const params = this.http.params({ page: String(filters.page), size: String(filters.size), sort: 'id,desc' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.modality !== 'ALL') params.set('modality', filters.modality);
    const [page, employees] = await Promise.all([
      this.http.request<Omit<ContractPage, 'content'> & { content: ContractResponse[] }>(this.http.url(API_PATHS.contracts, params)),
      this.employees.listEmployees(),
    ]);
    return { ...page, content: page.content.map(contract => withEmployeeName(contract, employees)) };
  }

  async getContract(employeeId: number, contractId: number): Promise<Contract> {
    const [contract, employees] = await Promise.all([
      this.http.request<ContractResponse>(this.http.url(contractPath(employeeId, contractId), this.http.params())),
      this.employees.listEmployees(),
    ]);
    return withEmployeeName(contract, employees);
  }

  async createContract(input: CreateContract): Promise<Contract> {
    const { employeeId, ...body } = input;
    const contract = await this.http.request<ContractResponse>(this.http.url(contractPath(employeeId)), {
      method: 'POST', body: JSON.stringify(this.http.withBusiness(body)),
    });
    return withEmployeeName(contract, []);
  }

  async updateContract(employeeId: number, contractId: number, input: UpdateContract): Promise<Contract> {
    const contract = await this.http.request<ContractResponse>(this.http.url(contractPath(employeeId, contractId), this.http.params()), {
      method: 'PATCH', body: JSON.stringify(input),
    });
    return withEmployeeName(contract, []);
  }

  /** Puts a pending contract into force. */
  async activateContract(employeeId: number, contractId: number): Promise<Contract> {
    const contract = await this.http.request<ContractResponse>(this.http.url(`${contractPath(employeeId, contractId)}/activation`, this.http.params()), {
      method: 'POST',
    });
    return withEmployeeName(contract, []);
  }
}

/** `/employees/{employeeId}/contracts[/{contractId}]` */
export function contractPath(employeeId: number, contractId?: number): string {
  const path = `${API_PATHS.employees}/${employeeId}${API_PATHS.contracts}`;
  return contractId === undefined ? path : `${path}/${contractId}`;
}

function withEmployeeName(contract: ContractResponse, employees: EmployeeOption[]): Contract {
  const employee = employees.find(item => item.id === contract.employeeId);
  return { ...contract, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : `Empleado #${contract.employeeId}` };
}
