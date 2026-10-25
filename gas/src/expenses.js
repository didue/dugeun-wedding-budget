/** 「예산·지출 기록」 시트 CRUD */

const EXPENSE_FIELDS = {
  id:                { h: 'ID' },
  category:          { h: '분류' },
  paidAt:            { h: '결제일', type: 'date' },
  title:             { h: '내용' },
  vendor:            { h: '업체' },
  deposit:           { h: '계약·예약금', type: 'number' },
  middle:            { h: '추가·중도금', type: 'number' },
  balance:           { h: '잔금', type: 'number' },
  total:             { h: '총 견적', type: 'number', computed: true },
  payer:             { h: '결제한 사람' },
  status:            { h: '진행상황' },
  contractAt:        { h: '계약·예약일', type: 'date' },
  memo:              { h: '메모' },
  contact:           { h: '업체 연락처' },
  url:               { h: 'URL' },
  cashReceiptAmount: { h: '현금영수금액', type: 'number' },
  cashReceiptStatus: { h: '현금영수 처리상태' },
};

function expenseTable_() {
  return table_(SHEET.expenses, ['분류', '결제일', '내용']);
}

function listExpenses_() {
  const t = expenseTable_();
  const rows = readRows_(t, EXPENSE_FIELDS).filter((r) => !isBlank_(r.obj, EXPENSE_FIELDS));
  ensureIds_(t, rows); // 시트에서 직접 추가한 행에도 ID를 붙여 줌
  return rows.filter((r) => r.obj.id).map((r) => r.obj);
}

function createExpense_(data) {
  const input = pick_(EXPENSE_FIELDS, data);
  if (!input.title || !String(input.title).trim()) throw new AppError('invalid', { field: 'title' });
  const t = expenseTable_();
  if (!t.col['ID']) throw new AppError('id_column_missing', { name: SHEET.expenses });
  input.id = Utilities.getUuid();
  const row = insertRows_(t, EXPENSE_FIELDS, [input])[0];
  return readRow_(t, EXPENSE_FIELDS, row);
}

function updateExpense_(id, data) {
  const t = expenseTable_();
  const row = requireRow_(t, id);
  writeRow_(t, EXPENSE_FIELDS, row, pick_(EXPENSE_FIELDS, data), null);
  return readRow_(t, EXPENSE_FIELDS, row);
}

function deleteExpense_(id) {
  const t = expenseTable_();
  const row = requireRow_(t, id);
  moveToTrash_(SHEET.expenses, readRow_(t, EXPENSE_FIELDS, row));
  t.sh.deleteRow(row);
  return { id: id };
}
