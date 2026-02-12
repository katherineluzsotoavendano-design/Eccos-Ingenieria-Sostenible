
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script actualizada por Katherine.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbRPrv_kz2Y9gsdE8NR5JnvAQYyyWgZRO_Rj_DaUTUJEapTQUKXJRzz1iEsULvLzWiWAQ/exec';

const handleGasResponse = (text: string) => {
  if (text.includes("Session.getActiveUser") || text.includes("permission")) {
    return { 
      success: false, 
      error: "⚠️ ERROR DE PERMISOS: Debes autorizar el script en el editor de Google (Ejecutar una vez manualmente)." 
    };
  }

  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    return { success: false, error: "Error en la respuesta del script." };
  }
};

export const loginUser = async (email: string, password: string): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const text = await response.text();
    const result = handleGasResponse(text);
    if (result.success && result.user) return { success: true, data: result.user };
    return { success: false, error: result.error || "Acceso denegado." };
  } catch (e) {
    return { success: false, error: "Error de conexión con Google." };
  }
};

export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    // Limpiamos datos que no corresponden a la categoría para evitar columnas vacías indeseadas
    const cleanData = { ...record };
    if (record.category === 'EGRESO') {
      delete (cleanData as any).creditDate;
      delete (cleanData as any).incomeType;
      delete (cleanData as any).paymentMode;
    }

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        ...cleanData, 
        action: 'save', 
        fileBase64, 
        fileMimeType 
      }),
    });

    const text = await response.text();
    const result = handleGasResponse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error };
  } catch (e: any) {
    return { success: false, error: "Error de sincronización con la hoja de cálculo." };
  }
};

export const registerUser = async (name: string, email: string, password: string, role: UserRole): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'register', name, email, password, role }),
    });
    const text = await response.text();
    const result = handleGasResponse(text);
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (e) {
    return { success: false, error: "Fallo al registrar usuario." };
  }
};

export const recoverPassword = async (email: string): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'recover', email }),
    });
    const text = await response.text();
    const result = handleGasResponse(text);
    return result.success ? { success: true, data: result.message } : { success: false, error: result.error };
  } catch (e) {
    return { success: false, error: "Error de comunicación." };
  }
};
