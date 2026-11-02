// token-sync 변환 스크립트(convert-tokens.mjs) 검사
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { makeProject, write, read, tempDir, REPO } from './helpers.mjs';
import { spawnSync } from 'node:child_process';
import { fnv, parseExport, convert, readOptions, cssName, cssTokens } from '../.claude/skills/token-sync/convert-tokens.mjs';

const SCRIPT = join(REPO, '.claude/skills/token-sync/convert-tokens.mjs');
const exp = (lines) => `@token-export v1 lines=${lines.length} fnv=${fnv(lines.join('\n'))}\n${lines.join('\n')}\n`;
const OPT = {
  modeAttrDefault: 'data-theme', modeAttr: {}, modeName: {}, fallback: {}, skipCollections: [], skipStyles: [],
  unitFor: {}, textPrefix: 'text-', shadowPrefix: 'shadow-', refFile: 'tokens.ts',
};
const run = (lines, opt = {}) => convert(parseExport(exp(lines)).data, { ...OPT, ...opt });

const BASE = [
  '#C Primitive|Value',
  'color/blue/500|Cfs!|#0473ea',
  'color/gray/900|Cfs!|#191919',
  'color/unused|Cfs!|#123456',
  'unit/plus/16|Fhg!|16',
  '#C Color|Light;Dark',
  'color/text/primary|CF|@color/gray/900 ; @color/blue/500',
  'color/bg/brand|Cfs|@color/blue/500',
  'flag|B|true',
  '#C Space|Mode 1',
  'spacing/16|Fhg|@unit/plus/16',
  'border/radius/rounded|Fr|99999',
  'opacity/half|FO|50',
  '#T',
  '#E',
];

test('해시·줄 수가 다르면 변환하지 않는다', () => {
  const good = exp(BASE);
  assert.deepEqual(parseExport(good).errors, []);
  assert.equal(parseExport(good.replace('#0473ea', '#0473eb')).errors.length, 1);
  assert.match(parseExport(good.replace('flag|B|true\n', '')).errors.join(), /줄 수/);
});

test('이름 규칙', () => {
  assert.equal(cssName('color/bg subtle'), 'color-bg-subtle');
  assert.equal(cssName('spacing/0.5'), 'spacing-0_5');
  assert.equal(cssName('Mobile/Kor/Body/font weight/bold'), 'mobile-kor-body-font-weight-bold');
});

test('숨긴 원시 변수는 가리키는 것만 포함하고, 별칭은 var()로 쓴다', () => {
  const r = run(BASE);
  const css = r.files['tokens.css'];
  assert.deepEqual(r.stops, []);
  assert.match(css, /--color-blue-500: #0473ea;/);
  assert.doesNotMatch(css, /color-unused/);
  assert.ok(r.excluded.some((e) => e.includes('color/unused')));
  assert.ok(r.excluded.some((e) => e.includes('불리언 flag')));
  assert.match(css, /--color-text-primary: var\(--color-gray-900\);/);
  assert.match(css, /--spacing-16: var\(--unit-plus-16\);/);
  assert.match(css, /--border-radius-rounded: 99999px;/);
  assert.match(css, /--opacity-half: 0.5;/);
  // 원시 → 의미 순서
  assert.ok(css.indexOf('--unit-plus-16') < css.indexOf('--color-bg-brand'));
  // 모드: 기본과 다른 값만
  assert.match(css, /\[data-theme="dark"\] \{\n {2}--color-text-primary: var\(--color-blue-500\);\n\}/);
});

test('적용 범위가 없는 숫자는 이름 첫 단계로, 모르면 멈추고 9번 값을 쓴다', () => {
  const lines = ['#C P|V', 'unit/plus/16|F|16', 'font size/14|F|14', 'font weight/bold|F|700', '#T', '#E'];
  const r = run(lines);
  assert.ok(r.stops.some((s) => s.startsWith('unit/plus/16: 숫자 단위')));
  const ok = run(lines, { unitFor: { unit: 'px' } });
  assert.deepEqual(ok.stops, []);
  assert.match(ok.files['tokens.css'], /--font-size-14: 14px;[\s\S]*--font-weight-bold: 700;/);
});

test('모드 컬렉션이 둘 이상이면 컬렉션별 속성이 필요하고, 한글 모드는 이름을 정해야 한다', () => {
  const lines = ['#C Color|Light;Dark', 'c/a|Cf|#000000 ; #ffffff', '#C Typo|일반;편한', 'size/a|Fz|14 ; 16', '#T', '#E'];
  assert.ok(run(lines).stops.some((s) => s.includes('컬렉션별 속성')));
  const noName = run(lines, { modeAttr: { Color: 'data-theme', Typo: 'data-banking' } });
  assert.ok(noName.stops.some((s) => s.includes('모드 "편한"')));
  const ok = run(lines, { modeAttr: { Color: 'data-theme', Typo: 'data-banking' }, modeName: { 편한: 'easy' } });
  assert.deepEqual(ok.stops, []);
  assert.match(ok.files['tokens.css'], /\[data-banking="easy"\] \{\n {2}--size-a: 16px;/);
});

test('다른 파일 변수·못 찾는 별칭·이름 겹침·값이면서 하위 단계는 멈춘다', () => {
  assert.ok(run(['#C A|M', 'a/b|Cf|@R:lib/x', '#T', '#E']).stops.some((s) => s.includes('다른 파일')));
  assert.ok(run(['#C A|M', 'a/b|Cf|@?', '#T', '#E']).stops.some((s) => s.includes('찾을 수 없음')));
  assert.ok(run(['#C A|M', 'a b|Cf|#000000', 'a/b|Cf|#111111', '#T', '#E']).stops.some((s) => s.includes('겹침')));
  assert.ok(run(['#C A|M', 'c/p|Cf|#000000', 'c/p/h|Cf|#111111', '#T', '#E']).stops.some((s) => s.includes('하위 단계')));
});

test('텍스트 스타일: 연결 변수는 var(), 밑줄·굵기·행간·자간, 묶음 클래스', () => {
  const lines = [
    '#C T|M', 'font family/kor|Sy|"Noto Sans KR"', 'font size/14|Fz|14', 'font weight/bold|Fw|700',
    '#T',
    'Body/md link|"Noto Sans KR"|Bold|14|150%|-2%|ORIGINAL|UNDERLINE|fontFamily=@font family/kor,fontSize=@font size/14',
    'Caption|"Noto Sans KR"|Medium Italic|12|18px|-0.3px|UPPER|NONE|',
    '#E',
  ];
  const r = run(lines, { fallback: { 'Noto Sans KR': 'system-ui, sans-serif' } });
  assert.deepEqual(r.stops, []);
  const css = r.files['tokens.css'];
  assert.match(css, /--font-family-kor: "Noto Sans KR", system-ui, sans-serif;/);
  assert.match(css, /--text-body-md-link-font-family: var\(--font-family-kor\);/);
  assert.match(css, /--text-body-md-link-font-weight: 700;/);
  assert.match(css, /--text-body-md-link-line-height: 1.5;/);
  assert.match(css, /--text-body-md-link-letter-spacing: -0.02em;/);
  assert.match(css, /--text-body-md-link-text-decoration: underline;/);
  assert.match(css, /--text-caption-font-style: italic;[\s\S]*--text-caption-text-transform: uppercase;/);
  assert.match(r.files['text-styles.css'], /\.text-body-md-link \{\n {2}font-family: var\(--text-body-md-link-font-family\);/);
  assert.match(r.files['tokens.ts'], /text: \{\n {4}body: \{\n {6}mdLink: \{\n {8}fontFamily: 'var\(--text-body-md-link-font-family\)',/);
  assert.match(r.files['tokens.ts'], /as const;\n$/);
});

test('그림자: inset·여러 겹·연결 색, 블러는 제외', () => {
  const lines = [
    '#C C|M', 'shadow-color/8|Ce|#00000014',
    '#T', '#E',
    'shadow/card|D,0,2,4,0,#00000014,color=@shadow-color/8 + I,0,1,2,0,#ffffff33',
    'blur/04|L,4',
  ];
  const r = run(lines);
  assert.deepEqual(r.stops, []);
  assert.match(r.files['tokens.css'], /--shadow-card: 0px 2px 4px 0px var\(--shadow-color-8\), inset 0px 1px 2px 0px #ffffff33;/);
  assert.ok(r.excluded.some((e) => e.includes('blur/04')));
});

test('9번 예외 칸을 백틱 키=값으로 읽는다', (t) => {
  const dir = tempDir(t);
  write(dir, 'docs/DESIGN.md', [
    '## 9. 프로젝트별 예외 (선택)',
    '- 모드 속성: `Color=data-theme`, `Typo=data-banking`',
    '- 모드 이름: `편한뱅킹=easy`',
    '- 대체 글꼴: `Noto Sans KR=system-ui, sans-serif`',
    '- 동기화 제외 컬렉션: `Template`',
    '- 동기화 제외 스타일: `Template/`',
    '- 숫자 단위 지정: `unit=px`',
  ].join('\n'));
  write(dir, 'docs/PROJECT.md', '- 퍼블 언어: Vue\n- TypeScript: 사용\n');
  const o = readOptions(dir);
  assert.deepEqual(o.modeAttr, { Color: 'data-theme', Typo: 'data-banking' });
  assert.deepEqual(o.modeName, { 편한뱅킹: 'easy' });
  assert.deepEqual(o.skipCollections, ['Template']);
  assert.equal(o.unitFor.unit, 'px');
  assert.equal(o.refFile, 'tokens.ts');
});

test('실행: 비교만 → --write → 삭제 토큰을 쓰는 곳이 있으면 멈춤', (t) => {
  const dir = makeProject(t);
  write(dir, 'docs/PROJECT.md', read(dir, 'docs/PROJECT.md').replace(/^- 퍼블 언어:.*$/m, '- 퍼블 언어: JS(HTML·CSS·JS)'));
  const f = join(dir, 'export.txt');
  write(dir, 'export.txt', exp(BASE));
  const node = (...a) => spawnSync('node', [SCRIPT, ...a, '--root', dir], { encoding: 'utf8' });
  let r = node(f);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /최초 생성/);
  assert.equal(read(dir, 'src/styles/tokens/tokens.css'), null);
  r = node(f, '--write');
  assert.equal(r.status, 0, r.stdout);
  assert.ok(cssTokens(read(dir, 'src/styles/tokens/tokens.css')).has('--color-bg-brand'));
  write(dir, 'src/components/Box.css', '.box { background: var(--color-bg-brand); }');
  write(dir, 'export.txt', exp(BASE.filter((l) => !l.startsWith('color/bg/brand'))));
  r = node(f, '--write');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /삭제 --color-bg-brand — 사용처 1곳/);
});
