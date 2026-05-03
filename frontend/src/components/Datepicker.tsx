import { useState, useEffect, useRef } from 'react';

interface DatepickerProps {
  /** Aktueller Wert als ISO-String "YYYY-MM-DD" oder leer. */
  value: string;
  onChange: (value: string) => void;
  /** Optionales ID/Name fürs umliegende <label>. */
  id?: string;
}

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISO(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(s: string): string {
  const d = fromISO(s);
  if (!d) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function Datepicker({ value, onChange, id }: DatepickerProps) {
  const today = new Date();
  const initial = fromISO(value) || today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-11
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Klick außerhalb schließt das Popup
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Wenn value von außen geändert wird, View synchronisieren
  useEffect(() => {
    const d = fromISO(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toISO(d));
    setOpen(false);
  }

  function selectToday() {
    const d = new Date();
    onChange(toISO(d));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setOpen(false);
  }

  // Tage-Grid berechnen: Wochenstart Montag (Europa)
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay() liefert 0=So..6=Sa, wir wollen 0=Mo..6=So
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = fromISO(value);
  const todayISO = toISO(today);

  function isSelected(day: number): boolean {
    return !!selected
      && selected.getFullYear() === viewYear
      && selected.getMonth() === viewMonth
      && selected.getDate() === day;
  }

  function isToday(day: number): boolean {
    return toISO(new Date(viewYear, viewMonth, day)) === todayISO;
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary text-sm w-44 text-left hover:border-text-muted transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value ? formatDisplay(value) : <span className="text-text-muted">Datum wählen</span>}
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg p-3 w-72"
          role="dialog"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 text-text-muted hover:text-text-primary"
              aria-label="Vorheriger Monat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-medium text-text-primary">
              {MONTHS_DE[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 text-text-muted hover:text-text-primary"
              aria-label="Nächster Monat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS_DE.map(w => (
              <div key={w} className="text-center text-xs text-text-muted py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const sel = isSelected(day);
              const td = isToday(day);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={[
                    'aspect-square text-sm rounded transition-colors',
                    sel
                      ? 'bg-text-primary text-bg-primary font-medium'
                      : td
                        ? 'border border-text-muted text-text-primary hover:bg-bg-primary'
                        : 'text-text-primary hover:bg-bg-primary',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={selectToday}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Heute
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
