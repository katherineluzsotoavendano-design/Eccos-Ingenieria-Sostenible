
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script actualizada por Katherine.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyGzYGBk6MK1EZfZrN88jTM0vh5bETHvMFlGThxeMTFLrw16uXOhknsCvegENXKEXK71g/exec';

/**
 * Autentica al usuario contra la base de datos de Google Sheets.
 * El backend de GAS ahora verifica el estado "AUTORIZADO".
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
      return { success: false, error: result.error || "Credenciales incorrectas o acceso no autorizado." };
    } catch (e) {
      if (text.includes("No tienes permiso") || text.includes("Exception")) {
        return { success: false, error: "Error de permisos en Google Script. Asegúrate de haber autorizado el acceso a Drive y Sheets." };
      }
      return { success: false, error: "Respuesta inesperada del servidor de Google." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de red: No se pudo conectar con el servicio de autenticación." };
  }
};

/**
 * Registra un nuevo usuario en la hoja "USUARIOS" y activa el envío de correo a Katherine.
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
      return { success: false, error: "Error de servidor al intentar registrar el usuario." };
    }
  } catch (e: any) {
    return { success: false, error: "Fallo de conexión al intentar el registro." };
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
    
    if (text.includes("DriveApp") || text.includes("permission") || text.includes("Exception")) {
      return { success: false, error: "El script de Google no tiene permisos suficientes para gestionar archivos en Drive." };
    }

    try {
      const result = JSON.parse(text);
      return result.success 
        ? { success: true, data: { driveUrl: result.driveUrl } } 
        : { success: false, error: result.error };
    } catch (parseError) {
      console.error("Error parsing GAS response:", text);
      return { success: false, error: "Respuesta inválida del servidor de Google." };
    }
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: "Error de sincronización: " + e.message };
  }
};
