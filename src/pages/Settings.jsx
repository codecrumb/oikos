import { useState, useEffect } from 'react'
import { Copy, Check, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]

export default function Settings() {
  const { member, session, refreshMember } = useAuth()
  const [members, setMembers] = useState([])
  const [displayName, setDisplayName] = useState(member?.display_name ?? '')
  const [avatarColor, setAvatarColor] = useState(member?.avatar_color ?? '#6366f1')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!member?.household_id) return
    supabase
      .from('members')
      .select('id, display_name, avatar_color, role')
      .eq('household_id', member.household_id)
      .then(({ data }) => setMembers(data ?? []))
  }, [member?.household_id])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('members')
      .update({ display_name: displayName.trim(), avatar_color: avatarColor })
      .eq('id', session.user.id)
    await refreshMember()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function copyHouseholdId() {
    navigator.clipboard.writeText(member.household_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      {/* Profile */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Your profile</h2>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="label" htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Avatar colour</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: color,
                    border: avatarColor === color ? '3px solid var(--color-text)' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </section>

      {/* Household */}
      {member?.household && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            Household · {member.household.name}
          </h2>

          <div className="form-group">
            <label className="label">Household ID</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                value={member.household_id}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={copyHouseholdId}
                style={{ flexShrink: 0 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, display: 'block' }}>
              Share this ID with family members so they can join your household.
            </span>
          </div>

          <h3 className="section-title" style={{ marginTop: 16, marginBottom: 8 }}>Members</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: m.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-sm)',
                  flexShrink: 0,
                }}>
                  {m.display_name[0].toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  {m.display_name}
                  {m.id === session.user.id && (
                    <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>(you)</span>
                  )}
                </span>
                <span style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                  background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)',
                  padding: '2px 8px',
                }}>
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sign out */}
      <section className="card">
        <button className="btn btn--danger" onClick={handleSignOut} style={{ width: '100%' }}>
          <LogOut size={16} aria-hidden />
          Sign out
        </button>
      </section>
    </div>
  )
}
