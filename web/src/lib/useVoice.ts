"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

// Thin type shim — SpeechRecognition isn't in lib.dom.d.ts by default.
type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & { SpeechRecognition?: new () => SR }).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition ??
    null
  );
}

export type UseVoiceOptions = {
  lang?: string;
  // Called with full transcript on each result event (final + interim).
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
};

export function useVoice({ lang = "ru-RU", onTranscript, onError }: UseVoiceOptions) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getSR() !== null);
  const srRef = useRef<SR | null>(null);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      srRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;

    const sr = new SR();
    sr.continuous = false;
    sr.interimResults = true;
    sr.lang = lang;

    sr.onresult = (e) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += chunk;
        } else {
          interim += chunk;
        }
      }
      const isFinal = finalText.length > 0;
      onTranscript(isFinal ? finalText : interim, isFinal);
    };

    sr.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        onError?.(e.error);
      }
    };

    sr.onend = () => {
      setListening(false);
    };

    srRef.current = sr;
    sr.start();
    setListening(true);
  }, [lang, onTranscript, onError]);

  const stop = useCallback(() => {
    srRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}
