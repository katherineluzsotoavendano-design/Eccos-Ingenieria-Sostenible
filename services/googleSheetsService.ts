import { FinancialRecord, ApiResponse, User, UserRole } from "../types";

/**
 * URL de la Aplicación Web de Google Apps Script. 
 * IMPORTANTE: Cada vez que hagas cambios en el script y quieras que se apliquen, 
 * debes ir a Implementar -> Nueva Implementación en Google Apps Script.
 */
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwmjmvdRbyuZgTIDyQxPjZL5zBprFB08bEYn6FToEXIjV35ph7FdC0LnJ4d2uMOpLVdHQ/exec';

/**
 * Helper para procesar la respuesta de Google Apps Script.
 * Google a veces devuelve errores de permisos en texto plano en lugar de JSON.
 */
const handleGasResponse = (text: string) => {
  // Caso de error de permisos de correo
  if (text.includes("MailApp.sendEmail") || text.includes("script.send_mail")) {
    return { 
      success: false, 
      error: "⚠️ PERMISOS REQUERIDOS: Katherine debe entrar al editor de Google Apps Script, ejecutar la función 'autorizarManual' y luego realizar una 'Nueva Implementación'." 
    };
  }
  
  // Caso de error genérico de Drive/Sheets
  if (text.includes("Exception") || text.includes("permission") || text.includes("DriveApp")) {
    return { success: false, error: "Error de permisos en Google Script. Asegúrate de que el script tenga acceso a Drive y Sheets." };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Si no es JSON, es probable que sea un mensaje de éxito/error de doGet o una página de error de Google
    if (text.length > 0 && text.length < 200) {
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
    
    if (result.success && result.user) {
      return { success: true, data: result.user };
    }
    return { success: false, error: result.error || "Credenciales incorrectas o cuenta no autorizada." };
  } catch (e: any) {
    return { success: false, error: "Error de red: No se pudo conectar con el servidor central." };
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
    
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  } catch (e: any) {
    return { success: false, error: "Fallo de conexión al intentar el registro." };
  }
};

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
    const result = handleGasResponse(text);
    
    return result.success 
      ? { success: true, data: { driveUrl: result.driveUrl } } 
      : { success: false, error: result.error };
  } catch (e: any) {
    return { success: false, error: "Error de sincronización cloud: " + e.message };
  }
};