import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { findOrCreateConversation } from '../lib/conversations'
import Avatar from '../components/Avatar'

export default function PeoplePage({ promptSignIn }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [people, setPeople] = useState([])
  const [followingSet, setFollowingSet] = useState(new Set())
  const [query, setQuery] = useState('')
  const [busyMsg, setBusyMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
    setPeople(data || [])
    if (session) {
      const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', session.user.id)
      setFollowingSet(new Set((follows || []).map(f => f.followee_id)))
    }
  }

  useEffect(() => { load() }, [session])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people.filter(p =>
      !q ||
      (p.display_name || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.role_title || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.skills || []).some(s => s.toLowerCase().includes(q))
    )
  }, [people, query])

  async function toggleFollow(id) {
    if (!session) return promptSignIn()
    if (followingSet.has(id)) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('followee_id', id)
      setFollowingSet(s => { const n = new Set(s); n.delete(id); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, followee_id: id })
      setFollowingSet(s => new Set(s).add(id))
    }
  }

  async function message(id) {
    if (!session) return promptSignIn()
    setBusyMsg('Opening conversation…')
    try {
      const convId = await findOrCreateConversation(supabase, session.user.id, id)
      navigate('/messages', { state: { open: convId } })
    } catch (e) {
      setBusyMsg('Could not open conversation: ' + e.message)
    }
  }

  return (
    <div className="page">
      <header className="row-between" style={{ marginBottom: 20 }}>
        <h1>People</h1>
        <div className="search-box" style={{ maxWidth: 380, width: '100%' }}>
          <input type="search" placeholder="Search by name, role, skill, location…"
            value={query} onChange={e => setQuery(e.target.value)} aria-label="Search people" />
        </div>
      </header>
      {busyMsg && <p className="hint" style={{ marginBottom: 12 }}>{busyMsg}</p>}
      {shown.length === 0 && <div className="panel-empty">No people found. Invite your crew to join BACKLINE!</div>}
      {shown.map(p => (
        <div className="people-row" key={p.id}>
          <Link to={'/profile/' + p.id}><Avatar profile={p} size="lg" /></Link>
          <div className="info">
            <Link to={'/profile/' + p.id} style={{ textDecoration: 'none' }}>
              <div className="name">{p.display_name || 'Unnamed user'}</div>
            </Link>
            <div className="sub">
              {p.role_title && p.role_title + ' · '}{p.location || 'Location not set'}
              {p.username ? ' · @' + p.username : ''}
            </div>
            {(p.skills || []).length > 0 && (
              <div className="skill-chips">
                {p.skills.map(s => <span key={s} className="role-chip">{s}</span>)}
              </div>
            )}
          </div>
          {session && p.id !== session.user.id && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => message(p.id)}>Message</button>
              <button className="btn btn-sm" onClick={() => toggleFollow(p.id)}>
                {followingSet.has(p.id) ? 'Following ✓' : 'Follow'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
