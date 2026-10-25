/**
 * PIN 인증과 세션 토큰
 *
 * Script Properties
 *   PIN            6자리 숫자 (필수)
 *   SESSION_HOURS  로그인 유지 시간, 기본 6 (CacheService 한계로 최대 6)
 */

const AUTH = {
  MAX_FAILS: 5,
  LOCK_MINUTES: 10,
};

function login_(pin) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('PIN');
  if (!expected || !/^\d{6}$/.test(expected)) return { ok: false, error: 'pin_not_configured' };

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const now = Date.now();
    const lockedUntil = Number(props.getProperty('AUTH_LOCKED_UNTIL') || 0);
    if (lockedUntil > now) {
      return { ok: false, error: 'locked', detail: { retryAfterSec: Math.ceil((lockedUntil - now) / 1000) } };
    }

    if (String(pin) !== expected) {
      const fails = Number(props.getProperty('AUTH_FAILS') || 0) + 1;
      if (fails >= AUTH.MAX_FAILS) {
        props.setProperties({ AUTH_FAILS: '0', AUTH_LOCKED_UNTIL: String(now + AUTH.LOCK_MINUTES * 60000) });
        return { ok: false, error: 'locked', detail: { retryAfterSec: AUTH.LOCK_MINUTES * 60 } };
      }
      props.setProperty('AUTH_FAILS', String(fails));
      return { ok: false, error: 'wrong_pin', detail: { remaining: AUTH.MAX_FAILS - fails } };
    }

    props.setProperty('AUTH_FAILS', '0');
    const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('tok_' + token, '1', sessionSeconds_());
    return { ok: true, data: { token: token, expiresInSec: sessionSeconds_() } };
  } finally {
    lock.releaseLock();
  }
}

function verifyToken_(token) {
  if (!token || typeof token !== 'string') return false;
  const cache = CacheService.getScriptCache();
  const key = 'tok_' + token;
  if (!cache.get(key)) return false;
  cache.put(key, '1', sessionSeconds_()); // 쓰는 동안은 만료 시간을 연장
  return true;
}

function logout_(token) {
  CacheService.getScriptCache().remove('tok_' + token);
  return true;
}

function sessionSeconds_() {
  const hours = Number(PropertiesService.getScriptProperties().getProperty('SESSION_HOURS') || 6);
  return Math.min(21600, Math.max(600, Math.round(hours * 3600)));
}

/** PIN 잠금을 풀어야 할 때 GAS 편집기에서 직접 실행 */
function resetPinLock() {
  PropertiesService.getScriptProperties().setProperties({ AUTH_FAILS: '0', AUTH_LOCKED_UNTIL: '0' });
  Logger.log('PIN 잠금을 해제했어요');
}
