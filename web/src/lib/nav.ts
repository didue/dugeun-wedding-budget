import type { NavigateFunction } from 'react-router-dom';

/** 앱 안에서 이동해 온 경우에만 뒤로, 바로 들어온 경우엔 fallback으로 */
export function goBack(navigate: NavigateFunction, fallback: string) {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}
