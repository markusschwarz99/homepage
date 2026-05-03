import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NotFound } from './NotFound';
import { Lightbox } from '../components/Lightbox';
import { useAuth } from '../hooks/useAuth';
import { listEntries, imageUrl } from '../api/diary';
import type { DiaryEntry, DiaryImage } from '../types';

type ViewMode = 'list' | 'calendar';

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateLong(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const weekday = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()];
  return `${weekday}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  // "HH:MM:SS" → "HH:MM"
  return iso.slice(0, 5);
}

export function Diary() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [lightboxImages, setLightboxImages] = useState<DiaryImage[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Kalender-Navigation
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => {
    if (authLoading || !user?.is_admin) return;
    listEntries()
      .then(setEntries)
      .catch(e => setError(e.message || 'Fehler beim Laden'));
  }, [authLoading, user?.is_admin]);

  // Map: "YYYY-MM-DD" → DiaryEntry[] (für Kalender-Lookup)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    if (!entries) return map;
    for (const e of entries) {
      const list = map.get(e.entry_date) ?? [];
      list.push(e);
      map.set(e.entry_date, list);
    }
    return map;
  }, [entries]);

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          <p className="text-text-muted text-sm">Lade...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.is_admin) {
    return <NotFound />;
  }

  function openLightbox(images: DiaryImage[], index: number) {
    setLightboxImages(images);
    setLightboxIndex(index);
  }

  function prevCalMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }
  function nextCalMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }

  // Kalender-Cells
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-medium text-text-primary">Fototagebuch</h1>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === 'list'
                    ? 'bg-text-primary text-bg-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Liste
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === 'calendar'
                    ? 'bg-text-primary text-bg-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Kalender
              </button>
            </div>
            <Link
              to="/diary/neu"
              className="px-3 py-1.5 text-sm rounded-lg bg-text-primary text-bg-primary hover:opacity-90 transition-opacity"
            >
              + Neuer Eintrag
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!entries && !error && (
          <p className="text-text-muted text-sm">Lade Einträge...</p>
        )}

        {entries && entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted">Noch keine Einträge.</p>
            <Link
              to="/diary/neu"
              className="inline-block mt-4 text-sm text-text-primary underline hover:opacity-70"
            >
              Ersten Eintrag anlegen
            </Link>
          </div>
        )}

        {/* ---------- Liste ---------- */}
        {entries && entries.length > 0 && view === 'list' && (
          <div className="space-y-8">
            {entries.map(entry => (
              <article
                key={entry.id}
                className="border border-border rounded-lg p-4 sm:p-6 bg-bg-secondary"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-medium text-text-primary">
                      {formatDateLong(entry.entry_date)}
                    </h2>
                    <p className="text-xs text-text-muted">{formatTime(entry.entry_time)}</p>
                  </div>
                  <Link
                    to={`/diary/${entry.id}/bearbeiten`}
                    className="text-xs text-text-muted hover:text-text-primary underline"
                  >
                    Bearbeiten
                  </Link>
                </div>

                {entry.description && (
                  <p className="text-sm text-text-primary whitespace-pre-wrap mb-4">
                    {entry.description}
                  </p>
                )}

                {entry.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {entry.images.map((img, idx) => (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => openLightbox(entry.images, idx)}
                        className="block aspect-square overflow-hidden rounded-lg bg-bg-primary group"
                      >
                        <img
                          src={imageUrl(img.thumb_url)}
                          alt={img.caption || ''}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* ---------- Kalender ---------- */}
        {entries && view === 'calendar' && (
          <div className="border border-border rounded-lg p-4 bg-bg-secondary">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevCalMonth}
                className="p-2 text-text-muted hover:text-text-primary"
                aria-label="Vorheriger Monat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="text-base font-medium text-text-primary">
                {MONTHS_DE[calMonth]} {calYear}
              </h2>
              <button
                type="button"
                onClick={nextCalMonth}
                className="p-2 text-text-muted hover:text-text-primary"
                aria-label="Nächster Monat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS_DE.map(w => (
                <div key={w} className="text-center text-xs text-text-muted py-1">{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calCells.map((day, i) => {
                if (day === null) return <div key={i} className="aspect-square" />;
                const iso = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                const dayEntries = entriesByDate.get(iso) ?? [];
                const firstImg = dayEntries.find(e => e.images.length > 0)?.images[0];
                const isToday = iso === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                const totalImages = dayEntries.reduce((sum, e) => sum + e.images.length, 0);

                if (dayEntries.length === 0) {
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded text-xs flex items-start justify-end p-1 text-text-muted ${
                        isToday ? 'border border-text-muted' : ''
                      }`}
                    >
                      {day}
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      // Erste Bild öffnen falls vorhanden
                      const allImages = dayEntries.flatMap(e => e.images);
                      if (allImages.length > 0) openLightbox(allImages, 0);
                    }}
                    className="relative aspect-square rounded overflow-hidden bg-bg-primary group"
                    aria-label={`${day}. ${MONTHS_DE[calMonth]}: ${dayEntries.length} Einträge`}
                  >
                    {firstImg ? (
                      <img
                        src={imageUrl(firstImg.thumb_url)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-bg-primary" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute top-1 right-1 text-xs text-white font-medium drop-shadow">
                      {day}
                    </span>
                    {totalImages > 1 && (
                      <span className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 tabular-nums">
                        {totalImages}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {lightboxImages && (
        <Lightbox
          images={lightboxImages.map(img => ({
            url: imageUrl(img.url),
            caption: img.caption,
          }))}
          index={lightboxIndex}
          onClose={() => setLightboxImages(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </Layout>
  );
}
