
export enum TransactionCategory {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO'
}

export enum OperationState {
  PENDIENTE = 'PENDIENTE',
  CONCILIADO = 'CONCILIADO',
  OBSERVADO = 'OBSERVADO'
}

export interface ExtractedData {
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  taxId: string;
  invoiceNumber: string;
  categorySuggest: string;
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
