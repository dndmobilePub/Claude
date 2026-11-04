// check-pub.mjs — 퍼블 점검 P1~P8 중 규칙으로 확실히 잡히는 것
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, write, read, replaceIn, run } from './helpers.mjs';

const SCRIPT = '.claude/scripts/check-pub.mjs';

const GOOD_DOC = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>금액 입력 | 서비스</title>
</head>
<body><main data-screen="TRF-010"><img src="../../images/icons/icon-close.svg" alt="닫기"></main></body>
</html>
`;

// 결과 표에서 "| 점검 | 심각도 | 파일:줄 |" 행을 찾는다.
const has = (out, code, level, file) => new RegExp(`\\| ${code} \\| ${level} \\| ${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\d+ \\|`).test(out);

test('정상 파일: 위반 없음', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/html/transfer/TRF-010.html', GOOD_DOC);
  const r = run(dir, SCRIPT, ['src']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /위반 없음/);
});

test('P8: lang·viewport·title이 빠진 문서', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/html/a.html', '<!doctype html>\n<html>\n<head><meta charset="utf-8"><title> </title></head>\n</html>\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.equal(r.code, 1);
  assert.match(r.out, /lang이 없음/);
  assert.match(r.out, /viewport meta가 없음/);
  assert.match(r.out, /<title>이 없거나 비어 있음/);
});

test('P8: 확대를 막는 viewport는 높음', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/html/a.html', GOOD_DOC.replace('initial-scale=1', 'initial-scale=1, maximum-scale=1, user-scalable=no'));
  const r = run(dir, SCRIPT, ['src']);
  assert.ok(has(r.out, 'P8', '높음', 'src/html/a.html'), r.out);
});

test('P8: Figma 임시 에셋 주소 (주석 줄은 제외)', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/screens/x/index.jsx', 'const a = "http://localhost:3845/assets/a.png";\n// const b = "http://localhost:3845/assets/b.png";\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.ok(has(r.out, 'P8', '높음', 'src/screens/x/index.jsx'), r.out);
  assert.equal((r.out.match(/임시 에셋 주소/g) || []).length, 1, r.out);
});

test('P6: 위험한 HTML 삽입과 외부 스크립트', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/lib/a.js', 'el.innerHTML = text;\n');
  write(dir, 'src/html/b.html', GOOD_DOC.replace('</head>', '<script src="https://cdn.example.com/x.js"></script>\n</head>'));
  const r = run(dir, SCRIPT, ['src']);
  assert.ok(has(r.out, 'P6', '높음', 'src/lib/a.js'), r.out);
  assert.ok(has(r.out, 'P6', '높음', 'src/html/b.html'), r.out);
});

test('P7: 화면 전용 스타일 파일, global.css 예외 형식', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/screens/transfer/TRF-010-AmountInput/style.css', '.a { color: var(--x); }\n');
  write(dir, 'src/styles/global.css', '.banner { margin: 0; }\n\n/* 예외: TRF-010 — 이유 */\n[data-screen="TRF-010"] .banner { margin: 0; }\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.ok(has(r.out, 'P7', '높음', 'src/screens/transfer/TRF-010-AmountInput/style.css'), r.out);
  assert.match(r.out, /화면 범위\(\[data-screen="<화면ID>"\]\)가 아님: \.banner/);
  assert.equal((r.out.match(/global\.css 예외가 화면 범위/g) || []).length, 1, r.out);
});

test('P3: 디자인 프레임 폭 고정·vw 글자 크기 (뷰포트 표가 있을 때)', (t) => {
  const dir = makeProject(t);
  replaceIn(dir, 'docs/PROJECT.md', '| [TODO: 예) 모바일] | [TODO: 예) 402×874] | [TODO: 예) 375] | [TODO: 예) 320] |', '| 모바일 | 402×874 | 375 | 320 |');
  write(dir, 'src/components/Box/box.css', '.box { width: 402px; }\n.t { font-size: 4vw; }\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.equal((r.out.match(/\| P3 \| 높음 \|/g) || []).length, 2, r.out);
});

test('P1: 정의되지 않은 토큰 (토큰 폴더가 있을 때)', (t) => {
  const dir = makeProject(t);
  write(dir, 'src/styles/tokens/tokens.css', ':root { --color-primary: #000; }\n');
  write(dir, 'src/components/Button/button.css', '.b { color: var(--color-primary); background: var(--color-missing); }\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.match(r.out, /정의되지 않은 토큰 --color-missing/);
  assert.doesNotMatch(r.out, /정의되지 않은 토큰 --color-primary/);
  assert.equal(read(dir, 'src/styles/tokens/tokens.css').includes('--color-primary'), true);
});

const flowDoc = (ids) => `# 플로우\n\n## 2. 화면 목록\n| 화면 ID | 화면명 | 패턴 | 역할 |\n|---|---|---|---|\n${ids.map((id) => `| ${id} | 화면 | 목록 | |`).join('\n')}\n`;

test('P5: PROJECT.md 화면 ID 형식으로 화면 목록을 읽는다 (글자로 끝나는 ID)', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/PROJECT.md', read(dir, 'docs/PROJECT.md').replace(/- 화면 ID 형식: .*/, () => '- 화면 ID 형식: `^[A-Z]{6}\\d{3}_\\d{2}[A-Z]{2}$`'));
  write(dir, 'docs/ui-flow/transfer.md', flowDoc(['TRNMUL002_10MS', 'TRNMUL002_23TB']));
  write(dir, 'src/screens/transfer/A.vue', '<template><button data-screen-link="TRNMUL002_23TB">다음</button><a data-screen-link="TRNMUL002_99XX">x</a></template>\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.doesNotMatch(r.out, /건너뜀: P5/);
  assert.match(r.out, /TRNMUL002_99XX이 화면 목록/);
  assert.doesNotMatch(r.out, /TRNMUL002_23TB이 화면 목록/);
});

const setIdFormat = (dir) => write(dir, 'docs/PROJECT.md', read(dir, 'docs/PROJECT.md').replace(/- 화면 ID 형식: .*/, () => '- 화면 ID 형식: `^[A-Z]{6}\\d{3}_\\d{2}[A-Z]{2}$`'));

test('P5: Vue 바인딩 삼항식은 식 안의 화면 ID만 대조한다', (t) => {
  const dir = makeProject(t);
  setIdFormat(dir);
  write(dir, 'docs/ui-flow/transfer.md', flowDoc(['TRNMUL002_10MS', 'TRNMUL002_23TB']));
  write(dir, 'src/components/ui/Tab/Tab.vue', `<template><a :data-screen-link="type === 'default' ? 'TRNMUL002_23TB' : 'TRNMUL002_99XX'">x</a></template>\n`);
  const r = run(dir, SCRIPT, ['src']);
  assert.match(r.out, /TRNMUL002_99XX이 화면 목록/);
  assert.doesNotMatch(r.out, /TRNMUL002_23TB이 화면 목록/);
  assert.doesNotMatch(r.out, /default/);
});

test('P5: Vue 변수 바인딩은 높음이 아니라 확인 필요', (t) => {
  const dir = makeProject(t);
  setIdFormat(dir);
  write(dir, 'docs/ui-flow/transfer.md', flowDoc(['TRNMUL002_10MS']));
  write(dir, 'src/components/patterns/Card/Card.vue', '<template><a :data-screen-link="item.screenLink">x</a><b v-bind:data-screen-link="link">y</b></template>\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.equal(r.code, 0, r.out);
  assert.equal(has(r.out, 'P5', '높음', 'src/components/patterns/Card/Card.vue'), false);
  assert.equal(has(r.out, 'P5', '확인 필요', 'src/components/patterns/Card/Card.vue'), true);
  assert.doesNotMatch(r.out, /item\.screenLink이 화면 목록/);
});

test('P5: JSX 고정 값과 {식} 안의 화면 ID를 대조한다', (t) => {
  const dir = makeProject(t);
  setIdFormat(dir);
  write(dir, 'docs/ui-flow/transfer.md', flowDoc(['TRNMUL002_10MS', 'TRNMUL002_23TB']));
  write(dir, 'src/screens/transfer/A.tsx', [
    'export const A = ({ ok }) => (<>',
    '  <a data-screen-link={"TRNMUL002_10MS"}>a</a>',
    '  <a data-screen-link={"TRNMUL002_88XX"}>b</a>',
    "  <a data-screen-link={ok ? 'TRNMUL002_23TB' : 'TRNMUL002_77XX'}>c</a>",
    '</>);',
    '',
  ].join('\n'));
  const r = run(dir, SCRIPT, ['src']);
  assert.match(r.out, /TRNMUL002_88XX이 화면 목록/);
  assert.match(r.out, /TRNMUL002_77XX이 화면 목록/);
  assert.doesNotMatch(r.out, /TRNMUL002_10MS이 화면 목록/);
  assert.doesNotMatch(r.out, /TRNMUL002_23TB이 화면 목록/);
});

test('P5: 화면 ID 형식이 비어 있으면 숫자가 든 ID를 넓게 읽는다', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/ui-flow/transfer.md', flowDoc(['TRF-010', 'ACC010MS']));
  write(dir, 'src/screens/transfer/A.vue', '<template><a data-screen-link="ACC010MS">x</a></template>\n');
  const r = run(dir, SCRIPT, ['src']);
  assert.doesNotMatch(r.out, /건너뜀: P5/);
  assert.doesNotMatch(r.out, /ACC010MS이 화면 목록/);
});
