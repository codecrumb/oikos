import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function HouseholdSetup() {
  const navigate = useNavigate()
  const { refreshMember } = useAuth()
  const [householdName, setHouseholdName] = useState('')
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

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    await refreshMember()
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1 className="login-hero__title">Welcome to Oikos</h1>
        <p className="login-hero__tagline">Name your household to get started.</p>
      </div>

      <div className="login-card">
        {error && <div className="login-error" role="alert">{error}</div>}

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
          <button
            type="submit"
            className="btn btn--primary login-form__submit"
            disabled={loading}
          >
            {loading && <span className="login-spinner" aria-hidden />}
            {loading ? 'Creating…' : 'Create & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
