'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Alert from '@/components/ui/Alert'

interface Props {
  onSuccess: () => void
}

export default function SignUpForm({ onSuccess }: Props) {
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">📬</div>
        <h2 className="font-semibold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-500">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <button onClick={onSuccess} className="btn-secondary w-full">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-3">
      {error && <Alert type="error">{error}</Alert>}

      <div>
        <label htmlFor="display-name" className="label">Display name</label>
        <input
          id="display-name"
          type="text"
          required
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className="label">Email address</label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="label">Password</label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
