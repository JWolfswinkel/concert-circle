// All pages in this group are dynamic (auth-gated, read cookies)
export const dynamic = 'force-dynamic'

import Nav from '@/components/layout/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
