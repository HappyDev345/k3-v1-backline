import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/utils'
import Avatar from '../components/Avatar'

const LABELS = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  message: 'sent you a message',
}

export default function NotificationsPage({ promptSignIn }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles:actor_id(id, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
  }

  useEffect(() => { if (session) load() }, [session])

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false)
    window.dispatchEvent(new Event('backline:notifs-read'))
    load()
  }

  if (!session) {
    return (
      <div className="auth-prompt">
        <h2>Notifications</h2>
        <p>Sign in to see activity on your posts and projects.</p>
        <button className="btn" style={{ marginTop: 16 }} onClick={promptSignIn}>Sign in</button>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <header className="row-between" style={{ marginBottom: 20 }}>
        <h1>Notifications</h1>
        {notifs.some(n => !n.read) && <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>}
      </header>
      {notifs.length === 0 && <div className="panel-empty">Nothing yet — interactions will show up here.</div>}
      {notifs.map(n => (
        <div
          key={n.id}
          className={'notif-item' + (n.read ? '' : ' unread')}
          style={{ cursor: n.type === 'message' ? 'pointer' : 'default' }}
          onClick={() => { if (n.type === 'message') navigate('/messages', { state: { open: n.ref_id } }) }}
        >
          <Avatar profile={n.profiles} />
          <div className="txt">
            <b>{n.profiles?.display_name || 'Someone'}</b> {LABELS[n.type] || 'interacted with you'}
          </div>
          <span className="time">{timeAgo(n.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
