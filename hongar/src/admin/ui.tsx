import type { ReactNode } from 'react'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-alm-forest px-4 py-2 font-semibold text-white hover:bg-alm-forest-dark disabled:opacity-50'
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-alm-line bg-white px-4 py-2 font-semibold hover:bg-alm-sand disabled:opacity-50'
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50'
// text-base (16px) verhindert das Auto-Zoomen von iOS beim Tippen.
export const inputClass =
  'w-full rounded-lg border border-alm-line bg-white px-3 py-2 text-base focus:border-alm-forest focus:outline-none focus:ring-2 focus:ring-alm-forest/20'

export interface FlashMessage {
  type: 'success' | 'error'
  text: string
}

export function Flash({ flash, onClose }: { flash: FlashMessage | null; onClose: () => void }) {
  if (!flash) return null
  const ok = flash.type === 'success'
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}
    >
      <span className="flex-1">{flash.text}</span>
      <button type="button" onClick={onClose} aria-label="Hinweis schließen" className="font-semibold opacity-70 hover:opacity-100">
        ×
      </button>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">{label}</div>
      {children}
      {hint && <p className="text-sm text-alm-muted">{hint}</p>}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-alm-forest"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-alm-muted">{hint}</span>}
      </span>
    </label>
  )
}
