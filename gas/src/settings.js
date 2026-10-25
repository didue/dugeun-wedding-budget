/**
 * 「설정」 시트: 키 | 값 | 설명
 * 「분류예산」 시트: 분류 | 예산
 */

const SETTING_KEYS = {
  weddingDate: { label: '결혼식 날짜 (D-day 기준)', type: 'date' },
  totalBudget: { label: '총 예산', type: 'number' },
};

function readSettings_() {
  const sh = sheet_(SHEET.settings);
  const n = sh.getLastRow() - 1;
  const raw = {};
  if (n > 0) sh.getRange(2, 1, n, 2).getValues().forEach((r) => { raw[String(r[0]).trim()] = r[1]; });

  const out = {};
  Object.keys(SETTING_KEYS).forEach((k) => { out[k] = fromCell_(raw[k], SETTING_KEYS[k].type); });
  out.budgets = readBudgets_();
  return out;
}

function saveSettings_(data) {
  if (!data || typeof data !== 'object') throw new AppError('invalid');
  const sh = sheet_(SHEET.settings);
  Object.keys(SETTING_KEYS).forEach((k) => {
    if (k in data) setSetting_(sh, k, toCell_(data[k], SETTING_KEYS[k].type));
  });
  if (data.budgets && typeof data.budgets === 'object') writeBudgets_(data.budgets);
  return readSettings_();
}

function setSetting_(sh, key, value) {
  const n = sh.getLastRow() - 1;
  const cell = n > 0 ? sh.getRange(2, 1, n, 1).createTextFinder(key).matchEntireCell(true).findNext() : null;
  if (cell) sh.getRange(cell.getRow(), 2).setValue(value);
  else sh.appendRow([key, value, SETTING_KEYS[key] ? SETTING_KEYS[key].label : '']);
}

function readBudgets_() {
  const sh = sheet_(SHEET.budgets);
  const n = sh.getLastRow() - 1;
  const out = {};
  if (n > 0) {
    sh.getRange(2, 1, n, 2).getValues().forEach((r) => {
      const name = String(r[0]).trim();
      const v = fromCell_(r[1], 'number');
      if (name && v !== null) out[name] = v;
    });
  }
  return out;
}

function writeBudgets_(map) {
  const sh = sheet_(SHEET.budgets);
  const n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, 2).clearContent();
  const rows = Object.keys(map)
    .map((k) => [String(k).trim(), Number(map[k])])
    .filter((r) => r[0] && r[1] > 0);
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows);
}

function renameBudgets_(renames) {
  if (!renames.length) return;
  const b = readBudgets_();
  renames.forEach((r) => {
    if (r.from in b) {
      b[r.to] = (b[r.to] || 0) + b[r.from];
      delete b[r.from];
    }
  });
  writeBudgets_(b);
}
