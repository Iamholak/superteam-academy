'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/routing'

export function DailyCheckIn() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/check-in', { method: 'POST', credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        window.alert(payload?.error || 'Check-in failed')
        return
      }
      if (payload.checkedIn) {
        setDone(true)
        window.alert(`Checked in successfully. +${payload.xpAwarded} XP`)
        router.refresh()
      } else {
        setDone(true)
        window.alert('You already checked in today')
        router.refresh()
      }
    } catch {
      window.alert('Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCheckIn}
      disabled={loading || done}
      className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
    >
      {done ? 'Checked In' : loading ? 'Checking In...' : 'Daily Check-In'}
    </Button>
  )
}
