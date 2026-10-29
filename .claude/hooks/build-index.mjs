#!/usr/bin/env node
// 인덱스 자동 생성 훅
// - PostToolUse(Edit|Write): docs/ia/, docs/ui-flow/, docs/screens/, docs/components/, docs/questions/ 파일을 고친 직후 실행된다.
// - 수동 실행: node .claude/hooks/build-index.mjs (에디터에서 직접 고쳤을 때)
//
// 원본 → 생성 결과
// - 화면 ID·화면명 원본
//   - IA 사본(docs/ia/screen-list.md)이 있으면: IA "## 1. 화면 목록" 표 (+ "## 2. 일정" 표의 예정일)
//   - 없으면: 각 플로우 문서의 "## 2. 화면 목록" 표
// - 플로우 frontmatter, 화면 명세 frontmatter(id·status·figma·flow)
//   → docs/ui-flow/_index.md 의 AUTO 블록 (도메인별 플로우, 전체 화면 맵)
// - 컴포넌트 명세 frontmatter → docs/components/_index.md 의 AUTO 블록
// - 질문 파일(docs/questions/<source>.md)의 "## 질문 목록" 표
//   → docs/questions/_index.md 의 AUTO 블록 (열린 질문 모음), 화면 맵의 "열린 질문" 칸
// - 현재 기준 버전(IA 사본 version, 기획서 분석 version, docs/changes/_index.md 1번 디자인 기준 버전)
//   + 변경 기록(docs/changes/<원본>-<버전>.md)의 "## 2. 변경 목록" 표 + 각 명세의 "수정필요" 상태
//   → docs/changes/_index.md 의 AUTO 블록. 화면 명세의 ia_ver·plan_ver·design_ver가 현재 버전과 다르면 경고
// - 검수 보고 파일(docs/reports/<화면ID>.md) frontmatter result → 화면 맵의 "검수" 칸
// - 화면 패턴: 플로우 "2. 화면 목록" 표의 "패턴" 칸을 docs/PATTERNS.md 1번 표·4번 예외 표의 패턴과 대조
// - 공통 화면: PROJECT.md "공통 화면 도메인 키"(기본 common) 플로우의 IA 밖 화면은
//   docs/questions/ia.md에 그 화면 ID가 대상인 열린 질문이 있으면 "IA 추가 요청 중"으로 표시하고 경고하지 않는다
// - 작업 묶음(docs/batches/<묶음 ID>.md)의 "## 2. 대상 화면과 순서" 표 + 화면 상태·검수 결과
//   → 각 묶음 파일과 docs/batches/_index.md 의 AUTO 블록 (진행·완료, 묶음 밖 퍼블 대상)
// - DS 변경 요청(docs/ds-requests/<요청 ID>-<이름>.md) frontmatter → docs/ds-requests/_index.md 의 AUTO 블록
//   열린 요청(요청·디자이너 검토)의 screens에 있는 화면이 확정·구현완료면 경고
// - 컴포넌트 명세 frontmatter figma_name → docs/components/_index.md 의 연결 목록 (같은 이름 중복, 구현완료인데 path 없음 경고)
// - 화면 ID 형식: docs/PROJECT.md "화면 ID 형식"의 정규식 (비어 있으면 기본값)
//
// 불일치(ID 중복, IA와 플로우의 차이, 허용되지 않은 상태 값 등)는 훅 모드에서 exit 2 + stderr로 Claude에게 알린다.
// 훅 오류로 작업이 막히지 않도록, 예외가 나면 그냥 통과시킨다.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUS = {
  screen: ['초안', '검토', '확정', '구현완료', '수정필요'],
  flow: ['초안', '검토', '확정', '수정필요'],
  component: ['초안', '승인', '구현완료', '수정필요'],
};
const NEEDS_FIX = '수정필요';
const QA_RESULT = ['통과', '조건부 통과', '미통과'];
const NO_FLOW = '플로우 전';
const NO_SPEC = '명세 전';
const DEFAULT_ID = '^[A-Z]{2,5}-\\d{3}$';
const UNSAFE_ID = /[\\/:*?"<>|\s]/; // 파일·폴더 이름에 쓸 수 없는 문자
const START = '<!-- AUTO:START';
const END = '<!-- AUTO:END -->';
const START_LINE = `${START} — 자동 생성. 직접 고치지 말고 원본 파일을 고친다 -->`;

// ---------- 읽기 ----------

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// 한 줄짜리 `키: 값`만 읽는다. 값 뒤의 ` # 주석`과 감싼 따옴표는 지운다.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    data[kv[1]] = kv[2].replace(/(^|\s+)#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return data;
}

function h1(text) {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
}

function cells(row) {
  return row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

// "## <번호>. <제목>"(번호가 null이면 "## <제목>") 섹션의 표를 { 머리글: 값 } 행 목록으로 읽는다. 구분선 행은 건너뛴다.
function sectionTable(text, no, title) {
  const num = no === null ? '' : `${no}\\.\\s*`;
  const sec = text.match(new RegExp(`^##\\s*${num}${title}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'));
  if (!sec) return [];
  const lines = sec[1].split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const head = cells(lines[0]);
  return lines
    .slice(1)
    .map(cells)
    .filter((c) => !c.every((v) => /^:?-{2,}:?$/.test(v) || v === ''))
    .map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])));
}

// docs/PROJECT.md의 "화면 ID 형식: `정규식`"을 읽는다. 없거나 [TODO]면 기본값.
function screenIdPattern(root) {
  const text = read(join(root, 'docs/PROJECT.md')) || '';
  const m = text.match(/화면 ID 형식:\s*`([^`]+)`/);
  try {
    return new RegExp(m ? m[1] : DEFAULT_ID);
  } catch {
    return new RegExp(DEFAULT_ID);
  }
}

// 플로우 문서의 "## 2. 화면 목록" 표에서 화면 행을 읽는다. (머리글 이름으로 읽고, 없으면 첫 칸 = 화면 ID, 둘째 칸 = 화면명)
function flowScreens(text, idRe) {
  return sectionTable(text, 2, '화면 목록')
    .map((r) => {
      const v = Object.values(r);
      return { id: r['화면 ID'] ?? v[0] ?? '', title: r['화면명'] ?? v[1] ?? '', role: r['역할'] ?? '', pattern: r['패턴'] ?? '' };
    })
    .filter((s) => idRe.test(s.id));
}

// docs/PATTERNS.md 1번 표와 4번 예외 표의 패턴 이름. 파일이 없으면 null (점검하지 않음)
function patternNames(root) {
  const text = read(join(root, 'docs/PATTERNS.md'));
  if (text === null) return null;
  const names = new Set(['없음']);
  for (const r of [...sectionTable(text, 1, '패턴 목록'), ...sectionTable(text, 4, '프로젝트별 예외')]) {
    if (r['패턴']) names.add(r['패턴']);
  }
  return names;
}

// docs/PROJECT.md의 "공통 화면 도메인 키". 없거나 [TODO]면 common
function commonKey(root) {
  const text = read(join(root, 'docs/PROJECT.md')) || '';
  const m = text.match(/공통 화면 도메인 키:[ \t]*`?([A-Za-z0-9_-]+)`?/);
  return m ? m[1] : 'common';
}

// IA 사본: 화면 목록·일정·현황에 표시할 단계
function readIa(root, idRe, warn) {
  const text = read(join(root, 'docs/ia/screen-list.md'));
  if (text === null) return null;
  const where = 'docs/ia/screen-list.md';
  const list = [];
  const ids = new Set();
  for (const r of sectionTable(text, 1, '화면 목록')) {
    const id = r['화면 ID'];
    if (!id) continue;
    if (UNSAFE_ID.test(id)) warn(`${where}: 화면 ID "${id}"에 파일 이름으로 쓸 수 없는 문자(공백 / \\ : * ? " < > |)가 있습니다.`);
    else if (!idRe.test(id)) warn(`${where}: 화면 ID "${id}"가 PROJECT.md의 화면 ID 형식(${idRe.source})과 맞지 않습니다.`);
    if (ids.has(id)) warn(`${where}: 화면 ID ${id}가 두 번 있습니다.`);
    ids.add(id);
    list.push({ id, title: r['화면명'] || '', domain: r['도메인'] || '' });
  }

  const source = read(join(root, 'docs/ia/source.md')) || '';
  const sm = source.match(/현황에 표시할 단계:\s*([^\n[]+)/);
  const stage = sm ? sm[1].trim() : '';
  const due = new Map();
  for (const r of sectionTable(text, 2, '일정')) {
    const id = r['화면 ID'];
    if (!id) continue;
    if (!ids.has(id)) warn(`${where}: 일정 표에만 있고 화면 목록에 없는 화면 ${id}`);
    if (stage && r['단계'] === stage) due.set(id, r['종료'] || '');
  }
  return { list, ids, stage, due };
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');

// ---------- 질문 ----------

const Q_STATUS = ['미답변', '보류', '가정', '확정'];
const Q_OPEN = ['미답변', '보류', '가정'];
const Q_BLOCK = ['예', '아니오'];

// docs/questions/<source>.md 의 "## 질문 목록" 표를 읽고 형식을 점검한다.
function readQuestions(root, warn) {
  const dir = join(root, 'docs/questions');
  const list = [];
  const seen = new Map();
  for (const file of mdFiles(dir)) {
    const text = read(join(dir, file));
    const where = `docs/questions/${file}`;
    const fm = (text && frontmatter(text)) || {};
    if (!fm.prefix) warn(`${where}: frontmatter에 prefix(질문 ID 앞부분)가 없습니다.`);
    for (const r of sectionTable(text || '', null, '질문 목록')) {
      const q = {
        id: r['ID'] || '',
        target: r['대상'] || '',
        from: r['출처 위치'] || '',
        text: r['질문'] || '',
        who: r['확인 대상'] || '',
        block: r['차단'] || '',
        status: r['상태'] || '',
        answer: r['답'] || '',
        applied: r['반영 위치'] || '',
        file,
      };
      if (!q.id && !q.text) continue;
      const at = `${where} ${q.id || '(ID 없음)'}`;
      if (!/^[A-Z][A-Z0-9-]*-\d{3}$/.test(q.id)) warn(`${at}: ID 형식이 "<앞부분>-<3자리 번호>"가 아닙니다.`);
      else if (fm.prefix && !q.id.startsWith(`${fm.prefix}-`)) warn(`${at}: ID가 이 파일의 prefix(${fm.prefix})로 시작하지 않습니다.`);
      if (seen.has(q.id)) warn(`${at}: 질문 ID가 ${seen.get(q.id)}에도 있습니다.`);
      else seen.set(q.id, where);
      if (!q.target) warn(`${at}: 대상이 비어 있습니다. (화면 ID·컴포넌트·도메인 키·공통)`);
      if (!q.who) warn(`${at}: 확인 대상이 비어 있습니다.`);
      if (!Q_BLOCK.includes(q.block)) warn(`${at}: 차단 "${q.block}"는 허용 값이 아닙니다 (${Q_BLOCK.join(' | ')}).`);
      if (!Q_STATUS.includes(q.status)) warn(`${at}: 상태 "${q.status}"는 허용 값이 아닙니다 (${Q_STATUS.join(' | ')}).`);
      if (q.status === '가정' && !q.answer) warn(`${at}: 가정인데 답 칸에 가정한 내용이 없습니다.`);
      if (q.status === '가정' && q.block === '예') warn(`${at}: 차단 질문은 가정으로 진행할 수 없습니다.`);
      if (q.status === '확정' && (!q.answer || !q.applied)) warn(`${at}: 확정인데 답 또는 반영 위치가 비어 있습니다.`);
      const path = q.applied.replace(/`/g, '').split('#')[0].trim();
      if (/^(docs|src)\//.test(path) && !existsSync(join(root, path))) warn(`${at}: 반영 위치 ${path} 파일이 없습니다.`);
      list.push(q);
    }
  }
  return list;
}

function buildQuestions(questions) {
  const out = [START_LINE, ''];
  if (questions.length === 0) {
    out.push('아직 등록된 질문이 없다.', '', END);
    return out.join('\n');
  }
  const n = (f) => questions.filter(f).length;
  const open = questions.filter((q) => Q_OPEN.includes(q.status));
  out.push(
    `전체 ${questions.length} · ${Q_STATUS.map((s) => `${s} ${n((q) => q.status === s)}`).join(' · ')} · 열린 차단 질문 ${n((q) => Q_OPEN.includes(q.status) && q.block === '예')}`,
    '',
    '### 열린 질문 (차단 먼저, 확인 대상별)',
  );
  if (open.length === 0) out.push('열린 질문이 없다.');
  else {
    open.sort((a, b) => (a.block === '예' ? 0 : 1) - (b.block === '예' ? 0 : 1) || a.who.localeCompare(b.who) || a.id.localeCompare(b.id));
    out.push('| ID | 대상 | 질문 | 확인 대상 | 차단 | 상태 | 답(가정·보류 이유) | 파일 |', '|---|---|---|---|---|---|---|---|');
    for (const q of open) {
      out.push(`| ${esc(q.id)} | ${esc(q.target)} | ${esc(q.text)} | ${esc(q.who)} | ${esc(q.block)} | ${esc(q.status)} | ${esc(q.answer)} | [${q.file}](${q.file}) |`);
    }
  }
  out.push('', '- 확정된 질문은 원본 파일에서 ID로 검색한다.', '', END);
  return out.join('\n');
}

// ---------- 화면·플로우 ----------

function buildScreens(root, warn, questions = []) {
  const idRe = screenIdPattern(root);
  const ia = readIa(root, idRe, warn);
  const flowDir = join(root, 'docs/ui-flow');
  const screenDir = join(root, 'docs/screens');

  // 화면 명세
  const specs = new Map();
  for (const file of mdFiles(screenDir)) {
    const text = read(join(screenDir, file));
    const fm = text && frontmatter(text);
    const where = `docs/screens/${file}`;
    if (!fm) {
      warn(`${where}: frontmatter가 없습니다.`);
      continue;
    }
    const id = fm.id || basename(file, '.md');
    if (id !== basename(file, '.md')) warn(`${where}: frontmatter id(${id})와 파일 이름이 다릅니다.`);
    if (!STATUS.screen.includes(fm.status)) {
      warn(`${where}: status "${fm.status ?? ''}"는 허용 값이 아닙니다 (${STATUS.screen.join(' | ')}).`);
    }
    const title = h1(text).replace(id, '').trim();
    specs.set(id, { ...fm, id, file, title });
    if (fm.status === NEEDS_FIX) needsFix.push({ kind: '화면', name: id, link: `../screens/${file}` });
  }

  // 검수 보고 파일
  const reports = new Map();
  const repDir = join(root, 'docs/reports');
  for (const file of mdFiles(repDir)) {
    const fm = frontmatter(read(join(repDir, file)) || '') || {};
    const where = `docs/reports/${file}`;
    const id = fm.screen || basename(file, '.md');
    if (id !== basename(file, '.md')) warn(`${where}: frontmatter screen(${id})과 파일 이름이 다릅니다.`);
    if (!QA_RESULT.includes(fm.result)) warn(`${where}: result "${fm.result ?? ''}"는 허용 값이 아닙니다 (${QA_RESULT.join(' | ')}).`);
    const spec = specs.get(id);
    if (!spec) warn(`${where}: 화면 명세 docs/screens/${id}.md가 없습니다.`);
    else if (spec.status === '구현완료') {
      if (fm.result === '미통과') warn(`${where}: 결과가 미통과인데 명세 상태가 구현완료입니다.`);
      for (const k of ['ia_ver', 'plan_ver', 'design_ver']) {
        if ((fm[k] || '') !== (spec[k] || '')) warn(`${where}: ${k}(${fm[k] || '빈칸'})가 명세(${spec[k] || '빈칸'})와 다릅니다. 명세가 바뀐 뒤 다시 검수하지 않았는지 확인합니다.`);
      }
    }
    reports.set(id, { file, ...fm });
  }
  allReports = reports;
  for (const [id, spec] of specs) {
    if (spec.status === '구현완료' && !reports.has(id)) warn(`docs/screens/${spec.file}: 구현완료인데 검수 보고 파일 docs/reports/${id}.md가 없습니다.`);
  }

  // 플로우
  const patterns = patternNames(root);
  const common = commonKey(root);
  const pending = new Set(); // IA 추가 요청 중인 공통 화면
  const iaById = new Map((ia?.list || []).map((s) => [s.id, s]));
  const flows = [];
  const seen = new Map(); // 화면 ID → 플로우 문서
  for (const file of mdFiles(flowDir)) {
    const text = read(join(flowDir, file));
    const fm = (text && frontmatter(text)) || {};
    const where = `docs/ui-flow/${file}`;
    const key = basename(file, '.md');
    if (!text || !frontmatter(text)) warn(`${where}: frontmatter가 없습니다.`);
    else if (!STATUS.flow.includes(fm.status)) {
      warn(`${where}: status "${fm.status ?? ''}"는 허용 값이 아닙니다 (${STATUS.flow.join(' | ')}).`);
    }
    const screens = text ? flowScreens(text, idRe) : [];
    for (const s of screens) {
      if (seen.get(s.id) === where) warn(`${where}: 화면 ID ${s.id}가 화면 목록에 두 번 있습니다.`);
      else if (seen.has(s.id)) warn(`화면 ID ${s.id}가 ${seen.get(s.id)}와 ${where}에 중복 등록됐습니다.`);
      else seen.set(s.id, where);
      if (fm.code && !s.id.startsWith(fm.code)) {
        warn(`${where}: ${s.id}의 약어가 플로우 code(${fm.code})와 다릅니다.`);
      }
      if (patterns && s.pattern && !patterns.has(s.pattern)) {
        warn(`${where}: ${s.id}의 패턴 "${s.pattern}"이 docs/PATTERNS.md 1번·4번 표에 없습니다.`);
      }
      if (ia) {
        const row = iaById.get(s.id);
        const asked = questions.some((q) => q.file === 'ia.md' && q.target === s.id && Q_OPEN.includes(q.status));
        if (!row && key === common && asked) pending.add(s.id);
        else if (!row && key === common) warn(`${where}: IA에 없는 공통 화면 ${s.id}인데 docs/questions/ia.md에 IA 추가 요청 질문(대상 ${s.id})이 없습니다.`);
        else if (!row) warn(`${where}: IA 화면 목록에 없는 화면 ${s.id} (IA에 추가를 요청하거나 플로우에서 뺀다)`);
        else {
          if (row.title !== s.title) warn(`${s.id}: 화면명이 IA("${row.title}")와 플로우 표("${s.title}")에서 다릅니다. IA를 따른다.`);
          if (row.domain && row.domain !== key) warn(`${s.id}: IA 도메인(${row.domain})과 플로우 문서(${file})가 다릅니다.`);
        }
      }
      const spec = specs.get(s.id);
      const name = ia ? iaById.get(s.id)?.title ?? s.title : s.title;
      if (spec?.title && spec.title !== name) {
        warn(`${s.id}: 화면명이 ${ia ? 'IA' : '플로우 표'}("${name}")와 명세 제목("${spec.title}")에서 다릅니다.`);
      }
    }
    flows.push({ file, key, domain: fm.domain || key, code: fm.code || '', status: fm.status || '', screens });
    if (fm.status === NEEDS_FIX) needsFix.push({ kind: '플로우', name: key, link: `../ui-flow/${file}` });
  }

  for (const [id, spec] of specs) {
    if (!seen.has(id)) warn(`docs/screens/${spec.file}: ${id}가 어느 플로우의 화면 목록에도 없습니다.`);
  }
  allSpecs = specs;

  // 질문 대상 점검: 화면 ID 형식인데 화면 목록에 없는 대상
  const known = new Set([...(ia?.ids || []), ...seen.keys()]);
  knownIds = known;
  for (const q of questions) {
    if (idRe.test(q.target) && !known.has(q.target)) {
      warn(`docs/questions/${q.file} ${q.id}: 대상 ${q.target}가 화면 목록(${ia ? 'IA' : '플로우'})에 없습니다.`);
    }
  }
  const openQ = (id) => {
    const qs = questions.filter((q) => q.target === id && Q_OPEN.includes(q.status));
    const b = qs.filter((q) => q.block === '예').length;
    return qs.length ? `${qs.length}${b ? ` (차단 ${b})` : ''}` : '';
  };

  // 화면 맵 행
  const flowOf = (id) => flows.find((f) => f.screens.some((s) => s.id === id));
  const rowOf = (id, title) => {
    const f = flowOf(id);
    const spec = specs.get(id);
    return {
      id,
      title,
      flow: f ? `[${esc(f.domain)}](${f.file})` : '-',
      spec: spec ? `[보기](../screens/${spec.file})` : '-',
      status: spec ? spec.status : f ? NO_SPEC : NO_FLOW,
      figma: spec?.figma ? '있음' : '없음',
      qa: reports.has(id) ? `[${esc(reports.get(id).result || '?')}](../reports/${reports.get(id).file})` : '',
      questions: openQ(id),
      due: ia?.due.get(id) || '',
    };
  };
  const rows = ia
    ? [
        ...ia.list.map((s) => rowOf(s.id, s.title)),
        ...[...seen.keys()].filter((id) => !ia.ids.has(id)).map((id) => rowOf(id, `${flowOf(id).screens.find((s) => s.id === id).title} (${pending.has(id) ? 'IA 추가 요청 중' : 'IA에 없음'})`)),
      ]
    : flows.flatMap((f) => f.screens.map((s) => rowOf(s.id, s.title)));

  const order = [...(ia ? [NO_FLOW] : []), NO_SPEC, ...STATUS.screen];
  const count = (list) => order.map((s) => `${s} ${list.filter((r) => r.status === s).length}`).join(' · ');

  const out = [START_LINE, ''];
  if (!ia && flows.length === 0) {
    out.push('아직 등록된 플로우가 없다.');
  } else {
    out.push(`화면 목록 원본: ${ia ? '[IA 사본](../ia/screen-list.md)' : '각 플로우 문서의 화면 목록'}`, '');
    out.push('### 도메인별 플로우');
    if (ia) {
      const keys = [...new Set([...ia.list.map((s) => s.domain).filter(Boolean), ...flows.map((f) => f.key)])];
      out.push('| 도메인 | 약어 | 플로우 문서 | 상태 | IA 화면 수 | 플로우 등록 |', '|---|---|---|---|---|---|');
      for (const k of keys) {
        const f = flows.find((x) => x.key === k);
        const n = ia.list.filter((s) => s.domain === k).length;
        out.push(`| ${esc(f?.domain || k)} | ${esc(f?.code || '')} | ${f ? `[${f.file}](${f.file})` : '-'} | ${esc(f?.status || NO_FLOW)} | ${n} | ${f ? f.screens.length : 0} |`);
      }
    } else {
      out.push('| 도메인 | 약어 | 플로우 문서 | 상태 | 화면 수 |', '|---|---|---|---|---|');
      for (const f of flows) {
        out.push(`| ${esc(f.domain)} | ${esc(f.code)} | [${f.file}](${f.file}) | ${esc(f.status)} | ${f.screens.length} |`);
      }
    }
    out.push('', '### 전체 화면 맵', `전체 ${rows.length} · ${count(rows)}`, '');
    if (ia) {
      const dueHead = `예정일${ia.stage ? ` (${ia.stage})` : ''}`;
      out.push(`| 화면 ID | 화면명 | 플로우 | 명세 | 상태 | Figma | 검수 | 열린 질문 | ${dueHead} |`, '|---|---|---|---|---|---|---|---|---|');
      for (const r of rows) out.push(`| ${r.id} | ${esc(r.title)} | ${r.flow} | ${r.spec} | ${r.status} | ${r.figma} | ${r.qa} | ${r.questions} | ${esc(r.due)} |`);
    } else {
      out.push('| 화면 ID | 화면명 | 플로우 | 명세 | 상태 | Figma | 검수 | 열린 질문 |', '|---|---|---|---|---|---|---|---|');
      for (const r of rows) out.push(`| ${r.id} | ${esc(r.title)} | ${r.flow} | ${r.spec} | ${r.status} | ${r.figma} | ${r.qa} | ${r.questions} |`);
    }
  }
  out.push('', END);
  return out.join('\n');
}

// ---------- 컴포넌트 ----------

function buildComponents(root, warn) {
  const dir = join(root, 'docs/components');
  const rows = [];
  const byFigma = new Map();
  for (const file of mdFiles(dir)) {
    const text = read(join(dir, file));
    const fm = text && frontmatter(text);
    const where = `docs/components/${file}`;
    if (!fm) {
      warn(`${where}: frontmatter가 없습니다.`);
      continue;
    }
    const name = fm.name || basename(file, '.md');
    if (name !== basename(file, '.md')) warn(`${where}: frontmatter name(${name})과 파일 이름이 다릅니다.`);
    if (!STATUS.component.includes(fm.status)) {
      warn(`${where}: status "${fm.status ?? ''}"는 허용 값이 아닙니다 (${STATUS.component.join(' | ')}).`);
    }
    if (fm.layer === '기본' && !fm.figma_name) warn(`${where}: 기본 계층인데 figma_name(연결할 Figma 컴포넌트 이름)이 비어 있습니다.`);
    if (fm.figma_name) {
      if (byFigma.has(fm.figma_name)) warn(`${where}: Figma 컴포넌트 "${fm.figma_name}"이 ${byFigma.get(fm.figma_name)}에도 연결돼 있습니다.`);
      else byFigma.set(fm.figma_name, where);
    }
    const path = (fm.path || '').replace(/`/g, '').trim();
    if (fm.status === '구현완료' && path && !path.endsWith('...') && !existsSync(join(root, path))) {
      warn(`${where}: 구현완료인데 path ${path}가 없습니다.`);
    }
    rows.push({ name, file, ...fm, path });
    if (fm.status === NEEDS_FIX) needsFix.push({ kind: '컴포넌트', name, link: `../components/${file}` });
  }

  const out = [START_LINE, ''];
  if (rows.length === 0) {
    out.push('아직 등록된 컴포넌트 명세가 없다.');
  } else {
    const count = STATUS.component.map((st) => `${st} ${rows.filter((r) => r.status === st).length}`).join(' · ');
    out.push(`전체 ${rows.length} · ${count}`, '');
    out.push('### 연결 목록 (Figma 컴포넌트 → 코드 컴포넌트)');
    const linked = rows.filter((r) => r.figma_name).sort((a, b) => a.figma_name.localeCompare(b.figma_name));
    if (linked.length === 0) out.push('연결된 컴포넌트가 없다.');
    else {
      out.push('| Figma 이름 | 코드 컴포넌트 | 경로 | 상태 | Code Connect |', '|---|---|---|---|---|');
      for (const r of linked) out.push(`| ${esc(r.figma_name)} | [${esc(r.name)}](${r.file}) | ${esc(r.path)} | ${esc(r.status)} | ${esc(r.code_connect)} |`);
    }
    out.push('', '### 전체 명세', '| 컴포넌트 | 계층 | 구분 | 상태 | 명세 |', '|---|---|---|---|---|');
    for (const r of rows) out.push(`| ${esc(r.name)} | ${esc(r.layer)} | ${esc(r.kind)} | ${esc(r.status)} | [보기](${r.file}) |`);
  }
  out.push('', END);
  return out.join('\n');
}

// ---------- DS 변경 요청 ----------

const DS_STATUS = ['요청', '디자이너 검토', '반영', '대체', '기각'];
const DS_OPEN = ['요청', '디자이너 검토'];
const DS_KIND = ['토큰', '컴포넌트', '변형', '아이콘', '기타'];

function buildDsRequests(root, warn) {
  const dir = join(root, 'docs/ds-requests');
  const list = [];
  const ids = new Map();
  for (const file of mdFiles(dir)) {
    const text = read(join(dir, file)) || '';
    const where = `docs/ds-requests/${file}`;
    const fm = frontmatter(text) || {};
    const id = fm.id || '';
    if (!/^DS-\d{3}$/.test(id)) warn(`${where}: id "${id}"가 "DS-<3자리 번호>" 형식이 아닙니다.`);
    else if (!file.startsWith(`${id}-`) && file !== `${id}.md`) warn(`${where}: 파일 이름이 id(${id})로 시작하지 않습니다.`);
    if (ids.has(id)) warn(`${where}: id ${id}가 ${ids.get(id)}에도 있습니다.`);
    else ids.set(id, where);
    if (!DS_STATUS.includes(fm.status)) warn(`${where}: status "${fm.status ?? ''}"는 허용 값이 아닙니다 (${DS_STATUS.join(' | ')}).`);
    if (fm.kind && !DS_KIND.includes(fm.kind)) warn(`${where}: kind "${fm.kind}"는 허용 값이 아닙니다 (${DS_KIND.join(' | ')}).`);
    if (!DS_OPEN.includes(fm.status) && DS_STATUS.includes(fm.status) && !fm.decided) warn(`${where}: ${fm.status}인데 decided(결정일)가 비어 있습니다.`);
    const screens = (fm.screens || '').split(',').map((x) => x.trim()).filter(Boolean);
    for (const sid of screens) {
      if (!knownIds.has(sid)) warn(`${where}: screens의 ${sid}가 화면 목록에 없습니다.`);
      const sp = allSpecs.get(sid);
      if (DS_OPEN.includes(fm.status) && ['확정', '구현완료'].includes(sp?.status)) {
        warn(`docs/screens/${sid}.md: 열린 DS 변경 요청 ${id}가 있는데 상태가 ${sp.status}입니다.`);
      }
    }
    list.push({ file, id, kind: fm.kind || '', status: fm.status || '', screens, created: fm.created || '', title: h1(text).replace(id, '').trim() });
  }
  const open = list.filter((x) => DS_OPEN.includes(x.status));
  const out = [START_LINE, ''];
  if (list.length === 0) out.push('아직 요청이 없다.');
  else {
    out.push(`전체 ${list.length} · ${DS_STATUS.map((st) => `${st} ${list.filter((x) => x.status === st).length}`).join(' · ')}`, '');
    out.push('### 열린 요청');
    if (open.length === 0) out.push('열린 요청이 없다.');
    else {
      out.push('| ID | 내용 | 종류 | 상태 | 멈춘 화면 | 만든 날 |', '|---|---|---|---|---|---|');
      for (const x of open) out.push(`| [${x.id}](${x.file}) | ${esc(x.title)} | ${esc(x.kind)} | ${esc(x.status)} | ${esc(x.screens.join(', '))} | ${esc(x.created)} |`);
    }
    out.push('', '- 닫힌 요청(반영·대체·기각)은 파일에서 ID로 검색한다.');
  }
  out.push('', END);
  return out.join('\n');
}

// ---------- 버전·변경 기록 ----------

const needsFix = []; // 상태가 "수정필요"인 화면·플로우·컴포넌트 (buildScreens·buildComponents가 채운다)
let allSpecs = new Map(); // 화면 명세 (buildScreens가 채운다)
const CH_SOURCE = { ia: 'IA', plan: '기획서', design: '디자인' };
const CH_KIND = ['추가', '삭제', '수정', '이동', '명칭 변경'];
const CH_DONE = ['미처리', '반영', '해당 없음'];
const VER_KEY = { ia: 'ia_ver', plan: 'plan_ver', design: 'design_ver' };

const usable = (v) => (v && !/^\[?TODO/.test(v) ? v : '');

// 원본별 현재 기준 버전
function currentVersions(root) {
  const ia = usable(frontmatter(read(join(root, 'docs/ia/screen-list.md')) || '')?.version);
  const plan = new Map(); // 도메인 키 → 버전
  const sbDir = join(root, 'docs/storyboard');
  for (const file of mdFiles(sbDir)) {
    const v = usable(frontmatter(read(join(sbDir, file)) || '')?.version);
    if (v) plan.set(basename(file, '.md'), v);
  }
  const idx = read(join(root, 'docs/changes/_index.md')) || '';
  const dm = idx.match(/디자인 기준 버전:[ \t]*([^\n]*)/);
  const design = usable(dm ? dm[1].trim() : '');
  return { ia, plan, design };
}

// 화면 명세의 기준 버전 점검
function checkSpecVersions(cur, warn) {
  for (const [id, spec] of allSpecs) {
    if (spec.status === NEEDS_FIX) continue;
    const where = `docs/screens/${spec.file}`;
    const domain = (spec.flow || '').match(/ui-flow\/([^/#]+)\.md/)?.[1];
    const want = { ia: cur.ia, plan: domain ? cur.plan.get(domain) || '' : '', design: cur.design };
    for (const [src, key] of Object.entries(VER_KEY)) {
      const now = want[src];
      const has = spec[key] || '';
      if (!now) continue;
      if (!has) {
        if (['확정', '구현완료'].includes(spec.status)) warn(`${where}: ${key}가 비어 있습니다. 현재 ${CH_SOURCE[src]} 기준 버전은 ${now}입니다.`);
      } else if (has !== now) {
        warn(`${where}: ${key}(${has})가 현재 ${CH_SOURCE[src]} 기준 버전(${now})과 다릅니다. version-update로 영향을 확인하고, 영향이 있으면 status를 "수정필요"로 바꿉니다.`);
      }
    }
  }
}

// docs/changes/<원본>-<버전>.md 를 읽고 형식을 점검한다.
function readChanges(root, warn) {
  const dir = join(root, 'docs/changes');
  const list = [];
  for (const file of mdFiles(dir)) {
    const text = read(join(dir, file)) || '';
    const where = `docs/changes/${file}`;
    const fm = frontmatter(text) || {};
    if (!CH_SOURCE[fm.source]) warn(`${where}: frontmatter source "${fm.source ?? ''}"는 허용 값이 아닙니다 (${Object.keys(CH_SOURCE).join(' | ')}).`);
    if (!fm.version) warn(`${where}: frontmatter version이 비어 있습니다.`);
    const rows = sectionTable(text, 2, '변경 목록').filter((r) => r['구분'] || r['대상']);
    rows.forEach((r, i) => {
      const at = `${where} 변경 ${i + 1}행(${r['대상'] || '대상 없음'})`;
      if (!CH_KIND.includes(r['구분'])) warn(`${at}: 구분 "${r['구분']}"는 허용 값이 아닙니다 (${CH_KIND.join(' | ')}).`);
      if (!r['대상']) warn(`${at}: 대상이 비어 있습니다.`);
      if (!CH_DONE.includes(r['처리'])) warn(`${at}: 처리 "${r['처리']}"는 허용 값이 아닙니다 (${CH_DONE.join(' | ')}).`);
    });
    list.push({ file, ...fm, rows, open: rows.filter((r) => r['처리'] === '미처리') });
  }
  // 수정필요인데 미처리 변경 줄이 없으면 경고 (화면만 점검)
  for (const n of needsFix.filter((x) => x.kind === '화면')) {
    const hit = list.some((c) => c.open.some((r) => r['대상'] === n.name || (r['영향 문서'] || '').includes(`screens/${n.name}.md`)));
    if (!hit) warn(`docs/screens/${n.name}.md: 상태가 수정필요인데 변경 기록에 이 화면의 미처리 줄이 없습니다.`);
  }
  return list;
}

function buildChanges(cur, changes) {
  const out = [START_LINE, '', '### 현재 기준 버전', '| 원본 | 현재 버전 | 원본 위치 |', '|---|---|---|'];
  out.push(`| IA | ${esc(cur.ia || '-')} | [docs/ia/screen-list.md](../ia/screen-list.md) |`);
  if (cur.plan.size === 0) out.push('| 기획서 | - | docs/storyboard/<도메인>.md |');
  for (const [k, v] of cur.plan) out.push(`| 기획서 (${esc(k)}) | ${esc(v)} | [docs/storyboard/${k}.md](../storyboard/${k}.md) |`);
  out.push(`| 디자인 | ${esc(cur.design || '-')} | 이 파일 1번 |`, '');

  out.push('### 변경 기록');
  if (changes.length === 0) out.push('아직 변경 기록이 없다.');
  else {
    out.push('| 파일 | 원본 | 버전 | 이전 | 받은 날 | 변경 | 미처리 |', '|---|---|---|---|---|---|---|');
    for (const c of [...changes].sort((a, b) => String(b.received || '').localeCompare(String(a.received || '')))) {
      out.push(`| [${c.file}](${c.file}) | ${esc(CH_SOURCE[c.source] || c.source)} | ${esc(c.version)} | ${esc(c.prev)} | ${esc(c.received)} | ${c.rows.length} | ${c.open.length} |`);
    }
  }
  out.push('', `### 수정필요 (${needsFix.length})`);
  if (needsFix.length === 0) out.push('수정필요 상태인 문서가 없다.');
  else {
    out.push('| 구분 | 이름 | 문서 |', '|---|---|---|');
    for (const n of needsFix) out.push(`| ${n.kind} | ${esc(n.name)} | [보기](${n.link}) |`);
  }
  out.push('', END);
  return out.join('\n');
}

// ---------- 작업 묶음 ----------

let allReports = new Map(); // 검수 보고 (buildScreens가 채운다)
let knownIds = new Set(); // 화면 목록의 화면 ID (buildScreens가 채운다)
const QA_DONE = ['통과', '조건부 통과'];

function screenDone(id) {
  const spec = allSpecs.get(id);
  const rep = allReports.get(id);
  return spec?.status === '구현완료' && QA_DONE.includes(rep?.result);
}

// docs/batches/<묶음 ID>.md 를 읽고, 각 파일의 현황 블록과 _index.md 현황을 만든다.
function buildBatches(root, warn) {
  const dir = join(root, 'docs/batches');
  const batches = [];
  for (const file of mdFiles(dir)) {
    const text = read(join(dir, file)) || '';
    const where = `docs/batches/${file}`;
    const fm = frontmatter(text) || {};
    const id = fm.id || basename(file, '.md');
    if (id !== basename(file, '.md')) warn(`${where}: frontmatter id(${id})와 파일 이름이 다릅니다.`);
    const items = sectionTable(text, 2, '대상 화면과 순서')
      .map((r) => ({ order: r['순서'] || '', id: r['화면 ID'] || '', work: r['작업'] || '', note: r['비고'] || '' }))
      .filter((it) => it.id);
    const screens = items.filter((it) => !it.id.startsWith('컴포넌트'));
    for (const it of screens) {
      if (!knownIds.has(it.id)) warn(`${where}: 화면 ${it.id}가 화면 목록에 없습니다.`);
      if (!['퍼블', '다시 퍼블'].includes(it.work)) warn(`${where}: ${it.id}의 작업 "${it.work}"는 허용 값이 아닙니다 (퍼블 | 다시 퍼블).`);
    }
    const done = screens.filter((it) => screenDone(it.id)).length;
    batches.push({ file, id, basis: fm.basis || '', created: fm.created || '', items, screens, done, open: done < screens.length || screens.length === 0 });
  }

  // 한 화면이 열린 묶음 두 개에 있으면 경고
  const owner = new Map();
  for (const b of batches.filter((x) => x.open)) {
    for (const it of b.screens) {
      if (owner.has(it.id) && owner.get(it.id) !== b.file) warn(`화면 ${it.id}가 열린 묶음 ${owner.get(it.id)}와 ${b.file}에 모두 있습니다.`);
      else owner.set(it.id, b.file);
    }
  }

  // 각 묶음 파일의 현황
  for (const b of batches) {
    const out = [START_LINE, '', `진행 ${b.done}/${b.screens.length}${b.open ? '' : ' · 완료'}`, ''];
    if (b.items.length === 0) out.push('2번 표에 대상이 없다.');
    else {
      out.push('| 순서 | 대상 | 작업 | 명세 상태 | 검수 | 열린 질문(차단) |', '|---|---|---|---|---|---|');
      for (const it of b.items) {
        const spec = allSpecs.get(it.id);
        const rep = allReports.get(it.id);
        const qs = questionsCache.filter((q) => q.target === it.id && Q_OPEN.includes(q.status));
        const blk = qs.filter((q) => q.block === '예').length;
        out.push(`| ${esc(it.order)} | ${esc(it.id)} | ${esc(it.work)} | ${esc(spec?.status || (it.id.startsWith('컴포넌트') ? '' : '명세 없음'))} | ${esc(rep?.result || '')} | ${qs.length ? `${qs.length}${blk ? ` (${blk})` : ''}` : ''} |`);
      }
    }
    out.push('', END);
    replaceBlock(root, `docs/batches/${b.file}`, out.join('\n'), warn);
  }

  // _index.md 현황
  const inOpen = new Set(owner.keys());
  const waiting = [...allSpecs.values()].filter((sp) => sp.status === '확정' && !inOpen.has(sp.id)).map((sp) => sp.id);
  const out = [START_LINE, ''];
  if (batches.length === 0) out.push('아직 묶음이 없다.');
  else {
    out.push(`묶음 ${batches.length} · 열림 ${batches.filter((b) => b.open).length} · 완료 ${batches.filter((b) => !b.open).length}`, '');
    out.push('| 묶음 | 근거 | 만든 날 | 진행 | 상태 |', '|---|---|---|---|---|');
    for (const b of batches) out.push(`| [${b.id}](${b.file}) | ${esc(b.basis)} | ${esc(b.created)} | ${b.done}/${b.screens.length} | ${b.open ? '열림' : '완료'} |`);
  }
  out.push('', `### 묶음 밖 퍼블 대상 (명세 확정, 열린 묶음 없음): ${waiting.length}`);
  if (waiting.length) out.push(waiting.join(', '));
  out.push('', END);
  return out.join('\n');
}

let questionsCache = [];

// ---------- 쓰기 ----------

function replaceBlock(root, relPath, block, warn) {
  const path = join(root, relPath);
  const text = read(path);
  if (text === null) return warn(`${relPath}가 없어 인덱스를 만들지 못했습니다.`);
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s < 0 || e < s) return warn(`${relPath}에 AUTO:START / AUTO:END 표시가 없어 인덱스를 만들지 못했습니다.`);
  const next = text.slice(0, s) + block + text.slice(e + END.length);
  if (next !== text) writeFileSync(path, next);
}

// ---------- 실행 ----------

function hookInput() {
  if (process.stdin.isTTY) return null; // 수동 실행
  try {
    return JSON.parse(readFileSync(0, 'utf8') || 'null');
  } catch {
    return null;
  }
}

function main() {
  const input = hookInput();
  const hookMode = Boolean(input?.tool_input);
  const root =
    process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL('../..', import.meta.url));

  if (hookMode) {
    const rel = relative(root, input.tool_input.file_path || '').replace(/\\/g, '/');
    if (!/^docs\/(ia|ui-flow|screens|components|questions|changes|storyboard|reports|batches|ds-requests)\/[^/]+\.md$/.test(rel) && rel !== 'docs/PROJECT.md') return 0;
    if (basename(rel) === '_index.md' && rel !== 'docs/changes/_index.md') return 0;
  }

  const warnings = [];
  const warn = (m) => warnings.push(m);
  const questions = readQuestions(root, warn);
  questionsCache = questions;
  replaceBlock(root, 'docs/ui-flow/_index.md', buildScreens(root, warn, questions), warn);
  replaceBlock(root, 'docs/components/_index.md', buildComponents(root, warn), warn);
  replaceBlock(root, 'docs/questions/_index.md', buildQuestions(questions), warn);
  const cur = currentVersions(root);
  checkSpecVersions(cur, warn);
  replaceBlock(root, 'docs/changes/_index.md', buildChanges(cur, readChanges(root, warn)), warn);
  if (existsSync(join(root, 'docs/batches/_index.md'))) replaceBlock(root, 'docs/batches/_index.md', buildBatches(root, warn), warn);
  if (existsSync(join(root, 'docs/ds-requests/_index.md'))) replaceBlock(root, 'docs/ds-requests/_index.md', buildDsRequests(root, warn), warn);

  if (!hookMode) {
    process.stdout.write(`인덱스를 다시 만들었습니다. 경고 ${warnings.length}건\n`);
    warnings.forEach((w) => process.stdout.write(`- ${w}\n`));
    return warnings.length ? 1 : 0;
  }
  if (warnings.length === 0) return 0;
  process.stderr.write(
    [
      `[인덱스 경고] 인덱스는 다시 만들었지만 원본 문서에서 불일치 ${warnings.length}건을 찾았습니다.`,
      ...warnings.slice(0, 10).map((w) => `- ${w}`),
      ...(warnings.length > 10 ? [`- 외 ${warnings.length - 10}건`] : []),
      '원본(IA 사본, 플로우 화면 목록 표, 명세 frontmatter, 질문 파일, 변경 기록, 검수 보고, 작업 묶음, DS 변경 요청)을 고쳐야 하면 사용자에게 알리고 승인받은 뒤 고치세요. IA 사본은 ia-sync로만 갱신합니다.',
    ].join('\n') + '\n',
  );
  return 2;
}

try {
  process.exit(main());
} catch {
  process.exit(0);
}
