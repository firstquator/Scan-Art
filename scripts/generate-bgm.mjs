// 기본 배경음악(public/audio/bgm-default.mp3)을 만든다.
// 저작권 걱정 없이 쓰도록 코드로 직접 합성한다: 잔잔한 피아노 선율 + 따뜻한 패드 + 낮은 베이스.
// 끝과 처음이 자연스럽게 이어지도록(무한 반복) 잔향 꼬리를 앞쪽에 겹쳐 둔다.
// 사용법: node scripts/generate-bgm.mjs  (ffmpeg 필요)
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RATE = 44100;
const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// 다장조 · Cmaj7 – Am7 – Fmaj7 – G(sus) 를 두 번(두 번째는 선율을 바꿔서) = 16마디
const CHORDS = [
  [48, [60, 64, 67, 71]], // Cmaj7
  [45, [57, 60, 64, 67]], // Am7
  [41, [57, 60, 65, 69]], // Fmaj7
  [43, [55, 59, 62, 67]], // G
  [48, [60, 64, 67, 71]],
  [45, [57, 60, 64, 67]],
  [41, [57, 60, 65, 69]],
  [43, [55, 60, 62, 67]], // Gsus4 → 처음으로 부드럽게 돌아간다
];
const PROGRESSION = [...CHORDS, ...CHORDS];

// [마디, 박, 음, 길이(박)] — 펜타토닉 위주의 느린 선율
const MELODY_A = [
  [0, 0, 76, 1.5], [0, 1.5, 79, 0.5], [0, 2, 77, 1], [0, 3, 76, 1],
  [1, 0, 72, 2], [1, 2, 74, 1], [1, 3, 76, 1],
  [2, 0, 77, 1.5], [2, 1.5, 76, 0.5], [2, 2, 72, 1], [2, 3, 69, 1],
  [3, 0, 71, 2], [3, 2, 74, 2],
  [4, 0, 76, 1], [4, 1, 79, 1], [4, 2, 84, 1.5], [4, 3.5, 83, 0.5],
  [5, 0, 81, 2], [5, 2, 79, 1], [5, 3, 76, 1],
  [6, 0, 77, 1], [6, 1, 81, 1], [6, 2, 79, 1], [6, 3, 77, 1],
  [7, 0, 74, 2.5], [7, 2.5, 72, 1.5],
];
const MELODY_B = [
  [0, 0, 79, 1], [0, 1, 76, 1], [0, 2, 72, 2],
  [1, 0, 76, 1], [1, 1, 74, 1], [1, 2, 72, 1], [1, 3, 69, 1],
  [2, 0, 72, 1.5], [2, 1.5, 74, 0.5], [2, 2, 76, 2],
  [3, 0, 74, 1], [3, 1, 71, 1], [3, 2, 67, 2],
  [4, 0, 72, 1], [4, 1, 76, 1], [4, 2, 79, 2],
  [5, 0, 84, 1], [5, 1, 81, 1], [5, 2, 76, 2],
  [6, 0, 77, 1.5], [6, 1.5, 76, 0.5], [6, 2, 74, 1], [6, 3, 72, 1],
  [7, 0, 72, 4],
];

const TOTAL = PROGRESSION.length * BAR;
const N = Math.round(TOTAL * RATE);
const L = new Float32Array(N);
const R = new Float32Array(N);

const freq = (m) => 440 * 2 ** ((m - 69) / 12);

// 결정적인 난수(매번 같은 파일이 나오게)
let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** 순환 버퍼에 더한다: 끝을 넘친 소리는 처음에 겹쳐 반복 이음매를 없앤다. */
function add(buf, i, v) {
  buf[((i % N) + N) % N] += v;
}

/** 부드러운 피아노(배음 몇 개 + 빠른 어택 + 지수 감쇠) */
function piano(start, midi, beats, vel, pan) {
  const f = freq(midi);
  const s0 = Math.round(start * RATE);
  const len = Math.round((beats * BEAT + 2.2) * RATE);
  const release = beats * BEAT;
  const harmonics = [
    [1, 1],
    [2, 0.32],
    [3, 0.1],
    [4, 0.05],
  ];
  const detune = 1 + (rand() - 0.5) * 0.0012;
  for (let n = 0; n < len; n++) {
    const t = n / RATE;
    const attack = Math.min(1, t / 0.012);
    let env = attack * Math.exp(-t * (1.6 + midi / 90));
    if (t > release) env *= Math.exp(-(t - release) * 5);
    let v = 0;
    for (const [h, a] of harmonics) v += a * Math.sin(2 * Math.PI * f * h * detune * t) * Math.exp(-t * h * 0.9);
    v *= env * vel;
    add(L, s0 + n, v * (1 - pan) * 0.5);
    add(R, s0 + n, v * (1 + pan) * 0.5);
  }
}

/** 따뜻한 패드(살짝 어긋난 사인 두 개 + 느린 어택/릴리스) */
function pad(start, midi, seconds, vel) {
  const f = freq(midi);
  const s0 = Math.round(start * RATE);
  const len = Math.round((seconds + 1.6) * RATE);
  for (let n = 0; n < len; n++) {
    const t = n / RATE;
    let env = Math.min(1, t / 1.1);
    if (t > seconds) env *= Math.max(0, 1 - (t - seconds) / 1.6);
    const lfo = 1 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t);
    const a = Math.sin(2 * Math.PI * f * 0.998 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t);
    const b = Math.sin(2 * Math.PI * f * 1.002 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2.003 * t);
    add(L, s0 + n, a * env * vel * lfo);
    add(R, s0 + n, b * env * vel * lfo);
  }
}

function bass(start, midi, seconds, vel) {
  const f = freq(midi);
  const s0 = Math.round(start * RATE);
  const len = Math.round((seconds + 0.8) * RATE);
  for (let n = 0; n < len; n++) {
    const t = n / RATE;
    let env = Math.min(1, t / 0.03) * Math.exp(-t * 0.35);
    if (t > seconds) env *= Math.max(0, 1 - (t - seconds) / 0.8);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * f * 2 * t)) * env * vel;
    add(L, s0 + n, v);
    add(R, s0 + n, v);
  }
}

// ── 곡 쓰기 ─────────────────────────────────────────
PROGRESSION.forEach(([root, notes], bar) => {
  const t = bar * BAR;
  bass(t, root, BAR * 0.95, 0.075);
  for (const m of notes) pad(t, m, BAR, 0.028);
  // 왼손 아르페지오(8분음표)
  const arp = [notes[0], notes[1], notes[2], notes[3], notes[2], notes[1], notes[2], notes[3]];
  arp.forEach((m, i) => piano(t + i * (BEAT / 2) + rand() * 0.012, m, 0.6, 0.075 + (i % 4 === 0 ? 0.02 : 0), -0.35 + (i % 2) * 0.2));
});

const melody = [...MELODY_A, ...MELODY_B.map(([b, ...rest]) => [b + 8, ...rest])];
for (const [bar, beat, midi, beats] of melody) {
  piano(bar * BAR + beat * BEAT + rand() * 0.01, midi, beats, 0.26, 0.25);
}

// ── 잔향(슈뢰더 방식, 순환 버퍼라 반복 이음매가 없다) ─────────────
function reverb(input, delays, feedback, damp) {
  const out = new Float32Array(N);
  for (const d of delays) {
    const buf = new Float32Array(N);
    let lp = 0;
    // 순환이므로 두 바퀴 돌려 안정 상태를 만든다
    for (let pass = 0; pass < 2; pass++) {
      for (let n = 0; n < N; n++) {
        const prev = buf[(n - d + N) % N];
        lp = prev * (1 - damp) + lp * damp;
        buf[n] = input[n] + lp * feedback;
      }
    }
    for (let n = 0; n < N; n++) out[n] += buf[(n - d + N) % N] / delays.length;
  }
  for (const d of [556, 441]) {
    const tmp = Float32Array.from(out);
    for (let n = 0; n < N; n++) out[n] = -0.5 * tmp[n] + tmp[(n - d + N) % N] + 0.5 * out[(n - d + N) % N];
  }
  return out;
}

const wetL = reverb(L, [1557, 1617, 1491, 1422], 0.82, 0.35);
const wetR = reverb(R, [1277, 1356, 1188, 1116], 0.82, 0.35);

// ── 섞기 · 부드러운 한계 · 16비트 WAV ───────────────────
let peak = 0;
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let n = 0; n < N; n++) {
  mixL[n] = L[n] * 0.8 + wetL[n] * 0.45;
  mixR[n] = R[n] * 0.8 + wetR[n] * 0.45;
  peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
}
const gain = 0.72 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const l = Math.tanh(mixL[n] * gain * 1.1);
  const r = Math.tanh(mixR[n] * gain * 1.1);
  pcm.writeInt16LE(Math.round(l * 32767), 44 + n * 4);
  pcm.writeInt16LE(Math.round(r * 32767), 46 + n * 4);
}

const wav = path.join(tmpdir(), `scan-art-bgm-${process.pid}.wav`);
writeFileSync(wav, pcm);
const outDir = path.join(process.cwd(), "public", "audio");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "bgm-default.mp3");
const result = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "128k", out], { stdio: "inherit" });
rmSync(wav, { force: true });
if (result.status !== 0) {
  console.error("[bgm] ffmpeg로 mp3를 만들지 못했습니다. ffmpeg가 설치되어 있는지 확인해 주세요.");
  process.exit(1);
}
console.log(`[bgm] ${out} (${TOTAL.toFixed(1)}초) 만들었습니다.`);
