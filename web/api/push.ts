/**
 * 웹 푸시 발송 (Vercel 함수)
 *
 * GAS에는 VAPID 서명(ES256)과 aes128gcm 암호화가 없어서 발송만 여기서 함.
 * 구독 목록은 GAS가 시트에서 읽어 보내 주고, 만료된 구독은 gone으로 돌려줘서 GAS가 지움.
 *
 * POST /api/push  (헤더 x-push-secret)
 *   { subscriptions: [{ endpoint, keys: { p256dh, auth } }], payload: { title, body, url, tag } }
 *   → { sent, gone: [endpoint] }
 *
 * 환경변수: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT(mailto:…), PUSH_SECRET
 */
import webpush, { type PushSubscription } from 'web-push';

type Body = { subscriptions?: PushSubscription[]; payload?: Record<string, unknown> };

export async function POST(request: Request) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SECRET } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT || !PUSH_SECRET) {
    return Response.json({ error: 'not_configured' }, { status: 500 });
  }
  if (request.headers.get('x-push-secret') !== PUSH_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.subscriptions) || !body.payload) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const data = JSON.stringify(body.payload);
  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    body.subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, data, { TTL: 60 * 60 * 24, urgency: 'high' });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404·410: 앱을 지웠거나 알림을 끈 기기
        if (status === 404 || status === 410) gone.push(sub.endpoint);
        else console.error('push failed', status, (err as Error).message);
      }
    }),
  );

  return Response.json({ sent, gone });
}
