'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/concerts',      label: 'Concerts'  },
  { href: '/friends',       label: 'Friends'   },
  { href: '/feed',          label: 'Feed'      },
]

export default function Nav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  const [unread, setUnread]     = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchUnread()
    // Subscribe to new notifications in real-time
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchUnread()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUnread() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    setUnread(count ?? 0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="font-bold text-brand-600 text-lg shrink-0">
          🎵 ConcertCircle
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/notifications"
            className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith('/notifications')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Notifications
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>

        {/* Logout – desktop */}
        <button
          onClick={handleLogout}
          className="hidden sm:block btn-ghost text-sm ml-auto"
        >
          Log out
        </button>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden ml-auto p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-600" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-2 space-y-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname.startsWith(href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/notifications"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
              pathname.startsWith('/notifications')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Notifications
            {unread > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <button
            onClick={() => { setMenuOpen(false); handleLogout() }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  )
}
