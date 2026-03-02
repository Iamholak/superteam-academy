import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { Award, Calendar, ExternalLink, Hash, ShieldCheck, Wallet } from 'lucide-react'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function CertificateDetailPage({ params }: Props) {
  const { locale, id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const { data: cert } = await supabase
    .from('course_certificates')
    .select('id, wallet_address, mint_address, signature, issued_at, network, metadata_uri, course_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!cert) {
    notFound()
  }

  const [{ data: course }, { data: profile }] = await Promise.all([
    supabase.from('courses').select('title, description').eq('id', cert.course_id).single(),
    supabase.from('profiles').select('username').eq('id', user.id).single()
  ])

  return (
    <div className="container py-12 space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-[radial-gradient(circle_at_top_right,rgba(20,241,149,0.2),transparent_45%),rgba(255,255,255,0.02)] p-6 md:p-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified credential
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{course?.title || 'Course Certificate'}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {course?.description || 'On-chain completion credential issued on Solana Devnet.'}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Recipient</p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <Award className="h-4 w-4 text-primary" />
              {profile?.username || user.email || 'Learner'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Issued</p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(cert.issued_at).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Mint Address</p>
            <p className="mt-2 flex items-start gap-2 break-all font-mono text-sm">
              <Hash className="mt-0.5 h-4 w-4 text-primary" />
              {cert.mint_address}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Wallet</p>
            <p className="mt-2 flex items-start gap-2 break-all font-mono text-sm">
              <Wallet className="mt-0.5 h-4 w-4 text-primary" />
              {cert.wallet_address}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <a href={`https://solscan.io/token/${cert.mint_address}?cluster=devnet`} target="_blank" rel="noreferrer noopener">
              View on Solscan
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/certificates">Back to Certificates</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
