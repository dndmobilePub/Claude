#!/usr/bin/env node
// token-sync 변환 스크립트 — export-tokens.js가 돌려준 내보내기 텍스트를 코드 토큰 파일로 바꾼다. 외부 패키지 없음.
// 변환 규칙 원본: docs/DESIGN.md 3-2(변수)·3-3(스타일)·9번(프로젝트별 예외). 같은 입력 → 같은 결과.
//
// 사용: node .claude/skills/token-sync/convert-tokens.mjs <내보내기 파일> [--write] [--root <프로젝트 폴더>]
//   기본(비교만): 해시 검사 → 변환 → 멈춤 조건·제외 목록·기존 파일과의 차이(추가·변경·삭제, 삭제 토큰 사용처) 보고
//   --write: 멈춤 조건이 없을 때만 토큰 파일을 통째로 새로 쓴다. (docs/PROJECT.md "코드 토큰 위치")
//   종료 코드: 0 정상 / 1 멈춤 조건·해시 불일치 / 2 사용법 오류
//
// 내보내기 형식 v1 (export-tokens.js와 같게 유지)
//   첫 줄   @token-export v1 lines=<본문 줄 수> fnv=<본문 FNV-1a 32비트 16진수>   (본문 = 둘째 줄부터, "\n"으로 이음)
//   #C <컬렉션>|<모드1>;<모드2>...          컬렉션 시작. 첫 모드가 기본 모드
//   <변수 이름>|<종류><적용 범위>[!]|<값>[ ; <값>...]
//      종류 C 색 / F 숫자 / S 문자열 / B 불리언. 적용 범위는 한 글자씩(아래 SCOPE). ! = 게시에서 숨김
//      값은 모드 순서. 모든 모드가 같으면 하나만. 별칭 @<이름>, 다른 파일 @R:<이름>, 못 찾음 @?
//      색 #rrggbb(aa), 숫자 그대로, 문자열 "JSON", 불리언 true/false
//   #T                                        텍스트 스타일
//   <이름>|"<글꼴>"|<글꼴 스타일>|<크기>|<행간 20px·150%·auto>|<자간 -0.3px·-2%>|<대소문자>|<꾸밈>|<연결 키=@이름,...>
//   #E                                        효과 스타일
//   <이름>|<효과>[ + <효과>]   효과 = D(드롭)·I(안쪽),x,y,흐림,퍼짐,#색[,연결 키=@이름...] / L(레이어 블러)·B(배경 블러),반경
//
// docs/DESIGN.md 9번에서 읽는 값 (백틱 안 `키=값`, 여러 개는 쉼표로)
//   모드 속성: `data-theme`(모든 컬렉션) 또는 `<컬렉션>=<속성>`   모드 이름: `<Figma 모드>=<코드 값>`
//   대체 글꼴: `<글꼴>=<뒤에 붙일 대체 목록>` (출력: "<글꼴>", <대체 목록>)   동기화 제외 컬렉션: `<컬렉션>`   동기화 제외 스타일: `<이름 앞부분>`
//   스타일 토큰 앞머리: `text=<앞머리>`, `shadow=<앞머리>`   숫자 단위 지정: `<이름 첫 단계>=px|none`

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tokenDir, pubDir } from '../../scripts/project-values.mjs';

const SCOPE = {
  A: 'ALL_SCOPES', F: 'ALL_FILLS', f: 'FRAME_FILL', s: 'SHAPE_FILL', t: 'TEXT_FILL', k: 'STROKE_COLOR', e: 'EFFECT_COLOR',
  y: 'FONT_FAMILY', Y: 'FONT_STYLE', w: 'FONT_WEIGHT', z: 'FONT_SIZE', l: 'LINE_HEIGHT', p: 'LETTER_SPACING',
  P: 'PARAGRAPH_SPACING', N: 'PARAGRAPH_INDENT', h: 'WIDTH_HEIGHT', g: 'GAP', r: 'CORNER_RADIUS', o: 'STROKE_FLOAT',
  x: 'EFFECT_FLOAT', O: 'OPACITY', T: 'TEXT_CONTENT',
};
const PX_SCOPES = ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'STROKE_FLOAT', 'EFFECT_FLOAT', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT'];
const NONE_SCOPES = ['FONT_WEIGHT', 'OPACITY'];
const PX_FIRST = ['spacing', 'space', 'gap', 'radius', 'border', 'size', 'width', 'height', 'font-size', 'line-height', 'letter-spacing', 'stroke', 'blur'];
const NONE_FIRST = ['font-weight', 'opacity', 'z-index'];
const WEIGHT = { thin: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
const HEADER = '자동 생성 — 직접 고치지 마세요. token-sync 스킬로 갱신합니다.';

// ---------- 공용 ----------
export function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
export const cssName = (name) =>
  name.toLowerCase().replace(/[/\s]+/g, '-').replace(/\./g, '_').replace(/[^a-z0-9_-]/g, '').replace(/^-+|-+$/g, '');
function refKey(seg) {
  const words = seg.replace(/\./g, '_').split(/[-\s]+/).map((w) => w.replace(/[^A-Za-z0-9_]/g, '')).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))).join('');
}
const quoteKey = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : `'${k}'`);

// 값 사이 " ; " 로 나눈다. 따옴표 안은 나누지 않는다.
function splitValues(s) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') q = !q;
    if (!q && s.startsWith(' ; ', i)) { out.push(cur); cur = ''; i += 2; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

// ---------- 읽기 ----------
export function parseExport(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const m = /^@token-export v1 lines=(\d+) fnv=([0-9a-f]+)$/.exec(lines[0] || '');
  if (!m) throw new Error('첫 줄이 "@token-export v1 lines=<n> fnv=<hash>"가 아닙니다.');
  const body = lines.slice(1);
  const errors = [];
  if (body.length !== Number(m[1])) errors.push(`줄 수가 다릅니다: 첫 줄 ${m[1]}, 실제 ${body.length} (조각을 빠뜨렸거나 순서가 바뀜)`);
  if (fnv(body.join('\n')) !== m[2]) errors.push(`해시가 다릅니다: 첫 줄 ${m[2]}, 실제 ${fnv(body.join('\n'))} (옮겨 적은 내용이 원본과 다름)`);
  const data = { collections: [], texts: [], effects: [] };
  let sec = null;
  let col = null;
  for (const line of body) {
    if (line.startsWith('#C ')) {
      const [name, modes] = line.slice(3).split('|');
      col = { name, modes: modes.split(';'), vars: [] };
      data.collections.push(col);
      sec = 'C';
    } else if (line === '#T') sec = 'T';
    else if (line === '#E') sec = 'E';
    else if (sec === 'C') {
      const i1 = line.indexOf('|');
      const i2 = line.indexOf('|', i1 + 1);
      const name = line.slice(0, i1);
      const meta = line.slice(i1 + 1, i2);
      const vals = splitValues(line.slice(i2 + 1));
      const type = meta[0];
      const hidden = meta.endsWith('!');
      const scopes = [...meta.slice(1, hidden ? -1 : undefined)].map((c) => SCOPE[c] || c);
      while (vals.length < col.modes.length) vals.push(vals[0]);
      col.vars.push({ name, type, hidden, scopes, values: vals, collection: col.name });
    } else if (sec === 'T') {
      const f = line.split('|');
      const bound = {};
      for (const kv of (f[8] || '').split(',').filter(Boolean)) { const j = kv.indexOf('='); bound[kv.slice(0, j)] = kv.slice(j + 1); }
      data.texts.push({ name: f[0], family: JSON.parse(f[1]), style: f[2], size: Number(f[3]), lineHeight: f[4], letterSpacing: f[5], textCase: f[6], decoration: f[7], bound });
    } else if (sec === 'E') {
      const j = line.indexOf('|');
      const items = line.slice(j + 1).split(' + ').filter(Boolean).map((e) => {
        const p = e.split(',');
        const bound = {};
        const t = p[0];
        const n = t === 'D' || t === 'I' ? 6 : 2;
        for (const kv of p.slice(n)) { const k = kv.indexOf('='); bound[kv.slice(0, k)] = kv.slice(k + 1); }
        return t === 'D' || t === 'I'
          ? { type: t, x: Number(p[1]), y: Number(p[2]), blur: Number(p[3]), spread: Number(p[4]), color: p[5], bound }
          : { type: t, radius: Number(p[1]), bound };
      });
      data.effects.push({ name: line.slice(0, j), items });
    }
  }
  return { data, errors };
}

// docs/DESIGN.md 9번의 한 줄에서 백틱 값들을 읽는다.
function exceptionItems(designText, key) {
  const sec = designText.split(/^## 9\./m)[1] || '';
  const line = sec.split('\n').find((l) => l.startsWith(`- ${key}:`));
  if (!line || /\[TODO/.test(line.split(':').slice(1).join(':').trim().slice(0, 6))) return [];
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}
const pairs = (items) => Object.fromEntries(items.filter((s) => s.includes('=')).map((s) => { const i = s.indexOf('='); return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; }));

export function readOptions(root) {
  let d = '';
  try { d = readFileSync(join(root, 'docs/DESIGN.md'), 'utf8'); } catch { /* 기본값 */ }
  let p = '';
  try { p = readFileSync(join(root, 'docs/PROJECT.md'), 'utf8'); } catch { /* 기본값 */ }
  const modeItems = exceptionItems(d, '모드 속성');
  const prefixes = pairs(exceptionItems(d, '스타일 토큰 앞머리'));
  const lang = (/^- 퍼블 언어:\s*(.+)$/m.exec(p) || [])[1] || '';
  const ts = (/^- TypeScript:\s*(.+)$/m.exec(p) || [])[1] || '';
  return {
    modeAttrDefault: modeItems.find((s) => !s.includes('=')) || 'data-theme',
    modeAttr: pairs(modeItems),
    modeName: pairs(exceptionItems(d, '모드 이름')),
    fallback: pairs(exceptionItems(d, '대체 글꼴')),
    skipCollections: exceptionItems(d, '동기화 제외 컬렉션').filter((s) => !s.includes('=')),
    skipStyles: exceptionItems(d, '동기화 제외 스타일').filter((s) => !s.includes('=')),
    unitFor: pairs(exceptionItems(d, '숫자 단위 지정')),
    textPrefix: prefixes.text || 'text-',
    shadowPrefix: prefixes.shadow || 'shadow-',
    refFile: /react|vue/i.test(lang) ? (/^사용/.test(ts.trim()) ? 'tokens.ts' : 'tokens.js') : null,
  };
}

// ---------- 변환 ----------
export function convert(data, opt) {
  const stops = [];
  const excluded = [];
  const cols = data.collections.filter((c) => {
    if (opt.skipCollections.includes(c.name)) { excluded.push(`컬렉션 ${c.name} (9번 제외)`); return false; }
    return true;
  });
  const byName = new Map();
  for (const c of data.collections) for (const v of c.vars) {
    if (!byName.has(v.name)) byName.set(v.name, []);
    byName.get(v.name).push(v);
  }
  // 대상: 숨기지 않은 변수 + 그것이 가리키는 숨긴 변수(계속 따라감). 불리언 제외
  const target = new Set();
  const visit = (v) => {
    if (target.has(v)) return;
    target.add(v);
    for (const val of v.values) if (val.startsWith('@') && !val.startsWith('@R:') && val !== '@?') {
      const t = byName.get(val.slice(1)) || [];
      if (t.length === 1 && !opt.skipCollections.includes(t[0].collection)) visit(t[0]);
    }
  };
  for (const c of cols) for (const v of c.vars) {
    if (v.type === 'B') { excluded.push(`불리언 ${v.name}`); continue; }
    if (!v.hidden) visit(v);
  }
  // 스타일이 연결한 숨긴 변수도 포함
  const styleRefs = [...data.texts.flatMap((t) => Object.values(t.bound)), ...data.effects.flatMap((e) => e.items.flatMap((i) => Object.values(i.bound)))];
  for (const r of styleRefs) { const t = byName.get(r.slice(1)) || []; if (t.length === 1 && !opt.skipCollections.includes(t[0].collection)) visit(t[0]); }
  for (const c of cols) for (const v of c.vars) if (v.hidden && !target.has(v) && v.type !== 'B') excluded.push(`숨긴 변수 ${v.name} (가리키는 토큰 없음)`);

  const resolveRef = (val, where) => {
    if (val === '@?') { stops.push(`${where}: 별칭 대상을 찾을 수 없음`); return null; }
    if (val.startsWith('@R:')) { stops.push(`${where}: 다른 파일·라이브러리 변수 ${val.slice(3)}를 가리킴`); return null; }
    const t = byName.get(val.slice(1)) || [];
    if (t.length > 1) { stops.push(`${where}: 이름이 같은 변수가 둘 이상 (${val.slice(1)})`); return null; }
    if (!t.length || !target.has(t[0])) { stops.push(`${where}: 동기화 범위 밖 변수 ${val.slice(1)}를 가리킴`); return null; }
    return `var(--${cssName(t[0].name)})`;
  };
  const unitOf = (v) => {
    if (v.scopes.some((s) => PX_SCOPES.includes(s))) return 'px';
    if (v.scopes.length && v.scopes.every((s) => NONE_SCOPES.includes(s))) return v.scopes.includes('OPACITY') ? 'opacity' : 'none';
    const raw = v.name.split('/')[0];
    const first = cssName(raw);
    const set = opt.unitFor[raw] || opt.unitFor[first];
    if (set) return set === 'px' ? 'px' : 'none';
    if (PX_FIRST.includes(first)) return 'px';
    if (NONE_FIRST.includes(first)) return first === 'opacity' ? 'opacity' : 'none';
    return null;
  };
  const fontList = (fam) => (opt.fallback[fam] ? `${JSON.stringify(fam)}, ${opt.fallback[fam]}` : JSON.stringify(fam));
  const literal = (v, val) => {
    if (v.type === 'C') return val.toLowerCase();
    if (v.type === 'F') {
      const u = unitOf(v);
      if (!u) { stops.push(`${v.name}: 숫자 단위를 정할 수 없음 (적용 범위 ${v.scopes.join(',') || '없음'}) → 9번 "숫자 단위 지정"`); return null; }
      if (u === 'px') return `${Number(val)}px`;
      if (u === 'opacity') return String(Number(val) > 1 ? Number(val) / 100 : Number(val));
      return String(Number(val));
    }
    const s = JSON.parse(val);
    if (v.scopes.includes('FONT_FAMILY') || /font.?family/i.test(v.name)) return fontList(s);
    if (v.scopes.includes('FONT_STYLE')) {
      const w = WEIGHT[s.toLowerCase().replace(/italic|\s/g, '')];
      if (!w) { stops.push(`${v.name}: 굵기 이름 "${s}"를 숫자로 바꿀 수 없음`); return null; }
      return String(w);
    }
    return JSON.stringify(s);
  };

  // 변수 토큰
  const vars = [];
  const seen = new Map();
  for (const c of data.collections) for (const v of c.vars) {
    if (!target.has(v)) continue;
    const css = cssName(v.name);
    if (!css) { stops.push(`${v.name}: 이름에서 영문·숫자가 남지 않음`); continue; }
    if (seen.has(css)) { stops.push(`${v.name}: 변환한 이름 --${css}이(가) ${seen.get(css)}와 겹침`); continue; }
    seen.set(css, v.name);
    const out = v.values.map((val) => (val.startsWith('@') ? resolveRef(val, v.name) : literal(v, val)));
    vars.push({ v, css, out, alias: v.values.some((x) => x.startsWith('@')), col: c });
  }
  const paths = [...seen.values()].map((n) => n.split('/'));
  for (const p of paths) for (const q of paths) if (p.length < q.length && p.every((s, i) => s === q[i])) stops.push(`${p.join('/')}: 값이면서 하위 단계(${q.join('/')})를 가짐`);

  // 모드
  const multi = cols.filter((c) => c.modes.length > 1);
  if (multi.length > 1 && !multi.every((c) => opt.modeAttr[c.name])) stops.push(`모드가 둘 이상인 컬렉션이 ${multi.length}개 (${multi.map((c) => c.name).join(', ')}) → 9번 "모드 속성"에 컬렉션별 속성을 적는다`);
  const blocks = new Map();
  for (const t of vars) {
    t.col.modes.slice(1).forEach((mode, i) => {
      if (t.out[i + 1] === t.out[0]) return;
      const val = opt.modeName[mode] || cssName(mode);
      if (!val) { stops.push(`모드 "${mode}": 코드 값으로 바꿀 수 없음 → 9번 "모드 이름"`); return; }
      const sel = `[${opt.modeAttr[t.col.name] || opt.modeAttrDefault}="${val}"]`;
      if (!blocks.has(sel)) blocks.set(sel, []);
      blocks.get(sel).push(t);
      t[sel] = t.out[i + 1];
    });
  }

  // 텍스트 스타일
  const skipStyle = (n) => opt.skipStyles.some((p) => n.startsWith(p.replace(/\*$/, '')));
  const prefixed = (name, prefix) => {
    const css = cssName(name);
    return css.startsWith(prefix) ? css : prefix + css;
  };
  const texts = [];
  const styleNames = new Map();
  for (const s of data.texts) {
    if (skipStyle(s.name)) { excluded.push(`텍스트 스타일 ${s.name} (9번 제외)`); continue; }
    const base = prefixed(s.name, opt.textPrefix);
    const b = (k) => (s.bound[k] ? resolveRef(s.bound[k], `텍스트 스타일 ${s.name} ${k}`) : null);
    const style = s.style.toLowerCase();
    const w = WEIGHT[style.replace(/italic|oblique|\s/g, '')];
    if (!s.bound.fontWeight && !w) stops.push(`텍스트 스타일 ${s.name}: 글꼴 스타일 "${s.style}"를 굵기로 바꿀 수 없음`);
    const lh = s.lineHeight === 'auto' ? 'normal' : s.lineHeight.endsWith('%') ? String(parseFloat(s.lineHeight) / 100) : s.lineHeight;
    const ls = s.letterSpacing.endsWith('%') ? `${parseFloat(s.letterSpacing) / 100}em` : `${parseFloat(s.letterSpacing)}px`;
    const props = [
      ['font-family', 'fontFamily', b('fontFamily') || fontList(s.family)],
      ['font-size', 'fontSize', b('fontSize') || `${s.size}px`],
      ['font-weight', 'fontWeight', b('fontWeight') || String(w)],
      ['line-height', 'lineHeight', (s.lineHeight.endsWith('px') && b('lineHeight')) || lh],
      ['letter-spacing', 'letterSpacing', (s.letterSpacing.endsWith('px') && b('letterSpacing')) || ls],
    ];
    if (/italic|oblique/.test(style)) props.push(['font-style', 'fontStyle', 'italic']);
    const tc = { UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize' }[s.textCase];
    if (tc) props.push(['text-transform', 'textTransform', tc]);
    const td = { UNDERLINE: 'underline', STRIKETHROUGH: 'line-through' }[s.decoration];
    if (td) props.push(['text-decoration', 'textDecoration', td]);
    if (seen.has(base) || styleNames.has(base)) { stops.push(`텍스트 스타일 ${s.name}: 이름 ${base}가 다른 토큰과 겹침`); continue; }
    styleNames.set(base, s.name);
    texts.push({ s, base, props });
  }

  // 그림자
  const shadows = [];
  for (const e of data.effects) {
    if (skipStyle(e.name)) { excluded.push(`효과 스타일 ${e.name} (9번 제외)`); continue; }
    const sh = e.items.filter((i) => i.type === 'D' || i.type === 'I');
    if (!sh.length) { excluded.push(`효과 스타일 ${e.name} (블러)`); continue; }
    if (sh.length < e.items.length) excluded.push(`효과 스타일 ${e.name}의 블러 효과`);
    const base = prefixed(e.name, opt.shadowPrefix);
    if (seen.has(base) || styleNames.has(base)) { stops.push(`효과 스타일 ${e.name}: 이름 ${base}가 다른 토큰과 겹침`); continue; }
    styleNames.set(base, e.name);
    const f = (i, k, v, unit = 'px') => (i.bound[k] ? resolveRef(i.bound[k], `효과 스타일 ${e.name} ${k}`) : `${v}${unit}`);
    const value = sh.map((i) => `${i.type === 'I' ? 'inset ' : ''}${f(i, 'offsetX', i.x)} ${f(i, 'offsetY', i.y)} ${f(i, 'radius', i.blur)} ${f(i, 'spread', i.spread)} ${i.bound.color ? resolveRef(i.bound.color, `효과 스타일 ${e.name} color`) : i.color.toLowerCase()}`).join(', ');
    shadows.push({ e, base, value });
  }

  // 출력
  const byCss = (a, b) => (a.css < b.css ? -1 : a.css > b.css ? 1 : 0);
  const prim = vars.filter((t) => !t.alias).sort(byCss);
  const sem = vars.filter((t) => t.alias).sort(byCss);
  const sortBase = (a, b) => (a.base < b.base ? -1 : a.base > b.base ? 1 : 0);
  texts.sort(sortBase);
  shadows.sort(sortBase);
  const root = [...prim, ...sem].map((t) => `  --${t.css}: ${t.out[0]};`);
  for (const t of texts) for (const [p, , val] of t.props) root.push(`  --${t.base}-${p}: ${val};`);
  for (const s of shadows) root.push(`  --${s.base}: ${s.value};`);
  let css = `/* ${HEADER} */\n:root {\n${root.join('\n')}\n}\n`;
  for (const [sel, list] of blocks) css += `\n${sel} {\n${[...list].sort(byCss).map((t) => `  --${t.css}: ${t[sel]};`).join('\n')}\n}\n`;

  const textCss = texts.length
    ? `/* text-styles.css — ${HEADER} */\n` + texts.map((t) => `.${t.base} {\n${t.props.map(([p]) => `  ${p}: var(--${t.base}-${p});`).join('\n')}\n}\n`).join('\n')
    : null;

  // 참조 파일
  let ref = null;
  if (opt.refFile) {
    const tree = {};
    const put = (segs, val, where) => {
      let o = tree;
      for (let i = 0; i < segs.length; i++) {
        const k = refKey(segs[i]) || '_';
        if (i === segs.length - 1) {
          if (k in o) { stops.push(`참조 파일: ${where}의 경로가 다른 토큰과 겹침`); return; }
          o[k] = val;
        } else {
          if (typeof o[k] === 'string') { stops.push(`참조 파일: ${where}의 경로가 다른 토큰과 겹침`); return; }
          o = o[k] ||= {};
        }
      }
    };
    for (const t of [...prim, ...sem]) put(t.v.name.split('/'), `var(--${t.css})`, t.v.name);
    const segsFor = (name, root) => { const s = name.split('/'); return cssName(s[0]) === root ? s : [root, ...s]; };
    for (const t of texts) {
      const obj = Object.fromEntries(t.props.map(([p, key]) => [key, `var(--${t.base}-${p})`]));
      put(segsFor(t.s.name, opt.textPrefix.replace(/-$/, '')), obj, t.s.name);
    }
    for (const s of shadows) put(segsFor(s.e.name, opt.shadowPrefix.replace(/-$/, '')), `var(--${s.base})`, s.e.name);
    const ser = (o, ind) => `{\n${Object.entries(o).map(([k, v]) => `${ind}  ${quoteKey(k)}: ${typeof v === 'string' ? `'${v}'` : ser(v, ind + '  ')},`).join('\n')}\n${ind}}`;
    ref = `// ${HEADER}\nexport const tokens = ${ser(tree, '')}${opt.refFile === 'tokens.ts' ? ' as const' : ''};\n`;
  }

  const files = { 'tokens.css': css };
  if (textCss) files['text-styles.css'] = textCss;
  if (ref) files[opt.refFile] = ref;
  return {
    stops: [...new Set(stops)],
    excluded,
    files,
    counts: { vars: vars.length, prim: prim.length, sem: sem.length, modes: [...blocks.keys()], texts: texts.length, shadows: shadows.length },
  };
}

// ---------- 기존 파일과 비교 ----------
export function cssTokens(text) {
  const map = new Map();
  let sel = null;
  for (const line of (text || '').split('\n')) {
    const open = /^([^\s].*?)\s*\{\s*$/.exec(line);
    if (open) { sel = open[1]; continue; }
    if (/^\}/.test(line)) { sel = null; continue; }
    const m = /^\s*--([\w-]+):\s*(.+);\s*$/.exec(line);
    if (m && sel) map.set(`${sel === ':root' ? '' : sel + ' '}--${m[1]}`, m[2]);
  }
  return map;
}
function usages(root, name) {
  const dir = join(root, pubDir(root));
  const skip = resolve(root, tokenDir(root));
  let n = 0;
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (resolve(p).startsWith(skip)) continue;
      if (statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p); continue; }
      if (!/\.(css|scss|sass|less|vue|jsx?|tsx?|html?)$/.test(f)) continue;
      if (readFileSync(p, 'utf8').includes(name)) n++;
    }
  };
  walk(dir);
  return n;
}

// ---------- 실행 ----------
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : process.cwd();
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');
  if (!file) { console.error('사용: node convert-tokens.mjs <내보내기 파일> [--write] [--root <폴더>]'); process.exit(2); }
  const { data, errors } = parseExport(readFileSync(file, 'utf8'));
  if (errors.length) { console.log('## 내보내기 검사 실패 — 변환하지 않습니다'); errors.forEach((e) => console.log(`- ${e}`)); process.exit(1); }
  const opt = readOptions(root);
  const r = convert(data, opt);
  const dir = join(root, tokenDir(root));
  console.log(`## 토큰 변환 결과 (토큰 위치 ${tokenDir(root)})`);
  console.log(`- 변수: ${r.counts.vars} (원시 ${r.counts.prim} · 의미 ${r.counts.sem}), 모드 블록: ${r.counts.modes.join(' ') || '없음'}`);
  console.log(`- 스타일: 텍스트 ${r.counts.texts} · 그림자 ${r.counts.shadows}`);
  console.log(`- 만들 파일: ${Object.keys(r.files).join(', ')}`);
  console.log(`- 제외 ${r.excluded.length}건${r.excluded.length ? ': ' + r.excluded.slice(0, 20).join(' / ') + (r.excluded.length > 20 ? ` 외 ${r.excluded.length - 20}건` : '') : ''}`);
  const before = cssTokens(existsSync(join(dir, 'tokens.css')) ? readFileSync(join(dir, 'tokens.css'), 'utf8') : '');
  const after = cssTokens(r.files['tokens.css']);
  if (!before.size) console.log('- 기존 파일 없음 → 최초 생성');
  else {
    const added = [...after.keys()].filter((k) => !before.has(k));
    const removed = [...before.keys()].filter((k) => !after.has(k));
    const changed = [...after.keys()].filter((k) => before.has(k) && before.get(k) !== after.get(k));
    console.log(`- 비교: 추가 ${added.length} / 값 변경 ${changed.length} / 삭제 ${removed.length}`);
    for (const k of changed.slice(0, 30)) console.log(`  - 값 변경 ${k}: ${before.get(k)} → ${after.get(k)}`);
    for (const k of removed) {
      const name = k.replace(/^.* /, '');
      const n = usages(root, name);
      console.log(`  - 삭제 ${k}${n ? ` — 사용처 ${n}곳 (멈춤)` : ''}`);
      if (n) r.stops.push(`삭제되는 토큰 ${name}을 ${n}곳에서 사용 중`);
    }
  }
  if (r.stops.length) {
    console.log(`\n## 멈춤 조건 ${r.stops.length}건 — 파일을 쓰지 않습니다`);
    r.stops.slice(0, 50).forEach((s) => console.log(`- ${s}`));
    process.exit(1);
  }
  if (args.includes('--write')) {
    mkdirSync(dir, { recursive: true });
    for (const [f, text] of Object.entries(r.files)) writeFileSync(join(dir, f), text);
    console.log(`\n파일을 썼습니다: ${Object.keys(r.files).map((f) => tokenDir(root) + f).join(', ')}`);
  } else console.log('\n비교만 했습니다. 승인받은 뒤 --write로 다시 실행합니다.');
}
