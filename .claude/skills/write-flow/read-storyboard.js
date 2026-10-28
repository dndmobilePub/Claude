// write-flow 기획 설계서 읽기 전용 조회 스크립트
// - use_figma의 code에 그대로 넣고, 아래 NODE_ID와 OFFSET만 바꿔 실행한다.
// - IMPORTANT: 읽기만 한다. 노드를 만들거나 고치는 코드를 추가하지 않는다.
// - NODE_ID가 null이면 페이지 목록과 페이지별 최상위 프레임 목록만 돌려준다.
// - NODE_ID(페이지·섹션·프레임)를 지정하면 그 안의 프레임마다 보이는 텍스트를
//   위→아래, 왼→오른쪽 순서로 돌려준다. 결과가 MAX_CHARS를 넘기 전에 멈추고,
//   돌려준 next가 null이 아니면 OFFSET = next로 다시 실행한다.

const NODE_ID = null; // 예) '12:345'
const OFFSET = 0;
const MAX_CHARS = 40000;

if (!NODE_ID) {
  await figma.loadAllPagesAsync();
  return figma.root.children.map((p) => ({
    id: p.id,
    name: p.name,
    frames: p.children.filter((n) => 'children' in n).map((n) => ({ id: n.id, name: n.name, type: n.type })),
  }));
}

const root = await figma.getNodeByIdAsync(NODE_ID);
if (!root || !('children' in root)) throw new Error('노드를 찾을 수 없거나 하위 노드가 없음: ' + NODE_ID);
if (root.type === 'PAGE') await root.loadAsync();

const frames = root.type === 'PAGE' || root.type === 'SECTION'
  ? root.children.filter((n) => 'children' in n)
  : [root];

// 숨긴 레이어(와 그 하위)는 건너뛴다
const collect = (node, acc) => {
  if (node.visible === false) return acc;
  if (node.type === 'TEXT') acc.push(node);
  else if ('children' in node) node.children.forEach((c) => collect(c, acc));
  return acc;
};

const texts = (frame) => {
  const o = frame.absoluteBoundingBox || { x: 0, y: 0 };
  return collect(frame, [])
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
  const item = { id: frames[i].id, name: frames[i].name, texts: texts(frames[i]) };
  const len = JSON.stringify(item).length;
  if (out.length && size + len > MAX_CHARS) break;
  out.push(item);
  size += len;
}
return { total: frames.length, next: i < frames.length ? i : null, frames: out };
