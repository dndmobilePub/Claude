// 테스트 공용 도구 — 지침 원본 저장소 검사용 (프로젝트에는 배포하지 않는다. framework.json "원본 전용")
// 외부 패키지 없이 Node 기본 모듈만 쓴다. 실행: node --test tests/

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = fileURLToPath(new URL('..', import.meta.url));

// 저장소에서 git이 추적하는 파일 목록 (tests/ 제외)
export function repoFiles() {
  return execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !f.startsWith('tests/'));
}

// 임시 폴더를 만들고, 테스트가 끝나면 지울 수 있게 돌려준다.
export function tempDir(t, name = 'fw-test-') {
  const dir = mkdtempSync(join(tmpdir(), name));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 저장소 파일을 복사한 예제 프로젝트를 만든다. (git 저장소가 아님)
export function makeProject(t) {
  const dir = tempDir(t, 'fw-proj-');
  copyRepo(dir);
  return dir;
}

export function copyRepo(dir) {
  for (const f of repoFiles()) {
    const to = join(dir, f);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(join(REPO, f), to);
  }
}

// 폴더를 git 저장소로 만들고 모두 커밋한다. (framework-update는 git ls-files로 파일 목록을 읽는다)
export function gitCommitAll(dir) {
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  if (!existsSync(join(dir, '.git'))) git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', 'snapshot', '--allow-empty');
}

export function write(dir, path, text) {
  const p = join(dir, path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

export const read = (dir, path) => {
  try {
    return readFileSync(join(dir, path), 'utf8');
  } catch {
    return null;
  }
};

// 파일 안 문자열 하나를 바꾼다. 없으면 테스트가 실패하도록 예외를 던진다.
export function replaceIn(dir, path, from, to) {
  const text = read(dir, path);
  if (text === null || !text.includes(from)) throw new Error(`${path}에 "${from}"이 없습니다`);
  writeFileSync(join(dir, path), text.replace(from, to));
}

// 프로젝트 폴더에서 스크립트를 실행한다. { code, out } (out = stdout + stderr)
export function run(dir, script, args = [], env = {}) {
  const r = spawnSync(process.execPath, [join(dir, script), ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// ---------- 작은 zip 만들기 (xlsx·pptx 예제용, 압축 없이 저장) ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// files: { 'zip 안 경로': '내용' }
export function makeZip(path, files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 이름
    local.writeUInt16LE(0, 8); // 저장(압축 없음)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  const count = Object.keys(files).length;
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([...locals, centralBuf, end]));
}
