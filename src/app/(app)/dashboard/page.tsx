import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { Database } from '@/types/database'

type UserRow = Database['public']['Tables']['users']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const result = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const profile = result.data as UserRow | null

  return (
    <DashboardClient
      userId={user.id}
      displayName={profile?.display_name ?? user.email ?? 'there'}
    />
  )
}
