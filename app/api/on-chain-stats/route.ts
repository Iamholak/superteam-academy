import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: progress }, certCountResult] = await Promise.all([
      supabase
        .from('user_progress')
        .select('total_xp')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('course_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
    ])

    let verified = Number(certCountResult.count || 0)
    if (certCountResult.error) {
      const msg = String(certCountResult.error.message || '').toLowerCase()
      const missingTable = msg.includes('course_certificates') && msg.includes('does not exist')
      if (!missingTable) {
        return NextResponse.json({ error: certCountResult.error.message }, { status: 500 })
      }
      verified = 0
    }

    return NextResponse.json({
      ok: true,
      xp: Number(progress?.total_xp || 0),
      verified
    })
  } catch (error) {
    console.error('[API] On-chain stats error:', error)
    return NextResponse.json({ error: 'Failed to load on-chain stats' }, { status: 500 })
  }
}
