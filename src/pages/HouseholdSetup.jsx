import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function HouseholdSetup() {
  const navigate = useNavigate()
  const { refreshMember } = useAuth()
  const [mode, setMode] = useState('create')
  const [householdName, setHouseholdName] = useState('')
  const [householdId, setHouseholdId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!householdName.trim()) return
    setError('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('create_household', {
      p_name: householdName.trim(),
    })

    if (rpcError) { setError(rpcError.message); setLoading(false); return }

    await refreshMember()
    navigate('/')
  }

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = householdId.trim()
    if (!trimmed) return
    setError('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('join_household', {
      p_household_id: trimmed,
    })

    if (rpcError) { setError(rpcError.message); setLoading(false); return }

    await refreshMember()
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1 className="login-hero__title">Welcome to Oikos</h1>
        <p className="login-hero__tagline">Set up your household to get started.</p>
      </div>

      <div className="login-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            className={`btn ${mode === 'create' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMode('create')}
            style={{ flex: 1 }}
          >
            Create
          </button>
          <button
            className={`btn ${mode === 'join' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMode('join')}
            style={{ flex: 1 }}
          >
            Join
          </button>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        {mode === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="label" htmlFor="household-name">Household name</label>
              <input
                id="household-name"
                className="input"
                type="text"
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                placeholder="e.g. The Feldmans"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn--primary login-form__submit" disabled={loading}>
              {loading && <span className="login-spinner" aria-hidden />}
              {loading ? 'Creating…' : 'Create & continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="label" htmlFor="household-id">Household ID</label>
              <input
                id="household-id"
                className="input"
                type="text"
                value={householdId}
                onChange={e => setHouseholdId(e.target.value)}
                placeholder="Paste the ID shared by your admin"
                required
                autoFocus
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                Ask your household admin to share the ID from Settings → Members.
              </span>
            </div>
            <button type="submit" className="btn btn--primary login-form__submit" disabled={loading}>
              {loading && <span className="login-spinner" aria-hidden />}
              {loading ? 'Joining…' : 'Join household'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
