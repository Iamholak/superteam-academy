import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { courseService } from '@/lib/services/course.service'
import { blockchainService } from '@/lib/services/blockchain.service'

export async function POST(req: Request) {
  try {
    const { courseId, mintAddress, signature, lessonCompletionId } = await req.json()
    if (!courseId || !mintAddress || !signature) {
      return NextResponse.json(
        { error: 'courseId, mintAddress and signature are required' },
        { status: 400 }
      )
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
        certificate: {
          mintAddress: existing.mint_address,
          signature: existing.signature
        }
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    if (!profile?.wallet_address) {
      return NextResponse.json({ error: 'Wallet not linked' }, { status: 409 })
    }

    const confirmation = await blockchainService
      .getConnection()
      .confirmTransaction(signature, 'confirmed')
    if (confirmation.value.err) {
      return NextResponse.json({ error: 'On-chain transaction failed' }, { status: 400 })
    }

    const db = createAdminClient() || supabase
    const { error: upsertError } = await db
      .from('course_certificates')
      .upsert(
        {
          user_id: user.id,
          course_id: resolvedCourseId,
          lesson_completion_id: lessonCompletionId || null,
          wallet_address: profile.wallet_address,
          mint_address: mintAddress,
          signature,
          network: 'devnet',
          metadata_uri: null
        },
        { onConflict: 'user_id,course_id' }
      )

    if (upsertError) {
      const msg = String(upsertError.message || '').toLowerCase()
      if ((upsertError as any).code === '42P01' || msg.includes("could not find the table 'public.course_certificates'")) {
        return NextResponse.json(
          { error: 'Missing table: public.course_certificates. Run scripts/004_course_certificates.sql in Supabase SQL editor.' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      certificate: {
        mintAddress,
        signature
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed confirming certificate'
    console.error('[API] Confirm certificate tx error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
