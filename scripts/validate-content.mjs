#!/usr/bin/env node
/**
 * 하루치 콘텐츠 자동 검증
 *
 *   node scripts/validate-content.mjs content/daily/2026/08/2026-08-13.json
 *
 * 형식·길이·중복·금칙어·분포를 검사한다.
 * 재미는 사람(또는 content-checker)이 판단한다. 여기서는 기계가 잡을 수 있는 것만 본다.
 */

import { readFileSync } from "node:fs";

const SIGNS = ["rat","ox","tiger","rabbit","dragon","snake",
               "horse","goat","monkey","rooster","dog","pig"];
const BANDS = ["student","worker","senior"];
const FLOW_TIMES = ["아침","낮","저녁","밤"];
const STAT_NAMES = ["컨디션","재물운","인연운","집중력"];
const AURAS = ["#D6B24C","#7FD0FF","#4A47A0","#7B4AA0","#C0533A","#3B7A5E"];

// 금칙어 — cliche-blacklist.md 와 맞춰서 관리
const BANNED = [
  "좋은 일이","노력한 만큼","귀인","건강에 유의","긍정적인 마음",
  "새로운 기회","금전운이","뜻밖의 행운","차분하게 대처","서두르지 말고",
  "마음가짐","~하리라","할지어다","하시길 바랍니다",
];
const BANNED_CHARS = /[✨🔮💫🌙⭐🎉😀-🙏!]|ㅋㅋ|ㅎㅎ|ㅠㅠ/u;

// 연령대별 금지 소재
const BAND_FORBIDDEN = {
  student: ["결재","월급","회식","상사","팀장","야근","퇴근","연차","입시","등수","성적","술집"],
  worker : ["급식","수행평가","용돈","담임","교복","1교시","야자"],
  senior : ["회의","상사","팀장","야근","결재","출근길","월급날"],
};

const errors = [];
const warns  = [];
const E = (where, msg) => errors.push(`${where} — ${msg}`);
const W = (where, msg) => warns.push(`${where} — ${msg}`);

const path = process.argv[2];
if (!path) {
  console.error("사용법: node scripts/validate-content.mjs <파일경로>");
  process.exit(2);
}

let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`JSON을 읽을 수 없습니다: ${e.message}`);
  process.exit(2);
}

// ── 전체 구조 ────────────────────────────
if (!data.date) E("파일", "date 필드가 없습니다");
if (!Array.isArray(data.sets)) {
  console.error("sets 배열이 없습니다");
  process.exit(2);
}
if (data.sets.length !== 36) {
  E("파일", `세트가 36개여야 합니다 (현재 ${data.sets.length}개)`);
}

// 12띠 × 3연령대가 빠짐없이 있는지
const seen = new Set();
for (const s of data.sets) seen.add(`${s.sign}/${s.band}`);
for (const sign of SIGNS) {
  for (const band of BANDS) {
    if (!seen.has(`${sign}/${band}`)) E("파일", `${sign}/${band} 세트가 없습니다`);
  }
}

// ── 중복 검사용 수집 ─────────────────────
const bucket = { author: new Map(), netflix: new Map(), talisman: new Map(), lead: new Map() };
const collect = (kind, key, where) => {
  if (!key) return;
  const m = bucket[kind];
  if (m.has(key)) E("중복", `${kind} "${key}" 가 ${m.get(key)} 와 ${where} 에 겹칩니다`);
  else m.set(key, where);
};

const len = (s) => [...String(s)].length;

// ── 세트별 검사 ──────────────────────────
for (const s of data.sets) {
  const at = `${s.sign}/${s.band}`;

  if (!SIGNS.includes(s.sign)) E(at, `알 수 없는 띠: ${s.sign}`);
  if (!BANDS.includes(s.band)) E(at, `알 수 없는 연령대: ${s.band}`);

  // lead
  if (!s.lead) E(at, "lead 없음");
  else {
    const n = len(s.lead);
    if (n < 8 || n > 20) W(at, `lead 길이 ${n}자 (권장 10~18)`);
    if (s.lead.endsWith(".")) W(at, "lead 끝에 마침표");
  }

  // body
  if (!Array.isArray(s.body) || s.body.length < 2 || s.body.length > 3) {
    E(at, `body 단락은 2~3개여야 합니다 (현재 ${s.body?.length ?? 0})`);
  } else {
    s.body.forEach((p, i) => {
      const lines = String(p).split("\n");
      if (lines.length !== 2) W(at, `body[${i}] 가 ${lines.length}줄 (권장 2줄)`);
      lines.forEach((L, j) => {
        const n = len(L);
        if (n > 24) E(at, `body[${i}] ${j + 1}번째 줄이 ${n}자 (최대 24)`);
      });
    });
  }

  // flow
  if (!Array.isArray(s.flow) || s.flow.length !== 4) {
    E(at, "flow 는 4개여야 합니다");
  } else {
    s.flow.forEach(([t, lv], i) => {
      if (t !== FLOW_TIMES[i]) E(at, `flow[${i}] 시간대가 "${FLOW_TIMES[i]}" 여야 합니다`);
      if (!Number.isInteger(lv) || lv < 1 || lv > 4) E(at, `flow[${i}] 레벨은 1~4`);
    });
    const levels = s.flow.map(f => f[1]);
    if (new Set(levels).size === 1) W(at, "flow 레벨이 전부 같습니다 (기복이 없음)");
  }

  // stats
  if (!Array.isArray(s.stats) || s.stats.length !== 4) {
    E(at, "stats 는 4개여야 합니다");
  } else {
    s.stats.forEach(([name, v], i) => {
      if (name !== STAT_NAMES[i]) E(at, `stats[${i}] 항목명은 "${STAT_NAMES[i]}"`);
      if (typeof v !== "number" || v < 0 || v > 100) E(at, `stats[${i}] 값은 0~100`);
    });
  }

  // score / aura
  if (typeof s.score !== "number" || s.score < 0 || s.score > 100) E(at, "score 는 0~100");
  if (!AURAS.includes(s.aura)) E(at, `aura 는 지정 팔레트 6색 중 하나 (현재 ${s.aura})`);

  // lucky
  for (const k of ["color", "num", "place", "food"]) {
    if (s.lucky?.[k] === undefined || s.lucky[k] === "") E(at, `lucky.${k} 가 비어 있습니다`);
  }

  // ally / foe
  const signKo = { rat:"쥐",ox:"소",tiger:"범",rabbit:"토끼",dragon:"용",snake:"뱀",
                   horse:"말",goat:"양",monkey:"원숭이",rooster:"닭",dog:"개",pig:"돼지" }[s.sign];
  if (s.ally?.[0]?.startsWith(signKo)) E(at, "ally 에 자기 띠를 넣을 수 없습니다");
  if (s.foe?.[0]?.startsWith(signKo)) E(at, "foe 에 자기 띠를 넣을 수 없습니다");

  // 명언
  if (!s.quote?.text || !s.quote?.author) E(at, "quote 가 불완전합니다");
  if (s.quote?.verified === false) E(at, "출처 미검증 명언은 쓸 수 없습니다");
  collect("author", s.quote?.author, at);

  // 부적
  if (!s.talisman?.name?.endsWith("부")) W(at, `부적 이름은 "○○부" 형태 (현재 ${s.talisman?.name})`);
  if (s.talisman?.phrase && !s.talisman.phrase.includes("하소서"))
    W(at, "부적 문구는 ~하소서 형태를 권장합니다");
  collect("talisman", s.talisman?.name, at);

  // 넷플릭스
  if (s.netflix?.verified === false) E(at, "링크 미검증 작품은 쓸 수 없습니다");
  if (s.netflix?.id && !/^\d{6,10}$/.test(String(s.netflix.id)))
    E(at, `넷플릭스 id 형식이 이상합니다 (${s.netflix.id})`);
  collect("netflix", s.netflix?.title, at);

  collect("lead", s.lead, at);

  // 금칙어 · 이모지 · 느낌표
  const blob = JSON.stringify(s);
  for (const w of BANNED) if (blob.includes(w)) E(at, `금칙어 "${w}"`);
  if (BANNED_CHARS.test(blob)) E(at, "이모지 / 느낌표 / 자음 표현이 있습니다");

  // 연령대 부적합 소재
  for (const w of BAND_FORBIDDEN[s.band] ?? []) {
    if (blob.includes(w)) E(at, `${s.band} 에 부적합한 소재 "${w}"`);
  }
}

// ── 분포 검사 ────────────────────────────
const scores = data.sets.map(s => s.score).filter(n => typeof n === "number");
const high = scores.filter(n => n >= 90).length;
const low  = scores.filter(n => n < 40).length;
if (high < 6 || high > 14) W("분포", `score 90+ 가 ${high}개 (권장 8~12)`);
if (low  < 2 || low  > 8)  W("분포", `score 40미만 이 ${low}개 (권장 3~6)`);

const auraCount = {};
for (const s of data.sets) auraCount[s.aura] = (auraCount[s.aura] ?? 0) + 1;
for (const a of AURAS) {
  const c = auraCount[a] ?? 0;
  if (c === 0) W("분포", `aura ${a} 가 한 번도 안 쓰였습니다`);
  if (c > 10) W("분포", `aura ${a} 가 ${c}회로 편중되었습니다`);
}

// ── 결과 ─────────────────────────────────
const bar = "─".repeat(52);
console.log(bar);
console.log(`  검증 대상 : ${path}`);
console.log(`  세트      : ${data.sets.length} / 36`);
console.log(bar);

if (warns.length) {
  console.log(`\n  경고 ${warns.length}건`);
  warns.forEach(w => console.log(`    · ${w}`));
}

if (errors.length) {
  console.log(`\n  오류 ${errors.length}건 — 배포할 수 없습니다`);
  errors.forEach(e => console.log(`    ✕ ${e}`));
  console.log(`\n${bar}`);
  process.exit(1);
}

console.log(`\n  오류 없음 — 자동 검증 통과`);
console.log(`  다음: content-checker 에이전트로 재미·안전 검수를 받으세요.`);
console.log(bar);
