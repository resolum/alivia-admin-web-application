export type ContractModality = 'HOURLY' | 'SERVICE';
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface Contract {
  id: number;
  code: string;
  employeeId: number;
  employeeName: string;
  businessId: number;
  position: string;
  modality: ContractModality;
  weeklyHours: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  eligible: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateContract = Pick<Contract, 'code' | 'employeeId' | 'businessId' | 'position' | 'modality' | 'weeklyHours' | 'startDate' | 'endDate' | 'notes'> & {
  initialStatus: 'PENDING' | 'ACTIVE';
};

export type UpdateContract = Pick<Contract, 'position' | 'modality' | 'weeklyHours' | 'startDate' | 'endDate' | 'notes'>;

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
  corporateEmail: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ContractPage {
  content: Contract[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ContractFilters {
  search: string;
  status: ContractStatus | 'ALL';
  modality: ContractModality | 'ALL';
  page: number;
  size: number;
}

export const contractStatusLabel: Record<ContractStatus, string> = {
  PENDING: 'Pendiente', ACTIVE: 'Vigente', EXPIRED: 'Vencido', TERMINATED: 'Finalizado',
};

export const contractModalityLabel: Record<ContractModality, string> = {
  HOURLY: 'Por horas', SERVICE: 'Servicio específico',
};
