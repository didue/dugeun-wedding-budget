/**
 * 처음 한 번만 GAS 편집기에서 실행하는 준비 스크립트
 * (실행 전에 꼭 [파일 > 사본 만들기]로 시트를 백업해 두세요)
 *
 * 1. 「예산·지출 기록」에 ID 열을 만들고 기존 행에 ID를 채움
 * 2. 앱이 쓰는 시트(목록, 목록_속성, 설정, 분류예산, 체크리스트, 삭제기록)를 만듦
 * 3. 지금 쓰고 있는 드롭다운 값을 「목록」 시트로 옮김
 * 4. 지출 시트의 데이터 확인 규칙을 「목록」 시트 범위 참조로 바꿈
 *
 * 여러 번 실행해도 이미 있는 것은 건드리지 않습니다.
 */
function setup() {
  const log = [];

  // 1) ID 열
  let t = expenseTable_();
  if (!t.col['ID']) {
    let last = 0;
    t.headers.forEach((h, i) => { if (h) last = i + 1; });
    const c = last + 1;
    if (c > t.sh.getMaxColumns()) t.sh.insertColumnAfter(t.sh.getMaxColumns());
    t.sh.getRange(t.headerRow, c).setValue('ID');
    log.push('ID 열을 ' + columnLetter_(c) + '열에 추가');
    t = expenseTable_();
  }
  const rows = readRows_(t, EXPENSE_FIELDS).filter((r) => !isBlank_(r.obj, EXPENSE_FIELDS) && !r.obj.id);
  rows.forEach((r) => t.sh.getRange(r.row, t.col['ID']).setValue(Utilities.getUuid()));
  if (rows.length) log.push('기존 지출 ' + rows.length + '건에 ID 채움');

  // 2) 시트 만들기
  const labels = Object.keys(LIST_TYPES).map((k) => LIST_TYPES[k]);
  const lists = ensureSheet_(SHEET.lists, labels);
  ensureSheet_(SHEET.listAttrs, ATTR_HEADERS);
  const settings = ensureSheet_(SHEET.settings, ['키', '값', '설명']);
  ensureSheet_(SHEET.budgets, ['분류', '예산']);
  const checklist = ensureSheet_(SHEET.checklist, headersOf_(CHECKLIST_FIELDS));
  ensureSheet_(SHEET.trash, ['삭제일시', '시트', 'ID', '데이터']);

  if (settings.created) {
    Object.keys(SETTING_KEYS).forEach((k) => setSetting_(settings.sh, k, ''));
  }
  if (checklist.created) {
    const doneCol = headersOf_(CHECKLIST_FIELDS).indexOf('완료') + 1;
    checklist.sh.getRange(2, doneCol, checklist.sh.getMaxRows() - 1, 1).insertCheckboxes();
  }

  // 3) 드롭다운 값 옮기기 (목록 시트를 새로 만들었을 때만)
  if (lists.created) {
    Object.keys(LIST_TYPES).forEach((type) => {
      const label = LIST_TYPES[type];
      const values = existingOptions_(t, label);
      writeListColumn_(label, values);
      writeAttrs_(label, values.map((v) => ({
        value: v,
        color: null,
        aggregate: type === 'status' ? defaultAggregate_(v) : null,
        inBudget: !(type === 'category' && /신혼집|이사/.test(v)),
      })));
      log.push(label + ' 목록 ' + values.length + '개 옮김');
    });
  }

  // 4) 데이터 확인 규칙을 범위 참조로
  Object.keys(LIST_TYPES).forEach((type) => {
    const label = LIST_TYPES[type];
    const c = t.col[label];
    if (!c) return;
    const header = lists.sh.getRange(1, 1, 1, lists.sh.getLastColumn()).getDisplayValues()[0];
    const lc = header.indexOf(label) + 1;
    if (!lc) return;
    const target = t.sh.getRange(t.headerRow + 1, c, t.sh.getMaxRows() - t.headerRow, 1);
    const prev = t.sh.getRange(t.headerRow + 1, c).getDataValidation();
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(lists.sh.getRange(2, lc, lists.sh.getMaxRows() - 1, 1), true)
      .setAllowInvalid(prev ? prev.getAllowInvalid() : true)
      .build();
    target.setDataValidation(rule);
    log.push(label + ' 열 확인 규칙 → 목록!' + columnLetter_(lc) + ' 참조');
  });

  if (!/^\d{6}$/.test(PropertiesService.getScriptProperties().getProperty('PIN') || '')) {
    log.push('⚠️ 프로젝트 설정 > 스크립트 속성에 PIN(6자리 숫자)을 등록하세요');
  }

  Logger.log(log.join('\n'));
}

/** 기존 확인 규칙의 값 + 실제로 쓰인 값 (기존 데이터가 규칙 위반이 되지 않도록 합침) */
function existingOptions_(t, label) {
  const c = t.col[label];
  if (!c) return [];
  let opts = [];
  const rule = t.sh.getRange(t.headerRow + 1, c).getDataValidation();
  if (rule) {
    const type = rule.getCriteriaType();
    const vals = rule.getCriteriaValues();
    if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) opts = vals[0];
    else if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) opts = vals[0].getDisplayValues().map((r) => r[0]);
  }
  const n = t.sh.getLastRow() - t.headerRow;
  const used = n > 0 ? t.sh.getRange(t.headerRow + 1, c, n, 1).getDisplayValues().map((r) => r[0]) : [];
  const seen = {};
  return opts.concat(used)
    .map((v) => String(v).trim())
    .filter((v) => v && !seen[v] && (seen[v] = true));
}

function defaultAggregate_(status) {
  if (/협찬|취소/.test(status)) return 'excluded';
  if (/완료|계약/.test(status)) return 'done';
  return 'planned';
}

function columnLetter_(c) {
  let s = '';
  while (c > 0) {
    const m = (c - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}
