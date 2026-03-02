'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ActivityRecord {
  date: string
  count: number
}

interface ActivityCalendarProps {
  records: ActivityRecord[]
  streak: number
  checkedInToday: boolean
  lastActivityDay: string | null
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function ActivityCalendar({
  records,
  streak,
  checkedInToday,
  lastActivityDay
}: ActivityCalendarProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const record of records) {
      map.set(record.date, record.count)
    }
    return map
  }, [records])

  const monthKeys = useMemo(() => {
    const keys = new Set<string>()
    records.forEach((record) => {
      keys.add(record.date.slice(0, 7))
    })
    const now = new Date()
    keys.add(monthKey(now))
    return Array.from(keys).sort()
  }, [records])

  const [monthIndex, setMonthIndex] = useState(Math.max(0, monthKeys.length - 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(lastActivityDay)
  const selectedMonthKey = monthKeys[monthIndex]

  const monthDate = useMemo(() => {
    const [y, m] = selectedMonthKey.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }, [selectedMonthKey])

  const title = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

  const maxCount = Math.max(1, ...Array.from(byDate.values()))
  const selectedCount = selectedDate ? (byDate.get(selectedDate) || 0) : 0
  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Select a day'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xl font-black">Activity</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMonthIndex((prev) => Math.max(0, prev - 1))}
            disabled={monthIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMonthIndex((prev) => Math.min(monthKeys.length - 1, prev + 1))}
            disabled={monthIndex === monthKeys.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        <span className="font-black text-orange-400">{streak}</span> day streak
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, index) => (
          <div key={`pad-${index}`} className="h-10 rounded-md border border-white/5 bg-transparent" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
          const key = date.toISOString().slice(0, 10)
          const count = byDate.get(key) || 0
          const intensity = count > 0 ? Math.min(1, count / maxCount) : 0

          const isSelected = selectedDate === key
          return (
            <div
              key={key}
              className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-white/5 text-[11px] font-bold transition-colors"
              onClick={() => setSelectedDate(key)}
              style={{
                backgroundColor: `rgba(168,85,247,${intensity * 0.75})`
              }}
              title={`${key}: ${count} completion${count === 1 ? '' : 's'}`}
            >
              <span className={isSelected ? 'text-primary' : undefined}>{day}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
        <p className="font-semibold text-foreground">{selectedLabel}</p>
        <p className="text-muted-foreground">
          {selectedDate ? `${selectedCount} completion${selectedCount === 1 ? '' : 's'}` : 'No day selected'}
        </p>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <p>
          Today: <span className={checkedInToday ? 'text-primary font-semibold' : 'text-muted-foreground'}>{checkedInToday ? 'Checked in' : 'Not checked in'}</span>
        </p>
        <p>
          Last activity date: <span className="font-semibold text-foreground">{lastActivityDay ? new Date(lastActivityDay).toLocaleDateString() : 'No activity yet'}</span>
        </p>
      </div>
    </div>
  )
}
