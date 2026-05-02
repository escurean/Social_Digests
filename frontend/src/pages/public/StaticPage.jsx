import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { staticPages } from '../../services/api.js'

function inline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function renderMarkdown(text) {
  if (!text) return ''
  const lines = text.split('\n')
  let html = ''
  let inList = false

  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }

  for (const line of lines) {
    const h3 = line.match(/^### (.+)/)
    const h2 = line.match(/^## (.+)/)
    const h1 = line.match(/^# (.+)/)
    const li = line.match(/^[-*] (.+)/)

    if (h3) { closeList(); html += `<h3>${inline(h3[1])}</h3>` }
    else if (h2) { closeList(); html += `<h2>${inline(h2[1])}</h2>` }
    else if (h1) { closeList(); html += `<h1>${inline(h1[1])}</h1>` }
    else if (li) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${inline(li[1])}</li>`
    }
    else if (line.trim() === '') closeList()
    else { closeList(); html += `<p>${inline(line)}</p>` }
  }
  closeList()
  return html
}

export default function StaticPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setPage(null)
    setNotFound(false)
    staticPages.get(slug)
      .then(({ data }) => setPage(data))
      .catch(() => setNotFound(true))
  }, [slug])

  if (notFound) return <Navigate to="/" replace />
  if (!page) return <div className="loading-screen">Loading…</div>

  return (
    <div className="container" style={{ maxWidth: 760, padding: '48px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 32, color: 'var(--color-text)' }}>
        {page.title}
      </h1>
      <div
        dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content || '') }}
        style={{
          lineHeight: 1.8,
          color: 'var(--color-text)',
          fontSize: 15,
        }}
      />
      <style>{`
        .container h2 { font-size: 20px; font-weight: 600; margin: 28px 0 12px; }
        .container h3 { font-size: 17px; font-weight: 600; margin: 20px 0 8px; }
        .container p  { margin: 0 0 14px; }
        .container ul { padding-left: 24px; margin: 0 0 14px; }
        .container li { margin-bottom: 6px; }
        .container code { font-family: monospace; background: var(--color-light-gray); padding: 1px 5px; border-radius: 3px; font-size: 13px; }
      `}</style>
    </div>
  )
}
