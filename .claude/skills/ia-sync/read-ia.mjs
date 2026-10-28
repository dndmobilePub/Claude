#!/usr/bin/env node
// IA 엑셀 읽기 스크립트 — 읽기 전용, 외부 패키지 없음 (ia-sync 스킬용)
// 지원: .xlsx · .xlsm · .csv  (옛 .xls는 .xlsx로 다시 저장해서 쓴다)
//
// 사용법
//   node read-ia.mjs <파일> sheets
//       시트 목록: 이름, 사용 범위, 병합 셀 수, 숨김 여부
//   node read-ia.mjs <파일> dump --sheet <시트> [--rows 1-40] [--cols A-Z] [--raw]
//       셀 값을 행 단위 TSV로 출력. 첫 칸은 행 번호, 머리글은 열 문자.
//       - 병합 셀은 왼쪽 위 값으로 채운다. (--raw면 채우지 않는다)
//       - 숨김 행은 행 번호 뒤에 (숨김), 취소선 글자는 ~~값~~으로 표시한다.
//       - 날짜 서식 숫자는 YYYY-MM-DD로 바꾼다.
//   node read-ia.mjs <파일> fills --sheet <시트> [--rows 1-40] [--cols A-Z]
//       배경색이 칠해진 칸만 행 단위로 출력: "행  열범위=색키; ..."  (WBS 색칠 일정 해석용)
//       색키 예: rgb:FFFFC000, theme:4/tint:0.4, indexed:13 — 같은 키 = 같은 색
//
// 한 번에 최대 100행만 출력한다. 더 있으면 마지막 줄에 다음 --rows 값을 알려준다.

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openZip, unescapeXml, attr, readRels, joinPath } from '../../scripts/office-zip.mjs';

const MAX_ROWS = 100;

// ---------- 공통 ----------

const colToNum = (s) => [...s.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const numToCol = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const splitRef = (ref) => {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  return m ? { col: colToNum(m[1]), row: Number(m[2]) } : null;
};
const parseRange = (text, toNum = Number) => {
  if (!text) return null;
  const [a, b = a] = text.split(/[-:]/);
  return { from: toNum(a), to: toNum(b) };
};
const clean = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();

// ---------- xlsx ----------

function loadXlsx(path) {
  const zip = openZip(path);
  const wb = zip.text('xl/workbook.xml');
  if (!wb) throw new Error('엑셀 통합 문서(xl/workbook.xml)를 찾을 수 없습니다.');
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(wb);
  const rels = readRels(zip, 'xl/_rels/workbook.xml.rels');

  const sheets = [...wb.matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => ({
    name: attr(m[1], 'name'),
    state: attr(m[1], 'state') || 'visible',
    path: joinPath('xl/workbook.xml', rels.get(attr(m[1], 'r:id')) || ''),
  }));

  // 공유 문자열
  const shared = [];
  const sst = zip.text('xl/sharedStrings.xml') || '';
  for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(
      [...m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((t) => unescapeXml(t[1]))
        .join(''),
    );
  }

  // 스타일: 셀 서식 → 채우기·글꼴(취소선)·날짜 여부
  const styles = zip.text('xl/styles.xml') || '';
  const block = (tag) => (styles.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1] || '';
  const customFmt = new Map(
    [...block('numFmts').matchAll(/<numFmt\b([^>]*)\/?>/g)].map((m) => [Number(attr(m[1], 'numFmtId')), attr(m[1], 'formatCode') || '']),
  );
  const isDateFmt = (id) => {
    if ((id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 50 && id <= 58)) return true;
    const code = (customFmt.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
    return /[yd]/i.test(code);
  };
  const fills = [...block('fills').matchAll(/<fill>([\s\S]*?)<\/fill>|<fill\/>/g)].map((m) => {
    const body = m[1] || '';
    const type = attr((body.match(/<patternFill\b([^>]*)>/) || [])[1] || '', 'patternType');
    if (!type || type === 'none' || type === 'gray125') return null;
    const fg = (body.match(/<fgColor\b([^>]*)\/?>/) || [])[1] || '';
    if (attr(fg, 'rgb')) return `rgb:${attr(fg, 'rgb').toUpperCase()}`;
    if (attr(fg, 'theme')) return `theme:${attr(fg, 'theme')}${attr(fg, 'tint') ? `/tint:${Number(attr(fg, 'tint')).toFixed(2)}` : ''}`;
    if (attr(fg, 'indexed')) return attr(fg, 'indexed') === '64' ? null : `indexed:${attr(fg, 'indexed')}`;
    return `pattern:${type}`;
  });
  const strikeFonts = [...block('fonts').matchAll(/<font\b[^>]*>([\s\S]*?)<\/font>|<font\/>/g)].map((m) =>
    /<strike\b(?![^>]*val="(0|false)")/.test(m[1] || ''),
  );
  const xfs = [...block('cellXfs').matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => ({
    fill: fills[Number(attr(m[1], 'fillId') || 0)] || null,
    strike: strikeFonts[Number(attr(m[1], 'fontId') || 0)] || false,
    date: isDateFmt(Number(attr(m[1], 'numFmtId') || 0)),
  }));

  const toDate = (serial) => {
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    return new Date(base + Math.round(Number(serial) * 86400000)).toISOString().slice(0, 10);
  };

  function readSheet(name) {
    const sheet = sheets.find((s) => s.name === name);
    if (!sheet) throw new Error(`시트를 찾을 수 없습니다: ${name} (sheets 명령으로 이름을 확인하세요)`);
    const xml = zip.text(sheet.path) || '';
    const cells = new Map(); // "행:열" → { v, fill, strike }
    const hiddenRows = new Set();
    for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNo = Number(attr(r[1], 'r'));
      if (/hidden="(1|true)"/.test(r[1])) hiddenRows.add(rowNo);
      for (const c of (r[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const pos = splitRef(attr(c[1], 'r') || '');
        if (!pos) continue;
        const style = xfs[Number(attr(c[1], 's') || 0)] || {};
        const type = attr(c[1], 't');
        const body = c[2] || '';
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let value = '';
        if (type === 's') value = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unescapeXml(t[1])).join('');
        else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else if (v !== undefined) value = style.date && type !== 'str' && type !== 'e' ? toDate(v) : unescapeXml(v);
        cells.set(`${pos.row}:${pos.col}`, { v: clean(value), fill: style.fill, strike: style.strike });
      }
    }
    const merges = [...xml.matchAll(/<mergeCell\b([^>]*)\/?>/g)].map((m) => attr(m[1], 'ref'));
    const dim = attr((xml.match(/<dimension\b([^>]*)\/?>/) || [])[1] || '', 'ref') || '';
    return { cells, hiddenRows, merges, dim };
  }

  return { sheets, readSheet };
}

// ---------- csv ----------

function loadCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const cells = new Map();
  rows.forEach((r, ri) => r.forEach((v, ci) => v !== '' && cells.set(`${ri + 1}:${ci + 1}`, { v: clean(v) })));
  const width = Math.max(1, ...rows.map((r) => r.length));
  const sheet = { cells, hiddenRows: new Set(), merges: [], dim: `A1:${numToCol(width)}${rows.length}` };
  return {
    sheets: [{ name: 'csv', state: 'visible' }],
    readSheet: (name) => {
      if (name !== 'csv') throw new Error('CSV의 시트 이름은 "csv" 하나입니다.');
      return sheet;
    },
  };
}

// ---------- 출력 ----------

function bounds(sheet, opts) {
  const dim = sheet.dim.split(':');
  const end = splitRef(dim[1] || dim[0] || 'A1') || { row: 1, col: 1 };
  let maxRow = end.row, maxCol = end.col;
  for (const key of sheet.cells.keys()) {
    const [r, c] = key.split(':').map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  const rows = parseRange(opts.rows) || { from: 1, to: maxRow };
  const cols = parseRange(opts.cols, colToNum) || { from: 1, to: maxCol };
  rows.to = Math.min(rows.to, maxRow, rows.from + MAX_ROWS - 1);
  cols.to = Math.min(cols.to, maxCol);
  return { rows, cols, maxRow };
}

function mergedLookup(sheet) {
  const map = new Map();
  for (const ref of sheet.merges) {
    const [a, b] = ref.split(':').map(splitRef);
    if (!a || !b) continue;
    for (let r = a.row; r <= b.row; r++)
      for (let c = a.col; c <= b.col; c++) if (r !== a.row || c !== a.col) map.set(`${r}:${c}`, `${a.row}:${a.col}`);
  }
  return map;
}

function cmdSheets(book) {
  const out = ['시트\t사용 범위\t병합 셀\t숨김'];
  for (const s of book.sheets) {
    const data = book.readSheet(s.name);
    out.push(`${s.name}\t${data.dim || '-'}\t${data.merges.length}\t${s.state === 'visible' ? '' : s.state}`);
  }
  return out.join('\n');
}

function cmdDump(book, opts) {
  const sheet = book.readSheet(opts.sheet);
  const { rows, cols, maxRow } = bounds(sheet, opts);
  const merged = opts.raw ? new Map() : mergedLookup(sheet);
  const out = [];
  const inRange = sheet.merges.filter((ref) => {
    const [a, b] = ref.split(':').map(splitRef);
    return a && b && a.row <= rows.to && b.row >= rows.from;
  });
  if (inRange.length) out.push(`# 병합: ${inRange.slice(0, 30).join(', ')}${inRange.length > 30 ? ` 외 ${inRange.length - 30}` : ''}`);
  const head = ['행'];
  for (let c = cols.from; c <= cols.to; c++) head.push(numToCol(c));
  out.push(head.join('\t'));
  for (let r = rows.from; r <= rows.to; r++) {
    const line = [`${r}${sheet.hiddenRows.has(r) ? '(숨김)' : ''}`];
    let any = false;
    for (let c = cols.from; c <= cols.to; c++) {
      const key = merged.get(`${r}:${c}`) || `${r}:${c}`;
      const cell = sheet.cells.get(key);
      const v = cell?.v ? (cell.strike ? `~~${cell.v}~~` : cell.v) : '';
      if (v) any = true;
      line.push(v);
    }
    if (any) out.push(line.join('\t'));
  }
  if (rows.to < maxRow) out.push(`# 다음: --rows ${rows.to + 1}-${Math.min(rows.to + MAX_ROWS, maxRow)} (전체 ${maxRow}행)`);
  return out.join('\n');
}

function cmdFills(book, opts) {
  const sheet = book.readSheet(opts.sheet);
  const { rows, cols, maxRow } = bounds(sheet, opts);
  const out = ['행\t색칠된 열 범위=색키'];
  for (let r = rows.from; r <= rows.to; r++) {
    const runs = [];
    for (let c = cols.from; c <= cols.to; c++) {
      const fill = sheet.cells.get(`${r}:${c}`)?.fill;
      const last = runs[runs.length - 1];
      if (fill && last && last.fill === fill && last.to === c - 1) last.to = c;
      else if (fill) runs.push({ from: c, to: c, fill });
    }
    if (runs.length) out.push(`${r}\t${runs.map((x) => `${numToCol(x.from)}:${numToCol(x.to)}=${x.fill}`).join('; ')}`);
  }
  if (rows.to < maxRow) out.push(`# 다음: --rows ${rows.to + 1}-${Math.min(rows.to + MAX_ROWS, maxRow)} (전체 ${maxRow}행)`);
  return out.join('\n');
}

// ---------- 실행 ----------

function parseArgs(argv) {
  const [file, cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i].replace(/^--/, '');
    if (k === 'raw') opts.raw = true;
    else opts[k] = rest[++i];
  }
  return { file, cmd, opts };
}

export function run(argv) {
  const { file, cmd, opts } = parseArgs(argv);
  if (!file || !cmd) throw new Error('사용법: node read-ia.mjs <파일> sheets | dump --sheet <시트> | fills --sheet <시트>');
  const ext = extname(file).toLowerCase();
  if (ext === '.xls') throw new Error('.xls(옛 형식)는 읽지 못합니다. 엑셀에서 .xlsx로 다시 저장해 주세요.');
  const book = ext === '.csv' ? loadCsv(file) : loadXlsx(file);
  if (cmd === 'sheets') return cmdSheets(book);
  if (!opts.sheet) throw new Error('--sheet <시트 이름>이 필요합니다.');
  if (cmd === 'dump') return cmdDump(book, opts);
  if (cmd === 'fills') return cmdFills(book, opts);
  throw new Error(`알 수 없는 명령: ${cmd}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.stdout.write(run(process.argv.slice(2)) + '\n');
  } catch (e) {
    process.stderr.write(`[read-ia] ${e.message}\n`);
    process.exit(1);
  }
}
