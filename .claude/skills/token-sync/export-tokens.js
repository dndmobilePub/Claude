// token-sync 읽기 전용 내보내기 스크립트 — 변수·텍스트 스타일·효과 스타일을 압축 형식으로 돌려준다.
// - use_figma의 code에 그대로 넣고, 아래 PART(와 필요하면 SKIP_*)만 바꿔 실행한다.
// - IMPORTANT: 읽기만 한다. 노드·변수·스타일을 만들거나 고치는 코드를 추가하지 않는다.
// - 결과의 text를 PART = 0, 1, ... parts-1 순서로 받아 줄바꿈 하나로 이어 임시 파일에 저장하고,
//   convert-tokens.mjs로 변환한다. 첫 조각 첫 줄의 fnv(해시)로 옮겨 적은 내용을 검증한다.
// - use_figma 결과는 48KB(바이트)까지라 조각은 MAX_BYTES 이하로 자른다.
// - 형식은 convert-tokens.mjs 맨 위 설명과 같다. 한쪽을 고치면 다른 쪽도 고친다.

const PART = 0;
const MAX_BYTES = 40000;
const SKIP_COLLECTIONS = []; // docs/DESIGN.md 9번 "동기화 제외 컬렉션"과 같게. 예) ['Template']
const SKIP_STYLE_PREFIXES = []; // 9번 "동기화 제외 스타일"과 같게. 예) ['Template/']

const SC = {
  ALL_SCOPES: 'A', ALL_FILLS: 'F', FRAME_FILL: 'f', SHAPE_FILL: 's', TEXT_FILL: 't', STROKE_COLOR: 'k',
  EFFECT_COLOR: 'e', FONT_FAMILY: 'y', FONT_STYLE: 'Y', FONT_WEIGHT: 'w', FONT_SIZE: 'z', LINE_HEIGHT: 'l',
  LETTER_SPACING: 'p', PARAGRAPH_SPACING: 'P', PARAGRAPH_INDENT: 'N', WIDTH_HEIGHT: 'h', GAP: 'g',
  CORNER_RADIUS: 'r', STROKE_FLOAT: 'o', EFFECT_FLOAT: 'x', OPACITY: 'O', TEXT_CONTENT: 'T',
};
const byte = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
const hex = (c) => '#' + byte(c.r) + byte(c.g) + byte(c.b) + (c.a !== undefined && c.a < 1 ? byte(c.a) : '');
const num = (n) => String(Math.round(n * 10000) / 10000);

const names = {};
async function ref(alias) {
  const id = alias && alias.id;
  if (!id) return '@?';
  if (!(id in names)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    names[id] = !v ? '@?' : (v.remote ? '@R:' : '@') + v.name;
  }
  return names[id];
}
async function value(v, raw) {
  if (raw && typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS') return ref(raw);
  if (v.resolvedType === 'COLOR') return hex(raw);
  if (v.resolvedType === 'FLOAT') return num(raw);
  if (v.resolvedType === 'BOOLEAN') return String(raw);
  return JSON.stringify(String(raw));
}

const lines = [];
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (SKIP_COLLECTIONS.includes(c.name)) continue;
  const modes = [...c.modes].sort((a, b) => (a.modeId === c.defaultModeId ? -1 : b.modeId === c.defaultModeId ? 1 : 0));
  lines.push('#C ' + c.name + '|' + modes.map((m) => m.name).join(';'));
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) continue;
    const vals = [];
    for (const m of modes) vals.push(await value(v, v.valuesByMode[m.modeId]));
    const same = vals.every((x) => x === vals[0]);
    const scopes = v.scopes.map((s) => SC[s] || '?').join('');
    lines.push(v.name + '|' + v.resolvedType[0] + scopes + (v.hiddenFromPublishing ? '!' : '') + '|' + (same ? [vals[0]] : vals).join(' ; '));
  }
}

const skipStyle = (n) => SKIP_STYLE_PREFIXES.some((p) => n.startsWith(p));
async function bound(b) {
  const out = [];
  for (const [k, a] of Object.entries(b || {})) out.push(k + '=' + (await ref(Array.isArray(a) ? a[0] : a)));
  return out.join(',');
}

lines.push('#T');
for (const s of await figma.getLocalTextStylesAsync()) {
  if (skipStyle(s.name)) continue;
  const lh = s.lineHeight.unit === 'AUTO' ? 'auto' : num(s.lineHeight.value) + (s.lineHeight.unit === 'PIXELS' ? 'px' : '%');
  const ls = num(s.letterSpacing.value) + (s.letterSpacing.unit === 'PIXELS' ? 'px' : '%');
  lines.push([s.name, JSON.stringify(s.fontName.family), s.fontName.style, num(s.fontSize), lh, ls, s.textCase, s.textDecoration, await bound(s.boundVariables)].join('|'));
}

const ET = { DROP_SHADOW: 'D', INNER_SHADOW: 'I', LAYER_BLUR: 'L', BACKGROUND_BLUR: 'B' };
lines.push('#E');
for (const s of await figma.getLocalEffectStylesAsync()) {
  if (skipStyle(s.name)) continue;
  const items = [];
  for (const e of s.effects) {
    if (e.visible === false) continue;
    const parts = [ET[e.type] || '?'];
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') parts.push(num(e.offset.x), num(e.offset.y), num(e.radius), num(e.spread || 0), hex(e.color));
    else parts.push(num(e.radius));
    const b = await bound(e.boundVariables);
    items.push(parts.join(',') + (b ? ',' + b : ''));
  }
  lines.push(s.name + '|' + items.join(' + '));
}

const body = lines.join('\n');
let h = 0x811c9dc5;
for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
const bytes = (s) => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };

const all = ['@token-export v1 lines=' + lines.length + ' fnv=' + h.toString(16)].concat(lines);
const parts = [[]];
let size = 0;
for (const l of all) {
  const n = bytes(l) + 1;
  if (parts[parts.length - 1].length && size + n > MAX_BYTES) { parts.push([]); size = 0; }
  parts[parts.length - 1].push(l);
  size += n;
}
return { part: PART, parts: parts.length, text: (parts[PART] || []).join('\n') };
