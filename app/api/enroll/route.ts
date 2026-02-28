import { NextResponse } from 'next/server'
import { courseService } from '@/lib/services/course.service'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { courseId, courseSlug } = await req.json()
    if (!courseId && !courseSlug) {
      return NextResponse.json({ error: 'courseId or courseSlug is required' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let resolvedCourseId: string | null = null
    if (courseId) {
      resolvedCourseId = await courseService.resolveCourseId(courseId)
    }
    if (!resolvedCourseId && courseSlug) {
      resolvedCourseId = await courseService.resolveCourseId(courseSlug)
    }

    // If not yet resolved, attempt a Sanity->Supabase sync using slug (if available)
    // and retry resolution. This requires SUPABASE_SERVICE_ROLE_KEY.
    let sanityCourseExists = false
    if (!resolvedCourseId && courseSlug) {
      const sanityCourse = await courseService.getCourseBySlug(courseSlug)
      sanityCourseExists = Boolean(sanityCourse)
      resolvedCourseId = await courseService.resolveCourseId(courseSlug)
    }

    if (!resolvedCourseId) {
      if (sanityCourseExists || courseSlug) {
        return NextResponse.json({
          error: 'Course exists in Sanity but is not synced to Supabase. Set SUPABASE_SERVICE_ROLE_KEY in .env.local and retry.'
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Course not found for provided id/slug' }, { status: 404 })
    }

    const enrollment = await courseService.enrollUser(user.id, resolvedCourseId)
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, enrollment })
  } catch (error) {
    console.error('[API] Enrollment error:', error);
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
