import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userService } from '@/lib/services/user.service'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await userService.dailyCheckIn(user.id)
    return NextResponse.json({
      ok: true,
      checkedIn: result.checkedIn,
      xpAwarded: result.xpAwarded
    })
  } catch (error) {
    console.error('[API] Check-in error:', error)
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
  }
}
