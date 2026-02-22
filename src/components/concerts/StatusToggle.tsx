'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'going' | 'interested' | null

interface Props {
  userId: string
  concertId: string
  initialStatus: Status
}

export default function StatusToggle({ userId, concertId, initialStatus }: Props) {
  const supabase = createClient()
  const [status, setStatus] = useState<Status>(initialStatus)
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: 'going' | 'interested') {
    setLoading(true)

    if (status === newStatus) {
      // Toggle off — remove the row
      await supabase
        .from('user_concerts')
        .delete()
        .eq('user_id', userId)
        .eq('concert_id', concertId)
      setStatus(null)
    } else {
      // Upsert
      const { error } = await supabase
        .from('user_concerts')
        .upsert({ user_id: userId, concert_id: concertId, status: newStatus })
      if (!error) setStatus(newStatus)
    }

    setLoading(false)
  }

  return (
    <div className="flex gap-1.5">
      <button
        disabled={loading}
        onClick={() => updateStatus('going')}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
          status === 'going'
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-700'
        }`}
      >
        Going
      </button>
      <button
        disabled={loading}
        onClick={() => updateStatus('interested')}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
          status === 'interested'
            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
            : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-300 hover:text-yellow-700'
        }`}
      >
        Interested
      </button>
    </div>
  )
}
