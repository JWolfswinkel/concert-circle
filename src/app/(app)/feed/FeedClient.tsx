'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusToggle from '@/components/concerts/StatusToggle'
import type { Database } from '@/types/database'

type Concert     = Database['public']['Tables']['concerts']['Row']
type UserConcert = Database['public']['Tables']['user_concerts']['Row']
type Friendship  = Database['public']['Tables']['friendships']['Row']
type User        = Database['public']['Tables']['users']['Row']

interface FeedItem {
  concert:     Concert
  myStatus:    'going' | 'interested' | null
  friendSigns: { user: User; status: 'going' | 'interested' }[]
}

interface Props { userId: string }

export default function FeedClient({ userId }: Props) {
  const supabase = createClient()
  const [items,   setItems]   = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)

    // 1. Find accepted friend IDs
    const fsResult = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')
    const rawFriendships = (fsResult.data ?? []) as Friendship[]

    const friendIds = rawFriendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    )

    if (friendIds.length === 0) { setItems([]); setLoading(false); return }

    // 2. Get friends' user_concert rows for upcoming concerts
    const fucResult = await supabase
      .from('user_concerts')
      .select('*')
      .in('user_id', friendIds)
    const friendUCs = (fucResult.data ?? []) as UserConcert[]

    if (!friendUCs.length) { setItems([]); setLoading(false); return }

    const concertIds = [...new Set(friendUCs.map((uc) => uc.concert_id))]

    // 3. Fetch those concerts (upcoming)
    const cResult = await supabase
      .from('concerts')
      .select('*')
      .in('id', concertIds)
      .gte('date', today)
      .order('date', { ascending: true })
    const concerts = (cResult.data ?? []) as Concert[]

    if (!concerts.length) { setItems([]); setLoading(false); return }

    // 4. Get current user's statuses
    const myResult = await supabase
      .from('user_concerts')
      .select('*')
      .eq('user_id', userId)
      .in('concert_id', concertIds)
    const myUCs = (myResult.data ?? []) as UserConcert[]

    // 5. Fetch friend user profiles
    const uResult = await supabase
      .from('users')
      .select('*')
      .in('id', friendIds)
    const friendUsers = (uResult.data ?? []) as User[]

    const userMap  = Object.fromEntries(friendUsers.map((u) => [u.id, u]))
    const myUCMap  = Object.fromEntries(myUCs.map((uc) => [uc.concert_id, uc]))

    const feed: FeedItem[] = concerts.map((c) => ({
      concert:     c,
      myStatus:    (myUCMap[c.id]?.status as 'going' | 'interested' | null) ?? null,
      friendSigns: friendUCs
        .filter((uc) => uc.concert_id === c.id)
        .map((uc) => ({ user: userMap[uc.user_id], status: uc.status as 'going' | 'interested' }))
        .filter((x) => x.user),
    }))

    setItems(feed)
    setLoading(false)
  }, [supabase, userId, today])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Friend Feed</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upcoming concerts your friends are going to or interested in.</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📡</p>
          <p className="font-medium">Nothing in your feed yet.</p>
          <p className="text-sm mt-1">Link with friends and see which concerts they&apos;re going to.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedCard key={item.concert.id} item={item} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedCard({ item, userId }: { item: FeedItem; userId: string }) {
  const { concert, myStatus, friendSigns } = item

  const dateFormatted = new Date(concert.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{concert.title}</p>
          <p className="text-sm text-brand-600 font-medium">{concert.artist}</p>
        </div>
        <StatusToggle
          userId={userId}
          concertId={concert.id}
          initialStatus={myStatus}
        />
      </div>

      <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>📅 {dateFormatted}</span>
        <span>📍 {concert.location}</span>
      </div>

      {/* Friend indicators */}
      <div className="flex flex-wrap gap-2">
        {friendSigns.map(({ user, status }) => (
          <span
            key={user.id}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              status === 'going'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-yellow-50 text-yellow-800 border-yellow-200'
            }`}
          >
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center text-[8px]">
                {(user.display_name ?? user.email ?? '?')[0]}
              </span>
            )}
            {user.display_name ?? user.email} · {status}
          </span>
        ))}
      </div>

      {concert.ticket_url && (
        <a
          href={concert.ticket_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 underline underline-offset-2 hover:text-brand-800"
        >
          View tickets ↗
        </a>
      )}
    </div>
  )
}
