// write-flow 기획 설계서 읽기 전용 조회 스크립트
// - use_figma의 code에 그대로 넣고, 아래 NODE_ID와 OFFSET만 바꿔 실행한다.
// - IMPORTANT: 읽기만 한다. 노드를 만들거나 고치는 코드를 추가하지 않는다.
// - NODE_ID가 null이면 페이지 목록(id·이름)만 돌려준다. 페이지를 모두 불러오지 않는다.
//   (figma.loadAllPagesAsync는 Figma MCP에서 지원하지 않는다)
// - NODE_ID(페이지·섹션·프레임)를 지정하면 그 안의 프레임마다 보이는 텍스트를
//   위→아래, 왼→오른쪽 순서로 돌려준다. 이미지로 붙인 기획서(이미지 채움 노드)는 images에
//   id·이름·크기를 돌려준다 → 텍스트가 없으면 get_screenshot으로 한 장씩 읽는다.
// - use_figma 결과는 48KB(바이트)까지라 MAX_BYTES를 넘기 전에 멈춘다.
//   돌려준 next가 null이 아니면 OFFSET = next로 다시 실행한다.

const NODE_ID = null; // 예) '12:345'
const OFFSET = 0;
const MAX_BYTES = 40000;

if (!NODE_ID) {
  return figma.root.children.map((p) => ({ id: p.id, name: p.name }));
}

const root = await figma.getNodeByIdAsync(NODE_ID);
if (!root || !('children' in root)) throw new Error('노드를 찾을 수 없거나 하위 노드가 없음: ' + NODE_ID);
if (root.type === 'PAGE') await figma.setCurrentPageAsync(root);

const isImage = (n) => 'fills' in n && Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE' && f.visible !== false);
const frames = root.type === 'PAGE' || root.type === 'SECTION'
  ? root.children.filter((n) => n.visible !== false && ('children' in n || isImage(n)))
  : [root];
const bytes = (s) => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };

// 숨긴 레이어(와 그 하위)는 건너뛴다
const collect = (node, acc) => {
  if (node.visible === false) return acc;
  if (node.type === 'TEXT') acc.push(node);
  else if (isImage(node)) acc.push(node);
  if ('children' in node) node.children.forEach((c) => collect(c, acc));
  return acc;
};

const texts = (frame) => {
  const o = frame.absoluteBoundingBox || { x: 0, y: 0 };
  return collect(frame, [])
    .filter((n) => n.type === 'TEXT')
    .map((n) => {
      const b = n.absoluteBoundingBox || o;
      return { y: Math.round(b.y - o.y), x: Math.round(b.x - o.x), t: n.characters.trim() };
    })
    .filter((n) => n.t)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((n) => n.t);
};

const out = [];
let size = 0;
let i = OFFSET;
for (; i < frames.length; i++) {
  const f = frames[i];
  const images = collect(f, []).filter((n) => n.type !== 'TEXT').map((n) => ({ id: n.id, name: n.name, w: Math.round(n.width), h: Math.round(n.height) }));
  const item = { id: f.id, name: f.name, texts: texts(f), images };
  const len = bytes(JSON.stringify(item)) + 1;
  if (out.length && size + len > MAX_BYTES) break;
  out.push(item);
  size += len;
}
return { total: frames.length, next: i < frames.length ? i : null, frames: out };
