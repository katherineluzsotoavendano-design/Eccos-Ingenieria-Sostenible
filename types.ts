
export enum TransactionCategory {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO'
}

export enum OperationState {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CONCILIADO = 'CONCILIADO',
  PAGADO = 'PAGADO'
}

export enum PaymentMode {
  CONTADO = 'CONTADO',
  CREDITO = 'CREDITO'
}

export enum FlowType {
  CFO = 'CFO',
  CFI = 'CFI',
  CFF = 'CFF'
}

export type UserRole = 'Gerente General' | 'Asistente de Gerencia' | 'Gerente de Proyectos' | 'Asistente de Proyectos';

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export type DriveFolder = 'VENTAS' | 'COMPRAS' | 'SERVICIOS';

export type IncomeType = 'VENTAS' | 'PRÉSTAMOS' | 'CAMBIO DE MONEDA' | 'INGRESOS FINANCIEROS';
export type ServiceLine = 'Capacitaciones Ágiles/Presenciales' | 'Consultoría Ambiental' | 'Consultoría SIG' | 'Auditoría Tradicional' | 'Auditorías 360' | 'ECCOS GASTO';
export type CostType = 'FIJO' | 'VARIABLE';
export type DepositedTo = 'NATHALIA' | 'JOSÉ' | 'PAGO DIRECTO' | 'OTROS';

export interface ExtractedData {
  vendor: string; 
  taxId: string; 
  date: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  description: string;
  detractionAmount: number;
  paymentMode: PaymentMode;
  creditDate?: string; 
  flowType: FlowType;
  incomeType?: IncomeType;
  serviceLine: ServiceLine;
  costType?: CostType;
  depositedTo?: DepositedTo;
  voucherAmount?: number; 
  voucherFileBase64?: string;
  targetFolder?: DriveFolder;
}

export interface FinancialRecord extends ExtractedData {
  id: string;
  category: TransactionCategory;
  operationState: OperationState;
  isPaid: boolean;
  createdAt: string;
  driveUrl?: string;
  folderPath?: string[];
  approvedBy?: string;
  rejectionReason?: string;
}

export interface BankMovement {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  isConciliated: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
