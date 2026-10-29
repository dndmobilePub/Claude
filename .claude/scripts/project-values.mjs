// docs/PROJECT.md에서 스크립트·훅이 함께 쓰는 값을 읽는 공용 모듈. 외부 패키지 없음, 읽기만 한다.
// - 퍼블 소스 폴더: 퍼블 파일을 두는 최상위 폴더. 없거나 [TODO]면 기본 src/
// - 코드 토큰 위치: token-sync가 토큰 파일을 만드는 폴더. 없거나 [TODO]면 <퍼블 소스 폴더>styles/tokens/
// - 폴더 설정 점검: 설정 파일을 읽지 못하는 곳(.claude/rules/의 paths, 컴포넌트 폴더 AGENTS.md 위치)이
//   퍼블 소스 폴더와 어긋나면 경고 문장을 돌려준다. (docs/HARNESS.md 5번)

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
  const v = value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/*$/, '/');
  if (v === '/' || v.split('/').includes('..')) return null;
  return v;
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

export function tokenDir(root) {
  const v = valueOf(readProject(root), '코드 토큰 위치');
  return (v && normalizeDir(v)) || `${pubDir(root)}styles/tokens/`;
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

// 퍼블 소스 폴더를 기본값에서 바꿨는데 손으로 바꿀 곳이 그대로면 경고한다. 기본값이면 점검하지 않는다.
export function checkPubDirSetup(root) {
  const dir = pubDir(root);
  if (dir === DEFAULT_PUB_DIR) return [];
  const where = `docs/PROJECT.md 퍼블 소스 폴더(${dir})`;
  const warnings = [];
  for (const { file, glob } of rulePaths(root)) {
    if (glob.startsWith(DEFAULT_PUB_DIR)) warnings.push(`${file}: paths "${glob}"가 ${DEFAULT_PUB_DIR}로 시작합니다. ${where}로 바꿉니다. (docs/HARNESS.md 5번)`);
  }
  if (existsSync(join(root, `${DEFAULT_PUB_DIR}components/AGENTS.md`))) {
    warnings.push(`${DEFAULT_PUB_DIR}components/AGENTS.md가 그대로 있습니다. ${where} 안의 실제 컴포넌트 폴더로 옮깁니다. (docs/HARNESS.md 5번)`);
  }
  return warnings;
}
