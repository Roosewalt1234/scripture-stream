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

  async studyAssistant(
    messages: { role: 'user' | 'assistant'; content: string }[],
    book: string,
    chapter: number,
    selectedVerse: string | null,
  ): Promise<string> {
    const ai = getClient();
    const systemContext = `You are a biblical study assistant. The user is reading ${book} chapter ${chapter}${selectedVerse ? `, currently looking at: "${selectedVerse}"` : ''}. Provide insightful, theologically grounded answers. When citing scripture, use the format Book Chapter:Verse.`;
    const contents = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemContext}\n\n${contents}\nAssistant:`,
      config: { temperature: 0.7, maxOutputTokens: 1200 },
    });
    return response.text ?? 'Unable to generate response.';
  },

  async generateMorningCard(
    verseText: string,
    reference: string,
    style: string,
  ): Promise<{ devotional: string; prayer: string; imageBase64: string | null }> {
    const ai = getClient();
    const stylePrompts: Record<string, string> = {
      Ethereal: 'ethereal, peaceful, soft light, heavenly atmosphere, soft watercolor',
      Ancient: 'ancient parchment textures, warm earthy tones, historical oil painting',
      Nature: 'beautiful serene nature landscape, morning sun, mountains or quiet waters',
      Modern: 'minimalist abstract gradient, clean lines, contemporary spiritual art',
    };
    const [textRes, imageRes] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a 3-sentence morning devotional reflection for "${verseText}" (${reference}). Then write a short one-sentence prayer. Format as JSON: {"devotional": "...", "prayer": "..."}`,
        config: { temperature: 0.8, maxOutputTokens: 400 },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Beautiful inspirational background for: "${verseText}". Style: ${stylePrompts[style] ?? stylePrompts.Ethereal}. NO TEXT.` }] },
        config: { imageConfig: { aspectRatio: '1:1' } },
      }),
    ]);
    let devotional = '', prayer = '';
    try {
      const raw = textRes.text?.replace(/```json\n?|\n?```/g, '') ?? '{}';
      const parsed = JSON.parse(raw);
      devotional = parsed.devotional ?? ''; prayer = parsed.prayer ?? '';
    } catch { devotional = textRes.text ?? ''; }
    let imageBase64: string | null = null;
    for (const part of imageRes.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) { imageBase64 = `data:image/png;base64,${part.inlineData.data}`; break; }
    }
    return { devotional, prayer, imageBase64 };
  },

  async generateDevotional(verseText: string, reference: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a 300-word devotional based on "${verseText}" (${reference}). Include: opening reflection, life application, and closing encouragement.`,
      config: { temperature: 0.8, maxOutputTokens: 600 },
    });
    return response.text ?? 'Unable to generate devotional.';
  },

  async generateSermonOutline(verseText: string, reference: string, theme: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a 3-point sermon outline for "${verseText}" (${reference}) on the theme of "${theme}". Include: title, introduction hook, 3 main points with sub-points, illustrations for each point, and conclusion call to action.`,
      config: { temperature: 0.7, maxOutputTokens: 1000 },
    });
    return response.text ?? 'Unable to generate sermon outline.';
  },

  async generateDiscussionQuestions(book: string, chapter: number, verseText?: string): Promise<string[]> {
    const ai = getClient();
    const context = verseText ? `"${verseText}" and ` : '';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 6 thought-provoking small group discussion questions for ${context}${book} chapter ${chapter}. Make them practical and suitable for diverse groups. Return as a JSON array of strings.`,
      config: { temperature: 0.7, maxOutputTokens: 600 },
    });
    try {
      const raw = response.text?.replace(/```json\n?|\n?```/g, '') ?? '[]';
      return JSON.parse(raw);
    } catch {
      return (response.text ?? '').split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, ''));
    }
  },

  async generatePrayer(verseText: string, reference: string, prayerType: 'gratitude' | 'intercession' | 'confession' | 'praise'): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a heartfelt ${prayerType} prayer (150-200 words) inspired by "${verseText}" (${reference}).`,
      config: { temperature: 0.8, maxOutputTokens: 400 },
    });
    return response.text ?? 'Unable to generate prayer.';
  },

  async findCrossReferences(verseText: string, reference: string): Promise<
    { reference: string; text: string; connection: string }[]
  > {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find 4-6 Bible cross-references for: "${verseText}" (${reference}).
Return a JSON array (no markdown) of objects with these exact keys:
- "reference": book chapter:verse (e.g. "Romans 5:8")
- "text": the verse text (one sentence)
- "connection": brief explanation of the thematic link (10-15 words)

Example: [{"reference":"Romans 5:8","text":"But God demonstrates...","connection":"Both verses show God's love expressed through sacrifice"}]`,
      config: { temperature: 0.3, maxOutputTokens: 1200 },
    });
    try {
      const raw = (response.text ?? '[]').replace(/```json|```/g, '').trim();
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async generateChapterSummary(book: string, chapter: number, verseTexts: string[]): Promise<
    { summary: string; keyThemes: string[]; reflectionQuestions: string[] }
  > {
    const ai = getClient();
    const chapterText = verseTexts.join(' ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize ${book} chapter ${chapter}. Chapter text: "${chapterText.slice(0, 3000)}..."
Return JSON (no markdown) with these exact keys:
- "summary": 3-4 sentence overview of the chapter
- "keyThemes": array of 3-5 key themes (strings)
- "reflectionQuestions": array of 3 reflection questions for personal application

Example: {"summary":"...","keyThemes":["Faith","Redemption"],"reflectionQuestions":["How does this...?"]}`,
      config: { temperature: 0.5, maxOutputTokens: 1000 },
    });
    try {
      const raw = (response.text ?? '{}').replace(/```json|```/g, '').trim();
      return JSON.parse(raw);
    } catch {
      return { summary: response.text ?? '', keyThemes: [], reflectionQuestions: [] };
    }
  },

  async getWordStudy(word: string, verseText: string, reference: string): Promise<
    { originalWord: string; language: string; meaning: string; usages: { reference: string; context: string }[]; application: string }
  > {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a word study for the word "${word}" in: "${verseText}" (${reference}).
Return JSON (no markdown) with these exact keys:
- "originalWord": the Greek or Hebrew original word with transliteration
- "language": "Greek" or "Hebrew"
- "meaning": 2-3 sentence explanation of the word's meaning and significance
- "usages": array of 2-3 other Bible references where this word appears, each with "reference" and "context" (one sentence)
- "application": one sentence on how understanding this word deepens faith

Example: {"originalWord":"ἀγάπη (agape)","language":"Greek","meaning":"...","usages":[{"reference":"1 Cor 13:4","context":"..."}],"application":"..."}`,
      config: { temperature: 0.4, maxOutputTokens: 1000 },
    });
    try {
      const raw = (response.text ?? '{}').replace(/```json|```/g, '').trim();
      return JSON.parse(raw);
    } catch {
      return { originalWord: word, language: 'Unknown', meaning: response.text ?? '', usages: [], application: '' };
    }
  },

  async generateReadingPlan(
    goal: string,
    durationDays: number,
    currentBook?: string,
  ): Promise<{ title: string; description: string; days: { day: number; book: string; chapters: string }[] }> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a ${durationDays}-day Bible reading plan for someone who wants to: "${goal}"${currentBook ? ` (currently reading ${currentBook})` : ''}. Return as JSON: {"title": "...", "description": "...", "days": [{"day": 1, "book": "John", "chapters": "1-3"}, ...]}. Keep it achievable (1-3 chapters per day).`,
      config: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    try {
      const raw = response.text?.replace(/```json\n?|\n?```/g, '') ?? '{}';
      return JSON.parse(raw);
    } catch {
      return { title: 'Custom Reading Plan', description: goal, days: [] };
    }
  },
};
