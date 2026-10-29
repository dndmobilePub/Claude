#!/usr/bin/env node
// 영향이 없는 화면 명세의 기준 버전(ia_ver·plan_ver·design_ver)만 한 번에 올린다.
// 명세 본문은 건드리지 않는다. frontmatter의 한 줄만 바꾼다. (없으면 frontmatter 끝에 추가)
// 외부 패키지 없이 Node만으로 동작한다.
//
// 사용
//   node .claude/skills/version-update/bump-ver.mjs --key ia_ver --to v1.3 [--from v1.2] [--domain transfer] [--skip ACC-010,ACC-020] [--write]
//   --key     ia_ver | plan_ver | design_ver
//   --to      새 버전
//   --from    이 값인 명세만 바꾼다 (생략하면 값이 --to와 다른 명세 모두)
//   --domain  frontmatter flow가 ui-flow/<도메인>.md 인 명세만 (기획서는 도메인마다 버전이 다르므로 plan_ver에 쓴다)
//   --skip    제외할 화면 ID (영향이 있는 화면). 쉼표로 구분
//   --write   실제로 쓴다. 없으면 바뀔 목록만 보여준다
// 상태가 "수정필요"인 명세는 항상 건너뛴다. (명세를 고칠 때 write-screen-spec이 버전을 올린다)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEYS = ['ia_ver', 'plan_ver', 'design_ver'];

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const name = a.slice(2);
    if (name === 'write') out.write = true;
    else out[name] = argv[++i];
  }
  return out;
}

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const opt = args(process.argv.slice(2));
if (!KEYS.includes(opt.key)) fail(`--key는 ${KEYS.join(' | ')} 중 하나여야 합니다.`);
if (!opt.to) fail('--to(새 버전)가 필요합니다.');
const skip = new Set((opt.skip || '').split(',').map((s) => s.trim()).filter(Boolean));

const root = process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL('../../..', import.meta.url));
const dir = join(root, 'docs/screens');
if (!existsSync(dir)) fail('docs/screens 폴더가 없습니다.');

const changed = [];
const skipped = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()) {
  const id = basename(file, '.md');
  const path = join(dir, file);
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    skipped.push(`${id} (frontmatter 없음)`);
    continue;
  }
  const fm = m[1];
  const get = (k) => (fm.match(new RegExp(`^${k}:[ \\t]*([^\\n#]*)`, 'm'))?.[1] || '').trim();
  const status = get('status');
  const cur = get(opt.key);
  const domain = get('flow').match(/ui-flow\/([^/#]+)\.md/)?.[1] || '';

  if (skip.has(id)) continue;
  if (opt.domain && domain !== opt.domain) continue;
  if (status === '수정필요') {
    skipped.push(`${id} (수정필요)`);
    continue;
  }
  if (cur === opt.to) continue;
  if (opt.from !== undefined && cur !== opt.from) {
    skipped.push(`${id} (${opt.key} "${cur}" ≠ --from)`);
    continue;
  }

  const line = `${opt.key}: ${opt.to}`;
  const re = new RegExp(`^${opt.key}:.*$`, 'm');
  const nextFm = re.test(fm) ? fm.replace(re, line) : `${fm}\n${line}`;
  changed.push(`${id} (${cur || '빈칸'} → ${opt.to})`);
  if (opt.write) writeFileSync(path, text.replace(fm, nextFm));
}

const out = [
  `${opt.write ? '바꿈' : '바뀔 예정(--write 없음)'}: ${changed.length}`,
  ...changed.map((c) => `- ${c}`),
  `건너뜀: ${skipped.length}`,
  ...skipped.map((c) => `- ${c}`),
];
process.stdout.write(out.join('\n') + '\n');
