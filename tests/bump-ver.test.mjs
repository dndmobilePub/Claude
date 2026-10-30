// bump-ver.mjs — 명세 frontmatter 기준 버전 한 줄만 고친다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, write, read, run } from './helpers.mjs';

const SCRIPT = '.claude/skills/version-update/bump-ver.mjs';

const spec = (id, status, iaVer, flow = 'transfer') => `---
id: ${id}
status: ${status}
flow: ui-flow/${flow}.md#4-1
ia_ver: ${iaVer}
plan_ver:
updated: 2026-01-01
---

# ${id} 화면

본문 ia_ver: 이 줄은 본문이라 바뀌지 않는다.
`;

function setup(t) {
  const dir = makeProject(t);
  write(dir, 'docs/screens/TRF-010.md', spec('TRF-010', '확정', 'v1.2'));
  write(dir, 'docs/screens/TRF-020.md', spec('TRF-020', '수정필요', 'v1.2'));
  write(dir, 'docs/screens/TRF-030.md', spec('TRF-030', '확정', 'v1.2'));
  write(dir, 'docs/screens/ACC-010.md', spec('ACC-010', '확정', 'v1.1', 'account'));
  return dir;
}

test('--write 없으면 목록만 보여주고 파일을 고치지 않는다', (t) => {
  const dir = setup(t);
  const before = read(dir, 'docs/screens/TRF-010.md');
  const r = run(dir, SCRIPT, ['--key', 'ia_ver', '--to', 'v1.3']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /바뀔 예정/);
  assert.equal(read(dir, 'docs/screens/TRF-010.md'), before);
});

test('--write: frontmatter 한 줄만 바꾸고, 수정필요·--skip·--from 밖은 건너뛴다', (t) => {
  const dir = setup(t);
  const r = run(dir, SCRIPT, ['--key', 'ia_ver', '--to', 'v1.3', '--from', 'v1.2', '--skip', 'TRF-030', '--write']);
  assert.equal(r.code, 0, r.out);

  const a = read(dir, 'docs/screens/TRF-010.md');
  assert.match(a, /^ia_ver: v1\.3$/m);
  assert.match(a, /본문 ia_ver: 이 줄은 본문이라 바뀌지 않는다/);
  assert.equal(a.replace('ia_ver: v1.3', 'ia_ver: v1.2'), spec('TRF-010', '확정', 'v1.2'));

  assert.match(read(dir, 'docs/screens/TRF-020.md'), /^ia_ver: v1\.2$/m);
  assert.match(r.out, /TRF-020 \(수정필요\)/);
  assert.match(read(dir, 'docs/screens/TRF-030.md'), /^ia_ver: v1\.2$/m);
  assert.match(read(dir, 'docs/screens/ACC-010.md'), /^ia_ver: v1\.1$/m);
});

test('--domain: 그 도메인 플로우의 명세만', (t) => {
  const dir = setup(t);
  const r = run(dir, SCRIPT, ['--key', 'plan_ver', '--to', 'p2', '--domain', 'account', '--write']);
  assert.equal(r.code, 0, r.out);
  assert.match(read(dir, 'docs/screens/ACC-010.md'), /^plan_ver: p2$/m);
  assert.match(read(dir, 'docs/screens/TRF-010.md'), /^plan_ver:$/m);
});

test('잘못된 --key는 거절한다', (t) => {
  const dir = setup(t);
  const r = run(dir, SCRIPT, ['--key', 'status', '--to', '확정']);
  assert.notEqual(r.code, 0);
});
