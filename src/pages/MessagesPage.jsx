import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/utils'
import Avatar from '../components/Avatar'

export default function MessagesPage({ promptSignIn }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(location.state?.open || null)
  const [others, setOthers] = useState({})
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { if (session) loadConvs() }, [session])

  useEffect(() => {
    if (!active) return
    loadMsgs()
    const ch = supabase.channel('conv-' + active)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + active },
        (payload) => {
          setMsgs(curr => curr.some(m => m.id === payload.new.id) ? curr : [...curr, payload.new])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function loadConvs() {
    const { data: mem } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', session.user.id)
    const ids = (mem || []).map(r => r.conversation_id)
    if (!ids.length) return
    const { data: allMem } = await supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', ids)
    const otherIds = [...new Set((allMem || []).filter(m => m.user_id !== session.user.id).map(m => m.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherIds)
    const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const { data: lastMsgs } = await supabase.from('messages').select('conversation_id, body, created_at').in('conversation_id', ids).order('created_at', { ascending: false })
    const lastByConv = {}
    for (const m of lastMsgs || []) if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m
    const otherByConv = {}
    for (const m of allMem || []) if (m.user_id !== session.user.id) otherByConv[m.conversation_id] = profMap[m.user_id]
    const list = ids
      .map(id => ({ id, other: otherByConv[id], last: lastByConv[id] }))
      .filter(c => c.other)
      .sort((a, b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0))
    setOthers(Object.fromEntries(list.map(c => [c.id, c.other])))
    setConvs(list)
    if (!active && list.length) setActive(list[0].id)
  }

  async function loadMsgs() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(id, display_name, avatar_url)')
      .eq('conversation_id', active)
      .order('created_at', { ascending: true })
    setMsgs(data || [])
  }

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || !session) return
    const { error } = await supabase.from('messages').insert({
      conversation_id: active,
      sender_id: session.user.id,
      body: text.trim(),
    })
    if (!error) setText('')
  }

  if (!session) {
    return (
      <div className="auth-prompt">
        <h2>Messages</h2>
        <p>Sign in to start conversations with other creatives.</p>
        <button className="btn" style={{ marginTop: 16 }} onClick={promptSignIn}>Sign in</button>
      </div>
    )
  }

  return (
    <div className="messages-wrap">
      <aside className="conv-list">
        {convs.length === 0 && (
          <div className="panel-empty">
            No conversations yet.<br />Find people on the People page and say hello.
          </div>
        )}
        {convs.map(c => (
          <div key={c.id} className={'conv-item' + (active === c.id ? ' active' : '')} onClick={() => setActive(c.id)}>
            <Avatar profile={c.other} />
            <div style={{ minWidth: 0 }}>
              <div className="name">{c.other.display_name || 'Unknown'}</div>
              <div className="preview">{c.last ? c.last.body : 'Start the conversation'}</div>
            </div>
          </div>
        ))}
      </aside>

      <section className="thread-panel">
        {active ? (
          <>
            <div className="thread-head">{others[active]?.display_name || 'Conversation'}</div>
            <div className="msgs">
              {msgs.map(m => (
                <div key={m.id} className={'msg' + (m.sender_id === session.user.id ? ' mine' : '')}>
                  {m.sender_id !== session.user.id && (
                    <div className="meta">{m.profiles?.display_name || ''} · {timeAgo(m.created_at)}</div>
                  )}
                  {m.body}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="msg-form" onSubmit={send}>
              <input
                className="input"
                placeholder={'Message ' + (others[active]?.display_name || '') + '…'}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>
        ) : (
          <div className="panel-empty" style={{ margin: 'auto' }}>Select a conversation to view messages.</div>
        )}
      </section>
    </div>
  )
}
