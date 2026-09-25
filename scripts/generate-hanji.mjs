// 한지 질감 텍스처를 만든다: public/textures/hanji.webp (이음매 없이 반복되는 타일)
// 실행: node scripts/generate-hanji.mjs
//
// 한지의 특징을 층으로 나눠 그린다.
//  1) 구름처럼 옅게 뭉친 두께 차이 (낮은 주파수 얼룩)
//  2) 종이 속에 묻힌 닥나무 섬유 (길고 가는 곡선, 방향이 제각각, 살짝 흐림)
//  3) 표면 위 밝은 섬유 몇 가닥
//  4) 드문드문 박힌 닥나무 껍질 티
//  5) 아주 고운 입자
// 모든 요소는 타일 경계 너머로도 한 번 더 그려 이음매가 생기지 않게 한다.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SIZE = 1024; // 화면에는 512px로 깔아 고해상도 화면에서도 선명하게 보이게 한다.
const BASE = "#f6f0e3";

let seed = 20260925;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const between = (a, b) => a + rand() * (b - a);

/** 경계에 걸친 요소를 반대편에도 그려 타일을 이어 붙인다. */
function wrapped(x, y, reach, draw) {
  const out = [];
  for (const dx of [-SIZE, 0, SIZE]) {
    for (const dy of [-SIZE, 0, SIZE]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx + reach < 0 || nx - reach > SIZE || ny + reach < 0 || ny - reach > SIZE) continue;
      out.push(draw(nx, ny));
    }
  }
  return out.join("");
}

/** 한 가닥의 섬유: 조금씩 방향이 휘는 여러 마디의 곡선 */
function fiberPath(x, y, length) {
  let angle = between(0, Math.PI * 2);
  const segments = Math.max(2, Math.round(length / 26));
  const step = length / segments;
  let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
  let cx = x;
  let cy = y;
  for (let i = 0; i < segments; i++) {
    angle += between(-0.45, 0.45);
    const mx = cx + Math.cos(angle) * step * 0.5 + between(-3, 3);
    const my = cy + Math.sin(angle) * step * 0.5 + between(-3, 3);
    cx += Math.cos(angle) * step;
    cy += Math.sin(angle) * step;
    d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  }
  return d;
}

function fibers({ count, minLen, maxLen, color, width, opacity }) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = between(0, SIZE);
    const y = between(0, SIZE);
    const len = between(minLen, maxLen);
    const w = between(width[0], width[1]).toFixed(2);
    const o = between(opacity[0], opacity[1]).toFixed(3);
    const d = fiberPath(0, 0, len);
    out += wrapped(x, y, len + 10, (nx, ny) => `<path transform="translate(${nx.toFixed(1)} ${ny.toFixed(1)})" d="${d}" stroke="${color}" stroke-width="${w}" stroke-opacity="${o}"/>`);
  }
  return out;
}

function flecks(count) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = between(0, SIZE);
    const y = between(0, SIZE);
    const rx = between(0.5, 2.2);
    const ry = rx * between(0.35, 1);
    const rot = between(0, 180).toFixed(0);
    const o = between(0.18, 0.5).toFixed(2);
    const c = rand() < 0.6 ? "#7d6446" : "#a98f66";
    out += wrapped(x, y, 4, (nx, ny) => `<ellipse cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" transform="rotate(${rot} ${nx.toFixed(1)} ${ny.toFixed(1)})" fill="${c}" fill-opacity="${o}"/>`);
  }
  return out;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="cloud" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(3 / SIZE).toFixed(5)}" numOctaves="3" seed="4" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.78  0 0 0 0 0.68  0 0 0 0 0.5  0 0 0 1.3 -0.55"/>
    </filter>
    <filter id="floc" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(22 / SIZE).toFixed(5)}" numOctaves="3" seed="11" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.76  0 0 0 0 0.66  0 0 0 0 0.48  0 0 0 1.6 -0.78"/>
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>
    <filter id="cloudLight" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(9 / SIZE).toFixed(5)}" numOctaves="3" seed="9" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.995  0 0 0 0 0.975  0 0 0 1.4 -0.62"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(512 / SIZE).toFixed(4)}" numOctaves="2" seed="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0.5 -0.2"/>
    </filter>
    <filter id="embed" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.35"/></filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="${BASE}"/>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#cloud)" opacity="0.32"/>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#floc)" opacity="0.28"/>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#cloudLight)" opacity="0.6"/>
  <g fill="none" stroke-linecap="round" filter="url(#embed)">
    ${fibers({ count: 120, minLen: 70, maxLen: 240, color: "#c2ad85", width: [1.2, 2.8], opacity: [0.1, 0.2] })}
    ${fibers({ count: 90, minLen: 60, maxLen: 200, color: "#fffcf4", width: [1.5, 3.2], opacity: [0.3, 0.55] })}
  </g>
  <g fill="none" stroke-linecap="round" filter="url(#soft)">
    ${fibers({ count: 700, minLen: 6, maxLen: 34, color: "#b8a47e", width: [0.3, 0.7], opacity: [0.1, 0.24] })}
    ${fibers({ count: 70, minLen: 40, maxLen: 150, color: "#ad9870", width: [0.4, 0.9], opacity: [0.12, 0.26] })}
    ${fibers({ count: 60, minLen: 30, maxLen: 140, color: "#fffdf8", width: [0.6, 1.3], opacity: [0.4, 0.75] })}
  </g>
  <g filter="url(#soft)">${flecks(40)}</g>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#grain)" opacity="0.35"/>
</svg>`;

mkdirSync("public/textures", { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
const info = await sharp(png).webp({ quality: 90, effort: 6 }).toFile("public/textures/hanji.webp");
console.log(`hanji.webp ${SIZE}x${SIZE} ${(info.size / 1024).toFixed(0)}KB`);

// 확인용: 2×2로 이어 붙인 미리보기(이음매 점검)
if (process.argv.includes("--preview")) {
  await sharp({ create: { width: SIZE * 2, height: SIZE * 2, channels: 3, background: BASE } })
    .composite([
      { input: png, left: 0, top: 0 },
      { input: png, left: SIZE, top: 0 },
      { input: png, left: 0, top: SIZE },
      { input: png, left: SIZE, top: SIZE },
    ])
    .resize(SIZE, SIZE)
    .png()
    .toFile(process.argv[process.argv.indexOf("--preview") + 1]);
}
