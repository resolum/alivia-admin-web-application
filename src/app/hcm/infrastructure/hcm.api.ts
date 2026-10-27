import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, CURRENT_BUSINESS_ID } from '../../shared/infrastructure/api.config';
import { Contract, ContractFilters, ContractPage, CreateContract, EmployeeOption, UpdateContract } from '../domain/contract.entity';

interface EmployeePageResponse { content: EmployeeOption[]; }
interface ContractResponse extends Omit<Contract, 'employeeName'> {}

export class HcmApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'HcmApiError'; }
}

@Injectable({ providedIn: 'root' })
export class HcmApi {
  async listContracts(filters: ContractFilters): Promise<ContractPage> {
    const params = new URLSearchParams({ businessId: String(CURRENT_BUSINESS_ID), page: String(filters.page), size: String(filters.size), sort: 'id,desc' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.modality !== 'ALL') params.set('modality', filters.modality);
    const [page, employees] = await Promise.all([
      this.request<Omit<ContractPage, 'content'> & { content: ContractResponse[] }>(`${API_BASE_URL}/contracts?${params}`),
      this.listEmployees(),
    ]);
    const employeeNames = new Map(employees.map(employee => [employee.id, `${employee.firstName} ${employee.lastName}`]));
    return { ...page, content: page.content.map(contract => ({ ...contract, employeeName: employeeNames.get(contract.employeeId) ?? `Empleado #${contract.employeeId}` })) };
  }

  async listEmployees(): Promise<EmployeeOption[]> {
    const params = new URLSearchParams({ businessId: String(CURRENT_BUSINESS_ID), status: 'ACTIVE', page: '0', size: '100', sort: 'lastName,asc' });
    return (await this.request<EmployeePageResponse>(`${API_BASE_URL}/employees?${params}`)).content;
  }

  async getContract(employeeId: number, contractId: number): Promise<Contract> {
    const params = new URLSearchParams({ businessId: String(CURRENT_BUSINESS_ID) });
    const [contract, employees] = await Promise.all([
      this.request<ContractResponse>(`${API_BASE_URL}/employees/${employeeId}/contracts/${contractId}?${params}`),
      this.listEmployees(),
    ]);
    const employee = employees.find(item => item.id === contract.employeeId);
    return { ...contract, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : `Empleado #${contract.employeeId}` };
  }

  async createContract(input: CreateContract): Promise<Contract> {
    const { employeeId, ...body } = input;
    const contract = await this.request<ContractResponse>(`${API_BASE_URL}/employees/${employeeId}/contracts`, {
      method: 'POST', body: JSON.stringify(body),
    });
    return { ...contract, employeeName: `Empleado #${contract.employeeId}` };
  }

  async updateContract(employeeId: number, contractId: number, input: UpdateContract): Promise<Contract> {
    const params = new URLSearchParams({ businessId: String(CURRENT_BUSINESS_ID) });
    const contract = await this.request<ContractResponse>(`${API_BASE_URL}/employees/${employeeId}/contracts/${contractId}?${params}`, {
      method: 'PATCH', body: JSON.stringify(input),
    });
    return { ...contract, employeeName: `Empleado #${contract.employeeId}` };
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    const token = this.accessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { ...init, headers }); }
    catch { throw new HcmApiError('No se pudo conectar con el servicio de capital humano.', 0); }
    if (!response.ok) throw new HcmApiError(await this.errorMessage(response), response.status);
    return await response.json() as T;
  }

  private accessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private async errorMessage(response: Response): Promise<string> {
    if (response.status === 401) return 'Debes iniciar sesión para consultar los contratos.';
    if (response.status === 403) return 'Tu usuario no tiene permiso para gestionar contratos.';
    if (response.status === 404) return 'El servicio de contratos no está disponible en el backend actual.';
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('json')) {
      const problem = await response.json() as { detail?: string; message?: string; title?: string };
      return problem.detail ?? problem.message ?? problem.title ?? 'No se pudo completar la solicitud.';
    }
    return `No se pudo completar la solicitud al backend (${response.status}).`;
  }
}
