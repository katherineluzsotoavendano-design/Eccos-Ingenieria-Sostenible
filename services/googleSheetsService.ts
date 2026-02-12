
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script v3.0 (Organización por mes y correos).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwrTqF4gSiCZF3M3nxP0ZMeAYimtjy1ipIc5LY-eM3Fo2epmk9WCW003hcsWg0PtrTY9Q/exec';

const handleGasResponse = (text: string) => {
  // Captura errores de permisos o sesiones de Google que vienen como HTML
  if (text.includes("Session.getActiveUser") || text.includes("permission") || text.includes("<!DOCTYPE html>") || text.includes("Google Drive - Quota exceeded")) {
    return { 
      success: false, 
      error: "⚠️ ERROR DE SERVIDOR: El script de Google no tiene permisos o ha excedido su cuota. Por favor, revisa la autorización en Apps Script." 
    };
  }

  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error("Respuesta no válida de GAS:", text);
    if (text.length > 0 && text.length < 200) {
       return { success: false, error: text };
    }
    return { success: false, error: "Error en el formato de respuesta del servidor de Google." };
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
    return { success: false, error: result.error || "Acceso denegado. Verifica tu correo y contraseña." };
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
    return { success: false, error: "Error de sincronización con la hoja de cálculo y Drive." };
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
    return { success: false, error: "Fallo al conectar con el servicio de registro." };
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
    return { success: false, error: "Error de comunicación con el servidor de correos." };
  }
};
