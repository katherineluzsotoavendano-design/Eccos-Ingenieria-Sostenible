
import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script (Versión Actualizada).
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyewl1N9HrBEMepNHrNETAIwcY5H7XRYBbigq0cfP1uIVit8gX4qjSu1RcXcYM7O9zOSg/exec';

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
      console.error("Server raw response:", text);
      return { success: false, error: "Error en el servidor de Google: " + (text.substring(0, 50) || "Respuesta vacía") };
    }
  } catch (e: any) {
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
      return { success: false, error: "Error al registrar el usuario en la base de datos central." };
    }
  } catch (e: any) {
    return { success: false, error: "Error de red al intentar el registro." };
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
    
    if (text.startsWith('<!DOCTYPE html>')) {
        throw new Error("El script devolvió HTML en lugar de JSON. Asegúrate de haber copiado el código de Apps Script completo y haberlo publicado como 'Cualquiera'.");
    }

    const result = JSON.parse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error || "Error desconocido al guardar en la nube." };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message || "Fallo en la sincronización con Google Drive." };
  }
};
