
import { FinancialRecord, ApiResponse, User, TransactionCategory } from "../types";

const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwrn2akFehr4jNyBKooVx1Nl37DCE9xSe8EqkgN_SL7DLkcUVTHcFArcAPqnpMcthC-Xw/exec';

const handleGasResponse = (text: string) => {
  if (!text || text.trim() === "") return { success: false, error: "El servidor de Google no envió respuesta." };
  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
      return { 
        success: false, 
        error: "Error de Configuración: El Script no está publicado correctamente como 'Cualquier Persona' (Anyone)." 
      };
    }
    return { success: false, error: "Error al interpretar la respuesta del servidor de Google." };
  }
};

export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    const isIncome = record.category === TransactionCategory.INGRESO;
    const targetSheet = isIncome ? 'INGRESOS' : 'EGRESOS';
    
    const baseData: any = {
      FECHA: record.date || new Date().toISOString().split('T')[0],
      ENTIDAD: record.vendor,
      RUC: record.taxId,
      N_FACTURA: record.invoiceNumber,
      DESCRIPCION: record.description || "Registro Auditoría AI",
      MONTO: record.amount,
      MONEDA: record.currency,
      MODALIDAD: record.paymentMode,
      FLUJO_CAJA: record.flowType,
      DETRACCION: record.detractionAmount || 0,
      LINEA: record.serviceLine,
      MOVIMIENTO: record.incomeType || record.costType || "N/A",
      ESTADO: record.operationState,
      RUTA_DRIVE: record.folderPath ? record.folderPath.join(' / ') : "SIN_RUTA"
    };

    if (!isIncome) {
      baseData.CAJA = record.depositedTo || "PAGO DIRECTO";
      baseData.MONTO_PAGADO = record.voucherAmount || 0;
    }

    const payload = { 
      action: 'save', 
      targetSheet: targetSheet,
      fileBase64: fileBase64 || "", 
      fileMimeType: fileMimeType || "application/pdf",
      voucherFileBase64: record.voucherFileBase64 || "",
      data: baseData
    };
    
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    
    const text = await response.text();
    const result = handleGasResponse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error || "Error al sincronizar con Sheets." };
  } catch (e) {
    console.error("Error de comunicación:", e);
    return { success: false, error: "No se pudo conectar con el servicio de Google Sheets." };
  }
};

export const deleteFromGoogleSheets = async (invoiceNumber: string, category: TransactionCategory): Promise<ApiResponse<void>> => {
  try {
    const targetSheet = category === TransactionCategory.INGRESO ? 'INGRESOS' : 'EGRESOS';
    const payload = { 
      action: 'delete', 
      targetSheet: targetSheet,
      invoiceNumber: invoiceNumber 
    };
    
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    
    const text = await response.text();
    const result = handleGasResponse(text);
    
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (e) {
    return { success: false, error: "No se pudo conectar con el servicio de Google Sheets." };
  }
};

export const loginUser = async (email: string, password: string): Promise<ApiResponse<User>> => {
  try {
    const payload = { 
      action: 'login', 
      email: email.trim().toLowerCase(), 
      password: password.toString().trim() 
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    
    const text = await response.text();
    const result = handleGasResponse(text);
    
    if (result.success && result.user) {
      return { success: true, data: result.user };
    }

    return { 
      success: false, 
      error: result.error || "Acceso denegado. Revisa tus credenciales en la hoja 'USERS'." 
    };
  } catch (e) {
    return { success: false, error: "Error de conexión: No se pudo validar el acceso." };
  }
};
