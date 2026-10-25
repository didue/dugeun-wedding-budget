/**
 * 시트를 "헤더 이름 → 필드" 표로 다루는 공통 함수
 *
 * fields 정의 예: { paidAt: { h: '결제일', type: 'date' }, total: { h: '총 견적', type: 'number', computed: true } }
 *   type     'date' | 'number' | 'bool' | (생략 시 문자열)
 *   computed 시트에서 수식으로 계산될 수 있는 열. 수식이 있으면 값을 쓰지 않음
 */

const TZ = 'Asia/Seoul';

const SHEET = {
  expenses: '예산·지출 기록',
  lists: '목록',
  listAttrs: '목록_속성',
  settings: '설정',
  budgets: '분류예산',
  checklist: '체크리스트',
  trash: '삭제기록',
};

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new AppError('sheet_missing', { name: name });
  return sh;
}

function ensureSheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  const created = !sh;
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return { sh: sh, created: created };
}

/** required 헤더가 모두 있는 행(위에서 10행 안)을 헤더 행으로 찾음 */
function table_(name, required) {
  const sh = sheet_(name);
  const width = Math.max(1, sh.getLastColumn());
  const scan = Math.max(1, Math.min(10, sh.getLastRow()));
  const top = sh.getRange(1, 1, scan, width).getDisplayValues().map((r) => r.map((h) => String(h).trim()));

  let headerRow = 1;
  if (required && required.length) {
    const i = top.findIndex((r) => required.every((h) => r.indexOf(h) >= 0));
    if (i < 0) throw new AppError('header_missing', { name: name, required: required });
    headerRow = i + 1;
  }

  const headers = top[headerRow - 1];
  const col = {};
  headers.forEach((h, i) => {
    if (h && !(h in col)) col[h] = i + 1;
  });
  return { sh: sh, headerRow: headerRow, headers: headers, col: col, width: width };
}

function readRows_(t, fields) {
  const n = t.sh.getLastRow() - t.headerRow;
  if (n <= 0) return [];
  const values = t.sh.getRange(t.headerRow + 1, 1, n, t.width).getValues();
  return values.map((r, i) => ({ row: t.headerRow + 1 + i, obj: toObj_(t, fields, r) }));
}

function readRow_(t, fields, row) {
  SpreadsheetApp.flush();
  return toObj_(t, fields, t.sh.getRange(row, 1, 1, t.width).getValues()[0]);
}

function toObj_(t, fields, r) {
  const o = {};
  Object.keys(fields).forEach((k) => {
    const c = t.col[fields[k].h];
    o[k] = c ? fromCell_(r[c - 1], fields[k].type) : (fields[k].type === 'bool' ? false : null);
  });
  return o;
}

function isBlank_(obj, fields) {
  return Object.keys(fields).every((k) => k === 'id' || fields[k].computed || obj[k] === null || obj[k] === false);
}

function fromCell_(v, type) {
  if (v === '' || v === null || v === undefined) return type === 'bool' ? false : null;
  if (type === 'date') {
    if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
    const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(String(v).trim());
    return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : String(v);
  }
  if (type === 'number') {
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^\d.-]/g, '');
    if (!s) return null;
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  if (type === 'bool') return v === true || v === 'TRUE' || v === 'Y';
  return String(v);
}

function toCell_(v, type) {
  if (v === null || v === undefined || v === '') return type === 'bool' ? false : '';
  if (type === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : String(v);
  }
  if (type === 'number') {
    const n = Number(v);
    if (isNaN(n)) throw new AppError('invalid', { value: v });
    return n;
  }
  if (type === 'bool') return v === true;
  return String(v);
}

/** 입력에서 알려진 필드만 남김 (id는 서버가 정함) */
function pick_(fields, data) {
  if (!data || typeof data !== 'object') throw new AppError('invalid');
  const out = {};
  Object.keys(fields).forEach((k) => {
    if (k !== 'id' && k in data) out[k] = data[k];
  });
  return out;
}

function findRow_(t, id) {
  const c = t.col['ID'];
  const n = t.sh.getLastRow() - t.headerRow;
  if (!c || !id || n <= 0) return null;
  const cell = t.sh.getRange(t.headerRow + 1, c, n, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : null;
}

function requireRow_(t, id) {
  const row = findRow_(t, id);
  if (!row) throw new AppError('not_found', { id: id });
  return row;
}

/** 마지막 데이터 행 다음부터 차례로 씀. 위 행의 수식은 같이 이어 붙임 */
function insertRows_(t, fields, list) {
  const rows = readRows_(t, fields);
  const lastUsed = rows.reduce((m, r) => (isBlank_(r.obj, fields) ? m : r.row), t.headerRow);
  const src = lastUsed > t.headerRow ? lastUsed : null;
  const need = lastUsed + list.length - t.sh.getMaxRows();
  if (need > 0) t.sh.insertRowsAfter(t.sh.getMaxRows(), need);
  return list.map((data, i) => {
    writeRow_(t, fields, lastUsed + 1 + i, data, src);
    return lastUsed + 1 + i;
  });
}

/** data에 있는 필드만 씀. 수식이 들어 있는 칸은 건드리지 않음 */
function writeRow_(t, fields, row, data, formulaSourceRow) {
  const curF = t.sh.getRange(row, 1, 1, t.width).getFormulas()[0];
  const srcF = formulaSourceRow ? t.sh.getRange(formulaSourceRow, 1, 1, t.width).getFormulasR1C1()[0] : [];
  Object.keys(data).forEach((k) => {
    const f = fields[k];
    if (!f) return;
    const c = t.col[f.h];
    if (!c || curF[c - 1] || srcF[c - 1]) return;
    if (f.computed && columnHasFormula_(t, c)) return;
    t.sh.getRange(row, c).setValue(toCell_(data[k], f.type));
  });
  srcF.forEach((f, i) => {
    if (f && !curF[i]) t.sh.getRange(row, i + 1).setFormulaR1C1(f);
  });
}

/** 헤더~첫 데이터 행에 ARRAYFORMULA 같은 수식이 있으면 그 열 전체가 계산 열 */
function columnHasFormula_(t, c) {
  return t.sh.getRange(t.headerRow, c, 3, 1).getFormulas().some((r) => r[0]);
}

function ensureIds_(t, rows) {
  const missing = rows.filter((r) => !r.obj.id);
  if (!missing.length) return;
  const c = t.col['ID'];
  if (!c) throw new AppError('id_column_missing', { name: t.sh.getName() });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    missing.forEach((r) => {
      r.obj.id = Utilities.getUuid();
      t.sh.getRange(r.row, c).setValue(r.obj.id);
    });
  } finally {
    lock.releaseLock();
  }
}

/** 삭제 전에 「삭제기록」 시트에 JSON으로 보관 */
function moveToTrash_(sheetName, obj) {
  const trash = ensureSheet_(SHEET.trash, ['삭제일시', '시트', 'ID', '데이터']).sh;
  trash.appendRow([new Date(), sheetName, obj.id, JSON.stringify(obj)]);
}

function headersOf_(fields) {
  return Object.keys(fields).map((k) => fields[k].h);
}
