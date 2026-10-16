import { initials } from '../lib/utils'

export default function Avatar({ profile, size }) {
  return (
    <span className={size === 'lg' ? 'avatar-lg' : 'avatar'}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile?.display_name)}
    </span>
  )
}
