import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/utils'
import Avatar from '../components/Avatar'

export const CATEGORIES = [
  'Lighting & Control', 'Audio & Signal', 'Cameras & Cinematography',
  'Video & Projection', 'Equipment', 'Workflows & Troubleshooting', 'Careers & Training',
]

export default function ForumPage({ promptSignIn }) {
  const { session, profile } = useAuth()
  const [threads, setThreads] = useState([])
  const [cat, setCat] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: CATEGORIES[0] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [replies, setReplies] = useState([])
  const [reply, setReply] = useState('')

  async function load() {
    let q = supabase
      .from('posts')
      .select('*, profiles:author_id(id, display_name, role_title, avatar_url), likes(count), comments(count)')
      .not('category', 'is', null)
      .order('created_at', { ascending: false })
    const { data } = await q
    setThreads(data || [])
  }

  useEffect(() => { load() }, [])

  const shown = cat ? threads.filter(t => t.category === cat) : threads

  async function createThread(e) {
    e.preventDefault()
    if (!session) return promptSignIn()
    setBusy(true); setError('')
    const { error } = await supabase.from('posts').insert({
      author_id: session.user.id,
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setShowNew(false)
    setForm({ title: '', body: '', category: CATEGORIES[0] })
    load()
  }

  async function openThread(t) {
    setOpen(t)
    const { data } = await supabase
      .from('comments').select('*, profiles:author_id(id, display_name, avatar_url)')
      .eq('post_id', t.id).order('created_at', { ascending: true })
    setReplies(data || [])
    setReply('')
  }

  async function submitReply(e) {
    e.preventDefault()
    if (!session) return promptSignIn()
    if (!reply.trim()) return
    const { data, error } = await supabase.from('comments')
      .insert({ post_id: open.id, author_id: session.user.id, body: reply.trim() })
      .select('*, profiles:author_id(id, display_name, avatar_url)').single()
    if (!error) {
      setReplies(r => [...r, data])
      setReply('')
      load()
    }
  }

  return (
    <div className="page">
      <header className="row-between" style={{ marginBottom: 6 }}>
        <h1>Forum</h1>
        <button className="btn" onClick={() => session ? setShowNew(true) : promptSignIn()}>+ New thread</button>
      </header>
      <p className="muted">Technical discussions, equipment advice and industry knowledge from the community.</p>

      <div className="forum-cats">
        <button className={'tab' + (cat === '' ? ' active' : '')} onClick={() => setCat('')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} className={'tab' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {shown.length === 0 && <div className="panel-empty">No threads here yet — start one!</div>}
      {shown.map(t => (
        <div className="thread-item" key={t.id} onClick={() => openThread(t)}>
          <div className="row-between">
            <h3>{t.title}</h3>
            <span className="badge badge-type">{t.category}</span>
          </div>
          <p className="muted" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
            {(t.body || '').slice(0, 140)}{(t.body || '').length > 140 ? '…' : ''}
          </p>
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
            {t.profiles?.display_name || 'Unknown'} · {timeAgo(t.created_at)} · {t.comments?.[0]?.count || 0} replies
          </p>
        </div>
      ))}

      {showNew && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false) }}>
          <div className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setShowNew(false)} aria-label="Close">&#10005;</button>
            <h2>Start a discussion</h2>
            <form onSubmit={createThread} style={{ marginTop: 18 }}>
              <div className="field">
                <label htmlFor="ft-cat">Category</label>
                <select id="ft-cat" className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ft-title">Title</label>
                <input id="ft-title" className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={140} />
              </div>
              <div className="field">
                <label htmlFor="ft-body">Details</label>
                <textarea id="ft-body" className="input" rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
              </div>
              {error && <p className="error-text">{error}</p>}
              <div className="modal-actions">
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post thread'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {open && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setOpen(null)} aria-label="Close">&#10005;</button>
            <span className="badge badge-type">{open.category}</span>
            <h2>{open.title}</h2>
            <div className="post-head" style={{ marginBottom: 14 }}>
              <Avatar profile={open.profiles} />
              <div>
                <div className="who">{open.profiles?.display_name || 'Unknown'}</div>
                <div className="sub">{timeAgo(open.created_at)}</div>
              </div>
            </div>
            <p className="post-body">{open.body}</p>
            <div className="modal-section">
              <h4>{replies.length} repl{replies.length === 1 ? 'y' : 'ies'}</h4>
              {replies.map(r => (
                <div className="comment" key={r.id}>
                  <Avatar profile={r.profiles} />
                  <div>
                    <div className="who">{r.profiles?.display_name || 'Unknown'} <span className="muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>· {timeAgo(r.created_at)}</span></div>
                    <div className="txt">{r.body}</div>
                  </div>
                </div>
              ))}
              {replies.length === 0 && <p className="muted">No replies yet.</p>}
            </div>
            <form className="comment-form" style={{ marginTop: 18 }} onSubmit={submitReply}>
              <input
                className="input"
                placeholder={session ? 'Write a reply…' : 'Sign in to reply'}
                value={reply}
                onChange={e => setReply(e.target.value)}
                disabled={!session}
              />
              <button className="btn btn-sm" type="submit" disabled={!session || !reply.trim()}>Reply</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
