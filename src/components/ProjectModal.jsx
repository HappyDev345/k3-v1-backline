import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { findOrCreateConversation } from '../lib/conversations'
import Avatar from './Avatar'

export default function ProjectModal({ p, onClose, promptSignIn }) {
  const { session, profile } = useAuth()
  const creator = p.profiles || {}
  const [interestSent, setInterestSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function expressInterest() {
    if (!session) return promptSignIn()
    setBusy(true); setError('')
    try {
      const convId = await findOrCreateConversation(supabase, session.user.id, creator.id)
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: session.user.id,
        body: 'Hi! I found "' + p.title + '" on Discover and I would like to express interest. Here is my profile: ' + (profile.display_name || ''),
      })
      if (msgErr) throw msgErr
      setInterestSent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">&#10005;</button>
        <div className="badges">
          <span className="badge badge-type">{p.type}</span>
          <span className={'badge ' + (p.compensation === 'Paid' ? 'badge-paid' : 'badge-vol')}>{p.compensation}</span>
        </div>
        <h2>{p.title}</h2>
        <div className="card-meta">
          <span>&#128205; {p.location}</span>
          <span>&#128197; {p.event_date || 'TBC'}</span>
          <span>&#128101; {p.spots || 1} open role{(p.spots || 1) > 1 ? 's' : ''}</span>
        </div>
        <div className="modal-section">
          <h4>About this project</h4>
          <p className="desc">{p.description}</p>
        </div>
        <div className="modal-section">
          <h4>Roles needed</h4>
          <div className="roles-needed">{(p.roles || []).map(r => <span key={r} className="role-chip">{r}</span>)}</div>
        </div>
        {(p.tags || []).length > 0 && (
          <div className="modal-section">
            <h4>Tags</h4>
            <div className="tags">{(p.tags || []).map(t => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        )}
        <div className="modal-section">
          <h4>Posted by</h4>
          <div className="creator-box">
            <Avatar profile={creator} />
            <div>
              <div className="name">{creator.display_name || 'Unknown'}</div>
              <div className="sub">{creator.role_title || 'Creator'}{creator.location ? ' · ' + creator.location : ''}</div>
            </div>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={expressInterest} disabled={busy || interestSent || creator.id === session?.user?.id}>
            {interestSent ? 'Interest sent \u2713' : creator.id === session?.user?.id ? 'Your project' : 'Express interest'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {interestSent && <p className="hint" style={{ marginTop: 12 }}>A conversation was opened with the project creator — check Messages.</p>}
      </div>
    </div>
  )
}
