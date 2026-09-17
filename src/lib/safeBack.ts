import type { NavigateFunction } from 'react-router-dom';

/** Router-owned history only: browser history length can include external sites. */
export function safeBack(navigate: NavigateFunction, fallback: string) {
  const index = window.history.state?.idx;
  if (typeof index === 'number' && index > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}
