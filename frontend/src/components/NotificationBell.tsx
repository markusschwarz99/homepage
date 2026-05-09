import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from '../api/notifications';
import type { Notification } from '../types';
import { useToast } from './Toast';

const PAGE_SIZE = 5;

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function notificationText(n: Notification): string {
  switch (n.type) {
    case 'recipe_comment':
      return `${n.payload.actor_name} hat „${n.payload.recipe_title}“ kommentiert.`;
    default:
      return 'Neue Benachrichtigung';
  }
}

function notificationLink(n: Notification): string {
  switch (n.type) {
    case 'recipe_comment':
      return `/rezepte/${n.payload.recipe_id}#comment-${n.payload.comment_id}`;
    default:
      return '/';
  }
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { show } = useToast();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial Unread-Count laden (on-mount)
  useEffect(() => {
    let cancelled = false;
    getUnreadCount()
      .then(c => { if (!cancelled) setUnreadCount(c); })
      .catch(() => {/* silent */});
    return () => { cancelled = true; };
  }, []);

  // Click-Outside zum Schließen
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications(PAGE_SIZE, 0);
      setItems(data.items);
      setTotal(data.total);
      const cnt = await getUnreadCount();
      setUnreadCount(cnt);
    } catch {
      /* silent — Glocke bleibt halt leer */
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadInitial();
    }
  }

  async function handleLoadMore() {
    setLoading(true);
    try {
      const data = await listNotifications(PAGE_SIZE, items.length);
      setItems(prev => [...prev, ...data.items]);
      setTotal(data.total);
    } catch {
      show('Konnte weitere Benachrichtigungen nicht laden.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleClick(n: Notification) {
    setOpen(false);
    if (!n.read) {
      // Optimistic UI
      setItems(prev => prev.map(it => it.id === n.id ? { ...it, read: true } : it));
      setUnreadCount(c => Math.max(0, c - 1));
      try {
        await markRead(n.id);
      } catch {
        // Optimistic Update zurückrollen
        setItems(prev => prev.map(it => it.id === n.id ? { ...it, read: false } : it));
        setUnreadCount(c => c + 1);
        show('Konnte Benachrichtigung nicht markieren.', 'error');
      }
    }
    navigate(notificationLink(n));
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    const previousItems = items;
    const previousCount = unreadCount;
    // Optimistic
    setItems(prev => prev.map(it => ({ ...it, read: true })));
    setUnreadCount(0);
    try {
      const res = await markAllRead();
      show(`${res.updated} Benachrichtigung${res.updated === 1 ? '' : 'en'} als gelesen markiert.`, 'success');
    } catch {
      setItems(previousItems);
      setUnreadCount(previousCount);
      show('Markieren fehlgeschlagen.', 'error');
    }
  }

  const hasMore = items.length < total;
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Benachrichtigungen${unreadCount > 0 ? ` (${unreadCount} ungelesen)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-text-primary hover:bg-bg-primary transition-colors"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-medium rounded-full bg-accent text-bg-primary"
            aria-hidden="true"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-bg-secondary shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-text-primary">Benachrichtigungen</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-text-muted hover:text-text-primary underline"
              >
                Alle als gelesen markieren
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-muted text-center">Lade...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-hint text-center">Keine Benachrichtigungen.</p>
            ) : (
              <ul>
                {items.map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-primary transition-colors ${
                        !n.read ? 'bg-bg-primary/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span
                            className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"
                            aria-label="Ungelesen"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary line-clamp-2">
                            {notificationText(n)}
                          </p>
                          <p className="text-xs text-text-hint mt-1">
                            {formatRelative(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full px-4 py-3 text-sm text-text-muted hover:text-text-primary border-t border-border disabled:opacity-50"
            >
              {loading ? 'Lade...' : 'Mehr laden'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
