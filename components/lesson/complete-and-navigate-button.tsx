'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'

interface CompleteAndNavigateButtonProps {
  lessonId: string
  lessonSlug?: string
  courseId: string
  courseTitle?: string
  xpEarned: number
  href: string
  issueCertificateOnComplete?: boolean
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function CompleteAndNavigateButton({
  lessonId,
  lessonSlug,
  courseId,
  courseTitle,
  xpEarned,
  href,
  issueCertificateOnComplete = false,
  children,
  variant = 'default',
  size = 'default',
  className
}: CompleteAndNavigateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { connection } = useConnection()
  const { connected, publicKey, sendTransaction } = useWallet()

  const onClick = async () => {
    if (issueCertificateOnComplete && typeof window !== 'undefined') {
      const shouldGenerate = window.confirm('Generate your course certificate now?')
      if (!shouldGenerate) {
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const url = typeof window !== 'undefined'
        ? `${window.location.origin}/api/lessons/complete`
        : '/api/lessons/complete'

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lessonId, lessonSlug, courseId, xpEarned, issueCertificateOnComplete, courseTitle })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg = payload?.error || 'Failed to save lesson progress'
        setError(msg)
        if (typeof window !== 'undefined') {
          window.alert(msg)
        }
        return
      }

      if (issueCertificateOnComplete && payload?.certificateError && typeof window !== 'undefined') {
        const prefix = payload?.courseCompleted
          ? 'Course completed, but certificate was not minted'
          : 'Course is not fully completed yet'
        window.alert(`${prefix}: ${payload.certificateError}`)
      }

      if (issueCertificateOnComplete) {
        if (!payload?.courseCompleted) {
          if (typeof window !== 'undefined') {
            const pct = typeof payload?.progressPercentage === 'number' ? payload.progressPercentage : null
            window.alert(
              pct !== null
                ? `Course is not fully completed yet (${pct}%). Complete all lessons first.${Array.isArray(payload?.missingLessonSlugs) && payload.missingLessonSlugs.length > 0 ? ` Missing: ${payload.missingLessonSlugs.join(', ')}` : ''}`
                : 'Course is not fully completed yet. Complete all lessons first.'
            )
          }
          return
        }

        const hasMintedCertificate = Boolean(payload?.certificate?.mintAddress && payload?.certificate?.signature)
        if (!hasMintedCertificate) {
          if (!connected || !publicKey) {
            if (typeof window !== 'undefined') {
              window.alert('Connect your wallet to sign certificate mint transaction.')
            }
            return
          }

          const prepareResponse = await fetch('/api/certificates/mint/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              courseId,
              walletAddress: publicKey.toBase58()
            })
          })
          const preparePayload = await prepareResponse.json().catch(() => ({}))
          if (!prepareResponse.ok) {
            const msg = preparePayload?.error || 'Failed to prepare certificate transaction'
            setError(msg)
            if (typeof window !== 'undefined') {
              window.alert(msg)
            }
            return
          }

          if (!preparePayload?.alreadyIssued) {
            const serialized = preparePayload?.serializedTransaction as string | undefined
            const mintAddress = preparePayload?.mintAddress as string | undefined
            if (!serialized || !mintAddress) {
              if (typeof window !== 'undefined') {
                window.alert('Invalid certificate transaction payload')
              }
              return
            }

            const txBytes = Uint8Array.from(atob(serialized), (c) => c.charCodeAt(0))
            const transaction = Transaction.from(txBytes)
            const signature = await sendTransaction(transaction, connection, {
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            })
            await connection.confirmTransaction(signature, 'confirmed')

            const confirmResponse = await fetch('/api/certificates/mint/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                courseId,
                mintAddress,
                signature
              })
            })
            const confirmPayload = await confirmResponse.json().catch(() => ({}))
            if (!confirmResponse.ok) {
              const msg = confirmPayload?.error || 'Failed to save certificate after minting'
              setError(msg)
              if (typeof window !== 'undefined') {
                window.alert(msg)
              }
              return
            }
          }

          if (typeof window !== 'undefined' && preparePayload?.alreadyIssued) {
            window.alert('Certificate already issued. Opening certificates page.')
          }
        }
      }

      router.push(href as any)
    } catch (error) {
      console.error('Failed to complete lesson:', error)
      setError('Failed to save lesson progress')
      if (typeof window !== 'undefined') {
        window.alert('Failed to save lesson progress')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={onClick}
        disabled={loading}
      >
        {children}
      </Button>
      {error && <span className="sr-only">{error}</span>}
    </>
  )
}
