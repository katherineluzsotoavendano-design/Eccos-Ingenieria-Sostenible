import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script proporcionada por el usuario.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbziBZ7ZmTMqUnoiz-KlgOhERBg-lZX5aA5c0jP20XAIILKPFz5J5VIRaDWrv8hZ-NDcsw/exec';

const handleGasResponse = (text: string) => {
  // Detecta si el script falló por falta de autorización para enviar correos
  if (text.includes("MailApp.sendEmail") || text.includes("script.send_mail") || text.includes("Authorization is required")) {
    return { 
      success: false, 
      error: "⚠️ PERMISOS REQUERIDOS: Katherine debe entrar al editor de Google Apps Script, ejecutar 'autorizarManual' una vez y realizar una 'Nueva Implementación'." 
    };
  }
  
  if (text.includes("Exception") || text.includes("permission") || text.includes("ReferenceError")) {
    return { success: false, error: "Error de servidor Google: " + text };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Si la respuesta es un texto plano exitoso pero no JSON
    if (text.length > 0 && text.length < 500 && (text.includes("enviado") || text.includes("éxito") || text.includes("success"))) {
      return { success: true, message: text };
    }
    return { success: false, error: "Respuesta inesperada del servidor central." };
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
    return { success: false, error: result.error || "Credenciales incorrectas o cuenta no autorizada." };
  } catch (e) {
    return { success: false, error: "Error de red al intentar iniciar sesión." };
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

export const recoverPassword = async (email: string): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'recover', email }),
    });
    const text = await response.text();
    const result = handleGasResponse(text);
    return result.success 
      ? { success: true, data: result.message || "Se ha enviado tu contraseña al correo corporativo registrado." } 
      : { success: false, error: result.error };
  } catch (e) {
    return { success: false, error: "Error de conexión al intentar recuperar la clave." };
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