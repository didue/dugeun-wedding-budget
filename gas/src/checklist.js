/** 「체크리스트」 시트 CRUD */

const CHECKLIST_FIELDS = {
  id:      { h: 'ID' },
  title:   { h: '제목' },
  group:   { h: '그룹' },
  dueDate: { h: '마감일', type: 'date' },
  done:    { h: '완료', type: 'bool' },
  owner:   { h: '담당' },
  memo:    { h: '메모' },
  order:   { h: '순서', type: 'number' },
};

function checklistTable_() {
  return table_(SHEET.checklist, ['ID', '제목']);
}

function listChecklist_() {
  const t = checklistTable_();
  const rows = readRows_(t, CHECKLIST_FIELDS).filter((r) => !isBlank_(r.obj, CHECKLIST_FIELDS));
  ensureIds_(t, rows);
  return rows.filter((r) => r.obj.id).map((r) => r.obj);
}

function createChecklist_(data) {
  return createChecklistMany_([data])[0];
}

function createChecklistMany_(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new AppError('invalid', { field: 'items' });
  const inputs = items.map((data) => {
    const input = pick_(CHECKLIST_FIELDS, data);
    if (!input.title || !String(input.title).trim()) throw new AppError('invalid', { field: 'title' });
    input.id = Utilities.getUuid();
    return input;
  });
  const t = checklistTable_();
  const rows = insertRows_(t, CHECKLIST_FIELDS, inputs);
  return rows.map((row) => readRow_(t, CHECKLIST_FIELDS, row));
}

function updateChecklist_(id, data) {
  const t = checklistTable_();
  const row = requireRow_(t, id);
  writeRow_(t, CHECKLIST_FIELDS, row, pick_(CHECKLIST_FIELDS, data), null);
  return readRow_(t, CHECKLIST_FIELDS, row);
}

function deleteChecklist_(id) {
  const t = checklistTable_();
  const row = requireRow_(t, id);
  moveToTrash_(SHEET.checklist, readRow_(t, CHECKLIST_FIELDS, row));
  t.sh.deleteRow(row);
  return { id: id };
}
