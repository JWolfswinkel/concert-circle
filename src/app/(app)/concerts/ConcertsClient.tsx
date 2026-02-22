'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConcertCard from '@/components/concerts/ConcertCard'
import ConcertForm from '@/components/concerts/ConcertForm'
import type { Database } from '@/types/database'

type Concert     = Database['public']['Tables']['concerts']['Row']
type UserConcert = Database['public']['Tables']['user_concerts']['Row']

interface Props { userId: string }

export default function ConcertsClient({ userId }: Props) {
  const supabase = createClient()

  const [concerts,     setConcerts]     = useState<Concert[]>([])
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([])
  const [showForm,     setShowForm]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<'all' | 'mine'>('all')

  const load = useCallback(async () => {
    setLoading(true)

    const [{ data: cs }, { data: ucs }] = await Promise.all([
      supabase
        .from('concerts')
        .select('*')
        .order('date', { ascending: true }),
      supabase
        .from('user_concerts')
        .select('*')
        .eq('user_id', userId),
    ])

    setConcerts(cs ?? [])
    setUserConcerts(ucs ?? [])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => { load() }, [load])

  const displayed = filter === 'mine'
    ? concerts.filter((c) => userConcerts.some((uc) => uc.concert_id === c.id))
    : concerts

  const ucMap = Object.fromEntries(userConcerts.map((uc) => [uc.concert_id, uc]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">All concerts you can see, including friends&apos; picks.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add concert
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'mine'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'All concerts' : 'My concerts'}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Add a concert</h2>
          <ConcertForm
            userId={userId}
            onSave={() => { setShowForm(false); load() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">🎶</p>
          <p className="font-medium">No concerts yet.</p>
          <p className="text-sm mt-1">
            {filter === 'mine'
              ? 'Mark a concert as Going or Interested to see it here.'
              : 'Add the first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((c) => (
            <ConcertCard
              key={c.id}
              concert={c}
              userConcert={ucMap[c.id] ?? null}
              userId={userId}
              canEdit={c.created_by === userId}
              onChange={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
