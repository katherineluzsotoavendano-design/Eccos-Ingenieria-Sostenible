
import { FinancialRecord, ApiResponse } from "../types";

// Nueva URL de Google Apps Script proporcionada por el usuario
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx6WWJpI8n5Rx7udeOUqM3fdSXRHBeicKfygrQfQ46s9aJvqpg8iycMPZHjxgQXiMHKLw/exec';

export const saveToGoogleSheets = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  try {
    // Enviamos como text/plain para maximizar compatibilidad con Google Apps Script en modo no-cors
    // Esto evita el error de preflight de CORS y permite que Google reciba el cuerpo del POST
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(record),
    });

    // En modo no-cors la respuesta es opaca, si no hay excepción, asumimos éxito
    return { success: true };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message };
  }
};
