import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script. 
 * Esta URL conecta con el backend que gestiona las hojas de cálculo 'INGRESOS' y 'EGRESOS'
 * y realiza la carga de archivos a Google Drive.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxvEkk2Q3NQd8iS9Ya16VNQiQUlYnky0CGZXDIU1WB9tFGE_TqOXSH_czDtSgnaHg5Zng/exec';

const handleGasResponse = (text: string) => {
  if (text.includes("MailApp.sendEmail") || text.includes("script.send_mail")) {
    return { 
      success: false, 
      error: "⚠️ PERMISOS REQUERIDOS: Katherine debe entrar al editor de Google Apps Script, ejecutar 'autorizarManual' y realizar una 'Nueva Implementación'." 
    };
  }
  
  if (text.includes("Exception") || text.includes("permission")) {
    return { success: false, error: "Error de servidor Google: " + text };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.length > 0 && text.length < 300) {
      return { success: true, message: text };
    }
    return { success: false, error: "Respuesta inesperada del servidor de Google." };
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
    return { success: false, error: result.error || "Credenciales incorrectas." };
  } catch (e) {
    return { success: false, error: "Fallo de conexión con el servidor central." };
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
    return { success: false, error: "Error de red al registrar solicitud." };
  }
};

/**
 * Guarda el registro completo en Google Sheets.
 * Envía todos los metadatos extraídos por la IA y clasificados por el usuario.
 */
export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    const payload = { 
      ...record,
      action: 'save',
      fileBase64: fileBase64, 
      fileMimeType: fileMimeType
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
    return { success: false, error: "Error de sincronización con Google Cloud: " + e.message };
  }
};