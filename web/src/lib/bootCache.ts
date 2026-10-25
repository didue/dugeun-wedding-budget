import { auth } from './auth';
import { queryClient } from './queryClient';
import { BOOT } from './queries';
import type { Bootstrap } from './types';

/**
 * 지난번 bootstrap 응답을 PIN으로 암호화해 기기에 보관
 * PIN을 넣으면 이걸 먼저 보여주고, GAS 응답이 오면 갱신됨
 * 키는 PIN에서 만들고, 잠금 해제된 동안만 메모리와 sessionStorage(토큰과 같은 수명)에 둠
 */
const BLOB_KEY = 'wb.bootCache';
const SALT_KEY = 'wb.bootCacheSalt';
const SESSION_KEY = 'wb.bootCacheKey';
const ITERATIONS = 600_000;

type Blob = { v: 1; iv: string; ct: string; savedAt: number };
type Cached = { data: Bootstrap; savedAt: number };
export type OpenedCache = { key: CryptoKey; cached: Cached | null };

let key: CryptoKey | null = null;
let saveTimer: number | undefined;

function toB64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function read(storage: () => Storage, k: string) {
  try {
    return storage().getItem(k);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, k: string, v: string | null) {
  try {
    if (v === null) storage().removeItem(k);
    else storage().setItem(k, v);
  } catch {
    // 저장이 막혀 있으면 캐시 없이 동작
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

function salt() {
  const saved = read(local, SALT_KEY);
  if (saved) return fromB64(saved);
  const s = crypto.getRandomValues(new Uint8Array(16));
  write(local, SALT_KEY, toB64(s));
  return s;
}

async function decrypt(k: CryptoKey): Promise<Cached | null> {
  const raw = read(local, BLOB_KEY);
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Blob;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(b.iv) }, k, fromB64(b.ct));
    return { data: JSON.parse(new TextDecoder().decode(plain)) as Bootstrap, savedAt: b.savedAt };
  } catch {
    // PIN이 바뀌었거나 깨진 캐시. 다음 저장 때 덮어씀
    return null;
  }
}

function hydrate(c: Cached | null) {
  // 그 사이 GAS 응답이 먼저 왔으면 그대로 둠
  if (!c || queryClient.getQueryData(BOOT)) return;
  queryClient.setQueryData(BOOT, c.data, { updatedAt: c.savedAt });
}

/** PIN 검사와 동시에 돌림. 키는 인증이 성공해 applyCache를 부를 때만 씀 */
export async function openCache(pin: string): Promise<OpenedCache | null> {
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    const k = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt(), iterations: ITERATIONS, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    return { key: k, cached: await decrypt(k) };
  } catch {
    return null;
  }
}

/** 인증 성공 후, 토큰을 넣기 전에 호출 */
export async function applyCache(o: OpenedCache) {
  key = o.key;
  hydrate(o.cached);
  try {
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', o.key));
    write(session, SESSION_KEY, toB64(raw));
  } catch {
    // 세션 키를 못 남겨도 이번 세션은 메모리 키로 동작 (새로고침 때만 캐시 없이 로딩)
  }
}

async function save(data: Bootstrap, savedAt: number) {
  if (!key) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))));
  // 암호화하는 동안 잠겼으면 버림
  if (!key) return;
  const blob: Blob = { v: 1, iv: toB64(iv), ct: toB64(ct), savedAt };
  write(local, BLOB_KEY, JSON.stringify(blob));
}

/** 앱 시작 시 한 번 호출: 새로고침이면 세션 키로 복원하고, 이후 bootstrap이 바뀔 때마다 저장 */
export function startBootCache() {
  const sessionKey = auth.getToken() ? read(session, SESSION_KEY) : null;
  if (sessionKey) {
    void crypto.subtle
      .importKey('raw', fromB64(sessionKey), 'AES-GCM', true, ['encrypt', 'decrypt'])
      .then(async (k) => {
        if (!auth.getToken()) return;
        key = k;
        hydrate(await decrypt(k));
      })
      .catch(() => write(session, SESSION_KEY, null));
  }

  auth.subscribe(() => {
    if (auth.getToken()) return;
    key = null;
    window.clearTimeout(saveTimer);
    write(session, SESSION_KEY, null);
  });

  queryClient.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.query.queryHash !== JSON.stringify(BOOT)) return;
    const { data, dataUpdatedAt } = e.query.state as { data?: Bootstrap; dataUpdatedAt: number };
    if (!data || !key) return;
    window.clearTimeout(saveTimer);
    // 받은 시각을 그대로 저장해야 다음에 열 때 오래된 값이면 바로 다시 받음
    saveTimer = window.setTimeout(() => void save(data, dataUpdatedAt), 500);
  });
}
