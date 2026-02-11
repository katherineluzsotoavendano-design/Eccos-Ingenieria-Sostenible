
export enum TransactionCategory {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO'
}

export enum OperationState {
  PENDIENTE = 'PENDIENTE',
  CONCILIADO = 'CONCILIADO',
  OBSERVADO = 'OBSERVADO'
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

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export type IncomeType = 'VENTAS' | 'PRÉSTAMOS' | 'CAMBIO DE MONEDA' | 'INGRESOS FINANCIEROS';
export type ServiceLine = 'Capacitaciones Ágiles/Presenciales' | 'Consultoría Ambiental' | 'Consultoría SIG' | 'Auditoría Tradicional' | 'Auditorías 360' | 'ECCOS GASTO';
export type CostType = 'FIJO' | 'VARIABLE';
export type Responsible = 'NATHALIA' | 'JOSÉ' | 'PAGO DIRECTO';

export interface ExtractedData {
  vendor: string; 
  taxId: string; 
  date: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  categorySuggest: string;
  detractionAmount?: number;
  paymentMode?: PaymentMode;
  creditDate?: string;
  flowType?: FlowType;
  incomeType?: IncomeType;
  serviceLine?: ServiceLine;
  costType?: CostType;
  responsible?: Responsible;
  voucherAmount?: number;
  voucherDate?: string;
  paidDate?: string;
}

export interface FinancialRecord extends ExtractedData {
  id: string;
  category: TransactionCategory;
  operationState: OperationState;
  isPaid: boolean;
  createdAt: string;
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
