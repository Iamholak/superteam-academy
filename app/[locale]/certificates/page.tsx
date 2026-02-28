'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  Award,
  Calendar,
  ExternalLink,
  Hash,
  Loader2,
  ShieldCheck,
  Trophy,
  Wallet,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import type { CourseCertificate } from '@/lib/types'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CourseCertificate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadWarning, setLoadWarning] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const { connected } = useWallet()

  const t = useTranslations('Certificates')
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, wallet_address')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username || user.email?.split('@')[0] || '')
        setWalletAddress(profile.wallet_address || null)
      }

      const certResponse = await fetch('/api/certificates', { credentials: 'include' })
      const certPayload = await certResponse.json().catch(() => ({}))
      if (!certResponse.ok) {
        console.error('Failed loading certificates:', certPayload?.error || certResponse.statusText)
        setLoadWarning(certPayload?.error || 'Failed loading certificates')
        setCertificates([])
      } else {
        setLoadWarning(certPayload?.warning || null)
        setCertificates(((certPayload?.certificates || []) as CourseCertificate[]))
      }
      setIsLoading(false)
    }

    loadData()
  }, [connected, supabase])

  const latestDate = useMemo(() => {
    if (!certificates.length) return null
    return new Date(certificates[0].issued_at).toLocaleDateString()
  }, [certificates])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(20,241,149,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(246,173,85,0.18),transparent_45%),rgba(255,255,255,0.02)] p-6 md:p-10">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              On-chain credentials
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">{t('title')}</h1>
            <p className="max-w-2xl text-muted-foreground">{t('subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="border-white/10 bg-black/20">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verified</p>
                <p className="mt-1 text-2xl font-black text-primary">{certificates.length}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-black/20">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latest</p>
                <p className="mt-1 text-sm font-bold">{latestDate || '-'}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-black/20 col-span-2 sm:col-span-1">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Wallet</p>
                <p className="mt-1 truncate text-sm font-bold">{walletAddress || 'Not linked'}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {loadWarning && (
        <Card className="mt-4 border-amber-400/30 bg-amber-500/10">
          <CardContent className="py-3 text-sm text-amber-100">
            Certificate data warning: {loadWarning}
          </CardContent>
        </Card>
      )}

      {certificates.length === 0 ? (
        <Card className="mt-8 border-dashed border-white/20 bg-card/20 py-16">
          <CardContent className="flex flex-col items-center space-y-6 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Trophy className="h-12 w-12 text-primary/50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black">{t('noCertificates')}</h3>
              <p className="max-w-md text-muted-foreground">
                {!connected ? 'Connect your wallet to prepare certificate minting.' : t('startLearning')}
              </p>
            </div>
            {!connected ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-1">
                <WalletMultiButton />
              </div>
            ) : (
              <Button asChild className="rounded-xl px-7 font-bold">
                <Link href="/courses">Explore Courses</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((cert) => (
            <article
              key={cert.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-1"
            >
              <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3 w-3" />
                {t('verified')}
              </div>

              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {cert.courses?.thumbnail_url ? (
                  <Image
                    src={cert.courses.thumbnail_url}
                    alt={cert.courses?.title || 'Certificate'}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-amber-400/20">
                    <Award className="h-14 w-14 text-primary/45" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="line-clamp-1 text-base font-black">{cert.courses?.title || 'Course Certificate'}</p>
                  <p className="line-clamp-1 text-xs text-white/70">{cert.courses?.description || 'Completed course credential'}</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="inline-flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('issueDate')}
                    </p>
                    <p className="mt-1 font-bold">{new Date(cert.issued_at).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="inline-flex items-center gap-1 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                      Holder
                    </p>
                    <p className="mt-1 line-clamp-1 font-bold">{username || 'Learner'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    {t('mintAddress')}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px]">{cert.mint_address}</p>
                </div>

                <Button asChild variant="outline" className="w-full rounded-lg border-primary/25 hover:bg-primary/10">
                  <a
                    href={`https://solscan.io/token/${cert.mint_address}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t('viewOnSolscan')}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
