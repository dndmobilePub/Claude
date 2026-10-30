// read-ia.mjs(xlsx·csv)·read-ppt.mjs(pptx) — 테스트 안에서 만든 작은 파일로 확인한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { REPO, tempDir, write, makeZip, run } from './helpers.mjs';

const IA = '.claude/skills/ia-sync/read-ia.mjs';
const PPT = '.claude/skills/write-flow/read-ppt.mjs';

// 시트 "화면목록": 머리글 + 3행. A2:A3 병합(도메인), 3행 이름은 취소선, C열 날짜, 4행 숨김, B4 노란 칠
function makeXlsx(path) {
  makeZip(path, {
    'xl/workbook.xml':
      '<workbook xmlns:r="r"><workbookPr/><sheets><sheet name="화면목록" sheetId="1" r:id="rId1"/><sheet name="숨김" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    'xl/sharedStrings.xml':
      '<sst><si><t>도메인</t></si><si><t>화면 ID</t></si><si><t>일정</t></si><si><t>이체</t></si><si><t>TRF-010</t></si><si><t>TRF-020</t></si><si><t>TRF-030</t></si></sst>',
    'xl/styles.xml':
      '<styleSheet><fonts count="2"><font><sz val="11"/></font><font><strike/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill></fills>' +
      '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0"/><xf numFmtId="0" fontId="1" fillId="0"/><xf numFmtId="14" fontId="0" fillId="0"/><xf numFmtId="0" fontId="0" fillId="2"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml':
      '<worksheet><dimension ref="A1:C4"/><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2" s="2"><v>45658</v></c></row>' +
      '<row r="3"><c r="B3" s="1" t="s"><v>5</v></c></row>' +
      '<row r="4" hidden="1"><c r="B4" s="3" t="s"><v>6</v></c></row>' +
      '</sheetData><mergeCells count="1"><mergeCell ref="A2:A3"/></mergeCells></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData/></worksheet>',
  });
}

test('read-ia sheets: 시트 이름·숨김·병합 수', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'ia.xlsx');
  makeXlsx(file);
  const r = run(REPO, IA, [file, 'sheets']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /화면목록/);
  assert.match(r.out, /숨김/);
});

test('read-ia dump: 병합 채움·취소선·날짜·숨김 행', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'ia.xlsx');
  makeXlsx(file);
  const r = run(REPO, IA, [file, 'dump', '--sheet', '화면목록']);
  assert.equal(r.code, 0, r.out);
  const lines = r.out.split('\n');
  const row = (n) => lines.find((l) => l.split('\t')[0].startsWith(String(n))) || '';
  assert.match(row(2), /이체\tTRF-010\t2025-01-01/);
  assert.match(row(3), /^3\t이체\t~~TRF-020~~/);
  assert.match(row(4), /\(숨김\)/);

  const raw = run(REPO, IA, [file, 'dump', '--sheet', '화면목록', '--raw']);
  const raw3 = raw.out.split('\n').find((l) => l.startsWith('3')) || '';
  assert.doesNotMatch(raw3, /이체/);
});

test('read-ia fills: 칠한 칸만 색키로', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'ia.xlsx');
  makeXlsx(file);
  const r = run(REPO, IA, [file, 'fills', '--sheet', '화면목록']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /4[^\n]*B[^\n]*rgb:FFFFFF00/);
  assert.doesNotMatch(r.out, /^2\t/m);
});

test('read-ia csv: 따옴표 안 쉼표', (t) => {
  const dir = tempDir(t);
  write(dir, 'ia.csv', '화면 ID,화면명\nTRF-010,"금액, 입력"\n');
  const r = run(REPO, IA, [join(dir, 'ia.csv'), 'dump', '--sheet', 'csv']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /TRF-010\t금액, 입력/);
});

test('read-ia: 옛 형식(zip 아님)이면 다시 저장하라고 알린다', (t) => {
  const dir = tempDir(t);
  write(dir, 'old.xlsx', 'not a zip');
  const r = run(REPO, IA, [join(dir, 'old.xlsx'), 'sheets']);
  assert.notEqual(r.code, 0);
  assert.match(r.out, /다시 저장/);
});

// 슬라이드 2장: 1장은 제목·표·노트, 2장은 숨김. 파일 안 순서와 보이는 순서를 일부러 다르게
function makePptx(path) {
  const sp = (text) => `<p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;
  makeZip(path, {
    'ppt/presentation.xml': '<p:presentation xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>',
    'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>',
    'ppt/slides/slide2.xml':
      `<p:sld><p:cSld><p:spTree>${sp('이체 금액 입력')}` +
      '<p:graphicFrame><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>항목</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>설명</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></p:graphicFrame>' +
      '</p:spTree></p:cSld></p:sld>',
    'ppt/slides/_rels/slide2.xml.rels': '<Relationships><Relationship Id="rId9" Target="../notesSlides/notesSlide1.xml"/></Relationships>',
    'ppt/notesSlides/notesSlide1.xml': `<p:notes>${sp('한도 확인 필요')}${sp('1')}</p:notes>`,
    'ppt/slides/slide1.xml': `<p:sld show="0"><p:cSld><p:spTree>${sp('숨긴 슬라이드')}</p:spTree></p:cSld></p:sld>`,
  });
}

test('read-ppt list: 보이는 순서·숨김·노트', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'plan.pptx');
  makePptx(file);
  const r = run(REPO, PPT, [file, 'list']);
  assert.equal(r.code, 0, r.out);
  const first = r.out.indexOf('이체 금액 입력');
  const second = r.out.indexOf('숨긴 슬라이드');
  assert.ok(first > -1 && second > first, r.out);
});

test('read-ppt text: 문단·표·노트', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'plan.pptx');
  makePptx(file);
  const r = run(REPO, PPT, [file, 'text', '--notes']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /이체 금액 입력/);
  assert.match(r.out, /\| 항목 \| 설명 \|/);
  assert.match(r.out, /한도 확인 필요/);
  assert.doesNotMatch(r.out, /^1$/m);
});
