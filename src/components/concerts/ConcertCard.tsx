'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConcertForm from './ConcertForm'
import StatusToggle from './StatusToggle'
import type { Database } from '@/types/database'

type Concert      = Database['public']['Tables']['concerts']['Row']
type UserConcert  = Database['public']['Tables']['user_concerts']['Row']

interface FriendSign {
  displayName: string
  status: 'going' | 'interested'
}

interface Props {
  concert:      Concert
  userConcert:  UserConcert | null
  userId:       string
  canEdit:      boolean
  onChange:     () => void
  friendSigns?: FriendSign[]
}

export default function ConcertCard({ concert, userConcert, userId, canEdit, onChange, friendSigns }: Props) {
  const supabase       = createClient()
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dateFormatted = new Date(concert.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

  async function handleDelete() {
    if (!confirm(`Delete "${concert.title}"? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('concerts').delete().eq('id', concert.id)
    onChange()
  }

  if (editing) {
    return (
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-4">Edit concert</h3>
        <ConcertForm
          userId={userId}
          concert={concert}
          onSave={() => { setEditing(false); onChange() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{concert.title}</p>
          <p className="text-sm text-brand-600 font-medium truncate">{concert.artist}</p>
        </div>
        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="btn-ghost px-2 py-1 text-xs"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-sm text-gray-500">
        <span>📅 {dateFormatted}</span>
        <span className="hidden sm:inline">·</span>
        <span>📍 {concert.location}</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
        <StatusToggle
          userId={userId}
          concertId={concert.id}
          initialStatus={(userConcert?.status as 'going' | 'interested' | null) ?? null}
        />
        {concert.ticket_url && (
          <a
            href={concert.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 underline underline-offset-2 hover:text-brand-800"
          >
            Tickets ↗
          </a>
        )}
      </div>

      {friendSigns && friendSigns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
          {friendSigns.map(({ displayName, status }) => (
            <span
              key={displayName}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                status === 'going'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-yellow-50 text-yellow-800 border-yellow-200'
              }`}
            >
              {displayName} · {status}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
