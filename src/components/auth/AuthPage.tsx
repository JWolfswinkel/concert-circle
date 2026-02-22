'use client'

import { useState } from 'react'
import SignInForm from './SignInForm'
import SignUpForm from './SignUpForm'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white text-2xl mb-4">
            🎵
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ConcertCircle</h1>
          <p className="mt-1 text-gray-500 text-sm">
            See which concerts your friends are going to — without the group chat noise.
          </p>
        </div>

        <div className="card p-6">
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create account
            </button>
          </div>

          {mode === 'signin' ? <SignInForm /> : <SignUpForm onSuccess={() => setMode('signin')} />}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
