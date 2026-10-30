// framework-update.mjs — lint, check, apply
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, tempDir, copyRepo, gitCommitAll, write, read, replaceIn, run } from './helpers.mjs';

const SCRIPT = '.claude/scripts/framework-update.mjs';

test('lint: 원본 저장소의 모든 파일이 분류 하나에만 들어간다', () => {
  const r = run(REPO, SCRIPT, ['lint']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /문제 없음/);
});

// from(지금 버전) / to(새 버전) / proj(프로젝트) 세 폴더를 만든다.
// change(to)로 새 버전을, edit(proj)로 프로젝트를 바꾼다.
function setup(t, { change = () => {}, edit = () => {} } = {}) {
  const base = tempDir(t);
  const from = join(base, 'from');
  const to = join(base, 'to');
  const proj = join(base, 'proj');
  for (const d of [from, to, proj]) copyRepo(d);
  replaceIn(to, '.claude/framework.json', '"version": "0.1.0"', '"version": "0.2.0"');
  change(to);
  edit(proj);
  gitCommitAll(from);
  gitCommitAll(to);
  const check = (...extra) => run(proj, SCRIPT, ['check', '--from', from, '--to', to, ...extra]);
  const apply = (...extra) => run(proj, SCRIPT, ['apply', '--from', from, '--to', to, ...extra]);
  return { from, to, proj, check, apply };
}

const row = (out, action, file) => new RegExp(`\\| ${action} \\| [^|]+ \\| ${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|`).test(out);

test('지침 관리: 프로젝트가 고치지 않은 파일은 새 버전으로 바뀐다', (t) => {
  const s = setup(t, { change: (to) => replaceIn(to, 'AGENTS.md', '# AGENTS.md', '# AGENTS.md (새 버전)') });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  assert.ok(row(r.out, '교체', 'AGENTS.md'), r.out);
  assert.match(read(s.proj, 'AGENTS.md'), /새 버전/);
  assert.match(read(s.proj, '.claude/framework.json'), /"version": "0.2.0"/);
});

test('지침 관리: 프로젝트가 직접 고친 파일은 충돌이고 apply가 멈춘다', (t) => {
  const s = setup(t, {
    change: (to) => replaceIn(to, 'AGENTS.md', '# AGENTS.md', '# AGENTS.md (새 버전)'),
    edit: (proj) => replaceIn(proj, 'AGENTS.md', '# AGENTS.md', '# AGENTS.md (프로젝트 수정)'),
  });
  const r = s.apply();
  assert.notEqual(r.code, 0);
  assert.ok(row(r.out, '충돌', 'AGENTS.md'), r.out);
  assert.match(read(s.proj, 'AGENTS.md'), /프로젝트 수정/);
  assert.match(read(s.proj, '.claude/framework.json'), /"version": "0.1.0"/);
});

test('지침 + 프로젝트 예외: 공통 부분은 바뀌고 예외 섹션 값은 남는다', (t) => {
  const s = setup(t, {
    change: (to) => replaceIn(to, 'docs/QA.md', '# QA.md — 검수 기준', '# QA.md — 검수 기준 (새 버전)'),
    edit: (proj) => replaceIn(proj, 'docs/QA.md', '- 확인할 브라우저·기기: [TODO', '- 확인할 브라우저·기기: 크롬 최신 [TODO'),
  });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  const qa = read(s.proj, 'docs/QA.md');
  assert.match(qa, /검수 기준 \(새 버전\)/);
  assert.match(qa, /크롬 최신/);
});

test('지침 + 프로젝트 예외: 예외 섹션 밖을 고친 파일은 충돌', (t) => {
  const s = setup(t, {
    change: (to) => replaceIn(to, 'docs/QA.md', '# QA.md — 검수 기준', '# QA.md — 검수 기준 (새 버전)'),
    edit: (proj) => replaceIn(proj, 'docs/QA.md', '## 1. 검수 순서', '## 1. 검수 순서 (프로젝트 수정)'),
  });
  const r = s.check();
  assert.equal(r.code, 1);
  assert.ok(row(r.out, '충돌', 'docs/QA.md'), r.out);
});

test('업종별 선택: 프로젝트가 지운 업종 규칙은 되살리지 않는다', (t) => {
  const s = setup(t, {
    change: (to) => replaceIn(to, '.claude/rules/finance-ui.md', '# 금융 UI 규칙', '# 금융 UI 규칙 (새 버전)'),
    edit: (proj) => rmSync(join(proj, '.claude/rules/finance-ui.md')),
  });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /finance-ui/);
  assert.equal(existsSync(join(s.proj, '.claude/rules/finance-ui.md')), false);
});

test('업종별 선택: 남긴 업종 규칙은 병합되고 예외 값이 남는다', (t) => {
  const s = setup(t, {
    change: (to) => replaceIn(to, '.claude/rules/finance-ui.md', '# 금융 UI 규칙', '# 금융 UI 규칙 (새 버전)'),
    edit: (proj) => replaceIn(proj, '.claude/rules/finance-ui.md', '- 고객센터 안내: [TODO]', '- 고객센터 안내: 1588-0000'),
  });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  const text = read(s.proj, '.claude/rules/finance-ui.md');
  assert.match(text, /금융 UI 규칙 \(새 버전\)/);
  assert.match(text, /1588-0000/);
});

test('업종별 선택: 새 버전의 새 업종 규칙은 "업종 규칙 확인"으로 알리기만 한다', (t) => {
  const s = setup(t, {
    change: (to) => {
      replaceIn(to, '.claude/framework.json', '".claude/rules/finance-ui.md"', '".claude/rules/finance-ui.md",\n      ".claude/rules/sample-ui.md"');
      write(to, '.claude/rules/sample-ui.md', '# 예시 업종 규칙\n\n## 1. 프로젝트별 예외 (선택)\n- [TODO]\n');
    },
  });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  assert.ok(row(r.out, '업종 규칙 확인', '.claude/rules/sample-ui.md'), r.out);
  assert.equal(existsSync(join(s.proj, '.claude/rules/sample-ui.md')), false);
});

test('설정: 고치지 않고 버전 사이 차이만 보여준다', (t) => {
  const s = setup(t, { change: (to) => replaceIn(to, '.gitignore', '.DS_Store', '.DS_Store\n*.log') });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  assert.ok(row(r.out, '설정 확인', '.gitignore'), r.out);
  assert.match(r.out, /\+ \*\.log/);
  assert.doesNotMatch(read(s.proj, '.gitignore'), /\*\.log/);
});

test('추가·삭제: 새 파일은 추가, 빠진 파일은 고치지 않았으면 삭제', (t) => {
  const s = setup(t, {
    change: (to) => {
      write(to, 'templates/new-template.md', '# 새 양식\n');
      rmSync(join(to, 'templates/adr.md'));
    },
  });
  const r = s.apply();
  assert.equal(r.code, 0, r.out);
  assert.equal(read(s.proj, 'templates/new-template.md'), '# 새 양식\n');
  assert.equal(existsSync(join(s.proj, 'templates/adr.md')), false);
});

test('지침 원본 전용: tests/는 비교하지 않는다', (t) => {
  const s = setup(t, { change: (to) => write(to, 'tests/only-in-framework.test.mjs', '// 지침 원본 전용\n') });
  const r = s.check();
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /tests\//);
});
