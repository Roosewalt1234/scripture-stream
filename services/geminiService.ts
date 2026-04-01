
import { Modality } from "@google/genai";
import { Verse } from "../types";
import { getGenAIClient } from "./genaiClient";

export const geminiService = {
  getVerseExplanation: async (verse: Verse): Promise<string> => {
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Explain the meaning and theological significance of the following Bible verse: "${verse.text}" (${verse.book} ${verse.chapter}:${verse.number} - ${verse.translation}). Keep it concise but deep.`,
        config: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
      });
      return response.text || "Unable to generate explanation at this time.";
    } catch (error) {
      console.error("AI Error:", error);
      if (error instanceof Error && error.message.startsWith('Missing Gemini API key')) {
        return error.message;
      }
      return "An error occurred while fetching the AI explanation.";
    }
  },

  getHistoricalContext: async (book: string, chapter: number): Promise<string> => {
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide historical background and context for the book of ${book}, specifically chapter ${chapter}. Include who the author was, the time period, and the original audience.`,
        config: {
            temperature: 0.5,
            maxOutputTokens: 1000,
        }
      });
      return response.text || "Context unavailable.";
    } catch (error) {
      console.error("AI Error:", error);
      if (error instanceof Error && error.message.startsWith('Missing Gemini API key')) {
        return error.message;
      }
      return "An error occurred while fetching context.";
    }
  },

  generateVerseArtBackground: async (verseText: string, style: string = "Ethereal"): Promise<string | null> => {
    try {
      const ai = getGenAIClient();
      const stylePrompts: Record<string, string> = {
        "Ethereal": "ethereal, peaceful, soft light, heavenly atmosphere, soft watercolor",
        "Ancient": "ancient parchment textures, warm earthy tones, old world aesthetics, historical oil painting",
        "Nature": "beautiful serene nature landscape, morning sun, mountains or quiet waters, realistic photography style",
        "Modern": "minimalist abstract gradient, clean lines, contemporary spiritual art, soft blurred colors"
      };

      const prompt = `A beautiful, minimalist, high-resolution artistic background inspired by the theme of this Bible verse: "${verseText}". Style: ${stylePrompts[style] || stylePrompts["Ethereal"]}. NO TEXT in the image. Purely artistic and atmospheric.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Generation Error:", error);
      if (error instanceof Error && error.message.startsWith('Missing Gemini API key')) {
        return null;
      }
      return null;
    }
  },

  generateSpeech: async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
      console.error("TTS Error:", error);
      if (error instanceof Error && error.message.startsWith('Missing Gemini API key')) {
        return null;
      }
      return null;
    }
  }
};
