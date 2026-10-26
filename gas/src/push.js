/**
 * 웹 푸시 구독과 알림
 *
 * 「푸시구독」 시트: endpoint | p256dh | auth | 등록일시
 *   지출을 등록한 기기는 endpoint로 알아보고 알림에서 뺌
 *
 * 발송은 Vercel 함수(web/api/push.ts)가 함. Script Properties
 *   PUSH_URL     https://<배포 주소>/api/push
 *   PUSH_SECRET  Vercel 환경변수 PUSH_SECRET과 같은 값
 *
 * 마감일 알림은 GAS 편집기에서 setupReminderTrigger()를 한 번 실행해서 켬
 */

const PUSH_HEADERS = ['endpoint', 'p256dh', 'auth', '등록일시'];
const REMINDER_DAYS = [7, 1];
const REMINDER_HOUR = 9;

function pushSheet_() {
  return ensureSheet_(SHEET.push, PUSH_HEADERS).sh;
}

function readSubscriptions_() {
  const sh = pushSheet_();
  const n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, 3).getValues()
    .filter((r) => r[0])
    .map((r) => ({ endpoint: String(r[0]), keys: { p256dh: String(r[1]), auth: String(r[2]) } }));
}

function findSubscriptionRow_(sh, endpoint) {
  const n = sh.getLastRow() - 1;
  if (n <= 0) return null;
  const cell = sh.getRange(2, 1, n, 1).createTextFinder(endpoint).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : null;
}

/** 같은 기기(endpoint)면 키만 바꿈 */
function subscribePush_(sub) {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw new AppError('invalid', { field: 'subscription' });
  const sh = pushSheet_();
  const values = [sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date()];
  const row = findSubscriptionRow_(sh, sub.endpoint);
  if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
  else sh.appendRow(values);
  return true;
}

function unsubscribePush_(endpoint) {
  const sh = pushSheet_();
  const row = findSubscriptionRow_(sh, String(endpoint || ''));
  if (row) sh.deleteRow(row);
  return true;
}

/** subs에게 알림을 보내고, 만료된 구독은 시트에서 지움 */
function sendPush_(subs, payload) {
  if (!subs.length) return 0;
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('PUSH_URL');
  const secret = props.getProperty('PUSH_SECRET');
  if (!url || !secret) {
    console.warn('PUSH_URL / PUSH_SECRET이 없어서 알림을 보내지 않았어요');
    return 0;
  }

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-push-secret': secret },
    payload: JSON.stringify({ subscriptions: subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })), payload: payload }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    console.error('push 발송 실패', res.getResponseCode(), res.getContentText());
    return 0;
  }

  const out = JSON.parse(res.getContentText());
  (out.gone || []).forEach((endpoint) => unsubscribePush_(endpoint));
  return out.sent || 0;
}

/** 지출 등록 직후: 등록한 기기(exclude)를 뺀 나머지에 알림 */
function notifyNewExpense_(expense, exclude) {
  const subs = readSubscriptions_().filter((s) => s.endpoint !== exclude);
  const amount = expense.total || (expense.deposit || 0) + (expense.middle || 0) + (expense.balance || 0);
  const summary = [expense.category ? '[' + expense.category + ']' : '', expense.title, amount ? '· ' + comma_(amount) + '원' : '']
    .filter(Boolean)
    .join(' ');
  // 결제한 사람은 다음 줄에
  const body = expense.payer ? summary + '\n결제한 사람: ' + expense.payer : summary;
  sendPush_(subs, {
    title: '💸새 지출이 등록됐어요',
    body: body,
    url: '/expenses/' + expense.id,
    tag: 'expense-' + expense.id,
  });
}

function comma_(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 오늘에서 days일 뒤 날짜 (yyyy-MM-dd, 한국 시간) */
function dayAfter_(days) {
  const p = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd').split('-').map(Number);
  return Utilities.formatDate(new Date(p[0], p[1] - 1, p[2] + days, 12), TZ, 'yyyy-MM-dd');
}

/**
 * GAS 편집기에서 한 번 실행: 마감일 알림 켜기
 * 매일 트리거는 지정한 시각부터 1시간 안 아무 때나 돌아서, 8시대에 armDueReminder가
 * "오늘 9시 정각" 1회 트리거를 다시 거는 방식으로 9시에 맞춤
 */
function setupReminderTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['armDueReminder', 'sendDueReminders'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('armDueReminder').timeBased().everyDays(1).atHour(REMINDER_HOUR - 1).inTimezone(TZ).create();
  armDueReminder();
  Logger.log('마감일 알림을 켰어요 (매일 %s시)', REMINDER_HOUR);
}

function armDueReminder() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sendDueReminders')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  const p = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd').split('-').map(Number);
  const at = new Date(p[0], p[1] - 1, p[2], REMINDER_HOUR, 0, 0);
  if (at.getTime() <= Date.now()) return; // 9시가 지난 뒤 직접 실행했으면 내일부터
  ScriptApp.newTrigger('sendDueReminders').timeBased().at(at).create();
}

/** 완료하지 않은 할 일 중 마감 7일 전·1일 전인 것을 날짜별로 묶어 알림 */
function sendDueReminders() {
  const subs = readSubscriptions_();
  if (!subs.length) return;
  const todo = listChecklist_().filter((c) => !c.done && c.dueDate);

  REMINDER_DAYS.forEach((days) => {
    const due = dayAfter_(days);
    const items = todo.filter((c) => c.dueDate === due);
    if (!items.length) return;
    // 한 줄에 하나씩. 잠금화면은 4줄 정도만 보여서 3개까지 적고 나머지는 "외 N개"로
    const lines = items.slice(0, 3).map((c) => '- ' + c.title + (c.owner ? ' (' + c.owner + ')' : ''));
    if (items.length > 3) lines.push('외 ' + (items.length - 3) + '개');
    sendPush_(subs, {
      title: days === 1 ? '🔔내일 마감인 할 일이 있어요' : '🔔마감 ' + days + '일 전인 할 일이 있어요',
      body: lines.join('\n'),
      url: '/checklist',
      tag: 'due-' + due,
    });
  });
}
