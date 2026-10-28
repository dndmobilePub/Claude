// token-sync 읽기 전용 조회 스크립트
// - use_figma의 code에 그대로 넣고, 아래 COLLECTION_ID와 OFFSET만 바꿔 실행한다.
// - IMPORTANT: 읽기만 한다. 노드·변수·스타일을 만들거나 고치는 코드를 추가하지 않는다.
// - COLLECTION_ID가 null이면 컬렉션 목록만 돌려준다.
// - 컬렉션을 지정하면 변수를 OFFSET부터 읽고, 결과가 MAX_CHARS를 넘기 전에 멈춘다.
//   돌려준 next가 null이 아니면 OFFSET = next로 다시 실행한다.

const COLLECTION_ID = null; // 예) 'VariableCollectionId:1:2'
const OFFSET = 0;
const MAX_CHARS = 40000;

const collections = await figma.variables.getLocalVariableCollectionsAsync();

if (!COLLECTION_ID) {
  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    hidden: c.hiddenFromPublishing,
    defaultMode: (c.modes.find((m) => m.modeId === c.defaultModeId) || {}).name,
    modes: c.modes.map((m) => m.name),
    count: c.variableIds.length,
  }));
}

const col = collections.find((c) => c.id === COLLECTION_ID);
if (!col) throw new Error('컬렉션을 찾을 수 없음: ' + COLLECTION_ID);

const modeName = Object.fromEntries(col.modes.map((m) => [m.modeId, m.name]));
const byte = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
const hex = (c) => '#' + byte(c.r) + byte(c.g) + byte(c.b) + (c.a !== undefined && c.a < 1 ? byte(c.a) : '');

const aliasCache = {};
async function alias(id) {
  if (!(id in aliasCache)) {
    const target = await figma.variables.getVariableByIdAsync(id);
    aliasCache[id] = target
      ? { alias: target.name, remote: target.remote, hidden: target.hiddenFromPublishing }
      : { alias: null, missing: id };
  }
  return aliasCache[id];
}

const variables = [];
let size = 0;
let i = OFFSET;
for (; i < col.variableIds.length; i++) {
  const v = await figma.variables.getVariableByIdAsync(col.variableIds[i]);
  if (!v) continue;
  const values = {};
  for (const [modeId, val] of Object.entries(v.valuesByMode)) {
    const key = modeName[modeId] || modeId;
    if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') values[key] = await alias(val.id);
    else if (v.resolvedType === 'COLOR') values[key] = hex(val);
    else values[key] = val;
  }
  const row = { name: v.name, type: v.resolvedType, scopes: v.scopes, hidden: v.hiddenFromPublishing, values };
  const rowSize = JSON.stringify(row).length + 1;
  if (variables.length > 0 && size + rowSize > MAX_CHARS) break;
  variables.push(row);
  size += rowSize;
}

return {
  collection: col.name,
  total: col.variableIds.length,
  from: OFFSET,
  next: i < col.variableIds.length ? i : null,
  variables,
};
