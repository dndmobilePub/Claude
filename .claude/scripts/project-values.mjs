// docs/PROJECT.md에서 스크립트·훅이 함께 쓰는 값을 읽는 공용 모듈. 외부 패키지 없음, 읽기만 한다.
// - 퍼블 소스 폴더: 퍼블 파일을 두는 최상위 폴더. 없거나 [TODO]면 기본 src/
// - 파일 구조: 화면 폴더(기본) / 종류별 폴더 (docs/ARCHITECTURE.md 3번)
// - 코드 토큰 위치: token-sync가 토큰 파일을 만드는 폴더. 없거나 [TODO]면 <퍼블 소스 폴더>styles/tokens/ (종류별 폴더면 css/tokens/)
// - 폴더 설정 점검: 설정 파일을 읽지 못하는 곳(.claude/rules/의 paths, 컴포넌트 폴더 AGENTS.md 위치)이
//   퍼블 소스 폴더와 어긋나면 경고 문장을 돌려준다. (docs/HARNESS.md 5번)
// - 업종 규칙 점검: docs/PROJECT.md "업종 규칙"과 .claude/rules/에 실제로 있는 업종 규칙 파일(.claude/framework.json "업종별 선택")이
//   어긋나면 경고 문장을 돌려준다.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_PUB_DIR = 'src/';

function readProject(root) {
  try {
    return readFileSync(join(root, 'docs/PROJECT.md'), 'utf8');
  } catch {
    return '';
  }
}

// 'pub', './pub', 'pub\\' → 'pub/'. 비거나 저장소 밖을 가리키면 null
function normalizeDir(value) {
  const v = value.replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (v === '' || v === '.' || v.split('/').includes('..')) return null;
  return `${v}/`;
}

// "키: 값" 한 줄의 값. 백틱은 벗기고, [TODO...]로 시작하면 null
function valueOf(text, key) {
  const m = text.match(new RegExp(`${key}:[ \\t]*\`?([^\`\\s[]+)`));
  return m ? m[1] : null;
}

export function pubDir(root) {
  const v = valueOf(readProject(root), '퍼블 소스 폴더');
  return (v && normalizeDir(v)) || DEFAULT_PUB_DIR;
}

// '화면 폴더' 또는 '종류별 폴더'. 없거나 [TODO]면 '화면 폴더'
export function fileLayout(root) {
  const v = valueOf(readProject(root), '파일 구조');
  return v && v.startsWith('종류별') ? '종류별 폴더' : '화면 폴더';
}

export function tokenDir(root) {
  const v = valueOf(readProject(root), '코드 토큰 위치');
  const def = fileLayout(root) === '종류별 폴더' ? 'css/tokens/' : 'styles/tokens/';
  return (v && normalizeDir(v)) || `${pubDir(root)}${def}`;
}

// .claude/rules/*.md frontmatter의 paths 글롭 목록
function rulePaths(root) {
  const dir = join(root, '.claude/rules');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    let text;
    try {
      text = readFileSync(join(dir, name), 'utf8');
    } catch {
      continue;
    }
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    for (const m of fm[1].matchAll(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/gm)) out.push({ file: `.claude/rules/${name}`, glob: m[1] });
  }
  return out;
}

// PROJECT.md 폴더 설정 점검: 루트를 적음, React·Vue인데 종류별 폴더, 퍼블 소스 폴더를 바꿨는데 손으로 바꿀 곳이 그대로임
export function checkPubDirSetup(root) {
  const raw = valueOf(readProject(root), '퍼블 소스 폴더');
  if (raw && !normalizeDir(raw)) return [`docs/PROJECT.md 퍼블 소스 폴더 "${raw}"는 쓸 수 없습니다. 저장소 루트·바깥은 지침 파일과 섞이므로 폴더를 하나 정합니다. 지금은 기본 ${DEFAULT_PUB_DIR}로 봅니다. (docs/ARCHITECTURE.md 3번)`];
  const warnings = [];
  const lang = valueOf(readProject(root), '퍼블 언어');
  if (fileLayout(root) === '종류별 폴더' && lang && /react|vue/i.test(lang)) {
    warnings.push(`docs/PROJECT.md 파일 구조 "종류별 폴더"는 JS(HTML·CSS·JS)만 쓸 수 있습니다. 퍼블 언어가 ${lang}이면 "화면 폴더"로 합니다. (docs/ARCHITECTURE.md 3번)`);
  }
  const dir = pubDir(root);
  if (dir === DEFAULT_PUB_DIR) return warnings;
  const where = `docs/PROJECT.md 퍼블 소스 폴더(${dir})`;
  for (const { file, glob } of rulePaths(root)) {
    if (glob.startsWith(DEFAULT_PUB_DIR)) warnings.push(`${file}: paths "${glob}"가 ${DEFAULT_PUB_DIR}로 시작합니다. ${where}로 바꿉니다. (docs/HARNESS.md 5번)`);
  }
  if (existsSync(join(root, `${DEFAULT_PUB_DIR}components/AGENTS.md`))) {
    warnings.push(`${DEFAULT_PUB_DIR}components/AGENTS.md가 그대로 있습니다. ${where} 안의 실제 컴포넌트 폴더로 옮깁니다. (docs/HARNESS.md 5번)`);
  }
  return warnings;
}

// .claude/framework.json "업종별 선택" 분류 글롭 → 정규식 목록. 없으면 빈 목록
function optionalRes(root) {
  let globs = [];
  try {
    globs = JSON.parse(readFileSync(join(root, '.claude/framework.json'), 'utf8')).files?.['업종별 선택'] || [];
  } catch {
    return [];
  }
  return globs.map((g) => new RegExp(`^${g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`));
}

// docs/PROJECT.md "업종 규칙" 값: 파일 이름 목록. "없음"이면 빈 목록, 없거나 [TODO]면 null
export function industryRules(root) {
  const m = readProject(root).match(/업종 규칙:[ \t]*(.*)/);
  if (!m) return null;
  const v = m[1].replace(/`/g, '').trim();
  if (v === '' || v.startsWith('[TODO')) return null;
  if (v.startsWith('없음')) return [];
  return v.split(/[,，]/).map((x) => x.trim().replace(/^\.claude\/rules\//, '')).filter(Boolean);
}

// 업종 규칙 점검: PROJECT.md에 적었는데 파일이 없음 / 선택 분류 파일이 있는데 PROJECT.md에 없음
export function checkRuleSetup(root) {
  const listed = industryRules(root);
  if (listed === null) return [];
  const dir = join(root, '.claude/rules');
  const present = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.md')) : [];
  const res = optionalRes(root);
  const warnings = [];
  for (const name of listed) {
    if (!present.includes(name)) warnings.push(`docs/PROJECT.md 업종 규칙의 ${name}가 .claude/rules/에 없습니다. 공통 지침 저장소의 같은 버전에서 가져오거나 PROJECT.md에서 뺍니다. (docs/HARNESS.md 5번)`);
  }
  for (const name of present) {
    if (res.some((re) => re.test(`.claude/rules/${name}`)) && !listed.includes(name)) {
      warnings.push(`.claude/rules/${name}는 업종 규칙인데 docs/PROJECT.md 업종 규칙에 없습니다. 쓰면 PROJECT.md에 적고, 쓰지 않으면 파일을 지웁니다. (docs/HARNESS.md 5번)`);
    }
  }
  return warnings;
}
