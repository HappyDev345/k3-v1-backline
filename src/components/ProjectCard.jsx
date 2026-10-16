import Avatar from './Avatar'

export default function ProjectCard({ p, saved, onToggleSave, onOpen }) {
  const creator = p.profiles || {}
  return (
    <article className="card" onClick={() => onOpen(p)}>
      <div className="card-top">
        <div className="badges">
          <span className="badge badge-type">{p.type}</span>
          <span className={'badge ' + (p.compensation === 'Paid' ? 'badge-paid' : 'badge-vol')}>{p.compensation}</span>
        </div>
        <button
          className={'bookmark' + (saved ? ' saved' : '')}
          aria-label="Save project"
          onClick={(e) => { e.stopPropagation(); onToggleSave(p.id) }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
        </button>
      </div>
      <h3>{p.title}</h3>
      <p className="blurb">{(p.description || '').slice(0, 160)}{(p.description || '').length > 160 ? '…' : ''}</p>
      <div className="card-meta">
        <span>&#128205; {p.location}</span>
        <span>&#128197; {p.event_date || 'TBC'}</span>
        <span>&#128101; {p.spots || 1} spot{(p.spots || 1) > 1 ? 's' : ''}</span>
      </div>
      <div className="roles-needed">
        {(p.roles || []).map(r => <span key={r} className="role-chip">{r}</span>)}
      </div>
      <div className="card-creator">
        <Avatar profile={creator} />
        <div>
          <div className="name">{creator.display_name || 'Unknown'}</div>
          <div className="role">{creator.role_title || 'Creator'}</div>
        </div>
      </div>
    </article>
  )
}
