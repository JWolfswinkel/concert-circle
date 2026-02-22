'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Alert from '@/components/ui/Alert'
import type { Database } from '@/types/database'
import type { ConcertResult } from '@/types/search'

type Concert = Database['public']['Tables']['concerts']['Row']

interface Props {
  userId: string
  concert?: Concert
  onSave: () => void
  onCancel: () => void
}

export default function ConcertForm({ userId, concert, onSave, onCancel }: Props) {
  const supabase = createClient()
  const editing  = !!concert

  const [title,     setTitle]     = useState(concert?.title      ?? '')
  const [artist,    setArtist]    = useState(concert?.artist     ?? '')
  const [location,  setLocation]  = useState(concert?.location   ?? '')
  const [date,      setDate]      = useState(concert?.date       ?? '')
  const [ticketUrl, setTicketUrl] = useState(concert?.ticket_url ?? '')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Search state (only shown when adding, not editing)
  const [query,     setQuery]     = useState('')
  const [searching, setSearching] = useState(false)
  const [results,   setResults]   = useState<ConcertResult[] | null>(null)
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchErr(null)
    setResults(null)

    try {
      const res = await fetch(`/api/search-concerts?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Search failed')
      const data: ConcertResult[] = await res.json()
      setResults(data)
      if (data.length === 0) setSearchErr('No upcoming events found. Try a different name or add manually below.')
    } catch {
      setSearchErr('Could not reach pop-agenda.nl. Add the concert manually below.')
    }
    setSearching(false)
  }

  function applyResult(r: ConcertResult) {
    setTitle(r.title)
    setArtist(r.artist)
    setLocation(r.location)
    setDate(r.date)
    setTicketUrl(r.ticketUrl)
    setResults(null)
    setQuery('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      title,
      artist,
      location,
      date,
      ticket_url: ticketUrl || null,
      created_by: userId,
    }

    let err
    if (editing) {
      ;({ error: err } = await supabase
        .from('concerts')
        .update(payload)
        .eq('id', concert.id))
    } else {
      ;({ error: err } = await supabase
        .from('concerts')
        .insert(payload))
    }

    if (err) {
      setError(err.message)
    } else {
      onSave()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* ── pop-agenda.nl search (add mode only) ── */}
      {!editing && (
        <div>
          <p className="label mb-1.5">
            Search pop-agenda.nl
            <span className="ml-1.5 font-normal text-gray-400">— fills in the details automatically</span>
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              ref={searchRef}
              type="search"
              className="input flex-1"
              placeholder="Artist or event name, e.g. Dotan"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResults(null); setSearchErr(null) }}
            />
            <button type="submit" disabled={searching || !query.trim()} className="btn-secondary shrink-0">
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Results list */}
          {results && results.length > 0 && (
            <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-sm max-h-72 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => applyResult(r)}
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.artist}</p>
                        <p className="text-sm text-gray-500 truncate">{r.location}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-gray-700">
                          {r.date
                            ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })
                            : ''}
                        </p>
                        {r.time && <p className="text-xs text-gray-400">{r.time}</p>}
                        {r.price != null && (
                          <p className="text-xs text-gray-400">€{r.price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    {r.genres && (
                      <p className="text-xs text-brand-600 mt-0.5">{r.genres}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchErr && (
            <p className="mt-2 text-sm text-gray-500">{searchErr}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">or fill in manually</span>
            <hr className="flex-1 border-gray-200" />
          </div>
        </div>
      )}

      {/* ── Manual form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Concert / event title</label>
            <input className="input" required value={title}
              onChange={(e) => setTitle(e.target.value)} placeholder="Dotan – TivoliVredenburg" />
          </div>
          <div>
            <label className="label">Artist / headliner</label>
            <input className="input" required value={artist}
              onChange={(e) => setArtist(e.target.value)} placeholder="Dotan" />
          </div>
          <div>
            <label className="label">Venue / location</label>
            <input className="input" required value={location}
              onChange={(e) => setLocation(e.target.value)} placeholder="TivoliVredenburg, Utrecht" />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              Ticket URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input className="input" type="url" value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://tivolivredenburg.nl/…" />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : editing ? 'Save changes' : 'Add concert'}
          </button>
        </div>
      </form>
    </div>
  )
}
