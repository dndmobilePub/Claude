#!/usr/bin/env node
// PPT 기획서 읽기 스크립트 — 읽기 전용, 외부 패키지 없음 (write-flow 0단계용)
// 지원: .pptx  (옛 .ppt는 .pptx로 다시 저장해서 쓴다)
//
// 사용법
//   node read-ppt.mjs <파일> list
//       슬라이드 목록: 번호, 숨김 여부, 첫 줄(제목 추정), 글자 수, 이미지 수, 노트 여부
//   node read-ppt.mjs <파일> text [--slides 1-20] [--notes]
//       슬라이드 순서대로 텍스트를 출력한다. 문단 = 한 줄, 표는 칸을 " | "로 잇는다.
//       --notes를 주면 발표자 노트도 함께 출력한다.
//
// - 슬라이드 번호는 PowerPoint에 보이는 순서다. (파일 안 slideN.xml 번호와 다를 수 있다)
// - 한 번에 최대 20장만 출력한다. 더 있으면 마지막 줄에 다음 --slides 값을 알려준다.
// - 글자가 거의 없고 이미지만 있는 슬라이드는 내용을 읽을 수 없다. 해당 슬라이드를 이미지·PDF로 받아 확인한다.

import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openZip, unescapeXml, attr, readRels, joinPath } from '../../scripts/office-zip.mjs';

const MAX_SLIDES = 20;

function loadPptx(path) {
  const zip = openZip(path);
  const pres = zip.text('ppt/presentation.xml');
  if (!pres) throw new Error('프레젠테이션(ppt/presentation.xml)을 찾을 수 없습니다.');
  const rels = readRels(zip, 'ppt/_rels/presentation.xml.rels');
  const order = [...pres.matchAll(/<p:sldId\b([^>]*)\/?>/g)].map((m) => joinPath('ppt/presentation.xml', rels.get(attr(m[1], 'r:id')) || ''));

  return order.map((slidePath, i) => {
    const xml = zip.text(slidePath) || '';
    const relsPath = slidePath.replace(/([^/]+)$/, '_rels/$1.rels');
    const slideRels = readRels(zip, relsPath);
    const notesTarget = [...slideRels.values()].find((t) => /notesSlide/.test(t));
    const notesXml = notesTarget ? zip.text(joinPath(slidePath, notesTarget)) || '' : '';
    return {
      no: i + 1,
      hidden: /<p:sld\b[^>]*\sshow="(0|false)"/.test(xml),
      lines: textLines(xml),
      images: (xml.match(/<p:pic\b/g) || []).length,
      notes: textLines(notesXml).filter((l) => !/^\d+$/.test(l)), // 노트의 슬라이드 번호 자리표시 제외
    };
  });
}

// 문단(a:p)마다 한 줄. 표(a:tbl)는 행마다 칸을 " | "로 잇는다.
function textLines(xml) {
  const lines = [];
  const para = (p) =>
    [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/>/g)]
      .map((m) => (m[1] !== undefined ? unescapeXml(m[1]) : ' '))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  const parts = xml.split(/(<a:tbl\b[\s\S]*?<\/a:tbl>)/);
  for (const part of parts) {
    if (part.startsWith('<a:tbl')) {
      for (const tr of part.matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)) {
        const cells = [...tr[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map((tc) =>
          [...tc[0].matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)].map((p) => para(p[0])).filter(Boolean).join(' / '),
        );
        if (cells.some(Boolean)) lines.push(`| ${cells.join(' | ')} |`);
      }
    } else {
      for (const p of part.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
        const t = para(p[0]);
        if (t) lines.push(t);
      }
    }
  }
  return lines;
}

function parseArgs(argv) {
  const [file, cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i].replace(/^--/, '');
    if (k === 'notes') opts.notes = true;
    else opts[k] = rest[++i];
  }
  return { file, cmd, opts };
}

export function run(argv) {
  const { file, cmd, opts } = parseArgs(argv);
  if (!file || !cmd) throw new Error('사용법: node read-ppt.mjs <파일> list | text [--slides 1-20] [--notes]');
  const ext = extname(file).toLowerCase();
  if (ext === '.ppt') throw new Error('.ppt(옛 형식)는 읽지 못합니다. PowerPoint에서 .pptx로 다시 저장해 주세요.');
  const slides = loadPptx(file);

  if (cmd === 'list') {
    const out = ['번호\t숨김\t첫 줄\t글자 수\t이미지\t노트'];
    for (const s of slides) {
      const chars = s.lines.join('').length;
      out.push(`${s.no}\t${s.hidden ? '숨김' : ''}\t${(s.lines[0] || '').slice(0, 40)}\t${chars}\t${s.images}\t${s.notes.length ? '있음' : ''}`);
    }
    return out.join('\n');
  }

  if (cmd === 'text') {
    const [a, b = a] = (opts.slides || `1-${slides.length}`).split('-').map(Number);
    const to = Math.min(b, slides.length, a + MAX_SLIDES - 1);
    const out = [];
    for (const s of slides.slice(a - 1, to)) {
      out.push(`=== 슬라이드 ${s.no}${s.hidden ? ' (숨김)' : ''} ===`);
      if (s.lines.length) out.push(...s.lines);
      else out.push(`(텍스트 없음${s.images ? ` · 이미지 ${s.images}개 — 이미지·PDF로 확인 필요` : ''})`);
      if (opts.notes && s.notes.length) out.push('[노트]', ...s.notes);
      out.push('');
    }
    if (to < slides.length) out.push(`# 다음: --slides ${to + 1}-${Math.min(to + MAX_SLIDES, slides.length)} (전체 ${slides.length}장)`);
    return out.join('\n');
  }

  throw new Error(`알 수 없는 명령: ${cmd}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.stdout.write(run(process.argv.slice(2)) + '\n');
  } catch (e) {
    process.stderr.write(`[read-ppt] ${e.message}\n`);
    process.exit(1);
  }
}
