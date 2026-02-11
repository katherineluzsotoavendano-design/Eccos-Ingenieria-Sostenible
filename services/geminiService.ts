
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse } from "../types";
import { supabase } from "./supabaseClient";

export const isApiKeyConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

export const processDocument = async (base64: string, mimeType: string): Promise<ExtractedData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        {
          text: "Extract data from this financial document (invoice/receipt). Act as a professional accountant. Provide the results in JSON format with fields: vendor, date (YYYY-MM-DD), amount (number), currency (3-letter), taxId, invoiceNumber, and a suggested sub-category name (categorySuggest)."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING },
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          taxId: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          categorySuggest: { type: Type.STRING },
        },
        required: ["vendor", "date", "amount", "currency", "taxId", "invoiceNumber", "categorySuggest"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data extracted from the document.");
  
  return JSON.parse(text) as ExtractedData;
};

export const saveToExternalDatabase = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  try {
    // Limpiamos el objeto para asegurarnos de que solo enviamos los campos que la tabla espera
    const cleanRecord = {
      id: record.id,
      vendor: record.vendor,
      date: record.date,
      amount: record.amount,
      currency: record.currency,
      taxId: record.taxId,
      invoiceNumber: record.invoiceNumber,
      categorySuggest: record.categorySuggest,
      category: record.category,
      operationState: record.operationState,
      isPaid: record.isPaid,
      createdAt: record.createdAt
    };

    const { error } = await supabase
      .from('financial_records')
      .insert([cleanRecord]);

    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('not found')) {
        throw new Error("⚠️ TABLA NO ENCONTRADA: Debes ejecutar el script SQL en el panel de Supabase para crear la tabla 'financial_records'.");
      }
      throw error;
    }
    return { success: true };
  } catch (e: any) {
    console.error("Supabase Save Error:", e);
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
  } catch (e) {
    console.error("Supabase Fetch Error:", e);
    const saved = localStorage.getItem('fincore_records');
    return saved ? JSON.parse(saved) : [];
  }
};

export const updateRecordInDatabase = async (id: string, updates: Partial<FinancialRecord>): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase
      .from('financial_records')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error("Supabase Update Error:", e);
    return { success: false, error: e.message };
  }
};
