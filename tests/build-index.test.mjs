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

const dsReq = (id, screens, extra = '', body = '') => `---
id: ${id}
kind: 토큰
status: 요청
screens: ${screens}
${extra}created: 2026-01-01
decided:
---

# ${id} 크기 토큰

## 4. 결정
- 결과: 대기
${body}`;

test('DS 요청: 열린 요청의 화면이 구현완료면 경고, assume: 예면 가정 진행으로 경고하지 않는다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', ''], ['TRF-020', '이체 확인', '확인', '']]));
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '금액 입력', '구현완료'));
  write(dir, 'docs/screens/TRF-020.md', spec('TRF-020', '이체 확인', '구현완료'));
  write(dir, 'docs/reports/TRF-010.md', '# 보고\n');
  write(dir, 'docs/reports/TRF-020.md', '# 보고\n');
  write(dir, 'docs/ds-requests/DS-001-size.md', dsReq('DS-001', 'TRF-010'));
  write(dir, 'docs/ds-requests/DS-002-z.md', dsReq('DS-002', 'TRF-020', 'assume: 예\n', '- 가정: Figma 값을 레이아웃 값 파일에 씀\n'));
  const r = run(dir, HOOK);
  assert.match(r.out, /TRF-010\.md: 열린 DS 변경 요청 DS-001/);
  assert.doesNotMatch(r.out, /TRF-020\.md: 열린 DS 변경 요청 DS-002/);
  const index = read(dir, 'docs/ds-requests/_index.md');
  assert.match(index, /\| \[DS-001\][^\n]*\| TRF-010 \| - \|/);
  assert.match(index, /\| \[DS-002\][^\n]*\| - \| TRF-020 \|/);
});

test('DS 요청: assume: 예인데 "- 가정:" 줄이 없거나 assume 값이 틀리면 경고한다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '']]));
  write(dir, 'docs/ds-requests/DS-001-size.md', dsReq('DS-001', 'TRF-010', 'assume: 예\n'));
  write(dir, 'docs/ds-requests/DS-002-z.md', dsReq('DS-002', 'TRF-010', 'assume: 응\n'));
  const r = run(dir, HOOK);
  assert.match(r.out, /DS-001-size\.md: assume이 "예"인데 4번 결정에 "- 가정:" 줄/);
  assert.match(r.out, /DS-002-z\.md: assume "응"는 허용 값이 아닙니다/);
});

test('컴포넌트: figma_name에 쉼표로 적은 세트는 세트마다 연결 목록 줄이 되고 세트별로 중복을 본다', (t) => {
  const dir = makeProject(t);
  const comp = (name, figma) => `---\nname: ${name}\nlayer: 기본\nkind: 신규\nstatus: 승인\nfigma_name: ${figma}\nfigma:\npath: src/components/ui/${name}/${name}.vue\ncode_connect: 해당 없음\n---\n\n# ${name}\n`;
  write(dir, 'docs/components/Header.md', comp('Header', 'Header/Mobile, Header/PC'));
  write(dir, 'docs/components/HeaderPc.md', comp('HeaderPc', 'Header/PC'));
  const r = run(dir, HOOK);
  const index = read(dir, 'docs/components/_index.md');
  assert.match(index, /\| Header\/Mobile \| \[Header\]/);
  assert.match(index, /\| Header\/PC \| \[Header\]/);
  assert.match(r.out, /HeaderPc\.md: Figma 컴포넌트 "Header\/PC"이 docs\/components\/Header\.md에도 연결돼 있습니다/);
});

test('손으로 실행: 표준 입력이 열려만 있고 아무것도 오지 않아도 기다리지 않고 끝난다', async (t) => {
  const dir = makeProject(t);
  const { spawn } = process.getBuiltinModule('node:child_process');
  const child = spawn(process.execPath, [join(dir, HOOK)], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (c) => (out += c));
  const code = await new Promise((done) => {
    const timer = setTimeout(() => {
      child.kill();
      done('timeout');
    }, 5000);
    child.on('exit', (c) => {
      clearTimeout(timer);
      done(c);
    });
  });
  child.stdin.destroy();
  assert.equal(code, 0, out);
  assert.match(out, /인덱스를 다시 만들었습니다/);
});

test('질문: 대상·반영 위치는 쉼표로 여러 개를 적을 수 있다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', ''], ['TRF-020', '확인', '확인', '']]));
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '금액 입력', '초안'));
  write(
    dir,
    'docs/questions/spec.md',
    `---
source: spec
prefix: Q-SP
---

# 질문: 명세

## 질문 목록
| ID | 대상 | 출처 위치 | 질문 | 확인 대상 | 차단 | 상태 | 답 | 반영 위치 |
|---|---|---|---|---|---|---|---|---|
| Q-SP-001 | TRF-010, TRF-020 | 명세 | 두 화면 공통? | 기획 | 아니오 | 미답변 | | |
| Q-SP-002 | TRF-010, TRF-999 | 명세 | 없는 화면 섞임 | 기획 | 아니오 | 미답변 | | |
| Q-SP-003 | TRF-010 | 명세 | 반영 두 곳 | 기획 | 아니오 | 확정 | 예 | docs/screens/TRF-010.md, docs/screens/TRF-777.md |
`,
  );
  const r = run(dir, HOOK);
  assert.match(r.out, /Q-SP-002: 대상 TRF-999가 화면 목록/);
  assert.doesNotMatch(r.out, /대상 TRF-010, TRF-020/);
  assert.match(r.out, /Q-SP-003: 반영 위치 docs\/screens\/TRF-777\.md 파일이 없습니다/);
  assert.doesNotMatch(r.out, /반영 위치 docs\/screens\/TRF-010\.md 파일이 없습니다/);
  const map = read(dir, 'docs/ui-flow/_index.md');
  assert.match(map, /TRF-020[^\n]*\| 1 \|/);
});

test('플로우: "2-1. 도메인 밖 이동 화면" 표는 화면 목록·화면 맵에 넣지 않는다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flow([['TRF-010', '금액 입력', '입력', '']]) + '\n### 2-1. 도메인 밖 이동 화면\n| 화면 ID | 화면명 | 가는 곳 |\n|---|---|---|\n| ACC-100 | 계좌 관리 | 계좌 |\n');
  const r = run(dir, HOOK);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(read(dir, 'docs/ui-flow/_index.md'), /ACC-100/);
});
