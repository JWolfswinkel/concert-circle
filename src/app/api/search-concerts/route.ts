import { NextResponse } from 'next/server'

interface WPEvent {
  id: number
  title: { rendered: string }
  link: string
  content: { rendered: string }
  acf: {
    eventdate: string
    eventtime: string
    venue: string
    city: string
    province: string
    adress: string
    ticketprice: number
    soldout: string
    canceled: string
    genres: string
    eventsubtype: string
  }
}

import type { ConcertResult } from '@/types/search'
export type { ConcertResult }

function parseDate(raw: string): string {
  // pop-agenda stores dates as YYYYMMDD
  if (raw.length !== 8) return ''
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function extractTicketUrl(html: string): string {
  // The ticket link sits inside a wp-block-button__link anchor
  const m = html.match(/class="wp-block-button__link[^"]*"[^>]*href="([^"]+)"/)
  if (m) return m[1]
  // Fallback: first external href that looks like a ticket/agenda URL
  const fb = html.match(/href="(https?:\/\/[^"]*(?:ticket|agenda|koop|bestel)[^"]*)"/)
  return fb?.[1] ?? ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json([])

  try {
    const apiUrl = new URL('https://www.pop-agenda.nl/wp-json/wp/v2/events')
    apiUrl.searchParams.set('search', q)
    apiUrl.searchParams.set('per_page', '15')
    apiUrl.searchParams.set('status', 'publish')
    apiUrl.searchParams.set('_fields', 'id,title,link,content,acf')

    const res = await fetch(apiUrl.toString(), {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'ConcertCircle/1.0' },
    })

    if (!res.ok) return NextResponse.json([])

    const raw: WPEvent[] = await res.json()

    // Only return future/today events
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    const results: ConcertResult[] = raw
      .filter((e) => (e.acf?.eventdate ?? '0') >= today)
      .map((e) => ({
        id:        e.id,
        title:     `${e.title.rendered} – ${e.acf?.venue ?? ''}`,
        artist:    e.title.rendered,
        location:  [e.acf?.venue, e.acf?.city].filter(Boolean).join(', '),
        date:      parseDate(e.acf?.eventdate ?? ''),
        time:      e.acf?.eventtime ?? '',
        ticketUrl: extractTicketUrl(e.content?.rendered ?? ''),
        sourceUrl: e.link,
        genres:    e.acf?.genres ?? '',
        price:     e.acf?.ticketprice ?? null,
        soldOut:   e.acf?.soldout === 'true',
        canceled:  e.acf?.canceled === 'true',
      }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
