
import { FinancialRecord, ApiResponse, User } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión de Producción Actualizada).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzmSMnvBG891G6qo-uzIJvuh5KaVdjDjI97l60xYfwdI43QvDU7g1zsFrW7EG_E-vclXA/exec';

/**
 * Autentica al usuario contra la base de datos de Google Sheets.
 */
export const loginUser = async (email: string, password: string): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    
    const result = await response.json();
    return result.success ? { success: true, data: result.user } : { success: false, error: result.error };
  } catch (e: any) {
    console.error("Login Error:", e);
    return { success: false, error: "Error de conexión con el servidor de autenticación." };
  }
};

/**
 * Envía el registro y el archivo original a Google Sheets/Drive.
 * Se utiliza 'no-cors' para evitar bloqueos por redirecciones de Google Apps Script.
 */
export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<void>> => {
  try {
    // Usamos mode: 'no-cors' para el envío de datos pesados (archivos)
    // Esto permite que la petición llegue a Apps Script sin fallar por políticas de CORS del navegador
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 
        'Content-Type': 'text/plain' 
      },
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
