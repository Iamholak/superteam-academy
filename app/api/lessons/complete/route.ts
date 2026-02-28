import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { courseService } from '@/lib/services/course.service'

export async function POST(req: Request) {
  try {
    const { lessonId, lessonSlug, courseId, xpEarned, issueCertificateOnComplete } = await req.json()
    if (!lessonId || !courseId) {
      return NextResponse.json({ error: 'lessonId and courseId are required' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedCourseId = await courseService.resolveCourseId(courseId)
    if (!resolvedCourseId) {
      return NextResponse.json({ error: 'Invalid lesson or course reference' }, { status: 400 })
    }

    let lesson: any = null
    const lessonIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId)
    if (lessonIsUuid) {
      const { data } = await supabase
        .from('lessons')
        .select('id, course_id, order_index, slug')
        .eq('id', lessonId)
        .single()
      lesson = data
    }
    if (!lesson) {
      const { data } = await supabase
        .from('lessons')
        .select('id, course_id, order_index, slug')
        .eq('sanity_id', lessonId)
        .single()
      lesson = data
    }
    if (!lesson) {
      const { data } = await supabase
        .from('lessons')
        .select('id, course_id, order_index, slug')
        .eq('slug', lessonSlug || lessonId)
        .eq('course_id', resolvedCourseId)
        .single()
      lesson = data
    }
    if (!lesson) {
      const { data } = await supabase
        .from('lessons')
        .select('id, course_id, order_index, slug')
        .eq('slug', lessonSlug || lessonId)
        .eq('course_id', resolvedCourseId)
        .single()
      lesson = data
    }

    let effectiveCourseId = resolvedCourseId
    let enrollment = await courseService.getUserEnrollment(user.id, effectiveCourseId)
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found in this course. Please refresh course data.' }, { status: 400 })
    }
    if (lesson.course_id !== resolvedCourseId) {
      const lessonEnrollment = await courseService.getUserEnrollment(user.id, lesson.course_id)
      if (!lessonEnrollment?.id) {
        return NextResponse.json({ error: 'Lesson does not belong to this course' }, { status: 400 })
      }
      effectiveCourseId = lesson.course_id
      enrollment = lessonEnrollment
    }

    if (!enrollment?.id) {
      return NextResponse.json({ error: 'Enrollment required' }, { status: 403 })
    }

    const result = await courseService.completeLesson(
      user.id,
      lesson.id,
      enrollment.id,
      typeof xpEarned === 'number' ? xpEarned : 0
    )

    let missingLessonSlugs: string[] | undefined
    if (issueCertificateOnComplete && !result.courseCompleted) {
      const { data: courseLessons } = await supabase
        .from('lessons')
        .select('id, slug')
        .eq('course_id', effectiveCourseId)
        .eq('is_published', true)

      const lessonsForProgress = (courseLessons && courseLessons.length > 0)
        ? courseLessons
        : (await supabase
            .from('lessons')
            .select('id, slug')
            .eq('course_id', effectiveCourseId)).data || []

      const { data: completionRows } = await supabase
        .from('lesson_completions')
        .select('lesson_id, lessons(slug)')
        .eq('enrollment_id', enrollment.id)

      const completedIds = new Set<string>()
      const completedSlugs = new Set<string>()
      for (const row of completionRows || []) {
        if ((row as any)?.lesson_id) {
          completedIds.add((row as any).lesson_id)
        }
        const lessonRef = Array.isArray((row as any).lessons)
          ? (row as any).lessons[0]
          : (row as any).lessons
        if (lessonRef?.slug) {
          completedSlugs.add(lessonRef.slug)
        }
      }

      missingLessonSlugs = (lessonsForProgress || [])
        .filter((l: any) => !(completedIds.has(l.id) || (l.slug && completedSlugs.has(l.slug))))
        .map((l: any) => l.slug)
        .filter(Boolean)
    }

    const certificate = result.certificate
    const certificateError = result.certificateError

    return NextResponse.json({
      ok: true,
      progressPercentage: result.progressPercentage,
      courseCompleted: result.courseCompleted,
      certificate,
      certificateError,
      missingLessonSlugs
    })
  } catch (error) {
    console.error('[API] Lesson completion error:', error)
    const message = error instanceof Error ? error.message : 'Bad Request'
    const status =
      message.includes('Wallet not linked')
        ? 409
        : message.includes('Invalid') || message.includes('not found') || message.includes('does not belong')
          ? 400
          : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
