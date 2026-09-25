"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ko = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ko"));
  if (ko.length === 0) return null;
  // 기기 내장(로컬) 음성을 우선한다: 오프라인에서도 되고 반응이 빠르다.
  return ko.find((v) => v.localService) ?? ko[0];
}

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
      voiceRef.current = pickKoreanVoice(synth.getVoices());
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
      u.rate = 0.92;
      u.pitch = 1.02;
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
