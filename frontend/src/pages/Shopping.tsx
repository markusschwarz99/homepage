import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import type { ShoppingItem, FrequentItem, HistoryItem } from '../types';

function GuestMessage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-8">Einkaufsliste</h1>
        <div className="bg-bg-primary p-8 rounded-lg border border-border text-center">
          <p className="text-2xl mb-4">⏳</p>
          <p className="font-medium mb-2">Dein Account wartet auf Freigabe</p>
          <p className="text-sm text-text-muted">
            Ein Administrator muss deinen Account erst freigeben bevor du Inhalte sehen kannst.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export function Shopping() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [frequent, setFrequent] = useState<FrequentItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [modal, setModal] = useState<{ name: string; defaultQty: string } | null>(null);
  const [modalQty, setModalQty] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  function toggleDay(key: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    if (!user?.is_household) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    const [itemsData, frequentData, historyData] = await Promise.all([
      api<ShoppingItem[]>('/shopping/items'),
      api<FrequentItem[]>('/shopping/frequent'),
      api<HistoryItem[]>('/shopping/history'),
    ]);
    setItems(itemsData);
    setFrequent(frequentData);
    setHistory(historyData);
  }

  async function addItem(name: string, quantity: string) {
    await api('/shopping/items', {
      method: 'POST',
      body: JSON.stringify({ name, quantity: quantity || '1' }),
    });
    await loadAll();
  }

  async function markPurchased(id: number, purchased: boolean) {
    await api(`/shopping/items/${id}/purchase?purchased=${purchased}`, {
      method: 'POST',
    });
    await loadAll();
  }

  function openModal(name: string, defaultQty: string) {
    setModal({ name, defaultQty });
    setModalQty(defaultQty);
  }

  async function confirmModal() {
    if (!modal) return;
    await addItem(modal.name, modalQty || '1');
    setModal(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await addItem(newName.trim(), newQty.trim() || '1');
    setNewName('');
    setNewQty('');
  }

  function formatRelativeTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays === 1) return 'gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE');
  }

  function formatDayHeader(iso: string) {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    if (isSameDay(date, today)) return 'Heute';
    if (isSameDay(date, yesterday)) return 'Gestern';
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${weekdays[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function groupByDay(items: HistoryItem[]) {
    const groups: { [key: string]: HistoryItem[] } = {};
    items.forEach(item => {
      const date = new Date(item.purchased_at);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).map(([key, items]) => ({
      key,
      date: items[0].purchased_at,
      items,
    }));
  }

  if (loading) {
    return <Layout><div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12"><p>Lade...</p></div></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-medium mb-8">Einkaufsliste</h1>
          <div className="bg-bg-primary p-8 rounded-lg border border-border text-center text-text-muted">
            Bitte <Link to="/login" className="text-text-primary underline">melde dich an</Link>.
          </div>
        </div>
      </Layout>
    );
  }

  if (!user.is_household) return <GuestMessage />;

  const historyGroups = groupByDay(history);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-8">Einkaufsliste</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Artikel..."
              required
              className="flex-1 min-w-0 px-4 py-3 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
            />
            <input
              type="text"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              placeholder="Menge"
              className="w-24 sm:w-40 px-4 py-3 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
            />
            <Button type="submit" className="w-12 sm:w-14 text-xl shrink-0">+</Button>
          </div>
        </form>

        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-4">Aktuelle Liste</h2>
          {items.length === 0 ? (
            <p className="text-center text-text-hint py-8 bg-bg-primary rounded-lg border border-border">
              Liste ist leer. Füge Artikel hinzu!
            </p>
          ) : (
            <div className="bg-bg-primary rounded-lg border border-border divide-y divide-border overflow-hidden">
              {items.map(i => (
                <div key={i.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-sm text-text-muted">Menge: {i.quantity}</p>
                    <p className="text-xs text-text-hint mt-1">von {i.added_by} · {formatRelativeTime(i.added_at)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => markPurchased(i.id, true)} className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-primary hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors whitespace-nowrap">✓ Gekauft</button>
                    <button onClick={() => markPurchased(i.id, false)} className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-primary hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors whitespace-nowrap">✕ Nicht gekauft</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-4">Häufig gekauft</h2>
          {frequent.length === 0 ? (
            <p className="text-text-hint text-sm">Noch keine häufigen Artikel.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {frequent.map(i => (
                <button key={i.name} onClick={() => openModal(i.name, i.last_quantity)} className="flex items-center gap-2 px-4 py-2 text-xs rounded-full border border-border bg-bg-primary hover:bg-accent hover:text-bg-primary hover:border-accent transition-colors">
                  + {i.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-hint">{i.count}x</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-4">Verlauf</h2>
          {historyGroups.length === 0 ? (
            <p className="text-text-hint text-sm">Noch kein Verlauf.</p>
          ) : (
            <div className="bg-bg-primary rounded-lg border border-border divide-y divide-border overflow-hidden">
              {historyGroups.map(group => {
                const isOpen = expandedDays.has(group.key);
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleDay(group.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary transition-colors text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-text-muted text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                        <span className="text-sm font-medium truncate">{formatDayHeader(group.date)}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-bg-secondary text-text-muted whitespace-nowrap shrink-0">
                        {group.items.length} {group.items.length === 1 ? 'Artikel' : 'Artikel'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border divide-y divide-border bg-bg-secondary/30">
                        {group.items.map(h => (
                          <div key={h.id} className="flex items-center justify-between p-3 pl-10 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm"><span className="font-medium">{h.item_name}</span><span className="text-text-muted"> · Menge: {h.quantity}</span></p>
                              <p className="text-xs text-text-hint mt-0.5">von {h.user_name} · {formatRelativeTime(h.purchased_at)}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 whitespace-nowrap">✓ Gekauft</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-bg-primary rounded-xl p-8 max-w-md w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-bg-secondary flex items-center justify-center text-text-muted hover:text-text-primary text-2xl leading-none">×</button>
            <h3 className="text-lg font-medium mb-6 pr-8">Menge für "{modal.name}"</h3>
            <input type="text" value={modalQty} onChange={e => setModalQty(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') confirmModal(); if (e.key === 'Escape') setModal(null); }} className="w-full px-4 py-3 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-primary mb-4" />
            <Button onClick={confirmModal} className="w-full">Hinzufügen</Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
