#!/usr/bin/env node
// 퍼블 점검 스크립트 — 규칙으로 확실하게 잡을 수 있는 것만 찾는다. (판단이 필요한 점검은 ds-check 스킬이 이어서 한다)
// 외부 패키지 없이 Node만으로 동작한다. 읽기만 하고 파일을 고치지 않는다.
//
// 사용
//   node .claude/scripts/check-pub.mjs              바뀐 파일만 (git의 변경·새 파일 중 퍼블 소스 폴더 아래. docs/PROJECT.md, 기본 src/)
//   node .claude/scripts/check-pub.mjs <경로...>    지정한 파일·폴더만
//
// 점검 (근거 문서)
//   P1 정의되지 않은 토큰 사용 — var(--x)의 --x가 어디에도 정의돼 있지 않음 (DESIGN.md 3-1)       높음
//   P2 텍스트 스타일 토큰이 있는데 글자 속성을 다른 값·변수로 지정 (DESIGN.md 3-1·3-3)              중간
//   P3 화면 폭: 디자인 프레임 폭 px, vw 글자 크기·간격, zoom (DESIGN.md 6-2)                       높음
//      transform: scale (눌림 효과일 수 있음)                                                     확인 필요
//   P4 개발 몫 코드 의심: 서버 호출·화면 이동 (ARCHITECTURE.md 1번)                                확인 필요
//   P5 data-screen-link 대상 화면 ID가 화면 목록에 없음 (ARCHITECTURE.md 4번)                       높음
//      고정 값은 그대로, 바인딩식(Vue :·v-bind:, JSX {식})은 식 안의 화면 ID 형식 문자열만 대조
//      바인딩식인데 화면 ID 문자열이 없음 (값이 오는 곳을 사람이 확인)                              확인 필요
//   P6 위험한 HTML 삽입, 외부 스크립트 직접 추가 (ARCHITECTURE.md 1번)                              높음
//   P7 스타일 위치 (ARCHITECTURE.md 8번)
//      화면 전용 스타일: screens/ 안의 스타일 파일·Vue <style>·스타일 가져오기, 화면 ID 이름의 스타일 파일   높음
//      global.css 예외: [data-screen="<화면ID>"] 범위가 아님, 바로 위 "/* 예외: <화면ID> — 이유 */" 없음   중간
//      !important                                                                                 확인 필요
//   P9 하드코딩: 색(HEX·rgb·hsl)·2px 이상 px(소수 포함) (DESIGN.md 3·3-4·8번)                       중간
//      토큰 폴더·레이아웃 값 파일·화면 확인 장치 폴더·테스트는 뺀다. 뷰포트 폭을 폭 조건에 쓴 줄은 허용 (.claude/scripts/hardcoded.mjs)
//   P4·P9는 화면 확인 장치(미리보기) 폴더를 보지 않는다 — 개발에 넘기지 않는 퍼블 도구 (ARCHITECTURE.md 6번)
//   P8 문서·에셋 (ARCHITECTURE.md 4-1·4-2)
//      <html>이 있는 문서에 lang·viewport meta·<title>이 없음                                       중간
//      viewport가 확대를 막음 (user-scalable=no, maximum-scale 2 미만)                              높음
//      Figma MCP 임시 에셋 주소가 코드에 남음 (localhost:3845, 127.0.0.1:3845, figma.com/api/mcp/asset)  높음
//
// 결과: 표를 출력한다. 높음·중간이 하나라도 있으면 종료 코드 1, 없으면 0.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pubDir as readPubDir, tokenDir as readTokenDir, screenIdPattern, previewDir } from './project-values.mjs';
import { isHardcodeTarget, findHardcoded, HARDCODE_HINT } from './hardcoded.mjs';

const root = process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL('../..', import.meta.url));
const EXT = /\.(html|vue|jsx?|tsx?|css|scss)$/;
const SKIP = /\.(stories|test|spec)\.|(^|\/)node_modules\//;

const read = (p) => {
  try {
    return readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); // CRLF도 LF로 맞춰 읽는다
  } catch {
    return null;
  }
};
const rel = (p) => relative(root, p).replace(/\\/g, '/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

// ---------- 프로젝트 값 ----------

const project = read(join(root, 'docs/PROJECT.md')) || '';
const pubDir = readPubDir(root);
const tokenDir = readTokenDir(root);

// 뷰포트 표의 디자인 프레임 폭 (예: 402×874 → 402)
const frameWidths = [...project.matchAll(/\|\s*[^|\n]+\|\s*(\d{3,4})\s*[×x]\s*\d{3,4}\s*\|/g)].map((m) => m[1]);

// 화면 목록: IA 사본 + 플로우 문서 표의 첫 칸 ("2. 화면 목록"과 "2-1. 도메인 밖 이동 화면" — 이동 대상으로 인정)
// 화면 ID 모양은 docs/PROJECT.md "화면 ID 형식"을 따른다. 없으면 "영문으로 시작하고 숫자가 들어간 이름"으로 넓게 본다.
const idRe = screenIdPattern(root) || /^[A-Za-z][\w-]*\d[\w-]*$/;
function screenIds() {
  const ids = new Set();
  const take = (text) => {
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      const c = line.split('|').map((x) => x.trim());
      if (c.length > 2 && idRe.test(c[1])) ids.add(c[1]);
    }
  };
  take(read(join(root, 'docs/ia/screen-list.md')));
  const flowDir = join(root, 'docs/ui-flow');
  if (existsSync(flowDir)) for (const f of readdirSync(flowDir)) if (f.endsWith('.md') && !f.startsWith('_')) take(read(join(flowDir, f)));
  return ids;
}

// data-screen-link 속성 읽기: 고정 값이면 { fixed }, 바인딩식이면 { expr }
//   고정: data-screen-link="ID", JSX data-screen-link={"ID"} ({`ID`}는 ${}가 없을 때만)
//   바인딩: Vue :data-screen-link="식"·v-bind:data-screen-link="식", JSX data-screen-link={식}
//   한 줄 안에서만 읽는다. 식이 줄을 넘으면 그 줄 끝까지를 식으로 본다.
function screenLinks(line) {
  const out = [];
  for (const m of line.matchAll(/(:|v-bind:)?data-screen-link\s*=\s*/g)) {
    const bound = Boolean(m[1]);
    const rest = line.slice(m.index + m[0].length);
    const q = rest[0];
    if (q === '"' || q === "'") {
      const end = rest.indexOf(q, 1);
      const value = end < 0 ? rest.slice(1) : rest.slice(1, end);
      out.push(bound ? { expr: value } : { fixed: value });
    } else if (q === '{') {
      let depth = 0;
      let i = 0;
      for (; i < rest.length; i++) {
        if (rest[i] === '{') depth++;
        else if (rest[i] === '}' && --depth === 0) break;
      }
      const inner = rest.slice(1, i).trim();
      const lit = inner.match(/^(["'`])([^"'`]*)\1$/);
      out.push(lit && !lit[2].includes('${') ? { fixed: lit[2] } : { expr: inner });
    }
  }
  return out;
}

// 바인딩식을 보고용으로 줄인다: 60자를 넘으면 단어 경계에서 자르고 … 를 붙인다
function shortExpr(expr) {
  const t = expr.trim().replace(/\s+/g, ' ');
  if (t.length <= 60) return t;
  const cut = t.slice(0, 60);
  const at = cut.search(/\s\S*$/);
  return `${(at > 20 ? cut.slice(0, at) : cut).trimEnd()} …`;
}

// ---------- 대상 파일 ----------

function targets() {
  const args = process.argv.slice(2);
  let files = [];
  if (args.length) {
    for (const a of args) {
      const p = join(root, a);
      if (!existsSync(p)) continue;
      if (statSync(p).isDirectory()) walk(p, files);
      else files.push(p);
    }
  } else {
    const run = (cmd) => {
      try {
        return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
      } catch {
        return [];
      }
    };
    files = [...new Set([...run('git diff --name-only HEAD'), ...run('git ls-files --others --exclude-standard')])]
      .filter((f) => f.startsWith(pubDir))
      .map((f) => join(root, f))
      .filter((p) => existsSync(p));
  }
  return files.filter((p) => EXT.test(p) && !SKIP.test(rel(p)) && !rel(p).startsWith(tokenDir));
}

// ---------- 점검 ----------

const files = targets();
const allSrc = walk(join(root, pubDir));

// 정의된 CSS 변수: 퍼블 소스 폴더 전체(토큰 파일 포함)의 "--이름:" 정의
const defined = new Set();
for (const p of allSrc) for (const m of (read(p) || '').matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
const hasTokens = existsSync(join(root, tokenDir));
const hasTextStyles = [...defined].some((d) => d.startsWith('--text-'));
const ids = screenIds();

const findings = [];
const add = (file, line, code, level, msg) => findings.push({ file: rel(file), line, code, level, msg });

const isComment = (t) => t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');

// P7 — 파일 단위: 화면 전용 스타일, global.css 예외 형식
const STYLE = /\.(css|scss)$/;
function checkStyle(file, lines) {
  const r = rel(file);
  const name = r.split('/').pop();
  const base = name.replace(/\.[^.]+$/, '');
  const inScreens = /(^|\/)screens\//.test(r);
  if (STYLE.test(name) && (inScreens || ids.has(base))) add(file, 1, 'P7', '높음', '화면 전용 스타일 파일 — 스타일은 컴포넌트 안에서, 예외는 global.css (ARCHITECTURE.md 8번)');
  if (inScreens && !STYLE.test(name)) {
    lines.forEach((line, i) => {
      if (/<style[\s>]/.test(line)) add(file, i + 1, 'P7', '높음', '화면 컴포넌트 안의 <style> — 스타일은 컴포넌트 안에서, 예외는 global.css');
      if (/import\s+(?:[\w{},\s*]+\s+from\s+)?["'][^"']+\.(css|scss)["']/.test(line)) add(file, i + 1, 'P7', '높음', '화면 파일에서 스타일 파일을 가져옴 — 화면 전용 스타일을 두지 않음');
    });
  }
  if (/^global\.(css|scss)$/.test(name)) {
    let depth = 0;
    lines.forEach((line, i) => {
      const t = line.trim();
      if (depth === 0 && t.includes('{') && !t.startsWith('@') && !t.startsWith('/*')) {
        const sel = t.slice(0, t.indexOf('{'));
        if (!/\[data-screen\s*=/.test(sel)) add(file, i + 1, 'P7', '중간', `global.css 예외가 화면 범위([data-screen="<화면ID>"])가 아님: ${sel.trim()}`);
        const before = lines.slice(Math.max(0, i - 3), i).join(' ');
        if (!/\/\*\s*예외:/.test(before)) add(file, i + 1, 'P7', '중간', 'global.css 예외 바로 위에 "/* 예외: <화면ID> — 이유 */" 주석이 없음');
      }
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (depth < 0) depth = 0;
    });
  }
}

// P8 — 파일 단위: 문서 기본 요소 (<html>이 있는 파일만)
function checkDocument(file, text) {
  const html = text.match(/<html\b[^>]*>/i);
  if (!html) return;
  const lineOf = (re) => {
    const i = text.search(re);
    return i < 0 ? 1 : text.slice(0, i).split(/\r?\n/).length;
  };
  if (!/\blang\s*=\s*["']?[\w-]+/i.test(html[0])) add(file, lineOf(/<html\b/i), 'P8', '중간', '<html>에 lang이 없음 (docs/PROJECT.md "화면 언어")');
  const vp = text.match(/<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i);
  if (!vp) add(file, lineOf(/<head\b|<html\b/i), 'P8', '중간', 'viewport meta가 없음 (width=device-width, initial-scale=1)');
  else {
    const content = (vp[0].match(/content\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    const max = content.match(/maximum-scale\s*=\s*([\d.]+)/i);
    if (/user-scalable\s*=\s*(no|0)\b/i.test(content) || (max && Number(max[1]) < 2)) add(file, lineOf(/name\s*=\s*["']viewport/i), 'P8', '높음', `viewport가 확대를 막음: ${content} (a11y.md 6번 글자 확대)`);
  }
  if (!/<title>\s*[^<\s][^<]*<\/title>/i.test(text)) add(file, lineOf(/<head\b|<html\b/i), 'P8', '중간', '<title>이 없거나 비어 있음 (IA 화면명, 형식은 ARCHITECTURE.md 11번)');
}

const preview = previewDir(root);
for (const file of files) {
  const text = read(file) || '';
  const lines = text.split(/\r?\n/);
  const relFile = relative(root, file).replace(/\\/g, '/');
  const inPreview = relFile.startsWith(preview);
  // P9
  if (isHardcodeTarget(root, relFile)) {
    for (const f of findHardcoded(root, text)) add(file, f.line, 'P9', '중간', `하드코딩 ${f.name} ${f.value} (토큰, 없으면 레이아웃 값 파일 --layout-*·--assume-* — DESIGN.md 3-4)`);
  }
  checkStyle(file, lines);
  checkDocument(file, text);
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t || isComment(t)) return;
    const n = i + 1;

    // P1
    if (hasTokens) {
      for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!defined.has(m[1])) add(file, n, 'P1', '높음', `정의되지 않은 토큰 ${m[1]} (삭제·이름 변경 토큰이면 token-sync 비교 보고 확인)`);
      }
    }

    // P2
    if (hasTextStyles) {
      const m = line.match(/(font-size|font-weight|line-height|letter-spacing|font-family|fontSize|fontWeight|lineHeight|letterSpacing|fontFamily)\s*:\s*([^;,}]+)/);
      if (m && !/var\(--text-|inherit|initial|unset|tokens\.text\./.test(m[2])) {
        add(file, n, 'P2', '중간', `${m[1]} 값을 텍스트 스타일 토큰 없이 지정: ${m[2].trim()} (.text-<이름> 클래스 또는 --text-<이름>-* 사용)`);
      }
    }

    // P3
    for (const w of frameWidths) {
      if (new RegExp(`(?<![\\w.-])${w}px\\b`).test(line)) add(file, n, 'P3', '높음', `디자인 프레임 폭 ${w}px를 그대로 씀 (가로 폭은 유동)`);
    }
    if (/(font-size|fontSize|padding|margin|gap|letter-spacing|line-height)[^;]*\d(\.\d+)?vw\b/.test(line)) add(file, n, 'P3', '높음', 'vw로 글자 크기·간격을 지정 (비율 축소 금지)');
    if (/\bzoom\s*:/.test(line)) add(file, n, 'P3', '높음', 'zoom으로 화면을 확대·축소');
    if (/transform\s*:[^;]*scale\(/.test(line)) add(file, n, 'P3', '확인 필요', 'transform: scale — 화면 전체 축소면 금지, 눌림 효과 등이면 괜찮음');

    // P4
    const dev = line.match(/\b(fetch\s*\(|axios\b|XMLHttpRequest|location\.(href\s*=|assign|replace)|router\.(push|replace)|history\.(pushState|replaceState)|navigate\s*\()/);
    if (dev && !inPreview) add(file, n, 'P4', '확인 필요', `개발 몫 코드 의심: ${dev[1]} (서버 호출·화면 이동은 퍼블에서 하지 않음)`);

    // P5
    if (ids.size) {
      for (const link of screenLinks(line)) {
        if (link.fixed !== undefined) {
          if (!ids.has(link.fixed)) add(file, n, 'P5', '높음', `data-screen-link 대상 ${link.fixed}이 화면 목록(IA 사본·플로우)에 없음`);
          continue;
        }
        const found = [...link.expr.matchAll(/["'`]([^"'`$]+)["'`]/g)].map((s) => s[1]).filter((s) => idRe.test(s));
        if (!found.length) {
          add(file, n, 'P5', '확인 필요', `data-screen-link 바인딩식(${shortExpr(link.expr)}) — 값을 넘기는 곳(부모 화면의 prop·배열, 더미 데이터)에서 화면 ID 확인`);
          continue;
        }
        for (const id of found) {
          if (!ids.has(id)) add(file, n, 'P5', '높음', `data-screen-link 대상 ${id}이 화면 목록(IA 사본·플로우)에 없음 (바인딩식 안)`);
        }
      }
    }

    // P6
    const risky = line.match(/(\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(|dangerouslySetInnerHTML|\bv-html\b)/);
    if (risky) add(file, n, 'P6', '높음', `위험한 HTML 삽입: ${risky[1]}`);
    if (/<script[^>]*\bsrc\s*=\s*["']?(https?:)?\/\//i.test(line)) add(file, n, 'P6', '높음', '외부 스크립트를 직접 추가');

    // P8 — 줄 단위 (주석 줄은 위에서 건너뜀)
    if (/(localhost|127\.0\.0\.1):3845\b|figma\.com\/api\/mcp\/asset/i.test(line)) add(file, n, 'P8', '높음', 'Figma MCP 임시 에셋 주소 — 에셋을 받아 에셋 폴더에 저장하고 그 경로를 씀 (ARCHITECTURE.md 4-2)');

    // P7 — 줄 단위
    if (/!important/.test(line)) add(file, n, 'P7', '확인 필요', '!important — 컴포넌트 스타일을 덮는 예외면 이유를 주석에 적음');
  });
}

// ---------- 출력 ----------

const count = (lv) => findings.filter((f) => f.level === lv).length;
const out = [`## check-pub 결과 (파일 ${files.length}개)`];
const skipped = [];
if (!hasTokens) skipped.push(`P1 (토큰 폴더 ${tokenDir} 없음)`);
if (!hasTextStyles) skipped.push('P2 (텍스트 스타일 토큰 없음)');
if (!frameWidths.length) skipped.push('P3 프레임 폭 (PROJECT.md 뷰포트 표가 비어 있음)');
if (!ids.size) skipped.push('P5 (화면 목록 없음)');
out.push(`- 높음 ${count('높음')} · 중간 ${count('중간')} · 확인 필요 ${count('확인 필요')}`);
if (skipped.length) out.push(`- 건너뜀: ${skipped.join(', ')}`);
if (findings.length) {
  out.push('', '| 점검 | 심각도 | 파일:줄 | 내용 |', '|---|---|---|---|');
  for (const f of findings) out.push(`| ${f.code} | ${f.level} | ${f.file}:${f.line} | ${f.msg.replace(/\|/g, '\\|')} |`);
} else out.push('- 위반 없음');
process.stdout.write(out.join('\n') + '\n');
process.exit(count('높음') + count('중간') > 0 ? 1 : 0);
