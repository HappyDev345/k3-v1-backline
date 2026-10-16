import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ open, onClose }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else await signUp(email, password, displayName.trim(), username.trim().toLowerCase())
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">&#10005;</button>
        <h2>{mode === 'in' ? 'Welcome back' : 'Join BACKLINE'}</h2>
        <div className="tabs" style={{ margin: '14px 0 20px' }}>
          <button className={'tab' + (mode === 'in' ? ' active' : '')} onClick={() => setMode('in')}>Sign in</button>
          <button className={'tab' + (mode === 'up' ? ' active' : '')} onClick={() => setMode('up')}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'up' && (
            <>
              <div className="field">
                <label htmlFor="auth-name">Display name</label>
                <input id="auth-name" className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="auth-user">Username</label>
                <input id="auth-user" className="input" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="auth-pass">Password</label>
            <input id="auth-pass" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
          {mode === 'up' && <p className="hint" style={{ marginTop: 12 }}>If email confirmation is enabled in Supabase, check your inbox before signing in.</p>}
        </form>
      </div>
    </div>
  )
}
