import { useEffect, useState, useCallback } from 'react';
import { getToken } from '../lib/api';
import type { ShoppingItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL;
const POLL_INTERVAL_MS = 60_000;

export function WandDashboard() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [authError, setAuthError] = useState(false);

  // Kiosk-Token aus ?token= einmalig in localStorage übernehmen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/shopping/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      if (!res.ok) return;
      setItems(await res.json());
      setAuthError(false);
    } catch {
      // Netzwerkfehler: bestehende Daten behalten
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const id = setInterval(fetchItems, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchItems]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (authError) {
    return (
      <div className="w-screen h-screen bg-bg-secondary flex items-center justify-center">
        <p className="text-text-muted text-2xl">
          Kein Zugriff — Kiosk-Token fehlt oder abgelaufen.
        </p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-bg-secondary flex overflow-hidden">

      {/* Linke Spalte: Uhr + Datum */}
      <div className="w-96 shrink-0 flex flex-col items-center justify-center border-r border-border px-8 gap-3">
        <p className="text-[9rem] font-light leading-none tabular-nums text-text-primary">
          {timeStr}
        </p>
        <p className="text-xl text-text-muted text-center capitalize">{dateStr}</p>
      </div>

      {/* Rechte Spalte: Einkaufsliste */}
      <div className="flex-1 flex flex-col p-10 min-h-0">
        <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mb-6">
          Einkaufsliste
        </h2>

        {items.length === 0 ? (
          <p className="text-text-hint text-2xl mt-8">Liste ist leer</p>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {items.map(item => (
              <li key={item.id} className="py-5 flex items-baseline gap-4">
                <span className="text-text-muted text-xl w-20 shrink-0 text-right">
                  {item.quantity}
                </span>
                <span className="text-3xl font-medium text-text-primary">{item.name}</span>
                {item.description && (
                  <span className="text-text-muted text-xl">— {item.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
