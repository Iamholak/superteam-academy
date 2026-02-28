import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('course_certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })

    if (error) {
      const msg = String(error.message || '').toLowerCase()
      const missingTable =
        (msg.includes('course_certificates') && msg.includes('does not exist')) ||
        (error as any)?.code === '42P01'
      if (missingTable) {
        return NextResponse.json({ ok: true, certificates: [] })
      }
      console.error('[API] Certificates query error:', error)
      return NextResponse.json({
        ok: true,
        certificates: [],
        warning: error.message || 'Failed to load certificates'
      })
    }

    const certificates = data || []
    const courseIds = Array.from(new Set(certificates.map((c: any) => c.course_id).filter(Boolean)))
    let coursesById = new Map<string, any>()

    if (courseIds.length > 0) {
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url, description')
        .in('id', courseIds)
      if (coursesError) {
        console.error('[API] Certificates courses query error:', coursesError)
      }

      coursesById = new Map((courses || []).map((course: any) => [course.id, course]))
    }

    const merged = certificates.map((cert: any) => ({
      ...cert,
      courses: cert.courses || coursesById.get(cert.course_id) || null
    }))

    return NextResponse.json({ ok: true, certificates: merged })
  } catch (error) {
    console.error('[API] Certificates error:', error)
    return NextResponse.json({ error: 'Failed to load certificates' }, { status: 500 })
  }
}
