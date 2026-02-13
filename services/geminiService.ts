
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse, TransactionCategory, PaymentMode, FlowType } from "../types";
import { supabase } from "./supabaseClient";

export const isApiKeyConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  }
  return cleaned;
};

export const processDocument = async (base64: string, mimeType: string, category: TransactionCategory): Promise<ExtractedData> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isIncome = category === TransactionCategory.INGRESO;
  
  // Prompt ultra-específico según requerimiento
  const systemInstruction = isIncome 
    ? `ACTÚA COMO AUDITOR FISCAL EXPERTO. El documento es un INGRESO.
       IMPORTANTE: Extrae los datos del DESTINATARIO/CLIENTE/ADQUIRIENTE (quien recibe el servicio). 
       NO extraigas los datos del emisor de la parte superior. Busca etiquetas como "Señor(es)", "Cliente", "Adquiriente".`
    : `ACTÚA COMO AUDITOR FISCAL EXPERTO. El documento es un EGRESO/GASTO.
       IMPORTANTE: Extrae los datos del EMISOR/PROVEEDOR (quien vende/emite la factura). 
       Busca etiquetas como "Razón Social", "Empresa", "Emisor".`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { 
          text: `${systemInstruction} 
          Extrae estrictamente en JSON los siguientes campos:
          - vendor (Razón Social según la instrucción anterior)
          - taxId (RUC o ID Fiscal de dicha Razón Social)
          - date (Fecha de emisión en formato YYYY-MM-DD)
          - amount (Monto Total final con decimales)
          - currency (PEN o USD)
          - invoiceNumber (Serie y número correlativo)
          - description (Resumen breve de los productos/servicios)
          - detractionAmount (Monto de detracción mencionado, si no hay pon 0)
          - paymentMode (CONTADO o CREDITO)` 
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING },
          taxId: { type: Type.STRING },
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          description: { type: Type.STRING },
          detractionAmount: { type: Type.NUMBER },
          paymentMode: { type: Type.STRING }
        },
        required: ["vendor", "taxId", "date", "amount", "currency", "invoiceNumber"]
      }
    }
  });

  const parsed = JSON.parse(cleanJsonResponse(response.text));
  
  // Normalización
  const normPaymentMode = parsed.paymentMode?.toUpperCase().includes('CREDIT') 
    ? PaymentMode.CREDITO 
    : PaymentMode.CONTADO;

  return {
    ...parsed,
    paymentMode: normPaymentMode,
    flowType: FlowType.CFO,
    serviceLine: isIncome ? 'Auditoría Tradicional' : 'ECCOS GASTO',
    targetFolder: isIncome ? 'VENTAS' : 'COMPRAS'
  } as ExtractedData;
};

export const processVoucherIA = async (base64: string, mimeType: string): Promise<{ date: string, amount: number }> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "Extrae la FECHA (YYYY-MM-DD) y el MONTO del voucher de pago. Devuelve JSON con 'date' y 'amount'." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER }
        },
        required: ["date", "amount"]
      }
    }
  });

  return JSON.parse(cleanJsonResponse(response.text));
};

export const saveToExternalDatabase = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').insert([record]);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const fetchRecordsFromExternalDatabase = async (): Promise<FinancialRecord[]> => {
  try {
    const { data, error } = await supabase.from('financial_records').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return (data as FinancialRecord[]) || [];
  } catch (e: any) {
    return [];
  }
};

export const updateRecordInDatabase = async (id: string, updates: Partial<FinancialRecord>): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').update(updates).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
