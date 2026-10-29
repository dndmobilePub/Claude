#!/usr/bin/env node
// 공통 지침(프레임워크) 업데이트 스크립트. 외부 패키지 없이 Node만으로 동작한다.
// 분류의 원본은 .claude/framework.json "files" (교체 / 병합 / 선택 / 설정 / 프로젝트).
//
// 사용
//   node .claude/scripts/framework-update.mjs lint
//       프레임워크 저장소용. git이 추적하는 파일이 다섯 분류 중 정확히 하나에 들어가는지 확인한다.
//   node .claude/scripts/framework-update.mjs check --from <지금 버전 폴더> --to <새 버전 폴더>
//       프로젝트에 무엇이 어떻게 바뀌는지 보고만 한다. (파일을 고치지 않는다)
//   node .claude/scripts/framework-update.mjs apply --from <지금 버전 폴더> --to <새 버전 폴더> [--keep-conflicts]
//       check와 같은 보고를 하고, 충돌·설정 확인이 아닌 파일만 반영한다. .claude/framework.json을 새 버전으로 바꾼다.
//       충돌이 있으면 아무것도 고치지 않고 멈춘다. 충돌 파일을 그대로 두기로 사람이 정했을 때만 --keep-conflicts를 붙인다.
//   <지금 버전 폴더>·<새 버전 폴더>: 프레임워크 저장소를 그 버전 태그로 받아 둔 폴더 (framework-update 스킬 2단계)
//
// 분류별 처리
//   교체: 프로젝트 파일이 지금 버전과 같으면 새 버전으로 바꾼다. 다르면 "충돌"(프로젝트가 직접 고침)
//   병합: "프로젝트별 예외" 섹션 본문, AUTO 블록, 맨 위 frontmatter는 프로젝트 것을 두고 나머지를 새 버전으로 바꾼다.
//         그 나머지가 지금 버전과 다르면 "충돌". frontmatter가 버전 사이에 바뀌었으면 "설정 확인"에 차이를 보인다
//   선택: 프로젝트가 고르는 파일(업종 규칙 등, docs/PROJECT.md "업종 규칙"). 프로젝트에 있으면 병합과 같다.
//         프로젝트에 없으면 일부러 뺀 것으로 보고 건너뛴다. 새 버전이 새로 만든 파일이면 "선택 확인"으로 알리기만 한다
//   설정: 고치지 않는다. 지금 버전 → 새 버전 사이의 차이를 보여주고 사람이 반영한다
//   프로젝트: 건드리지 않는다
//   지금 버전에 있고 새 버전에 없는 파일: 프로젝트 파일이 지금 버전과 같으면 지운다. 다르면 "충돌"
// 경로: 프레임워크의 src/로 시작하는 파일은 docs/PROJECT.md "퍼블 소스 폴더"로 옮겨서 찾는다.
// 결과: 충돌이 있으면 종료 코드 1.

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pubDir } from './project-values.mjs';

const root = process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST = '.claude/framework.json';
const KINDS = ['교체', '병합', '선택', '설정', '프로젝트'];
const EXC = /^##\s+[\d.-]*\s*프로젝트별 예외/;
const AUTO_START = '<!-- AUTO:START';
const AUTO_END = '<!-- AUTO:END -->';

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};
const fail = (msg) => {
  process.stderr.write(`${msg}\n`);
  process.exit(2);
};

// ---------- 분류 ----------

function globRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function manifestOf(dir) {
  const text = read(join(dir, MANIFEST));
  if (text === null) fail(`${join(dir, MANIFEST)}가 없습니다.`);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${join(dir, MANIFEST)}를 읽지 못했습니다 (JSON 형식 오류).`);
  }
}

function classifier(manifest) {
  const rules = KINDS.flatMap((k) => (manifest.files?.[k] || []).map((g) => ({ kind: k, re: globRe(g) })));
  return (path) => [...new Set(rules.filter((r) => r.re.test(path)).map((r) => r.kind))];
}

function tracked(dir) {
  try {
    return execSync('git ls-files', { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    fail(`${dir}에서 git ls-files를 실행하지 못했습니다. 프레임워크 저장소를 git으로 받아 둔 폴더여야 합니다.`);
  }
}

// ---------- 병합 ----------

// 프로젝트 몫(frontmatter, 예외 섹션 본문, AUTO 블록 본문)과 프레임워크 몫을 나눈다.
function split(text) {
  const lines = text.split(/\r?\n/);
  const keep = { front: null, exc: null, auto: [] };
  const owned = [];
  let i = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      keep.front = lines.slice(0, end + 1).join('\n');
      owned.push('<<FRONTMATTER>>');
      i = end + 1;
    }
  }
  while (i < lines.length) {
    const line = lines[i];
    if (EXC.test(line)) {
      owned.push(line, '<<EXCEPTION>>');
      let j = i + 1;
      while (j < lines.length && !/^##\s/.test(lines[j]) && !lines[j].startsWith(AUTO_START)) j++;
      keep.exc = lines.slice(i + 1, j).join('\n');
      i = j;
      continue;
    }
    if (line.startsWith(AUTO_START)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(AUTO_END)) j++;
      keep.auto.push(lines.slice(i + 1, j).join('\n'));
      owned.push(line, '<<AUTO>>', lines[j] ?? AUTO_END);
      i = j + 1;
      continue;
    }
    owned.push(line);
    i++;
  }
  return { owned: owned.join('\n').trimEnd(), keep };
}

function mergeInto(newText, projectText) {
  const proj = split(projectText).keep;
  const fresh = split(newText);
  let autoIdx = 0;
  const useAuto = proj.auto.length === fresh.keep.auto.length;
  const out = fresh.owned
    .split('\n')
    .map((line) => {
      if (line === '<<FRONTMATTER>>') return proj.front ?? fresh.keep.front;
      if (line === '<<EXCEPTION>>') return proj.exc ?? fresh.keep.exc;
      if (line === '<<AUTO>>') {
        const v = useAuto ? proj.auto[autoIdx] : fresh.keep.auto[autoIdx];
        autoIdx++;
        return v;
      }
      return line;
    })
    .join('\n');
  return `${out.trimEnd()}\n`;
}

// ---------- 차이 ----------

function diff(a, b, max = 40) {
  const x = (a ?? '').split(/\r?\n/);
  const y = (b ?? '').split(/\r?\n/);
  const n = x.length;
  const m = y.length;
  if (n * m > 4_000_000) return ['(파일이 커서 줄 비교를 생략합니다. 두 버전 폴더에서 직접 비교합니다)'];
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      i++;
      j++;
    } else if (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) out.push(`- ${x[i++]}`);
    else out.push(`+ ${y[j++]}`);
  }
  return out.length > max ? [...out.slice(0, max), `… 외 ${out.length - max}줄`] : out;
}

// ---------- 비교 ----------

function plan(fromDir, toDir) {
  const oldM = manifestOf(fromDir);
  const newM = manifestOf(toDir);
  const kindOf = classifier(newM);
  const oldKindOf = classifier(oldM);
  const pub = pubDir(root);
  const target = (p) => (p.startsWith('src/') ? `${pub}${p.slice(4)}` : p);
  const paths = [...new Set([...tracked(fromDir), ...tracked(toDir)])].filter((p) => p !== MANIFEST).sort();
  const items = [];

  for (const p of paths) {
    const kind = kindOf(p)[0] || oldKindOf(p)[0] || '프로젝트';
    if (kind === '프로젝트') continue;
    const oldText = read(join(fromDir, p));
    const newText = read(join(toDir, p));
    const t = target(p);
    const projText = read(join(root, t));
    const item = { path: p, target: t, kind };

    if (oldText === newText) continue;

    if (kind === '설정') {
      items.push({ ...item, action: '설정 확인', detail: diff(oldText, newText) });
      continue;
    }
    if (newText === null) {
      if (projText === null) continue;
      const same = kind !== '교체' ? split(projText).owned === split(oldText).owned : projText === oldText;
      items.push({ ...item, action: same ? '삭제' : '충돌', note: same ? '' : '새 버전에서 빠진 파일인데 프로젝트에서 고쳤습니다' });
      continue;
    }
    if (projText === null && kind === '선택') {
      if (oldText === null) items.push({ ...item, action: '선택 확인', note: '새 버전에 새 선택 파일(업종 규칙 등)이 생겼습니다. 쓰려면 docs/PROJECT.md "업종 규칙"에 적고 새 버전 폴더에서 가져옵니다' });
      continue;
    }
    if (projText === null) {
      if (oldText !== null && p.startsWith('src/')) {
        items.push({ ...item, action: '위치 확인', note: `${t}가 없습니다. 실제 위치(docs/ARCHITECTURE.md 11번)에 직접 반영합니다` });
      } else items.push({ ...item, action: '추가', content: newText });
      continue;
    }
    if (kind === '교체') {
      if (oldText !== null && projText !== oldText) items.push({ ...item, action: '충돌', note: '프로젝트에서 직접 고친 파일입니다' });
      else if (oldText === null && projText !== newText) items.push({ ...item, action: '충돌', note: '새 버전이 추가한 파일과 같은 이름의 프로젝트 파일이 있습니다' });
      else items.push({ ...item, action: '교체', content: newText });
      continue;
    }
    // 병합·선택
    const projOwned = split(projText).owned;
    if (oldText !== null && projOwned !== split(oldText).owned) {
      items.push({ ...item, action: '충돌', note: '예외 섹션·AUTO 블록 밖을 프로젝트에서 직접 고쳤습니다. 고친 내용은 예외 섹션으로 옮깁니다' });
      continue;
    }
    if (oldText === null && projOwned !== split(newText).owned) {
      items.push({ ...item, action: '충돌', note: '새 버전이 추가한 파일과 같은 이름의 프로젝트 파일이 있습니다' });
      continue;
    }
    const merged = mergeInto(newText, projText);
    if (merged.trimEnd() !== projText.trimEnd()) items.push({ ...item, action: '병합', content: merged });
    const oldFront = oldText === null ? null : split(oldText).keep.front;
    const newFront = split(newText).keep.front;
    if (oldFront !== newFront) items.push({ ...item, action: '설정 확인', note: 'frontmatter가 바뀌었습니다. 프로젝트 값(paths 등)을 지키며 직접 반영합니다', detail: diff(oldFront, newFront) });
  }
  return { items, from: oldM.version, to: newM.version, newManifest: read(join(toDir, MANIFEST)) };
}

// ---------- 출력 ----------

const ORDER = ['충돌', '설정 확인', '위치 확인', '선택 확인', '교체', '병합', '추가', '삭제'];

function report({ items, from, to }, applied) {
  const count = (a) => items.filter((x) => x.action === a).length;
  const out = [`## 공통 지침 업데이트 ${applied ? '반영' : '비교'} (v${from} → v${to})`];
  out.push(`- ${ORDER.map((a) => `${a} ${count(a)}`).join(' · ')}`);
  if (!items.length) out.push('- 바뀌는 파일 없음');
  else {
    out.push('', '| 처리 | 분류 | 프로젝트 파일 | 메모 |', '|---|---|---|---|');
    for (const a of ORDER) for (const x of items.filter((i) => i.action === a)) out.push(`| ${a} | ${x.kind} | ${x.target} | ${(x.note || '').replace(/\|/g, '\\|')} |`);
  }
  for (const x of items.filter((i) => i.detail)) {
    out.push('', `### ${x.target} (${x.action}) — 지금 버전 → 새 버전`, '```diff', ...x.detail, '```');
  }
  if (applied) out.push('', `- 반영: 교체·병합·추가·삭제 ${['교체', '병합', '추가', '삭제'].map(count).reduce((s, v) => s + v, 0)}건, ${MANIFEST}를 v${to}로 바꿈`, '- 충돌·설정 확인·위치 확인·선택 확인은 고치지 않았습니다. 하나씩 사람과 정합니다.');
  process.stdout.write(out.join('\n') + '\n');
  return count('충돌') ? 1 : 0;
}

function apply(result) {
  for (const x of result.items) {
    const p = join(root, x.target);
    if (['교체', '병합', '추가'].includes(x.action)) {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, x.content);
    } else if (x.action === '삭제') unlinkSync(p);
  }
  writeFileSync(join(root, MANIFEST), result.newManifest);
}

// ---------- lint ----------

function lint() {
  const kindOf = classifier(manifestOf(root));
  const problems = [];
  for (const p of tracked(root)) {
    const k = kindOf(p);
    if (k.length === 0) problems.push(`${p}: 분류가 없습니다`);
    else if (k.length > 1) problems.push(`${p}: 분류가 여러 개입니다 (${k.join(', ')})`);
  }
  process.stdout.write(problems.length ? `## framework.json 분류 점검 — 문제 ${problems.length}건\n${problems.map((x) => `- ${x}`).join('\n')}\n` : '## framework.json 분류 점검 — 문제 없음\n');
  return problems.length ? 1 : 0;
}

// ---------- 실행 ----------

const [cmd, ...rest] = process.argv.slice(2);
const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 && rest[i + 1] ? resolve(rest[i + 1]) : null;
};

if (cmd === 'lint') process.exit(lint());
if (cmd === 'check' || cmd === 'apply') {
  const from = opt('--from');
  const to = opt('--to');
  if (!from || !to) fail('--from <지금 버전 폴더> --to <새 버전 폴더>가 필요합니다.');
  const cur = manifestOf(root).version;
  const fromV = manifestOf(from).version;
  if (cur !== fromV) fail(`프로젝트 버전(v${cur})과 --from 폴더 버전(v${fromV})이 다릅니다. --from은 지금 프로젝트 버전 태그로 받은 폴더여야 합니다.`);
  const result = plan(from, to);
  const conflicts = result.items.filter((x) => x.action === '충돌').length;
  if (cmd === 'apply' && conflicts && !rest.includes('--keep-conflicts')) {
    report(result, false);
    fail(`충돌 ${conflicts}건이 있어 반영하지 않았습니다. 충돌을 먼저 정리하거나(고친 내용을 예외 섹션으로 옮기고 지금 버전으로 되돌림), 그대로 두기로 정했으면 --keep-conflicts를 붙입니다.`);
  }
  if (cmd === 'apply') apply(result);
  process.exit(report(result, cmd === 'apply'));
}
fail('사용: framework-update.mjs lint | check --from <폴더> --to <폴더> | apply --from <폴더> --to <폴더>');
