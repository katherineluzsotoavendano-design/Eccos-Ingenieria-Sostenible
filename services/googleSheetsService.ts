
import { FinancialRecord, ApiResponse } from "../types";

// URL de Google Apps Script actualizada por el usuario
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwWliz4m2fyvwlq8aAnE_zuzWwYvszlWj9fetbLtSGVfxR7mmJDx0vk1PcK2g5rSFNTbg/exec';

/**
 * Envía un registro financiero a Google Sheets a través de un Webhook de Apps Script.
 * Utiliza el modo 'no-cors' con Content-Type 'text/plain' para evitar bloqueos de navegador
 * y asegurar que los datos lleguen al script de Google.
 */
export const saveToGoogleSheets = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  try {
    // Enviamos la petición POST. En modo no-cors, el navegador no permite leer la respuesta,
    // pero garantiza que el cuerpo (body) se envíe al servidor de Google.
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(record),
    });

    // En 'no-cors' la respuesta es opaca (type: "opaque"), por lo que devolvemos éxito manual
    // si la ejecución del fetch no lanzó una excepción de red.
    return { success: true };
  } catch (e: any) {
    console.error("Google Sheets Sync Error:", e);
    return { success: false, error: e.message };
  }
};
