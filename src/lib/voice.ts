/** 음성 목록에서 쓰는 최소한의 정보 (SpeechSynthesisVoice와 같은 모양) */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/**
 * 이름에 들어 있으면 더 자연스러운 음성으로 보는 표시와 점수.
 * - Edge: "Microsoft SunHi Online (Natural) - Korean" 같은 신경망 음성
 * - iOS/macOS: "유나(향상됨)", "Yuna (Premium)" 같은 고품질 음성
 * - Chrome: "Google 한국의" (서버 음성, 기본 음성보다 자연스럽다)
 */
const QUALITY_HINTS: Array<[RegExp, number]> = [
  [/premium|프리미엄/i, 120],
  [/natural|neural/i, 110],
  [/enhanced|향상|고품질/i, 90],
  [/siri/i, 70],
  [/google/i, 60],
  [/online/i, 30],
];

export function isKorean(voice: VoiceLike): boolean {
  return voice.lang.toLowerCase().replace("_", "-").startsWith("ko");
}

export function voiceScore(voice: VoiceLike): number {
  let score = 0;
  for (const [pattern, points] of QUALITY_HINTS) {
    if (pattern.test(voice.name)) score += points;
  }
  // 이름만으로 구분이 안 되면 기기 기본 음성을 조금 우선한다.
  if (voice.default) score += 5;
  // 한국 표준(ko-KR)을 우선한다.
  if (/^ko[-_]kr$/i.test(voice.lang)) score += 3;
  return score;
}

/** 한국어 음성 가운데 가장 자연스러운 것을 고른다. 없으면 null. */
export function pickBestKoreanVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const korean = voices.filter(isKorean);
  if (korean.length === 0) return null;
  return korean.reduce((best, v) => (voiceScore(v) > voiceScore(best) ? v : best));
}
