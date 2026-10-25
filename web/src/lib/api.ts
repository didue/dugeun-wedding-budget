import { auth } from './auth';

export class ApiError extends Error {
  code: string;
  detail: Record<string, unknown> | null;

  constructor(code: string, detail?: Record<string, unknown> | null) {
    super(code);
    this.code = code;
    this.detail = detail ?? null;
  }
}

type Envelope<T> = { ok: boolean; data?: T; error?: string; detail?: Record<string, unknown> | null };

/**
 * GAS 웹앱 호출
 * Content-Type을 text/plain으로 보내야 CORS 사전요청(OPTIONS)이 생기지 않음 (GAS는 OPTIONS를 처리 못 함)
 */
export async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const url = import.meta.env.VITE_GAS_URL;
  if (!url) throw new ApiError('missing_gas_url');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: auth.getToken(), ...payload }),
    });
  } catch {
    throw new ApiError('network');
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!json) throw new ApiError('bad_response');
  if (!json.ok) {
    if (json.error === 'unauthorized') auth.lock();
    throw new ApiError(json.error ?? 'server_error', json.detail);
  }
  return json.data as T;
}

const MESSAGES: Record<string, string> = {
  network: '인터넷 연결을 확인해 주세요',
  bad_response: 'GAS 응답을 읽지 못했어요. 배포 URL을 확인해 주세요',
  unauthorized: '다시 PIN을 입력해 주세요',
  missing_gas_url: 'VITE_GAS_URL이 설정되지 않았어요',
  pin_not_configured: 'GAS 스크립트 속성에 PIN이 없어요',
  sheet_missing: '필요한 시트가 없어요. GAS에서 setup()을 먼저 실행해 주세요',
  header_missing: '시트 헤더를 찾지 못했어요',
  id_column_missing: '지출 시트에 ID 열이 없어요. setup()을 실행해 주세요',
  not_found: '이미 삭제됐거나 없는 항목이에요',
  duplicate: '같은 이름의 항목이 있어요',
  invalid: '입력값을 확인해 주세요',
};

export function errorMessage(e: unknown) {
  if (!(e instanceof ApiError)) return '문제가 생겼어요. 잠시 후 다시 시도해 주세요';
  if (e.code === 'in_use' && Array.isArray(e.detail?.values)) {
    const list = (e.detail.values as { value: string; count: number }[]).map((v) => `${v.value}(${v.count}건)`).join(', ');
    return `${list}은(는) 지출 내역에서 쓰고 있어서 삭제할 수 없어요`;
  }
  return MESSAGES[e.code] ?? `문제가 생겼어요 (${e.code})`;
}
