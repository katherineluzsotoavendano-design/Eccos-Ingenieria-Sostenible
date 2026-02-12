import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse, TransactionCategory, PaymentMode, FlowType } from "../types";
import { supabase } from "./supabaseClient";

export const isApiKeyConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

export const processDocument = async (base64: string, mimeType: string, category: TransactionCategory): Promise<ExtractedData> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isIncome = category === TransactionCategory.INGRESO;
  
  const systemPrompt = isIncome 
    ? `EXTRACCIÓN PARA INGRESOS (VENTAS): 
       Debes extraer los datos del CLIENTE / ADQUIRIENTE. 
       Busca etiquetas como: "Señor(es)", "Adquiriente", "Cliente", "Razón Social del Cliente".`
    : `EXTRACCIÓN PARA EGRESOS (COMPRAS/GASTOS): 
       Debes extraer los datos del PROVEEDOR (Emisor). 
       Extrae el RUC y Razón Social que aparece en la cabecera principal como emisor.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        {
          text: `${systemPrompt}
          
          DATOS OBLIGATORIOS Y DETALLADOS A EXTRAER:
          - Monto total bruto, IGV/Tax (si hay), fecha (YYYY-MM-DD) y moneda (PEN, USD).
          - Número de factura o boleta completo (Serie-Número).
          - Monto de Detracción (si aplica, busca porcentajes del 10%, 12%, etc).
          - Condición de pago: "CONTADO" o "CREDITO". Si es crédito, extrae la fecha de vencimiento.
          - Sugiere un Tipo de Flujo: "CFO" (Operativo), "CFI" (Inversión) o "CFF" (Financiamiento).
          - Para egresos, identifica si es un gasto de "Capacitaciones", "Consultoría", "Auditoría" o "Gastos Generales".
          
          Responde estrictamente en formato JSON.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING, description: isIncome ? "Cliente" : "Proveedor" },
          taxId: { type: Type.STRING, description: "RUC/ID Fiscal" },
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          categorySuggest: { type: Type.STRING },
          detractionAmount: { type: Type.NUMBER },
          paymentMode: { type: Type.STRING, enum: ["CONTADO", "CREDITO"] },
          creditDate: { type: Type.STRING },
          flowType: { type: Type.STRING, enum: ["CFO", "CFI", "CFF"] },
          serviceLine: { type: Type.STRING },
          costType: { type: Type.STRING, enum: ["FIJO", "VARIABLE"] }
        },
        required: ["vendor", "taxId", "date", "amount", "currency", "invoiceNumber"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as ExtractedData;
};

export const processVoucher = async (base64: string, mimeType: string): Promise<{ amount: number, date: string }> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "Extract the transaction amount and the date from this bank payment voucher. Return JSON with 'amount' (number) and 'date' (YYYY-MM-DD)." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING }
        },
        required: ["amount", "date"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const saveToExternalDatabase = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').insert([record]);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.warn("Supabase Sync skipped:", e.message);
    return { success: false, error: e.message };
  }
};

export const fetchRecordsFromExternalDatabase = async (): Promise<FinancialRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .order('createdAt', { ascending: false });
      
    if (error) throw error;
    return (data as FinancialRecord[]) || [];
  } catch (e: any) {
    console.error("Error fetching records:", e.message);
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
