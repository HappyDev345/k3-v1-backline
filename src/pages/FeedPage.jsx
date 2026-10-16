import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import Avatar from '../components/Avatar'

export default function FeedPage({ promptSignIn }) {
  const { session, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [likedSet, setLikedSet] = useState(new Set())
  const [followingSet, setFollowingSet] = useState(new Set())
  const [tab, setTab] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles:author_id(id, display_name, role_title, avatar_url), likes(count), comments(count)')
      .is('category', null)
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data || [])
    if (session) {
      const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', session.user.id)
      setLikedSet(new Set((likes || []).map(l => l.post_id)))
      const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', session.user.id)
      setFollowingSet(new Set((follows || []).map(f => f.followee_id)))
    }
  }

  useEffect(() => { load() }, [session])

  async function publish(e) {
    e.preventDefault()
    if (!session) return promptSignIn()
    setBusy(true)
    const { data, error } = await supabase.from('posts')
      .insert({ author_id: session.user.id, title: title.trim() || null, body: body.trim() })
      .select('*, profiles:author_id(id, display_name, role_title, avatar_url), likes(count), comments(count)')
      .single()
    setBusy(false)
    if (!error) {
      setPosts(p => [data, ...p])
      setTitle(''); setBody('')
    }
  }

  async function toggleLike(post) {
    if (!session) return promptSignIn()
    const id = post.id
    if (likedSet.has(id)) {
      await supabase.from('likes').delete().eq('post_id', id).eq('user_id', session.user.id)
      setLikedSet(s => { const n = new Set(s); n.delete(id); return n })
      setPosts(ps => ps.map(p => p.id === id ? { ...p, likes: [{ count: Math.max(0, (p.likes?.[0]?.count || 1) - 1) }] } : p))
    } else {
      await supabase.from('likes').insert({ post_id: id, user_id: session.user.id })
      setLikedSet(s => new Set(s).add(id))
      setPosts(ps => ps.map(p => p.id === id ? { ...p, likes: [{ count: (p.likes?.[0]?.count || 0) + 1 }] } : p))
    }
  }

  const shown = tab === 'all' ? posts : posts.filter(p => followingSet.has(p.author_id))

  return (
    <div className="page">
      <header className="row-between" style={{ marginBottom: 22 }}>
        <h1>Feed</h1>
        <div className="tabs">
          <button className={'tab' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>Everyone</button>
          <button className={'tab' + (tab === 'following' ? ' active' : '')} onClick={() => setTab('following')}>Following</button>
        </div>
      </header>

      <form className="composer" onSubmit={publish}>
        <div className="composer-top">
          {session ? <Avatar profile={profile} /> : <span className="avatar">?</span>}
          <textarea
            className="input"
            rows={3}
            placeholder={session ? 'Share a production, a tip, a question…' : 'Sign in to share your work'}
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={!session}
          />
        </div>
        <div className="row-between">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!session}
          />
          <button className="btn" type="submit" disabled={!session || !body.trim() || busy}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {shown.length === 0 && (
        <div className="panel-empty">
          {tab === 'following'
            ? 'No posts from people you follow yet — visit the People page to build your network.'
            : 'No posts yet. Be the first to share something!'}
        </div>
      )}
      {shown.map(p => (
        <PostCard key={p.id} post={p} liked={likedSet.has(p.id)} onLike={toggleLike} promptSignIn={promptSignIn} />
      ))}
    </div>
  )
}
