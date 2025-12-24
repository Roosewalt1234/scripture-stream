
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveConversationProps {
  isActive: boolean;
  onClose: () => void;
  context: {
    book?: string;
    chapter?: string;
    translation?: string;
    selectedVerseText?: string;
  };
}

const LiveConversation: React.FC<LiveConversationProps> = ({ isActive, onClose, context }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'idle'>('idle');
  const [isAiTalking, setIsAiTalking] = useState(false);
  
  const audioContextInputRef = useRef<AudioContext | null>(null);
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Manual base64 helpers as per requirements
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  useEffect(() => {
    if (isActive) {
      startSession();
    } else {
      stopSession();
    }
    return () => stopSession();
  }, [isActive]);

  const startSession = async () => {
    setStatus('connecting');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    try {
      audioContextInputRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutputRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const instruction = `You are a compassionate Bible scholar. You are having a live conversation with a user about ${context.book} chapter ${chapterContext()}. ${context.selectedVerseText ? `They are currently focused on this verse: "${context.selectedVerseText}".` : ''} Be insightful, respectful, and encouraging. Keep your responses conversational and brief to allow for natural back-and-forth. Avoid long monologues.`;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: instruction,
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            const source = audioContextInputRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextInputRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInputRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAiTalking(true);
              const ctx = audioContextOutputRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiTalking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiTalking(false);
            }
          },
          onerror: () => setStatus('error'),
          onclose: () => setStatus('idle'),
        },
      });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const stopSession = () => {
    sessionPromiseRef.current?.then((session: any) => session.close());
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextInputRef.current?.close();
    audioContextOutputRef.current?.close();
    setStatus('idle');
  };

  const chapterContext = () => `${context.book} ${context.chapter}`;

  if (!isActive && status === 'idle') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4">
      <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4 animate-in slide-in-from-bottom-10">
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${status === 'active' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {status === 'connecting' ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>
          {isAiTalking && (
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping scale-150"></div>
          )}
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-sm">Scripture Voice</h4>
          <p className="text-xs opacity-60">
            {status === 'active' ? (isAiTalking ? 'Scholar is speaking...' : 'Listening to you...') : 
             status === 'connecting' ? 'Waking up the scholar...' : 'Session ended'}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LiveConversation;
