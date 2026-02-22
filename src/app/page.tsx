// Root page: show auth form (middleware redirects logged-in users to /dashboard)
// Must be dynamic — reads env vars and renders based on auth state
export const dynamic = 'force-dynamic'

import AuthPage from '@/components/auth/AuthPage'

export default function Home() {
  return <AuthPage />
}
