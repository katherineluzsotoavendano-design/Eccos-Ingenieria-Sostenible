import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script.
 * Administradora: katherineluzsotoavendano@gmail.com
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwBX2M1UBO0_Juq9vppagB1fGE3M_geQJ_bdLxxXdNQo9FF3kuDvytUPW3oHWNYAgAW5w/exec';

const handleGasResponse = (text: string) => {
  // Manejo de errores de permisos conocidos
  if (text.includes("Session.getActiveUser") || text.includes("permission")) {
    return { 
      success: false, 
      error: "⚠️ ERROR DE PERMISOS: Katherine debe ejecutar 'probarManual' en el editor de Scripts y autorizar." 
    };
  }

  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    // Si no es JSON, verificar si es un mensaje de éxito en texto plano
    if (text.length > 0 && text.length < 200 && (text.toLowerCase().includes("éxito") || text.toLowerCase().includes("success"))) {
      return { success: true, message: text };
    }
    return { success: false, error: "Error del Servidor: " + text.substring(0, 100) };
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
    return { success: false, error: result.error || "No se pudo iniciar sesión." };
  } catch (e) {
    return { success: false, error: "Error de red: No hay conexión con el servidor de Google." };
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
    return { success: false, error: "Error al enviar solicitud de registro." };
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
    return { success: false, error: "Error de conexión al recuperar clave." };
  }
};

export const saveToGoogleSheets = async (
  record: FinancialRecord, 
  fileBase64?: string, 
  fileMimeType?: string
): Promise<ApiResponse<{ driveUrl?: string }>> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        ...record, 
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
    return { success: false, error: "Fallo en la sincronización Cloud." };
  }
};