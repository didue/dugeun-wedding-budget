/**
 * 데이터 확인 규칙 목록
 *
 * 「목록」 시트: 1행에 목록 이름(분류, 결제한 사람, …), 아래로 값.
 *   지출 시트의 데이터 확인 규칙이 이 범위를 참조하므로, 여기 값을 바꾸면 시트 드롭다운도 같이 바뀜.
 * 「목록_속성」 시트: 유형 | 값 | 색상 | 집계구분(완료/예정/제외) | 예산포함(TRUE/FALSE)
 */

const LIST_TYPES = {
  category: '분류',
  payer: '결제한 사람',
  status: '진행상황',
  cashReceiptStatus: '현금영수 처리상태',
};

const ATTR_HEADERS = ['유형', '값', '색상', '집계구분', '예산포함'];
const AGG_LABEL = { done: '완료', planned: '예정', excluded: '제외' };
const AGG_FROM_LABEL = { '완료': 'done', '예정': 'planned', '제외': 'excluded' };

function readLists_() {
  const sh = sheet_(SHEET.lists);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const grid = lastRow && lastCol ? sh.getRange(1, 1, lastRow, lastCol).getDisplayValues() : [[]];
  const header = grid[0].map((h) => String(h).trim());
  const attrs = readAttrs_();

  const out = {};
  Object.keys(LIST_TYPES).forEach((type) => {
    const label = LIST_TYPES[type];
    const c = header.indexOf(label);
    const values = c < 0 ? [] : grid.slice(1).map((r) => String(r[c]).trim()).filter(Boolean);
    out[type] = values.map((v) => {
      const a = attrs[label + '\u0000' + v] || {};
      return {
        value: v,
        color: a.color || null,
        aggregate: a.aggregate || (type === 'status' ? 'planned' : null),
        inBudget: a.inBudget !== false,
      };
    });
  });
  return out;
}

function readAttrs_() {
  const sh = sheet_(SHEET.listAttrs);
  const n = sh.getLastRow() - 1;
  const map = {};
  if (n <= 0) return map;
  sh.getRange(2, 1, n, ATTR_HEADERS.length).getValues().forEach((r) => {
    const type = String(r[0]).trim();
    const value = String(r[1]).trim();
    if (!type || !value) return;
    map[type + '\u0000' + value] = {
      color: r[2] ? String(r[2]).trim() : null,
      aggregate: AGG_FROM_LABEL[String(r[3]).trim()] || null,
      inBudget: !(r[4] === false || r[4] === 'FALSE' || r[4] === 'N'),
    };
  });
  return map;
}

/**
 * 목록 하나를 통째로 저장
 * renames: [{ from, to }] 이름을 바꾼 항목. 지출 내역의 기존 값도 같이 바꿈
 * 지출 내역에서 쓰고 있는 값을 지우려고 하면 in_use 오류
 */
function saveList_(type, items, renames) {
  const label = LIST_TYPES[type];
  if (!label) throw new AppError('invalid', { field: 'type' });
  if (!Array.isArray(items)) throw new AppError('invalid', { field: 'items' });

  const clean = items.map((i) => ({
    value: String((i && i.value) || '').trim(),
    color: (i && i.color) || null,
    aggregate: i && AGG_LABEL[i.aggregate] ? i.aggregate : null,
    inBudget: !(i && i.inBudget === false),
  }));
  const values = clean.map((i) => i.value);
  if (values.some((v) => !v)) throw new AppError('invalid', { field: 'value' });
  if (new Set(values).size !== values.length) throw new AppError('duplicate');

  const renameList = (Array.isArray(renames) ? renames : [])
    .filter((r) => r && r.from && r.to && r.from !== r.to && values.indexOf(r.to) >= 0);
  const renamedFrom = renameList.map((r) => r.from);

  const t = expenseTable_();
  const c = t.col[label];
  const n = t.sh.getLastRow() - t.headerRow;
  const used = {};
  if (c && n > 0) {
    t.sh.getRange(t.headerRow + 1, c, n, 1).getDisplayValues().forEach((r) => {
      const v = String(r[0]).trim();
      if (v) used[v] = (used[v] || 0) + 1;
    });
  }

  const current = readLists_()[type].map((i) => i.value);
  const inUse = current
    .filter((v) => values.indexOf(v) < 0 && renamedFrom.indexOf(v) < 0 && used[v])
    .map((v) => ({ value: v, count: used[v] }));
  if (inUse.length) throw new AppError('in_use', { values: inUse });

  writeListColumn_(label, values);
  writeAttrs_(label, clean);
  if (c && n > 0) {
    const range = t.sh.getRange(t.headerRow + 1, c, n, 1);
    renameList.forEach((r) => range.createTextFinder(r.from).matchEntireCell(true).replaceAllWith(r.to));
  }
  if (type === 'category') renameBudgets_(renameList);

  return readLists_()[type];
}

function writeListColumn_(label, values) {
  const sh = sheet_(SHEET.lists);
  const header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0].map((h) => String(h).trim());
  let c = header.indexOf(label) + 1;
  if (!c) {
    c = header.filter(Boolean).length + 1;
    sh.getRange(1, c).setValue(label).setFontWeight('bold');
  }
  const max = sh.getMaxRows();
  if (values.length + 1 > max) throw new AppError('invalid', { field: 'items', reason: 'too_many' });
  if (max > 1) sh.getRange(2, c, max - 1, 1).clearContent();
  if (values.length) sh.getRange(2, c, values.length, 1).setValues(values.map((v) => [v]));
}

function writeAttrs_(label, items) {
  const sh = sheet_(SHEET.listAttrs);
  const n = sh.getLastRow() - 1;
  const rows = n > 0
    ? sh.getRange(2, 1, n, ATTR_HEADERS.length).getValues().filter((r) => String(r[0]).trim() && String(r[0]).trim() !== label)
    : [];
  items.forEach((i) => rows.push([label, i.value, i.color || '', i.aggregate ? AGG_LABEL[i.aggregate] : '', i.inBudget]));
  if (n > 0) sh.getRange(2, 1, n, ATTR_HEADERS.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, ATTR_HEADERS.length).setValues(rows);
}
