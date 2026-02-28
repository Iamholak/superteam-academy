import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { courseService } from '@/lib/services/course.service'
import { blockchainService } from '@/lib/services/blockchain.service'

export async function POST(req: Request) {
  try {
    const { courseId, walletAddress } = await req.json()
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedCourseId = await courseService.resolveCourseId(courseId)
    if (!resolvedCourseId) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('course_certificates')
      .select('mint_address, signature')
      .eq('user_id', user.id)
      .eq('course_id', resolvedCourseId)
      .single()

    if (existingError && (existingError as any).code !== 'PGRST116') {
      const msg = String(existingError.message || '').toLowerCase()
      if ((existingError as any).code === '42P01' || msg.includes("could not find the table 'public.course_certificates'")) {
        return NextResponse.json(
          { error: 'Missing table: public.course_certificates. Run scripts/004_course_certificates.sql in Supabase SQL editor.' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existing?.mint_address && existing?.signature) {
      return NextResponse.json({
        ok: true,
        alreadyIssued: true,
        certificate: {
          mintAddress: existing.mint_address,
          signature: existing.signature
        }
      })
    }

    const [{ data: enrollment }, { data: profile }, { data: course }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, completed_at, progress_percentage')
        .eq('user_id', user.id)
        .eq('course_id', resolvedCourseId)
        .single(),
      supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single(),
      supabase
        .from('courses')
        .select('title')
        .eq('id', resolvedCourseId)
        .single()
    ])

    if (!enrollment?.id) {
      return NextResponse.json({ error: 'Enrollment required' }, { status: 403 })
    }

    const profileWallet = profile?.wallet_address
    if (!profileWallet) {
      return NextResponse.json({ error: 'Link wallet in profile before minting certificate' }, { status: 409 })
    }
    if (walletAddress && walletAddress !== profileWallet) {
      return NextResponse.json({ error: 'Connected wallet does not match linked profile wallet' }, { status: 409 })
    }

    const { data: publishedLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, slug')
      .eq('course_id', resolvedCourseId)
      .eq('is_published', true)

    if (lessonsError) {
      return NextResponse.json({ error: lessonsError.message }, { status: 500 })
    }

    let published = publishedLessons || []
    if (published.length === 0) {
      const { data: fallbackLessons, error: fallbackLessonsError } = await supabase
        .from('lessons')
        .select('id, slug')
        .eq('course_id', resolvedCourseId)
      if (fallbackLessonsError) {
        return NextResponse.json({ error: fallbackLessonsError.message }, { status: 500 })
      }
      published = fallbackLessons || []
    }
    let progress = enrollment.progress_percentage || 0
    if (published.length > 0) {
      const { data: completionRows, error: completionsError } = await supabase
        .from('lesson_completions')
        .select('lesson_id, lessons(slug)')
        .eq('enrollment_id', enrollment.id)
      
      if (completionsError) {
        return NextResponse.json({ error: completionsError.message }, { status: 500 })
      }

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

      const matchedCompleted = published.filter((lesson: any) => {
        return completedIds.has(lesson.id) || (lesson.slug && completedSlugs.has(lesson.slug))
      }).length

      progress = Math.min(100, Math.round((matchedCompleted / published.length) * 100))
    }

    if (progress < 100) {
      return NextResponse.json({ error: 'Course must be completed before certificate issuance' }, { status: 400 })
    }

    await supabase
      .from('enrollments')
      .update({
        progress_percentage: progress,
        completed_at: enrollment.completed_at || new Date().toISOString()
      })
      .eq('id', enrollment.id)

    const prepared = await blockchainService.prepareCourseCertificateTransaction(
      profileWallet,
      resolvedCourseId,
      course?.title || 'Course'
    )

    return NextResponse.json({
      ok: true,
      alreadyIssued: false,
      serializedTransaction: prepared.serializedTransaction,
      mintAddress: prepared.mintAddress
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prepare certificate transaction'
    console.error('[API] Prepare certificate tx error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
