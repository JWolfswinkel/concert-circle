import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConcertsClient from './ConcertsClient'

export default async function ConcertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return <ConcertsClient userId={user.id} />
}
