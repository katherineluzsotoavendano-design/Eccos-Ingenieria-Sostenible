
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión Actualizada).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyxgZTyOZk_B4b7lxtWPFbXoZjuW-yYYGxyQkcU8gOv9DBmE0Nvu6u9xzkt54YXmX4L4Q/exec';

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
      console.error("Error al parsear JSON de GAS:", text);
      return { success: false, error: "El servidor devolvió una respuesta inesperada. Revisa la implementación de Apps Script." };
    }
  } catch (e: any) {
    console.error("Login Error:", e);
    return { success: false, error: "Error de conexión con el servicio de autenticación." };
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
      return { success: false, error: "Error en el servidor al intentar registrar." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de red al registrar usuario." };
  }
};

/**
 * Envía el registro y el archivo original a Google Sheets/Drive.
 */
export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<void>> => {
  try {
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        action: 'save', 
        ...record,
        fileBase64, 
        fileMimeType
      }),
    });
    return { success: true };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message };
  }
};
