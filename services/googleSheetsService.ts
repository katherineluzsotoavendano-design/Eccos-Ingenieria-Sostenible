import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión más reciente proporcionada).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwNYOM-xwyfkU2Hkr37cvoCMZ1tiKUHPhovCohvy_tw1AUVy0P5Y3OAGNPmvHlLtueIiQ/exec';

/**
 * Autentica al usuario contra la base de datos de Google Sheets.
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
      return result.success ? { success: true, data: result.user } : { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: "El servidor devolvió una respuesta inesperada." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de conexión." };
  }
};

/**
 * Registra un nuevo usuario en la hoja "USUARIOS".
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
      return { success: false, error: "Error en el registro." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de red." };
  }
};

/**
 * Envía el registro y el archivo original a Google Sheets/Drive.
 * Se asegura de que el ID sea enviado explícitamente en la raíz del objeto.
 */
export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    // Construimos el payload explícitamente para asegurar que el Apps Script reciba las claves exactas
    const payload = { 
      action: 'save',
      id: record.id, // Aseguramos que el ID se envíe
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
    // Apps Script a veces devuelve errores HTML si falla críticamente, capturamos eso.
    if (text.startsWith('<!DOCTYPE html>')) {
        throw new Error("Error interno del servidor (Apps Script). Verifica los permisos de Drive.");
    }

    const result = JSON.parse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error || "Error desconocido en el script." };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message || "Error de sincronización con la nube." };
  }
};