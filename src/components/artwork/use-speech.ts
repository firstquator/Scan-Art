"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickBestKoreanVoice } from "@/lib/voice";

/**
 * 설명글 읽어주기. 문장 하나씩 읽어서 지금 읽는 문장 번호를 알려준다.
 * (긴 글을 한 번에 넘기면 일부 브라우저가 중간에 끊어 버린다.)
 * 한국어 음성이 없는 기기에서는 supported=false.
 */
export function useSpeech(sentences: string[]) {
  const [supported, setSupported] = useState(false);
  const [current, setCurrent] = useState(-1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const run = runRef;
    const load = () => {
      // 기기에 있는 한국어 음성 중 가장 자연스러운 것(신경망·향상된 음성 등)을 고른다.
      voiceRef.current = pickBestKoreanVoice(synth.getVoices());
      setSupported(!!voiceRef.current);
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      run.current++;
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    runRef.current++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setCurrent(-1);
  }, []);

  const start = useCallback(() => {
    const voice = voiceRef.current;
    if (!voice || sentences.length === 0) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const run = ++runRef.current;

    const speakAt = (i: number) => {
      if (run !== runRef.current) return;
      if (i >= sentences.length) {
        setCurrent(-1);
        return;
      }
      setCurrent(i);
      const u = new SpeechSynthesisUtterance(sentences[i]);
      u.voice = voice;
      u.lang = voice.lang;
      // 고품질 음성은 속도·높이를 크게 바꾸면 오히려 어색해진다. 살짝만 느리게.
      u.rate = 0.95;
      u.pitch = 1;
      u.onend = () => speakAt(i + 1);
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") speakAt(i + 1);
      };
      synth.speak(u);
    };
    speakAt(0);
  }, [sentences]);

  return { supported, speaking: current >= 0, current, start, stop };
}
