// 오피스 파일(xlsx·pptx) 공용 읽기 모듈 — 읽기 전용, 외부 패키지 없음
// - xlsx·pptx는 XML 파일을 묶은 zip이다. Node 기본 모듈(zlib)만으로 필요한 XML을 꺼낸다.
// - read-ia.mjs(ia-sync), read-ppt.mjs(write-flow)가 함께 쓴다.

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// zip 안의 파일 목록을 읽어 { 이름: () => 내용(문자열) } 형태로 돌려준다.
export function openZip(path) {
  const buf = readFileSync(path);
  // 중앙 디렉터리 끝 레코드(EOCD)를 뒤에서부터 찾는다.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip 형식이 아닙니다. (.xls·.ppt 같은 옛 형식이면 .xlsx·.pptx로 다시 저장해 주세요)');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }

  const cache = new Map();
  return {
    has: (name) => entries.has(name),
    names: () => [...entries.keys()],
    text(name) {
      if (cache.has(name)) return cache.get(name);
      const e = entries.get(name);
      if (!e) return null;
      const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
      const raw = buf.subarray(start, start + e.size);
      let out;
      if (e.method === 0) out = raw.toString('utf8');
      else if (e.method === 8) out = inflateRawSync(raw).toString('utf8');
      else throw new Error(`지원하지 않는 압축 방식입니다: ${name}`);
      cache.set(name, out);
      return out;
    },
  };
}

// XML 문자 참조를 풀어 준다.
export function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

// 태그 속성 문자열에서 속성 하나를 꺼낸다. (예: attr('r="A1" s="3"', 'r') → 'A1')
export function attr(attrs, name) {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? unescapeXml(m[1]) : undefined;
}

// 관계 파일(.rels)을 { Id: Target } 으로 읽는다.
export function readRels(zip, relsPath) {
  const xml = zip.text(relsPath);
  const map = new Map();
  if (!xml) return map;
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    map.set(attr(m[1], 'Id'), attr(m[1], 'Target'));
  }
  return map;
}

// "a/b/../c.xml" 같은 상대 경로를 zip 안 경로로 정리한다.
export function joinPath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
