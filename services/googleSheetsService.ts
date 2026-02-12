import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión con Aprobación por Email).
 * Administradora: katherineluzsotoavendano@gmail.com
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzUttlhF6DYSG3i1PkvH9tlN54N5x5t3l9h5Qefsde8KO-Kvvv-flka16_qnFktVWCXqg/exec';

const handleGasResponse = (text: string) => {
  // 1. Error de Scope de Email o Identidad
  if (text.includes("Session.getActiveUser") || text.includes("userinfo.email") || text.includes("permission")) {
    return { 
      success: false, 
      error: "⚠️ ERROR DE IDENTIDAD/PERMISOS: Katherine debe verificar el archivo appsscript.json, agregar los scopes requeridos, ejecutar 'autorizarManual' y volver a Implementar." 
    };
  }

  // 2. Error general de autorización de MailApp
  if (text.includes("Authorization is required") || text.includes("MailApp.sendEmail") || text.includes("script.send_mail")) {
    return { 
      success: false, 
      error: "⚠️ AUTORIZACIÓN PENDIENTE: Katherine debe entrar al editor de Google Scripts, ejecutar 'autorizarManual' una vez para habilitar Gmail y realizar una 'Nueva Implementación'." 
    };
  }
  
  if (text.includes("Exception") || text.includes("ReferenceError")) {
    return { success: false, error: "Error técnico en Google Sheets: " + text };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Manejo de respuestas de texto plano exitosas (como las de aprobación)
    if (text.length > 0 && text.length < 500 && (text.toLowerCase().includes("enviado") || text.toLowerCase().includes("éxito") || text.toLowerCase().includes("success"))) {
      return { success: true, message: text };
    }
    return { success: false, error: "El servidor de Google devolvió una respuesta no válida." };
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
    return { success: false, error: result.error || "Credenciales incorrectas o cuenta aún en revisión (PENDIENTE)." };
  } catch (e) {
    return { success: false, error: "Error de red: No se pudo conectar con el sistema central." };
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
    return { success: false, error: "Error de red al registrar la solicitud de acceso." };
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
      ? { success: true, data: result.message || "Las credenciales han sido enviadas a tu correo corporativo." } 
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
    return { success: false, error: "Fallo en la sincronización con Google Drive: " + e.message };
  }
};