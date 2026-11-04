// check-hardcoded.mjs — 고친 파일의 하드코딩 값 경고 (레이아웃 값 파일은 제외)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeProject, write, read } from './helpers.mjs';

const HOOK = '.claude/hooks/check-hardcoded.mjs';

const runHook = (dir, file) =>
  spawnSync(process.execPath, [join(dir, HOOK)], {
    input: JSON.stringify({ tool_input: { file_path: join(dir, file) } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });

test('컴포넌트의 px 값은 경고한다', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/components/ui/Box/Box.css', '.box { width: 600px; }\n');
  const r = runHook(dir, 'src/components/ui/Box/Box.css');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /px 값/);
  assert.match(r.stderr, /레이아웃 값 파일/);
});

test('레이아웃 값 파일(기본 위치)은 경고하지 않는다', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/styles/layout.css', ':root { --layout-pc-content-width: 600px; }\n');
  assert.equal(runHook(dir, 'src/styles/layout.css').status, 0);
});

test('PROJECT.md "레이아웃 값 파일"에 적은 위치를 따른다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/PROJECT.md', read(dir, 'docs/PROJECT.md').replace(/- 레이아웃 값 파일: .*/, () => '- 레이아웃 값 파일: `src/styles/_layout.scss`'));
  write(dir, 'src/styles/_layout.scss', ':root { --layout-z-dialog: 30; --layout-header-height: 84px; }\n');
  write(dir, 'src/styles/layout.css', '.x { height: 84px; }\n');
  assert.equal(runHook(dir, 'src/styles/_layout.scss').status, 0);
  assert.equal(runHook(dir, 'src/styles/layout.css').status, 2);
});
