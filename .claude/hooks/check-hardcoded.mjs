#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅: src/ 파일을 고친 직후 하드코딩된 디자인 값을 빠르게 찾아 Claude에게 알린다.
// - 전체 점검은 ds-check 스킬이 맡는다. 이 훅은 색상·px 값만 가볍게 본다.
// - 위반이 있으면 exit 2 + stderr로 Claude에게 전달하고, 없으면 조용히 끝낸다.
// - 훅 오류로 작업이 막히지 않도록, 예외가 나면 그냥 통과시킨다.

import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const MAX_FINDINGS = 10;

const RULES = [
  { name: 'HEX 색상', re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  { name: 'rgb/hsl 색상', re: /\b(?:rgba?|hsla?)\(/g },
  { name: 'px 값', re: /(?<![\w.-])(?:[2-9]|\d{2,})px\b/g },
];

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

// docs/PROJECT.md의 "코드 토큰 위치" 값을 읽는다. [TODO]면 null.
function readTokenPath(root) {
  try {
    const text = readFileSync(join(root, 'docs/PROJECT.md'), 'utf8');
    const m = text.match(/코드 토큰 위치:\s*`?([^`\s[]+)/);
    return m ? m[1].replace(/\\/g, '/').replace(/^\.\//, '') : null;
  } catch {
    return null;
  }
}

function main() {
  const input = readInput();
  const filePath = input.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = relative(root, filePath).replace(/\\/g, '/');

  // 점검 대상: src/ 아래 스타일·컴포넌트 파일. 테스트·스토리는 제외.
  if (!rel.startsWith('src/')) return 0;
  if (!/\.(tsx?|jsx?|css|scss)$/.test(rel)) return 0;
  if (/\.(stories|test|spec)\./.test(rel)) return 0;

  // 토큰 정의 파일(또는 폴더)은 제외.
  const tokenPath = readTokenPath(root);
  if (tokenPath && (rel === tokenPath || rel.startsWith(tokenPath.replace(/\/?$/, '/')))) return 0;

  const findings = [];
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.re)) {
        findings.push(`${rel}:${i + 1} ${rule.name} \`${match[0].replace(/\($/, '(...)')}\``);
      }
    }
  });

  if (findings.length === 0) return 0;

  const shown = findings.slice(0, MAX_FINDINGS);
  const more = findings.length - shown.length;
  process.stderr.write(
    [
      `[하드코딩 경고] 방금 고친 파일에서 디자인 값 직접 입력 ${findings.length}건을 찾았습니다.`,
      ...shown.map((f) => `- ${f}`),
      ...(more > 0 ? [`- 외 ${more}건`] : []),
      '토큰으로 바꾸거나, 맞는 토큰이 없으면 사용자에게 물어보세요 (docs/DESIGN.md 3·8번).',
      '허용 값(레이아웃용 등)이라면 그대로 두고 이유를 보고하세요.',
    ].join('\n') + '\n',
  );
  return 2;
}

try {
  process.exit(main());
} catch {
  process.exit(0);
}
