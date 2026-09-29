import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactNode } from 'react'

// Wysiwyg-Editor für kurze Texte (Aktuelles, Öffnungszeiten, Kontakt). Die
// Werkzeuge liegen innerhalb der Server-Allowlist (nh3): Absätze,
// fett/kursiv/unterstrichen, Listen, Links, Zentrieren.
export default function RichEditor({
  value,
  onChange,
  placeholder = '',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-stone max-w-none px-4 py-3 focus:outline-none prose-headings:font-display min-h-24`,
      },
    },
  })

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            center: e.isActive({ textAlign: 'center' }),
            link: e.isActive('link'),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  })

  if (!editor || !state) return null

  function editLink() {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const input = window.prompt('Link-Adresse (z.B. https://… oder mailto:…)', previous ?? 'https://')
    if (input === null) return
    const href = input.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (href === '' || href === 'https://') chain.unsetLink().run()
    else chain.setLink({ href }).run()
  }

  const run = (fn: () => void) => () => fn()

  return (
    <div className="overflow-hidden rounded-xl border border-alm-line bg-white focus-within:border-alm-forest focus-within:ring-2 focus-within:ring-alm-forest/20">
      <div className="flex flex-wrap gap-1 border-b border-alm-line bg-alm-cream/60 p-1.5">
        <Tool label="Fett" active={state.bold} onClick={run(() => editor.chain().focus().toggleBold().run())}>
          <strong>F</strong>
        </Tool>
        <Tool label="Kursiv" active={state.italic} onClick={run(() => editor.chain().focus().toggleItalic().run())}>
          <em>K</em>
        </Tool>
        <Tool
          label="Unterstrichen"
          active={state.underline}
          onClick={run(() => editor.chain().focus().toggleUnderline().run())}
        >
          <span className="underline">U</span>
        </Tool>
        <Divider />
        <Tool
          label="Aufzählung"
          active={state.bullet}
          onClick={run(() => editor.chain().focus().toggleBulletList().run())}
        >
          • Liste
        </Tool>
        <Tool
          label="Nummerierte Liste"
          active={state.ordered}
          onClick={run(() => editor.chain().focus().toggleOrderedList().run())}
        >
          1. Liste
        </Tool>
        <Tool
          label="Zentrieren"
          active={state.center}
          onClick={run(() =>
            state.center
              ? editor.chain().focus().unsetTextAlign().run()
              : editor.chain().focus().setTextAlign('center').run(),
          )}
        >
          Zentriert
        </Tool>
        <Divider />
        <Tool label="Link" active={state.link} onClick={editLink}>
          Link
        </Tool>
        <span className="ml-auto flex gap-1">
          <Tool label="Rückgängig" disabled={!state.canUndo} onClick={run(() => editor.chain().focus().undo().run())}>
            ↶
          </Tool>
          <Tool label="Wiederholen" disabled={!state.canRedo} onClick={run(() => editor.chain().focus().redo().run())}>
            ↷
          </Tool>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function Tool({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // mousedown verhindern, damit der Editor Fokus + Markierung behält
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm transition-colors disabled:opacity-40 ${active ? 'bg-alm-forest text-white' : 'hover:bg-alm-sand'}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 my-1 w-px bg-alm-line" />
}
