import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { assetUrl, errorText, uploadFile } from '../lib/api'

// Wysiwyg-Editor. Die Werkzeuge entsprechen der Server-Allowlist (nh3):
// Absätze, Überschrift 2/3, fett/kursiv/unterstrichen/durchgestrichen,
// Listen, Zitat, Links, Bilder, Zentrieren.
export default function RichEditor({
  value,
  onChange,
  placeholder = '',
  simple = false,
  onError,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Ohne Überschriften und Bilder – für kurze Texte wie Öffnungszeiten. */
  simple?: boolean
  onError?: (message: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: simple ? false : { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      ...(simple ? [] : [Image]),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-stone max-w-none px-4 py-3 focus:outline-none prose-headings:font-display ${simple ? 'min-h-24' : 'min-h-72'}`,
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
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
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

  async function insertImage(file: File) {
    if (!editor) return
    setUploading(true)
    try {
      const res = await uploadFile<{ url: string }>('/hongar/images', file)
      const src = assetUrl(res.url)
      if (src) editor.chain().focus().setImage({ src, alt: '' }).run()
    } catch (err) {
      onError?.(`Bild-Upload fehlgeschlagen: ${errorText(err)}`)
    } finally {
      setUploading(false)
    }
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
        {!simple && (
          <>
            <Tool
              label="Überschrift"
              active={state.h2}
              onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            >
              Überschrift
            </Tool>
            <Tool
              label="Zwischentitel"
              active={state.h3}
              onClick={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            >
              Zwischentitel
            </Tool>
            <Divider />
          </>
        )}
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
        {!simple && (
          <Tool label="Zitat" active={state.quote} onClick={run(() => editor.chain().focus().toggleBlockquote().run())}>
            „Zitat“
          </Tool>
        )}
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
        {!simple && (
          <>
            <Tool label="Bild einfügen" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? 'Lädt …' : 'Bild'}
            </Tool>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void insertImage(file)
              }}
            />
          </>
        )}
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
