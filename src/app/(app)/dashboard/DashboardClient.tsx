'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ConcertCard from '@/components/concerts/ConcertCard'
import ConcertForm from '@/components/concerts/ConcertForm'
import type { Database } from '@/types/database'

type Concert      = Database['public']['Tables']['concerts']['Row']
type UserConcert  = Database['public']['Tables']['user_concerts']['Row']
type Friendship   = Database['public']['Tables']['friendships']['Row']
type User         = Database['public']['Tables']['users']['Row']

type FriendSign = { displayName: string; status: 'going' | 'interested' }

interface Props { userId: string; displayName: string }

export default function DashboardClient({ userId, displayName }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [upcoming,        setUpcoming]        = useState<Concert[]>([])
  const [userConcerts,    setUserConcerts]    = useState<UserConcert[]>([])
  const [friendSignsMap,  setFriendSignsMap]  = useState<Record<string, FriendSign[]>>({})
  const [showForm,        setShowForm]        = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [deleteError,     setDeleteError]     = useState<string | null>(null)

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch('/api/delete-account', { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json()
      setDeleteError(body.error ?? 'Something went wrong.')
      setDeleting(false)
      return
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)

    // Fetch all user_concerts first, then use the IDs for the concerts query
    const { data: ucs } = await supabase
      .from('user_concerts')
      .select('*')
      .eq('user_id', userId)

    const safeUcs: UserConcert[] = ucs ?? []
    const markedIds = safeUcs.map((uc) => uc.concert_id)

    let cs: Concert[] = []
    if (markedIds.length) {
      const { data } = await supabase
        .from('concerts')
        .select('*')
        .in('id', markedIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(6)
      cs = data ?? []
    }

    // Fetch accepted friend IDs
    const fsResult = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')
    const friendships = (fsResult.data ?? []) as Friendship[]
    const friendIds = friendships.map((f) => f.user_id === userId ? f.friend_id : f.user_id)

    // Build friendSignsMap only when there are concerts and friends
    const map: Record<string, FriendSign[]> = {}
    if (cs.length && friendIds.length) {
      const concertIds = cs.map((c) => c.id)

      const [fucResult, uResult] = await Promise.all([
        supabase.from('user_concerts').select('*').in('user_id', friendIds).in('concert_id', concertIds),
        supabase.from('users').select('*').in('id', friendIds),
      ])
      const friendUCs   = (fucResult.data ?? []) as UserConcert[]
      const friendUsers = (uResult.data ?? []) as User[]
      const userMap     = Object.fromEntries(friendUsers.map((u) => [u.id, u]))

      for (const uc of friendUCs) {
        const u = userMap[uc.user_id]
        if (!u) continue
        if (!map[uc.concert_id]) map[uc.concert_id] = []
        map[uc.concert_id].push({
          displayName: u.display_name ?? u.email ?? 'Someone',
          status: uc.status as 'going' | 'interested',
        })
      }
    }

    setUpcoming(cs)
    setUserConcerts(safeUcs)
    setFriendSignsMap(map)
    setLoading(false)
  }, [supabase, userId, today])

  useEffect(() => { load() }, [load])

  const ucMap = Object.fromEntries(userConcerts.map((uc) => [uc.concert_id, uc]))

  const firstName = displayName.split(' ')[0]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hello, {firstName} 👋</h1>
        <p className="text-gray-500 mt-1 text-sm">Here are your upcoming concerts.</p>
      </div>

      {/* Quick add */}
      {showForm ? (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Add a concert</h2>
          <ConcertForm
            userId={userId}
            onSave={() => { setShowForm(false); load() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto btn-primary"
        >
          + Add concert
        </button>
      )}

      {/* Upcoming concerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Your upcoming concerts</h2>
          <Link href="/concerts" className="text-sm text-brand-600 hover:underline">View all →</Link>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">🎶</p>
            <p className="font-medium">No upcoming concerts marked.</p>
            <p className="text-sm mt-1">Add a concert and mark yourself as Going or Interested.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((c) => (
              <ConcertCard
                key={c.id}
                concert={c}
                userConcert={ucMap[c.id] ?? null}
                userId={userId}
                canEdit={c.created_by === userId}
                onChange={load}
                friendSigns={friendSignsMap[c.id]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLink href="/friends" emoji="👥" label="Manage friends" desc="Invite friends and accept requests" />
        <QuickLink href="/feed"    emoji="📡" label="Friend feed"    desc="See concerts friends are going to" />
        <QuickLink href="/notifications" emoji="🔔" label="Notifications" desc="Concert matches and friend requests" />
      </section>

      {/* Danger zone */}
      <section className="border border-red-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-red-700 text-sm">Danger zone</h2>
        {!confirmDelete ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Permanently delete your account, concert statuses, and friend connections.
            </p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-4 shrink-0 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Delete account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Are you sure? This cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 text-sm"
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={deleting}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function QuickLink({ href, emoji, label, desc }: { href: string; emoji: string; label: string; desc: string }) {
  return (
    <Link href={href} className="card p-4 hover:border-brand-300 hover:shadow-md transition-all group">
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="font-medium text-gray-900 group-hover:text-brand-700">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </Link>
  )
}
