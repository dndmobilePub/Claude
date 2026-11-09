#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅: 퍼블 소스 폴더(docs/PROJECT.md, 기본 src/)의 파일을 고친 직후 하드코딩된 디자인 값을 빠르게 찾아 Claude에게 알린다.
// - 규칙은 .claude/scripts/hardcoded.mjs (check-pub P9와 같음). 이 훅은 방금 고친 파일만 본다. 판단이 필요한 점검은 ds-check.
// - 위반이 있으면 exit 2 + stderr로 Claude에게 전달하고, 없으면 조용히 끝낸다.
// - 훅 오류로 작업이 막히지 않도록, 예외가 나면 그냥 통과시킨다.

import { readFileSync, existsSync } from 'node:fs';
import { relative } from 'node:path';
import { isHardcodeTarget, findHardcoded, HARDCODE_HINT } from '../scripts/hardcoded.mjs';

const MAX_FINDINGS = 10;

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function main() {
  const input = readInput();
  const filePath = input.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = relative(root, filePath).replace(/\\/g, '/');
  // 점검 대상·규칙은 check-pub P9와 같다 (.claude/scripts/hardcoded.mjs)
  if (!isHardcodeTarget(root, rel)) return 0;

  const findings = findHardcoded(root, readFileSync(filePath, 'utf8')).map((f) => `${rel}:${f.line} ${f.name} \`${f.value}\``);
  if (findings.length === 0) return 0;

  const shown = findings.slice(0, MAX_FINDINGS);
  const more = findings.length - shown.length;
  process.stderr.write(
    [
      `[하드코딩 경고] 방금 고친 파일에서 디자인 값 직접 입력 ${findings.length}건을 찾았습니다.`,
      ...shown.map((f) => `- ${f}`),
      ...(more > 0 ? [`- 외 ${more}건`] : []),
      `${HARDCODE_HINT}. 맞는 토큰이 없으면 사용자에게 물어보세요.`,
      '같은 점검은 check-pub P9에서도 돈다 (스크립트로 고친 파일도 린트에서 잡힌다).',
    ].join('\n') + '\n',
  );
  return 2;
}

try {
  process.exit(main());
} catch {
  process.exit(0);
}
