import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/utils'
import Avatar from './Avatar'

export default function PostCard({ post, liked, onLike, promptSignIn }) {
  const { session, profile } = useAuth()
  const author = post.profiles || {}
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [body, setBody] = useState('')
  const [count, setCount] = useState(post.comments?.[0]?.count || 0)

  const likeCount = post.likes?.[0]?.count || 0

  async function toggleComments() {
    if (!expanded && !loaded) {
      const { data } = await supabase
        .from('comments').select('*, profiles:author_id(id, display_name, avatar_url)')
        .eq('post_id', post.id).order('created_at', { ascending: true })
      setComments(data || [])
      setLoaded(true)
    }
    setExpanded(!expanded)
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!session) return promptSignIn()
    if (!body.trim()) return
    const { data, error } = await supabase.from('comments')
      .insert({ post_id: post.id, author_id: session.user.id, body: body.trim() })
      .select('*, profiles:author_id(id, display_name, avatar_url)').single()
    if (!error) {
      setComments(c => [...c, data])
      setCount(c => c + 1)
      setBody('')
    }
  }

  return (
    <article className="post-card">
      <div className="post-head">
        <Link to={'/profile/' + author.id}><Avatar profile={author} /></Link>
        <div>
          <Link to={'/profile/' + author.id} style={{ textDecoration: 'none' }}><div className="who">{author.display_name || 'Unknown'}</div></Link>
          <div className="sub">{author.role_title ? author.role_title + ' · ' : ''}{timeAgo(post.created_at)}</div>
        </div>
      </div>
      {post.title && <h3 className="post-title">{post.title}</h3>}
      <p className="post-body">{post.body}</p>
      <div className="post-actions">
        <button className={'action-btn' + (liked ? ' liked' : '')} onClick={() => onLike(post)}>
          {liked ? '\u2665' : '\u2661'} Like {likeCount > 0 && '(' + likeCount + ')'}
        </button>
        <button className="action-btn" onClick={toggleComments}>
          &#128172; Comments ({count})
        </button>
      </div>
      {expanded && (
        <div className="comments">
          {comments.map(c => (
            <div className="comment" key={c.id}>
              <Avatar profile={c.profiles} />
              <div>
                <div className="who">{c.profiles?.display_name || 'Unknown'}</div>
                <div className="txt">{c.body}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="muted" style={{ padding: '8px 0' }}>No comments yet — start the discussion.</p>}
          <form className="comment-form" onSubmit={submitComment}>
            <input
              className="input"
              placeholder={session ? 'Write a comment…' : 'Sign in to comment'}
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={!session}
            />
            <button className="btn btn-sm" type="submit" disabled={!session || !body.trim()}>Post</button>
          </form>
        </div>
      )}
    </article>
  )
}
