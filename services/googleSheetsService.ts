
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script v3.3.
 * Esta URL se comunica con las hojas USUARIOS, INGRESOS y EGRESOS.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxVrgx71bwJgMD8CSQ5M0Dc0tN3nb-hDyPC58fZRBnOPl9LwsBveqiqcQjVW8Piv3kEXQ/exec';

const handleGasResponse = (text: string) => {
  // Manejo de errores de sesión o permisos de Google
  if (text.includes("Session.getActiveUser") || text.includes("permission") || text.includes("<!DOCTYPE html>")) {
    return { 
      success: false, 
      error: "⚠️ ERROR DE VÍNCULO: El script de Google no puede acceder a las hojas o no está vinculado correctamente. Abre la hoja de cálculo, ve a Extensiones > Apps Script y asegúrate de haber implementado el código correctamente." 
    };
  }

  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error("Respuesta cruda de Google:", text);
    return { success: false, error: "El servidor de Google devolvió una respuesta inesperada. Verifica que el Apps Script esté publicado como 'Cualquier persona' (Anyone)." };
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
    return { success: false, error: result.error || "Credenciales no encontradas en la hoja USUARIOS." };
  } catch (e) {
    return { success: false, error: "Fallo de conexión con el servidor de autenticación." };
  }
};

export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    const payload = { 
      ...record, 
      action: 'save', 
      fileBase64, 
      fileMimeType 
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const result = handleGasResponse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error };
  } catch (e: any) {
    return { success: false, error: "Error al sincronizar con las hojas INGRESOS/EGRESOS." };
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
    return { success: false, error: "No se pudo enviar la solicitud de registro." };
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
    return { success: false, error: "Error al intentar recuperar la clave." };
  }
};
