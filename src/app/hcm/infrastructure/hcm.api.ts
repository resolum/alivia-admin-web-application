import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS, currentBusinessId } from '../../shared/infrastructure/api.config';
import { Contract, ContractFilters, ContractPage, CreateContract, EmployeeOption, UpdateContract } from '../domain/contract.entity';
import { SaveWorkSchedule, WorkSchedule, WorkScheduleFilters, WorkSchedulePage, WorkScheduleSummary } from '../domain/work-schedule.entity';

interface EmployeePageResponse { content: EmployeeOption[]; }
interface ContractResponse extends Omit<Contract, 'employeeName'> {}
type WorkScheduleResponse = Omit<WorkSchedule, 'employeeName' | 'employeeRole'>;

export class HcmApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'HcmApiError'; }
}

@Injectable({ providedIn: 'root' })
export class HcmApi {
  async listContracts(filters: ContractFilters): Promise<ContractPage> {
    const params = new URLSearchParams({ businessId: String(this.businessId()), page: String(filters.page), size: String(filters.size), sort: 'id,desc' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.modality !== 'ALL') params.set('modality', filters.modality);
    const [page, employees] = await Promise.all([
      this.request<Omit<ContractPage, 'content'> & { content: ContractResponse[] }>(`${API_BASE_URL}${API_PATHS.contracts}?${params}`),
      this.listEmployees(),
    ]);
    const employeeNames = new Map(employees.map(employee => [employee.id, `${employee.firstName} ${employee.lastName}`]));
    return { ...page, content: page.content.map(contract => ({ ...contract, employeeName: employeeNames.get(contract.employeeId) ?? `Empleado #${contract.employeeId}` })) };
  }

  async listEmployees(): Promise<EmployeeOption[]> {
    // Names live in the staff profile, not in the employees table, so the backend can only sort by id.
    const params = new URLSearchParams({ businessId: String(this.businessId()), status: 'ACTIVE', page: '0', size: '100', sort: 'id,asc' });
    const employees = (await this.request<EmployeePageResponse>(`${API_BASE_URL}${API_PATHS.employees}?${params}`)).content;
    return [...employees].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es'));
  }

  async getContract(employeeId: number, contractId: number): Promise<Contract> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    const [contract, employees] = await Promise.all([
      this.request<ContractResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.contracts}/${contractId}?${params}`),
      this.listEmployees(),
    ]);
    const employee = employees.find(item => item.id === contract.employeeId);
    return { ...contract, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : `Empleado #${contract.employeeId}` };
  }

  async createContract(input: CreateContract): Promise<Contract> {
    const { employeeId, ...rest } = input;
    const body = { ...rest, businessId: this.businessId() };
    const contract = await this.request<ContractResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.contracts}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    return { ...contract, employeeName: `Empleado #${contract.employeeId}` };
  }

  async updateContract(employeeId: number, contractId: number, input: UpdateContract): Promise<Contract> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    const contract = await this.request<ContractResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.contracts}/${contractId}?${params}`, {
      method: 'PATCH', body: JSON.stringify(input),
    });
    return { ...contract, employeeName: `Empleado #${contract.employeeId}` };
  }

  async listWorkSchedules(filters: WorkScheduleFilters): Promise<WorkSchedulePage> {
    const params = new URLSearchParams({ businessId: String(this.businessId()), page: String(filters.page), size: String(filters.size), sort: 'id,desc' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.role !== 'ALL') params.set('role', filters.role);
    if (filters.status !== 'ALL') params.set('status', filters.status);
    const [page, employees] = await Promise.all([
      this.request<Omit<WorkSchedulePage, 'content'> & { content: WorkScheduleResponse[] }>(`${API_BASE_URL}${API_PATHS.workSchedules}?${params}`),
      this.listEmployees(),
    ]);
    return { ...page, content: page.content.map(schedule => this.withEmployee(schedule, employees)) };
  }

  async getWorkScheduleSummary(): Promise<WorkScheduleSummary> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    return this.request<WorkScheduleSummary>(`${API_BASE_URL}${API_PATHS.workSchedules}/summary?${params}`);
  }

  async getWorkSchedule(employeeId: number, workScheduleId: number): Promise<WorkSchedule> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    const [schedule, employees] = await Promise.all([
      this.request<WorkScheduleResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.workSchedules}/${workScheduleId}?${params}`),
      this.listEmployees(),
    ]);
    return this.withEmployee(schedule, employees);
  }

  async listContractWorkSchedules(contractId: number): Promise<WorkSchedule[]> {
    const params = new URLSearchParams({ businessId: String(this.businessId()), contractId: String(contractId), page: '0', size: '20', sort: 'startDate,desc' });
    const page = await this.request<{ content: WorkScheduleResponse[] }>(`${API_BASE_URL}${API_PATHS.workSchedules}?${params}`);
    return page.content.map(schedule => this.withEmployee(schedule, []));
  }

  /** A schedule is always configured inside one of the employee's contracts. */
  async createWorkSchedule(employeeId: number, contractId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    const schedule = await this.request<WorkScheduleResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.contracts}/${contractId}${API_PATHS.workSchedules}`, {
      method: 'POST', body: JSON.stringify({ ...input, businessId: this.businessId() }),
    });
    return this.withEmployee(schedule, []);
  }

  async updateWorkSchedule(employeeId: number, workScheduleId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    const schedule = await this.request<WorkScheduleResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.workSchedules}/${workScheduleId}?${params}`, {
      method: 'PATCH', body: JSON.stringify(input),
    });
    return this.withEmployee(schedule, []);
  }

  async deactivateWorkSchedule(employeeId: number, workScheduleId: number): Promise<WorkSchedule> {
    const params = new URLSearchParams({ businessId: String(this.businessId()) });
    const schedule = await this.request<WorkScheduleResponse>(`${API_BASE_URL}${API_PATHS.employees}/${employeeId}${API_PATHS.workSchedules}/${workScheduleId}/deactivation?${params}`, { method: 'POST' });
    return this.withEmployee(schedule, []);
  }

  private withEmployee(schedule: WorkScheduleResponse, employees: EmployeeOption[]): WorkSchedule {
    const employee = employees.find(item => item.id === schedule.employeeId);
    return {
      ...schedule,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : `Empleado #${schedule.employeeId}`,
      employeeRole: employee?.role ?? null,
    };
  }

  /** Every hcm endpoint is scoped to the business of the signed-in user. */
  private businessId(): number {
    const businessId = currentBusinessId();
    if (businessId === null) throw new HcmApiError('Tu sesión no tiene un negocio asignado. Inicia sesión con una cuenta de un negocio.', 403);
    return businessId;
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
    if (response.status === 401) return 'Debes iniciar sesión para consultar capital humano.';
    if (response.status === 403) return 'Tu usuario no tiene permiso para gestionar capital humano.';
    if (response.status === 404) return 'El servicio de capital humano no está disponible en el backend actual.';
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('json')) {
      const problem = await response.json() as { detail?: string; message?: string; title?: string };
      return problem.detail ?? problem.message ?? problem.title ?? 'No se pudo completar la solicitud.';
    }
    return `No se pudo completar la solicitud al backend (${response.status}).`;
  }
}
