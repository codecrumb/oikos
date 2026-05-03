import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still loading, null = signed out, object = signed in
  const [session, setSession] = useState(undefined)
  const [member, setMember] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadMember(session.user.id)
      else setMember(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadMember(session.user.id)
      } else {
        setMember(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadMember(userId) {
    const { data } = await supabase
      .from('members')
      .select('*, household:households(*)')
      .eq('id', userId)
      .maybeSingle()
    setMember(data)
  }

  async function refreshMember() {
    if (session) await loadMember(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, member, refreshMember }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
