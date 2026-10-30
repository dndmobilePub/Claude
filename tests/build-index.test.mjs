// build-index.mjs — AUTO 블록 생성과 불일치 경고
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeProject, write, read, replaceIn, run } from './helpers.mjs';

const HOOK = '.claude/hooks/build-index.mjs';

const flow = (rows) => `---
domain: 이체
code: TRF
status: 초안
updated: 2026-01-01
---

# 플로우: 이체

## 2. 화면 목록
| 화면 ID | 화면명 | 패턴 | 역할 |
|---|---|---|---|
${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}
`;

const spec = (id, title, status) => `---
id: ${id}
status: ${status}
figma:
device:
flow: ui-flow/transfer.md#4-1
ia_ver:
plan_ver:
design_ver:
updated: 2026-01-01
---

# ${id} ${title}
`;

test('빈 프로젝트: 경고 없이 끝난다', (t) => {
  const dir = makeProject(t);
  const r = run(dir, HOOK);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /경고 0건/);
});

test('플로우 화면 목록과 명세 상태로 화면 맵을 만든다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '시작'], ['TRF-020', '이체 확인', '확인', '']]));
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '금액 입력', '검토'));
  const r = run(dir, HOOK);
  assert.equal(r.code, 0, r.out);
  const index = read(dir, 'docs/ui-flow/_index.md');
  assert.match(index, /TRF-010[^\n]*검토/);
  assert.match(index, /TRF-020[^\n]*명세 전/);
});

test('화면 ID 중복·형식 오류·잘못된 상태·패턴 값을 경고한다', (t) => {
  const dir = makeProject(t);
  write(
    dir,
    'docs/ui-flow/transfer.md',
    flow([
      ['TRF-010', '금액 입력', '입력', ''],
      ['TRF-010', '금액 입력', '입력', ''],
      ['trf10', '잘못된 ID', '입력', ''],
      ['TRF-030', '결과', '없는패턴', ''],
    ]),
  );
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '금액 입력', '완료'));
  const r = run(dir, HOOK);
  assert.equal(r.code, 1);
  assert.match(r.out, /TRF-010가 화면 목록에 두 번/);
  assert.match(r.out, /화면 ID "trf10"가 PROJECT\.md의 화면 ID 형식/);
  assert.match(r.out, /status "완료"는 허용 값이 아닙니다/);
  assert.match(r.out, /패턴 "없는패턴"/);
});

test('명세 제목이 화면 목록의 화면명과 다르면 경고한다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '']]));
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '금액 입력하기', '초안'));
  const r = run(dir, HOOK);
  assert.match(r.out, /화면명이 플로우 표\("금액 입력"\)와 명세 제목\("금액 입력하기"\)에서 다릅니다/);
});

test('질문 줄 형식을 점검하고 열린 질문 현황을 만든다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '']]));
  write(
    dir,
    'docs/questions/plan.md',
    `---
source: plan
prefix: Q-PL
---

# 질문: 기획서

## 질문 목록
| ID | 대상 | 출처 위치 | 질문 | 확인 대상 | 차단 | 상태 | 답 | 반영 위치 |
|---|---|---|---|---|---|---|---|---|
| Q-PL-001 | TRF-010 | 3쪽 | 한도는? | 기획 | 예 | 미답변 | | |
| Q-PL-002 | TRF-010 | 4쪽 | 문구는? | 기획 | 예 | 가정 | 기본 문구 | |
| Q-PL-003 | TRF-999 | 5쪽 | 없는 화면 | 기획 | 아니오 | 미답변 | | |
`,
  );
  const r = run(dir, HOOK);
  assert.equal(r.code, 1);
  assert.match(r.out, /Q-PL-002: 차단 질문은 가정으로 진행할 수 없습니다/);
  assert.match(r.out, /대상 TRF-999가 화면 목록/);
  assert.match(read(dir, 'docs/questions/_index.md'), /Q-PL-001/);
});

test('업종 규칙: PROJECT.md 값과 실제 파일이 어긋나면 경고한다', (t) => {
  const dir = makeProject(t);
  const set = (v) => replaceIn(dir, 'docs/PROJECT.md', /- 업종 규칙:.*/.exec(read(dir, 'docs/PROJECT.md'))[0], `- 업종 규칙: ${v}`);

  set('없음');
  let r = run(dir, HOOK);
  assert.match(r.out, /finance-ui\.md는 업종 규칙인데 docs\/PROJECT\.md 업종 규칙에 없습니다/);

  set('finance-ui.md');
  r = run(dir, HOOK);
  assert.equal(r.code, 0, r.out);

  set('finance-ui.md, sample-ui.md');
  r = run(dir, HOOK);
  assert.match(r.out, /업종 규칙의 sample-ui\.md가 \.claude\/rules\/에 없습니다/);

  set('없음');
  rmSync(join(dir, '.claude/rules/finance-ui.md'));
  r = run(dir, HOOK);
  assert.equal(r.code, 0, r.out);
});

test('훅 모드: 감시 대상이 아닌 파일 수정에는 아무것도 하지 않는다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '']]));
  const before = read(dir, 'docs/ui-flow/_index.md');
  const input = JSON.stringify({ tool_input: { file_path: join(dir, 'README.md') } });
  const { spawnSync } = process.getBuiltinModule('node:child_process');
  const r = spawnSync(process.execPath, [join(dir, HOOK)], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(r.status, 0);
  assert.equal(read(dir, 'docs/ui-flow/_index.md'), before);
});
