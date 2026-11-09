// 하드코딩 점검 — check-pub P9와 check-hardcoded 훅이 같이 쓴다. (docs/DESIGN.md 3·3-4·8번)
// 색(HEX·rgb·hsl)과 2px 이상 px 값(소수 포함)을 찾는다. 판단이 필요한 점검(중복 컴포넌트 등)은 ds-check가 한다.
//
// 빼는 곳
//   - 토큰 폴더, 레이아웃 값 파일 (숫자를 모으는 곳)
//   - 화면 확인 장치(미리보기) 폴더 — 개발에 넘기지 않는 퍼블 도구
//   - 테스트·스토리 파일, 주석 줄
//   - PROJECT.md 뷰포트 표의 구현 기준 폭·최소 폭과 디바이스 전환 폭을 폭 조건(min-width·max-width·@media·SCSS 변수)에 쓴 줄

import { pubDir, tokenDir, layoutFile, previewDir, viewportWidths } from './project-values.mjs';

const EXT = /\.(html|vue|jsx?|tsx?|css|scss)$/;
const SKIP = /\.(stories|test|spec)\./;

const RULES = [
  { name: 'HEX 색상', re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  { name: 'rgb/hsl 색상', re: /\b(?:rgba?|hsla?)\(/g },
  { name: 'px 값', re: /(?<![\w.#$-])(\d+(?:\.\d+)?)px\b/g, min: 2 },
];

const isComment = (t) => t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');
const WIDTH_CONDITION = /min-width|max-width|@media|^\s*\$[\w-]+\s*:/;

// 이 파일이 점검 대상인지 (rel = 저장소 기준 경로, / 구분)
export function isHardcodeTarget(root, rel) {
  if (!rel.startsWith(pubDir(root)) || !EXT.test(rel) || SKIP.test(rel)) return false;
  const tokens = tokenDir(root);
  if (rel === tokens.replace(/\/$/, '') || rel.startsWith(tokens)) return false;
  if (rel === layoutFile(root)) return false;
  if (rel.startsWith(previewDir(root))) return false;
  return true;
}

// 찾은 것: [{ line, name, value }]
export function findHardcoded(root, text) {
  const allowed = viewportWidths(root);
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || isComment(t)) return;
    for (const rule of RULES) {
      for (const m of line.matchAll(rule.re)) {
        if (rule.min !== undefined) {
          const n = Number(m[1]);
          if (n < rule.min) continue;
          if (allowed.has(n) && WIDTH_CONDITION.test(line)) continue;
        }
        out.push({ line: i + 1, name: rule.name, value: m[0].replace(/\($/, '(...)') });
      }
    }
  });
  return out;
}

export const HARDCODE_HINT =
  '토큰으로 바꾼다. 토큰 종류가 없는 값(폭·높이·z-index 등)은 레이아웃 값 파일에 --layout-<용도>, 종류는 있는데 맞는 값이 없어 가정으로 진행하는 값은 --assume-<종류>-<용도>로 모은다 (docs/DESIGN.md 3-4·8번)';
