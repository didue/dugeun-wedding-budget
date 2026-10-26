/**
 * 결혼예산 가계부 API (GAS 웹앱)
 *
 * 모든 요청은 POST + Content-Type: text/plain 으로 JSON 문자열을 보냅니다.
 *   { action: "expense.update", token: "...", id: "...", data: {...} }
 * 응답은 항상 { ok: true, data } 또는 { ok: false, error, detail } 형태입니다.
 */

const ROUTES = {
  'bootstrap':            { fn: () => bootstrap_() },
  'logout':               { fn: (req) => logout_(req.token) },
  'expense.create':       { write: true, fn: (req) => createExpense_(req.data), after: (req, data) => notifyNewExpense_(data, req.exclude) },
  'expense.update':       { write: true, fn: (req) => updateExpense_(req.id, req.data) },
  'expense.delete':       { write: true, fn: (req) => deleteExpense_(req.id) },
  'checklist.create':     { write: true, fn: (req) => createChecklist_(req.data) },
  'checklist.createMany': { write: true, fn: (req) => createChecklistMany_(req.items) },
  'checklist.update':     { write: true, fn: (req) => updateChecklist_(req.id, req.data) },
  'checklist.delete':     { write: true, fn: (req) => deleteChecklist_(req.id) },
  'lists.save':           { write: true, fn: (req) => saveList_(req.type, req.items, req.renames) },
  'settings.save':        { write: true, fn: (req) => saveSettings_(req.data) },
  'push.subscribe':       { write: true, fn: (req) => subscribePush_(req.subscription) },
  'push.unsubscribe':     { write: true, fn: (req) => unsubscribePush_(req.endpoint) },
};

class AppError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail || null;
  }
}

function doGet() {
  return json_({ ok: true, data: { name: 'wedding-budget-api' } });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }

  try {
    if (req.action === 'auth') return json_(login_(req.pin));
    if (!verifyToken_(req.token)) return json_({ ok: false, error: 'unauthorized' });

    const route = ROUTES[req.action];
    if (!route) return json_({ ok: false, error: 'unknown_action' });
    if (!route.write) return json_({ ok: true, data: route.fn(req) });

    // 둘이 동시에 저장해도 행이 꼬이지 않도록 쓰기는 한 번에 하나씩
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let data;
    try {
      data = route.fn(req);
    } finally {
      lock.releaseLock();
    }

    // 알림 같은 뒷일은 잠금을 푼 뒤에 하고, 실패해도 저장 결과는 그대로 돌려줌
    if (route.after) {
      try {
        route.after(req, data);
      } catch (err) {
        console.error(err);
      }
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    if (err instanceof AppError) return json_({ ok: false, error: err.code, detail: err.detail });
    console.error(err);
    return json_({ ok: false, error: 'server_error', detail: { message: String(err && err.message || err) } });
  }
}

function bootstrap_() {
  return {
    expenses: listExpenses_(),
    lists: readLists_(),
    settings: readSettings_(),
    checklist: listChecklist_(),
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
