
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, FinancialRecord, ApiResponse } from "../types";

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

// Mock persistent storage simulation
export const saveToExternalDatabase = async (record: FinancialRecord): Promise<ApiResponse<void>> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  return { success: true };
};

export const fetchRecordsFromExternalDatabase = async (): Promise<FinancialRecord[]> => {
  // In a real app, this would be a fetch call to a backend
  const saved = localStorage.getItem('fincore_records');
  return saved ? JSON.parse(saved) : [];
};
