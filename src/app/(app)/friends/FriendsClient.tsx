'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Alert from '@/components/ui/Alert'
import type { Database } from '@/types/database'

type Friendship = Database['public']['Tables']['friendships']['Row']
type User       = Database['public']['Tables']['users']['Row']

interface FriendRow {
  friendship: Friendship
  other: User
}

interface Props { userId: string }

export default function FriendsClient({ userId }: Props) {
  const supabase = createClient()

  const [friends,  setFriends]  = useState<FriendRow[]>([])
  const [pending,  setPending]  = useState<FriendRow[]>([])   // incoming pending
  const [outgoing, setOutgoing] = useState<FriendRow[]>([])   // sent pending
  const [loading,  setLoading]  = useState(true)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [inviteMsg,   setInviteMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const fsResult = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    const rows = (fsResult.data ?? []) as Friendship[]

    if (!rows.length) {
      setFriends([])
      setPending([])
      setOutgoing([])
      setLoading(false)
      return
    }

    // Collect all other user IDs
    const otherIds = [...new Set(
      rows.map((r) => (r.user_id === userId ? r.friend_id : r.user_id))
    )]

    const uResult = await supabase.from('users').select('*').in('id', otherIds)
    const usersData = (uResult.data ?? []) as User[]

    const userMap = Object.fromEntries(usersData.map((u) => [u.id, u]))

    const accepted: FriendRow[] = []
    const pend:     FriendRow[] = []
    const out:      FriendRow[] = []

    for (const f of rows) {
      const otherId = f.user_id === userId ? f.friend_id : f.user_id
      const other   = userMap[otherId]
      if (!other) continue

      if (f.status === 'accepted') {
        accepted.push({ friendship: f, other })
      } else if (f.status === 'pending') {
        if (f.friend_id === userId) {
          pend.push({ friendship: f, other }) // incoming
        } else {
          out.push({ friendship: f, other })  // outgoing
        }
      }
    }

    setFriends(accepted)
    setPending(pend)
    setOutgoing(out)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)

    // Look up the user by email
    const targetResult = await supabase
      .from('users')
      .select('*')
      .eq('email', inviteEmail.toLowerCase().trim())
      .maybeSingle()
    const target = targetResult.data as User | null

    if (!target) {
      setInviteMsg({ type: 'error', text: 'No account found with that email address. They must sign up first.' })
      setInviting(false)
      return
    }

    if (target.id === userId) {
      setInviteMsg({ type: 'error', text: 'You cannot invite yourself.' })
      setInviting(false)
      return
    }

    const { error } = await supabase
      .from('friendships')
      .insert({ user_id: userId, friend_id: target.id })

    if (error) {
      if (error.code === '23505') {
        setInviteMsg({ type: 'error', text: 'You have already sent a request to this person.' })
      } else {
        setInviteMsg({ type: 'error', text: error.message })
      }
    } else {
      setInviteMsg({ type: 'success', text: `Invite sent to ${target.display_name ?? inviteEmail}!` })
      setInviteEmail('')
      load()
    }

    setInviting(false)
  }

  async function respondToRequest(friendshipId: string, accept: boolean) {
    await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', friendshipId)
    load()
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Friends</h1>

      {/* Invite form */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Invite a friend</h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter their email address. They must already have a ConcertCircle account.
        </p>
        <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
          <input
            type="email"
            required
            className="input flex-1 min-w-48"
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteMsg && <div className="mt-3"><Alert type={inviteMsg.type}>{inviteMsg.text}</Alert></div>}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Incoming requests */}
          {pending.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">Pending requests ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map(({ friendship, other }) => (
                  <div key={friendship.id} className="card p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{other.display_name ?? other.email}</p>
                      <p className="text-xs text-gray-400">{other.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(friendship.id, true)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToRequest(friendship.id, false)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Outgoing requests */}
          {outgoing.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">Sent requests</h2>
              <div className="space-y-2">
                {outgoing.map(({ friendship, other }) => (
                  <div key={friendship.id} className="card p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{other.display_name ?? other.email}</p>
                      <p className="text-xs text-gray-400">Awaiting response</p>
                    </div>
                    <button
                      onClick={() => removeFriend(friendship.id)}
                      className="btn-ghost text-xs text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Accepted friends */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-3">
              {friends.length > 0 ? `Your friends (${friends.length})` : 'Your friends'}
            </h2>
            {friends.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">👥</p>
                <p className="font-medium">No friends linked yet.</p>
                <p className="text-sm mt-1">Send an invite above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(({ friendship, other }) => (
                  <div key={friendship.id} className="card p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {other.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
                          {(other.display_name ?? other.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{other.display_name ?? other.email}</p>
                        <p className="text-xs text-gray-400">{other.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${other.display_name ?? 'this friend'}?`)) {
                          removeFriend(friendship.id)
                        }
                      }}
                      className="btn-ghost text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
