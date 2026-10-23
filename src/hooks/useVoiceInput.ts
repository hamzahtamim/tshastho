"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceRecognitionOptions } from "@/lib/voice/types";

export function useVoiceInput(options: VoiceRecognitionOptions = {}) {
  const {
    language = "bn-BD",
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      const current = finalText || interimText;
      setTranscript(current);
      onResult?.(current, !!finalText);
    };

    recognition.onerror = (event: any) => {
      onError?.(event.error || "Unknown error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      onError?.(e.message || "Failed to start");
    }
  }, [isSupported, language, continuous, interimResults, onResult, onError, onEnd]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, transcript, start, stop, toggle };
}
