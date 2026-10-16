import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'

export default function NavBar({ onSignIn }) {
  const { session, profile, signOut } = useAuth()
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) { setUnread(0); return }
    async function loadCount() {
      const { count } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id).eq('read', false)
      setUnread(count || 0)
    }
    loadCount()
    const recalc = () => loadCount()
    window.addEventListener('backline:notifs-read', recalc)
    const ch = supabase.channel('notif-count')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        () => setUnread(u => u + 1))
      .subscribe()
    return () => {
      window.removeEventListener('backline:notifs-read', recalc)
      supabase.removeChannel(ch)
    }
  }, [session])

  return (
    <nav className="nav">
      <NavLink to="/" className="brand"><span className="brand-mark">B</span>BACKLINE</NavLink>
      <div className="nav-links">
        <NavLink to="/" end>Feed</NavLink>
        <NavLink to="/discover">Discover</NavLink>
        <NavLink to="/people">People</NavLink>
        <NavLink to="/forum">Forum</NavLink>
        <NavLink to="/messages">Messages</NavLink>
        <NavLink to="/notifications" className="bell-wrap">
          &#128276;
          {unread > 0 && <span className="badge-dot">{unread}</span>}
        </NavLink>
      </div>
      {session && profile ? (
        <div className="nav-user">
          <NavLink to={'/profile/' + profile.id}><Avatar profile={profile} /></NavLink>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
        </div>
      ) : (
        <button className="btn btn-sm" onClick={onSignIn}>Sign in</button>
      )}
    </nav>
  )
}
