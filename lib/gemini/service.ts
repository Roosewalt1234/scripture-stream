// SERVER-ONLY — never import this from client components
import { GoogleGenAI, Modality } from '@google/genai';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey: key });
}

export const geminiService = {
  async explainVerse(verseText: string, reference: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Explain the meaning and theological significance of: "${verseText}" (${reference}). Concise but deep.`,
      config: { temperature: 0.7, maxOutputTokens: 800 },
    });
    return response.text ?? 'Unable to generate explanation.';
  },

  async getHistoricalContext(book: string, chapter: number): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide historical background for ${book} chapter ${chapter}. Include author, time period, and original audience.`,
      config: { temperature: 0.5, maxOutputTokens: 1000 },
    });
    return response.text ?? 'Context unavailable.';
  },

  async generateVerseArt(verseText: string, style: string): Promise<string | null> {
    const stylePrompts: Record<string, string> = {
      Ethereal: 'ethereal, peaceful, soft light, heavenly atmosphere, soft watercolor',
      Ancient: 'ancient parchment textures, warm earthy tones, historical oil painting',
      Nature: 'beautiful serene nature landscape, morning sun, mountains or quiet waters, realistic photography',
      Modern: 'minimalist abstract gradient, clean lines, contemporary spiritual art',
    };
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Beautiful artistic background for: "${verseText}". Style: ${stylePrompts[style] ?? stylePrompts.Ethereal}. NO TEXT.` }] },
      config: { imageConfig: { aspectRatio: '1:1' } },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  },

  async generateSpeech(text: string, voiceName = 'Kore'): Promise<string | null> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `Read clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
  },
};
