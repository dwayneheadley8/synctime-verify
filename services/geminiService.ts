import { GoogleGenAI } from "@google/genai";
import { TimesheetEntry } from "../types";

const parseGeminiResponse = (text: string): TimesheetEntry[] => {
  try {
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure IDs are present
      return parsed.map((item: any, idx: number) => ({
        ...item,
        id: `extracted_${Date.now()}_${idx}`,
        // basic normalization
        hoursWorked: item.hoursWorked || 0
      }));
    }
    return [];
  } catch (e) {
    console.error("Failed to parse Gemini JSON", e);
    return [];
  }
};

export const extractTimesheetData = async (base64Image: string): Promise<TimesheetEntry[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock data.");
    // Return empty array to trigger mock fallback in UI or handle error
    throw new Error("API Key Missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze this timesheet image. Extract the following fields for each row:
    - date (YYYY-MM-DD format)
    - arrivalTime (HH:MM 24h format)
    - departureTime (HH:MM 24h format)
    - hoursWorked (number)
    - description (string summary)

    Return ONLY a raw JSON array. Do not include markdown code blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt }
        ]
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return parseGeminiResponse(text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
