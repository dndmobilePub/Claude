// token-sync 읽기 전용 조회 스크립트 — 텍스트 스타일·효과 스타일
// - use_figma의 code에 그대로 넣고, 아래 KIND와 OFFSET만 바꿔 실행한다.
// - IMPORTANT: 읽기만 한다. 노드·변수·스타일을 만들거나 고치는 코드를 추가하지 않는다.
// - KIND: 'TEXT'(텍스트 스타일) | 'EFFECT'(효과 스타일) | null(개수만)
// - 결과가 MAX_CHARS를 넘기 전에 멈춘다. 돌려준 next가 null이 아니면 OFFSET = next로 다시 실행한다.
// - 스타일 값에 변수가 연결돼 있으면 그 변수 이름을 bound에 함께 돌려준다. (변환은 DESIGN.md 3-3)

const KIND = null; // 예) 'TEXT'
const OFFSET = 0;
const MAX_CHARS = 40000;

const texts = await figma.getLocalTextStylesAsync();
const effects = await figma.getLocalEffectStylesAsync();

if (!KIND) {
  return { text: texts.length, effect: effects.length };
}

const byte = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
const hex = (c) => '#' + byte(c.r) + byte(c.g) + byte(c.b) + (c.a !== undefined && c.a < 1 ? byte(c.a) : '');

const nameCache = {};
async function varName(alias) {
  if (!alias || !alias.id) return null;
  if (!(alias.id in nameCache)) {
    const v = await figma.variables.getVariableByIdAsync(alias.id);
    nameCache[alias.id] = v ? { name: v.name, remote: v.remote, hidden: v.hiddenFromPublishing } : { missing: alias.id };
  }
  return nameCache[alias.id];
}

async function bound(obj) {
  const out = {};
  for (const [field, alias] of Object.entries(obj || {})) {
    const target = Array.isArray(alias) ? alias[0] : alias;
    const n = await varName(target);
    if (n) out[field] = n;
  }
  return out;
}

async function textRow(s) {
  return {
    name: s.name,
    fontFamily: s.fontName.family,
    fontStyle: s.fontName.style,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight, // { unit: 'PIXELS'|'PERCENT'|'AUTO', value }
    letterSpacing: s.letterSpacing, // { unit: 'PIXELS'|'PERCENT', value }
    textCase: s.textCase,
    textDecoration: s.textDecoration,
    bound: await bound(s.boundVariables),
  };
}

async function effectRow(s) {
  const items = [];
  for (const e of s.effects) {
    if (e.visible === false) continue;
    const row = { type: e.type, radius: e.radius };
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      row.color = hex(e.color);
      row.offset = e.offset;
      row.spread = e.spread || 0;
    }
    row.bound = await bound(e.boundVariables);
    items.push(row);
  }
  return { name: s.name, effects: items };
}

const list = KIND === 'TEXT' ? texts : effects;
const rows = [];
let size = 0;
let i = OFFSET;
for (; i < list.length; i++) {
  const row = KIND === 'TEXT' ? await textRow(list[i]) : await effectRow(list[i]);
  const rowSize = JSON.stringify(row).length + 1;
  if (rows.length > 0 && size + rowSize > MAX_CHARS) break;
  rows.push(row);
  size += rowSize;
}

return {
  kind: KIND,
  total: list.length,
  from: OFFSET,
  next: i < list.length ? i : null,
  styles: rows,
};
