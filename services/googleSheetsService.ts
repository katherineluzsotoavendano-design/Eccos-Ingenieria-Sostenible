import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión Actualizada proporcionada por el usuario).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxlKEXnq02kZK0_yQkL8gN6UNIGJXYlR2DdNw0rqOmIY8rcUPpJrKCENaXKXvRdYSfflQ/exec';

/**
 * Autentica al usuario contra la base de datos de Google Sheets.
 * El orden esperado en la hoja es: [0] Email, [1] Nombre, [2] Password, [3] Rol.
 */
export const loginUser = async (email: string, password: string): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    
    const text = await response.text();
    try {
      const result = JSON.parse(text);
      if (result.success && result.user) {
        return { success: true, data: result.user };
      }
      return { success: false, error: result.error || "Credenciales incorrectas." };
    } catch (e) {
      console.error("Respuesta cruda del servidor:", text);
      return { success: false, error: "Respuesta inválida del servidor de Google." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de red: No se pudo conectar con Google Sheets." };
  }
};

/**
 * Registra un nuevo usuario en la hoja "USUARIOS".
 * Se envía en el orden: Email, Nombre, Password, Rol.
 */
export const registerUser = async (name: string, email: string, password: string, role: UserRole): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'register', name, email, password, role }),
    });
    
    const text = await response.text();
    try {
      const result = JSON.parse(text);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: "Error al registrar: respuesta fallida del servidor." };
    }
  } catch (e: any) {
    return { success: false, error: "Fallo de conexión al intentar registrar." };
  }
};

/**
 * Envía el registro y el archivo original a Google Sheets/Drive.
 */
export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    const payload = { 
      action: 'save',
      id: record.id, 
      date: record.date,
      vendor: record.vendor,
      taxId: record.taxId,
      amount: record.amount,
      currency: record.currency,
      invoiceNumber: record.invoiceNumber,
      operationState: record.operationState,
      category: record.category,
      flowType: record.flowType,
      fileBase64: fileBase64, 
      fileMimeType: fileMimeType
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    
    if (text.startsWith('<!DOCTYPE html>')) {
        throw new Error("Configuración incorrecta del Apps Script (devolvió HTML).");
    }

    const result = JSON.parse(text);
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message };
  }
};