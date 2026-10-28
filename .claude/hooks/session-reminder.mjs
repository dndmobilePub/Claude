#!/usr/bin/env node
// SessionStart(compact) 훅: 대화가 압축된 직후 핵심 규칙과 현재 작업 위치를 다시 알려준다.
// stdout에 쓴 내용이 Claude의 컨텍스트에 추가된다.

import { execSync } from 'node:child_process';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const branch = run('git branch --show-current') || '(알 수 없음)';
const changed = run('git status --porcelain')
  .split('\n')
  .filter(Boolean)
  .slice(0, 15)
  .map((l) => `  ${l}`);

const lines = [
  '[압축 후 재확인] 대화가 압축되었습니다. 아래 규칙을 다시 따르세요.',
  '- 파일 생성·수정·커밋 전에는 사용자 승인을 받는다. 단계를 건너뛰지 않는다.',
  '- 필요한 문서·Figma 노드만 읽는다. 작업 중인 화면 명세를 다시 읽어 맥락을 복원한다.',
  '- 디자인 값은 토큰만 쓴다. 기존 컴포넌트를 먼저 찾는다.',
  '- 결과물은 개발에 넘기는 퍼블 파일이다. 화면 이동·서버 호출은 구현하지 않는다. (docs/ARCHITECTURE.md 1번)',
  `- 현재 브랜치: ${branch}`,
  ...(changed.length ? ['- 커밋되지 않은 변경:', ...changed] : ['- 커밋되지 않은 변경: 없음']),
];

process.stdout.write(lines.join('\n') + '\n');
