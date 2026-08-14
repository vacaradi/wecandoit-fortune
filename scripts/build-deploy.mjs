#!/usr/bin/env node
/**
 * 배포용 폴더(dist)를 만든다.
 *
 *   node scripts/build-deploy.mjs
 *
 * web/index.html 은 ../assets 를 참조하지만 배포본은 index.html 이 루트에 놓이므로
 * 경로를 assets/ 로 바꿔서 내보낸다.
 *
 * Netlify 빌드가 이 스크립트를 돌린다. 파이썬은 서버에 없을 수 있어 Node 로 짰다.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync, statSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist");

// ── 초기화 ──────────────────────────────
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ── 부적 이미지 목록 만들기 ──────────────
// assets/talisman 폴더를 훑어서 목록을 만든다.
// 파일을 넣기만 하면 코드를 고치지 않아도 자동으로 쓰인다.
const TAL_DIR = join(ROOT, "assets", "talisman");
let talismans = [];
if (existsSync(TAL_DIR)) {
  talismans = readdirSync(TAL_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => "assets/talisman/" + f);
}
if (!talismans.length) talismans = ["assets/character/poses/wizard-orb.jpg"];

// ── 배포 번호 ───────────────────────────
// 폰이 예전 화면을 붙들고 있는 사고를 막는 장치.
// 앱은 이 번호만 확인해서 다르면 스스로 새로 받는다.
const STAMP = (process.env.GITHUB_SHA || "").slice(0, 7) || String(Date.now());

// ── index.html — 경로 치환 ──────────────
let html = readFileSync(join(ROOT, "web", "index.html"), "utf8");
html = html
  .replaceAll("../assets/", "assets/")
  .replaceAll("../content/", "content/")

  // 부적 이미지 목록을 실제 파일 목록으로 갈아끼운다
  .replace(/const TALISMANS=\[[^\]]*\];/,
           "const TALISMANS=" + JSON.stringify(talismans) + ";")

  // 배포 번호를 심는다
  .replace(/const BUILD="[^"]*";/, 'const BUILD="' + STAMP + '";');
writeFileSync(join(DIST, "index.html"), html, "utf8");
writeFileSync(join(DIST, "version.json"), JSON.stringify({ build: STAMP }), "utf8");

// ── 실제로 쓰이는 파일만 복사 ────────────
const COPY = [
  // 영상 · 캐릭터
  ["assets/video/main/hero.mp4", "assets/video/main/hero.mp4"],
  ["assets/video/main/hero-poster.jpg", "assets/video/main/hero-poster.jpg"],
  ["assets/video/main/quote.mp4", "assets/video/main/quote.mp4"],
  ["assets/video/main/quote-poster.jpg", "assets/video/main/quote-poster.jpg"],
  ["assets/character/poses/wizard-orb.jpg", "assets/character/poses/wizard-orb.jpg"],
  // 브랜드 · 아이콘 (홈화면 설치와 카톡 썸네일에 필요)
  ["assets/brand/logo.png", "assets/brand/logo.png"],
  ["assets/brand/favicon.ico", "assets/brand/favicon.ico"],
  ["assets/brand/icon-192.png", "assets/brand/icon-192.png"],
  ["assets/brand/icon-512.png", "assets/brand/icon-512.png"],
  ["assets/brand/apple-touch-icon.png", "assets/brand/apple-touch-icon.png"],
  ["assets/brand/og-image.png", "assets/brand/og-image.png"],
  ["assets/brand/logo-instagram.png", "assets/brand/logo-instagram.png"],
  ["assets/brand/logo-netflix.png",   "assets/brand/logo-netflix.png"],
  ["assets/brand/logo-chest.png",     "assets/brand/logo-chest.png"],
  ["assets/brand/logo-joseonlab.png", "assets/brand/logo-joseonlab.png"],
  // 앱 설치 정보
  ["web/manifest.webmanifest", "manifest.webmanifest"],
  ["web/sw.js", "sw.js"],
];

const missing = [];
for (const [src, dst] of COPY) {
  const from = join(ROOT, src);
  if (!existsSync(from)) { missing.push(src); continue; }
  const to = join(DIST, dst);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}

// ── manifest 안 경로 보정 ───────────────
const mf = join(DIST, "manifest.webmanifest");
if (existsSync(mf)) {
  let txt = readFileSync(mf, "utf8")
    .replaceAll("../assets/", "assets/")
    .replace('"start_url": "./index.html"', '"start_url": "./"')
    ;
  writeFileSync(mf, txt, "utf8");
}

// ── 부적 이미지 복사 ────────────────────
// _source 같은 하위 폴더(원본 보관용)는 배포에 넣지 않는다.
if (talismans.length) {
  for (const rel of talismans) {
    const from = join(ROOT, rel);
    if (!existsSync(from)) continue;
    const to = join(DIST, rel);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }
}

// ── 매일 생성되는 콘텐츠 ────────────────
const daily = join(ROOT, "content", "daily");
if (existsSync(daily)) {
  cpSync(daily, join(DIST, "content", "daily"), { recursive: true });
}

// ── 캐시 정책 ───────────────────────────
// 영상·이미지는 오래 캐시하고, HTML 은 항상 새로 받게 한다.
writeFileSync(join(DIST, "_headers"), `/*
  X-Content-Type-Options: nosniff

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: no-store

/index.html
  Cache-Control: no-store

/manifest.webmanifest
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache

/content/*
  Cache-Control: no-cache
`, "utf8");

// ── 결과 ────────────────────────────────
let total = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else {
      total += st.size;
      console.log("   %s %s KB",
        relative(DIST, p).replaceAll("\\", "/").padEnd(46),
        String(Math.round(st.size / 1024)).padStart(5));
    }
  }
};

console.log("배포 폴더 생성 완료");
console.log("  위치 :", DIST);
walk(DIST);
console.log("  용량 : %s MB", (total / 1024 / 1024).toFixed(2));
if (missing.length) {
  console.log("\n  빠진 파일:");
  for (const m of missing) console.log("   -", m);
}
