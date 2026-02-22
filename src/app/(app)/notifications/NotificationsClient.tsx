'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface Props { userId: string }

function formatPayload(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'friend_request':
      return `${payload.from_name ?? 'Someone'} sent you a friend request.`
    case 'friend_accepted':
      return `${payload.from_name ?? 'Someone'} accepted your friend request.`
    case 'concert_match':
      return `${payload.actor_id ? 'A friend' : 'Someone'} is also ${payload.actor_status} for ${payload.concert_artist} – ${payload.concert_title}.`
    default:
      return JSON.stringify(payload)
  }
}

export default function NotificationsClient({ userId }: Props) {
  const supabase = createClient()
  const [notifs,   setNotifs]   = useState<Notification[]>([])
  const [loading,  setLoading]  = useState(true)
  const [marking,  setMarking]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setNotifs(data ?? [])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => { load() }, [load])

  async function markAllRead() {
    setMarking(true)
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    await load()
    setMarking(false)
  }

  async function markOneRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="btn-secondary text-sm"
          >
            {marking ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : notifs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">🔔</p>
          <p className="font-medium">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const payload = (typeof n.payload === 'object' && n.payload && !Array.isArray(n.payload))
              ? n.payload as Record<string, unknown>
              : {}
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markOneRead(n.id)}
                className={`card p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  n.is_read ? 'opacity-60' : 'hover:border-brand-300'
                }`}
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-brand-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                    {formatPayload(n.type, payload)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {n.type === 'concert_match' && !!payload.concert_artist && (
                  <span className="badge-going shrink-0">Match</span>
                )}
                {n.type === 'friend_request' && (
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800 shrink-0">
                    Request
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
