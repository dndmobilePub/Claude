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
// - 화면 ID 형식: docs/PROJECT.md "화면 ID 형식"의 정규식 (비어 있으면 기본값)
//
// 불일치(ID 중복, IA와 플로우의 차이, 허용되지 않은 상태 값 등)는 훅 모드에서 exit 2 + stderr로 Claude에게 알린다.
// 훅 오류로 작업이 막히지 않도록, 예외가 나면 그냥 통과시킨다.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUS = {
  screen: ['초안', '검토', '확정', '구현완료'],
  flow: ['초안', '검토', '확정'],
  component: ['초안', '승인', '구현완료'],
};
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

// 플로우 문서의 "## 2. 화면 목록" 표에서 화면 행을 읽는다. (첫 칸 = 화면 ID)
function flowScreens(text, idRe) {
  return sectionTable(text, 2, '화면 목록')
    .map((r) => Object.values(r))
    .filter((c) => idRe.test(c[0]))
    .map(([id, title = '', role = '']) => ({ id, title, role }));
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
  }

  // 플로우
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
      if (ia) {
        const row = iaById.get(s.id);
        if (!row) warn(`${where}: IA 화면 목록에 없는 화면 ${s.id} (IA에 추가를 요청하거나 플로우에서 뺀다)`);
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
  }

  for (const [id, spec] of specs) {
    if (!seen.has(id)) warn(`docs/screens/${spec.file}: ${id}가 어느 플로우의 화면 목록에도 없습니다.`);
  }

  // 질문 대상 점검: 화면 ID 형식인데 화면 목록에 없는 대상
  const known = new Set([...(ia?.ids || []), ...seen.keys()]);
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
      questions: openQ(id),
      due: ia?.due.get(id) || '',
    };
  };
  const rows = ia
    ? [
        ...ia.list.map((s) => rowOf(s.id, s.title)),
        ...[...seen.keys()].filter((id) => !ia.ids.has(id)).map((id) => rowOf(id, `${flowOf(id).screens.find((s) => s.id === id).title} (IA에 없음)`)),
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
      out.push(`| 화면 ID | 화면명 | 플로우 | 명세 | 상태 | Figma | 열린 질문 | ${dueHead} |`, '|---|---|---|---|---|---|---|---|');
      for (const r of rows) out.push(`| ${r.id} | ${esc(r.title)} | ${r.flow} | ${r.spec} | ${r.status} | ${r.figma} | ${r.questions} | ${esc(r.due)} |`);
    } else {
      out.push('| 화면 ID | 화면명 | 플로우 | 명세 | 상태 | Figma | 열린 질문 |', '|---|---|---|---|---|---|---|');
      for (const r of rows) out.push(`| ${r.id} | ${esc(r.title)} | ${r.flow} | ${r.spec} | ${r.status} | ${r.figma} | ${r.questions} |`);
    }
  }
  out.push('', END);
  return out.join('\n');
}

// ---------- 컴포넌트 ----------

function buildComponents(root, warn) {
  const dir = join(root, 'docs/components');
  const rows = [];
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
    rows.push({ name, file, ...fm });
  }

  const out = [START_LINE, ''];
  if (rows.length === 0) {
    out.push('아직 등록된 컴포넌트 명세가 없다.');
  } else {
    const count = STATUS.component.map((s) => `${s} ${rows.filter((r) => r.status === s).length}`).join(' · ');
    out.push(`전체 ${rows.length} · ${count}`, '');
    out.push('| 컴포넌트 | 계층 | 구분 | 상태 | Code Connect | 명세 |', '|---|---|---|---|---|---|');
    for (const r of rows) {
      out.push(`| ${esc(r.name)} | ${esc(r.layer)} | ${esc(r.kind)} | ${esc(r.status)} | ${esc(r.code_connect)} | [보기](${r.file}) |`);
    }
  }
  out.push('', END);
  return out.join('\n');
}

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
    if (!/^docs\/(ia|ui-flow|screens|components|questions)\/[^/]+\.md$/.test(rel) && rel !== 'docs/PROJECT.md') return 0;
    if (basename(rel) === '_index.md') return 0;
  }

  const warnings = [];
  const warn = (m) => warnings.push(m);
  const questions = readQuestions(root, warn);
  replaceBlock(root, 'docs/ui-flow/_index.md', buildScreens(root, warn, questions), warn);
  replaceBlock(root, 'docs/components/_index.md', buildComponents(root, warn), warn);
  replaceBlock(root, 'docs/questions/_index.md', buildQuestions(questions), warn);

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
      '원본(IA 사본, 플로우 화면 목록 표, 명세 frontmatter, 질문 파일)을 고쳐야 하면 사용자에게 알리고 승인받은 뒤 고치세요. IA 사본은 ia-sync로만 갱신합니다.',
    ].join('\n') + '\n',
  );
  return 2;
}

try {
  process.exit(main());
} catch {
  process.exit(0);
}
