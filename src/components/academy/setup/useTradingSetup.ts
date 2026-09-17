import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
export function useTradingSetup() {
  const { user } = useAuth();
  const key = `vault-local-trading-setup-v1:${user?.id || 'guest'}`;
  const [revision, refresh] = useState(0);
  let ready: number[] = [];
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(value)) ready = [...new Set(value.filter(i => Number.isInteger(i) && i >= 0 && i < 5))]; } catch {}
  const [error, setError] = useState('');
  function toggle(index: number) {
    try { localStorage.setItem(key, JSON.stringify(ready.includes(index) ? ready.filter(i => i !== index) : [...ready, index])); setError(''); refresh(revision + 1); }
    catch { setError('This browser could not save your checklist. Allow local storage and try again.'); }
  }
  return { ready, toggle, error };
}
