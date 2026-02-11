
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse, PaymentMode } from "../types";
import { supabase } from "./supabaseClient";

export const isApiKeyConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

export const processDocument = async (base64: string, mimeType: string): Promise<ExtractedData> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        {
          text: `Extract data from this financial invoice. 
          CRITICAL INSTRUCTION FOR INCOME (FACTURA DE VENTA):
          - Identify if it's an INCOME (Venta/Ingreso).
          - If it is an INCOME, YOU MUST EXTRACT THE RECIPIENT'S (CLIENT/CUSTOMER) Business Name (Razón Social) and RUC (taxId). DO NOT extract the issuer's data. 
          - Look for labels like "Adquiriente", "Cliente", "Señor(es)".
          
          GENERAL EXTRACTION:
          - Extract total amount, date (YYYY-MM-DD), and currency (PEN, USD).
          - Extract Invoice Number.
          - Identify "Detracción" amount if listed.
          - Determine if "CONTADO" or "CREDITO". If "CREDITO", find the due date.
          
          Return JSON following the schema.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING, description: "Business name of the Client (Income) or Provider (Expense)" },
          taxId: { type: Type.STRING, description: "RUC of the Client (Income) or Provider (Expense)" },
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          categorySuggest: { type: Type.STRING },
          detractionAmount: { type: Type.NUMBER },
          paymentMode: { type: Type.STRING, enum: ["CONTADO", "CREDITO"] },
          creditDate: { type: Type.STRING },
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
        { text: "Extract the transaction amount and the date from this bank payment voucher/transfer image. Return JSON with 'amount' (number) and 'date' (YYYY-MM-DD)." }
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
    if (error) {
      console.error("Supabase Error Details:", error);
      if (error.message.includes('column') || error.message.includes('schema cache') || error.code === '42703') {
        throw new Error("⚠️ ERROR DE ESQUEMA: Debes ejecutar el script SQL de actualización en el dashboard de Supabase. La tabla no reconoce los nuevos campos como flowType o isPaid.");
      }
      throw error;
    }
    return { success: true };
  } catch (e: any) {
    console.error("Critical Database Error:", e);
    return { success: false, error: e.message };
  }
};

export const fetchRecordsFromExternalDatabase = async (): Promise<FinancialRecord[]> => {
  try {
    const { data, error } = await supabase.from('financial_records').select('*').order('createdAt', { ascending: false });
    if (error) {
       console.error("Error fetching records:", error);
       return [];
    }
    return (data as FinancialRecord[]) || [];
  } catch (e) {
    console.error("Fetch Exception:", e);
    return [];
  }
};

export const updateRecordInDatabase = async (id: string, updates: Partial<FinancialRecord>): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.from('financial_records').update(updates).eq('id', id);
    if (error) console.error("Update Error:", error);
    return { success: !error, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
