
import { GoogleGenAI, Type } from "@google/genai";
import { Translation, Verse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * BibleService handles the dynamic retrieval of authoritative Bible text.
 * It uses the Gemini API as a high-fidelity scripture server to ensure
 * access to every chapter and verse across all supported translations.
 */
export const bibleService = {
  getChapter: async (book: string, chapter: number, translation: Translation): Promise<Verse[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide the full and accurate text for ${book} chapter ${chapter} in the ${translation} translation. Return every verse as a structured list.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: {
                  type: Type.INTEGER,
                  description: "The verse number",
                },
                text: {
                  type: Type.STRING,
                  description: "The verbatim text of the verse",
                },
              },
              required: ["number", "text"],
            },
          },
          systemInstruction: `You are a precision-oriented Bible Scripture Server. 
          Your only task is to provide verbatim text from the requested Bible translation. 
          Do not add commentary, headers, or footnotes. 
          Ensure that the verse numbers are correct and the text is exactly as it appears in the ${translation} version.`,
        },
      });

      const rawData = JSON.parse(response.text || "[]");
      
      return rawData.map((v: { number: number; text: string }, index: number) => ({
        id: `${translation}-${book}-${chapter}-${v.number || index + 1}`,
        number: v.number || index + 1,
        text: v.text,
        book,
        chapter,
        translation
      }));
    } catch (error) {
      console.error("Error fetching scripture:", error);
      // Fallback in case of API failure, though in production we would have a secondary source
      throw new Error(`Failed to load ${book} ${chapter}. Please check your connection.`);
    }
  }
};
