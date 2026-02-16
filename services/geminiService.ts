
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse, TransactionCategory, PaymentMode, FlowType, BankMovement, AuditReport } from "../types";
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
  
  const systemInstruction = isIncome 
    ? `ACTÚA COMO AUDITOR FISCAL EXPERTO. El documento es un INGRESO (Venta).
       Extrae los datos del DESTINATARIO/CLIENTE/ADQUIRIENTE.`
    : `ACTÚA COMO AUDITOR FISCAL EXPERTO. El documento es un EGRESO (Gasto).
       Extrae los datos del EMISOR/PROVEEDOR.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { 
          text: `${systemInstruction} 
          Extrae estrictamente en JSON:
          - vendor, taxId, date (YYYY-MM-DD), amount, currency (PEN o USD), invoiceNumber, description, detractionAmount, paymentMode (CONTADO o CREDITO)` 
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
  const normPaymentMode = parsed.paymentMode?.toUpperCase().includes('CREDIT') ? PaymentMode.CREDITO : PaymentMode.CONTADO;

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
        { text: "Extrae FECHA (YYYY-MM-DD) y MONTO del voucher bancario. JSON: 'date' y 'amount'." }
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

export const extractBankMovements = async (base64: string, mimeType: string, currency: 'PEN' | 'USD'): Promise<BankMovement[]> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: `Extrae todos los movimientos bancarios (fecha, monto, descripción) del estado de cuenta en moneda ${currency}.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            reference: { type: Type.STRING }
          },
          required: ["date", "amount", "description"]
        }
      }
    }
  });

  const parsed = JSON.parse(cleanJsonResponse(response.text));
  return parsed.map((m: any) => ({
    ...m,
    id: crypto.randomUUID(),
    isConciliated: false,
    currency
  }));
};

export const performAuditIA = async (movements: BankMovement[], records: FinancialRecord[]): Promise<AuditReport> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `ACTÚA COMO AUDITOR FINANCIERO SENIOR.
  Compara estos MOVIMIENTOS BANCARIOS con estos REGISTROS DE SISTEMA.
  
  MOVIMIENTOS BANCARIOS: ${JSON.stringify(movements)}
  REGISTROS SISTEMA: ${JSON.stringify(records)}
  
  Identifica coincidencias, discrepancias en montos, movimientos en banco que faltan registrar en sistema, y registros en sistema que no aparecen en el banco.
  Devuelve JSON con:
  - matches (string array de IDs/Facturas que coinciden perfecto)
  - discrepancies (string array detallando diferencias de montos)
  - missingInSystem (string array de movimientos bancarios no encontrados)
  - missingInBank (string array de registros de sistema no vistos en banco)
  - isEverythingOk (boolean si todo cuadra perfectamente)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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

export const deleteRecordFromExternalDatabase = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const deleteAllRecordsFromExternalDatabase = async (): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').delete().neq('id', '0'); 
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
