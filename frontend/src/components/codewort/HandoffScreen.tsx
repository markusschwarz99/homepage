import { useCallback, useEffect, useRef, useState } from 'react';
import type { Team, TeamNames } from '../../lib/codewort/types';

interface Props {
  variant: 'toSpymaster' | 'toTable';
  team: Team;
  teamNames: TeamNames;
  onConfirm: () => void;
}

/** Haltedauer, bis die Übergabe bestätigt gilt (INV-12/AC-14: kein Ein-Klick). */
const HOLD_MS = 650;

/**
 * Vollbild-Übergabe-Screen: verdeckt das Spielfeld und wird nur durch bewusstes
 * Halten verlassen — nicht durch einen einzelnen Klick (INV-12, AC-14). Das
 * schützt das Geheimnis über den Personenwechsel (§8.2).
 */
export function HandoffScreen({ variant, team, teamNames, onConfirm }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  }, [onConfirm]);

  useEffect(() => cancel, [cancel]);

  const toSpymaster = variant === 'toSpymaster';
  const title = toSpymaster
    ? `Gerät an den Geheimdienstchef von ${teamNames[team]}`
    : 'Gerät zurück auf den Tisch';
  const subtitle = toSpymaster
    ? 'Nur der Chef darf jetzt auf den Bildschirm schauen. Halte gedrückt, wenn du das Gerät in der Hand hast.'
    : 'Legt das Gerät in die Mitte. Halte gedrückt, wenn alle bereit sind.';

  return (
    <section
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center bg-bg-primary"
      data-testid="handoff-screen"
      data-variant={variant}
    >
      <p className="text-xs uppercase tracking-widest text-text-muted mb-4">Übergabe</p>
      <h1 className="text-2xl sm:text-4xl font-semibold max-w-xl mb-4">{title}</h1>
      <p className="text-sm text-text-muted max-w-md mb-10">{subtitle}</p>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start();
        }}
        onKeyUp={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Zum Bestätigen gedrückt halten"
        data-testid="handoff-confirm"
        className="relative w-64 max-w-full h-16 rounded-xl border-2 border-accent overflow-hidden select-none touch-none font-medium text-text-primary"
      >
        <span
          className="absolute inset-y-0 left-0 bg-accent/20"
          style={{
            width: holding ? '100%' : '0%',
            transition: holding ? `width ${HOLD_MS}ms linear` : 'width 120ms ease-out',
          }}
          aria-hidden="true"
        />
        <span className="relative">
          {holding ? 'Weiter halten …' : 'Gedrückt halten'}
        </span>
      </button>
    </section>
  );
}
