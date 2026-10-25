import type { NavigateFunction } from 'react-router-dom';

/** 앱 안에서 이동해 온 경우에만 뒤로, 바로 들어온 경우엔 fallback으로 */
export function goBack(navigate: NavigateFunction, fallback: string) {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}

// 지출 목록의 마지막 필터. 상세에서 돌아오거나 탭을 다시 눌러도 유지되도록 세션 동안 기억
const EXPENSES_QUERY_KEY = 'wb.expensesQuery';

export function rememberExpensesQuery(query: string) {
  try {
    sessionStorage.setItem(EXPENSES_QUERY_KEY, query);
  } catch {
    // 저장이 막혀 있으면 필터 없는 목록으로 돌아감
  }
}

export function expensesPath() {
  let query = '';
  try {
    query = sessionStorage.getItem(EXPENSES_QUERY_KEY) ?? '';
  } catch {
    // 무시
  }
  return query ? `/expenses?${query}` : '/expenses';
}
