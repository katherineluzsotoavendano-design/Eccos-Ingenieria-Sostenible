
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse, TransactionCategory, PaymentMode, FlowType, BankMovement, AuditReport } from "../types";
import { supabase } from "./supabaseClient";

const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === "" || key === "undefined" || key === "null") return null;
  return key;
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
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("CONFIG_MISSING: No se detectó la llave API_KEY.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const isIncome = category === TransactionCategory.INGRESO;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { 
            text: `Eres un experto contable peruano. Analiza este ${isIncome ? 'Ingreso/Venta' : 'Egreso/Gasto'}.
            Extrae en JSON:
            - vendor: nombre del proveedor o cliente
            - taxId: RUC
            - date: fecha emisión (YYYY-MM-DD)
            - amount: MONTO TOTAL (incluye IGV)
            - igvAmount: MONTO DEL IGV (18%). Si no figura, calcúlalo como (Total / 1.18) * 0.18.
            - currency: PEN o USD
            - invoiceNumber: Serie-Correlativo
            - description: Breve detalle
            - detractionAmount: si aplica detracción
            - paymentMode: CONTADO o CREDITO` 
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
            igvAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            description: { type: Type.STRING },
            detractionAmount: { type: Type.NUMBER },
            paymentMode: { type: Type.STRING }
          },
          required: ["vendor", "taxId", "date", "amount", "igvAmount", "currency", "invoiceNumber"]
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("La IA no devolvió contenido.");
    
    const parsed = JSON.parse(cleanJsonResponse(textResponse));
    const normPaymentMode = parsed.paymentMode?.toUpperCase().includes('CREDIT') ? PaymentMode.CREDITO : PaymentMode.CONTADO;

    return {
      ...parsed,
      paymentMode: normPaymentMode,
      flowType: FlowType.CFO,
      serviceLine: isIncome ? 'Auditoría Tradicional' : 'ECCOS GASTO',
      targetFolder: isIncome ? 'VENTAS' : 'COMPRAS'
    } as ExtractedData;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(`Error de IA: ${error.message || "No se pudo procesar"}`);
  }
};

export const processVoucherIA = async (base64: string, mimeType: string): Promise<{ date: string, amount: number }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "Extrae FECHA (YYYY-MM-DD) y MONTO del voucher. JSON: 'date' y 'amount'." }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(cleanJsonResponse(response.text));
};

export const extractBankMovements = async (base64: string, mimeType: string, currency: 'PEN' | 'USD'): Promise<BankMovement[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: `Extrae todos los movimientos bancarios en moneda ${currency}.` }
      ]
    },
    config: { responseMimeType: "application/json" }
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Compara estos movimientos: ${JSON.stringify(movements)} con estos registros: ${JSON.stringify(records)}. Devuelve JSON: matches, discrepancies, missingInSystem, missingInBank, isEverythingOk`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
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
