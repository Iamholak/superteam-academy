'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BookOpen, Star } from 'lucide-react';

type LocalStartedCourse = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  difficulty?: string;
  xp_reward?: number;
  nextLessonHref?: string;
  startedAt: string;
};

export function LocalStartedCourses({ userId }: { userId: string }) {
  const [items, setItems] = useState<LocalStartedCourse[]>([]);

  useEffect(() => {
    const key = `started_courses:${userId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LocalStartedCourse[];
      setItems(parsed);
    } catch {
      setItems([]);
    }
  }, [userId]);

  const uniqueItems = useMemo(() => {
    const bySlug = new Map<string, LocalStartedCourse>();
    items.forEach((item) => {
      const key = item.slug || item.id;
      if (!bySlug.has(key)) bySlug.set(key, item);
    });
    return Array.from(bySlug.values()).slice(0, 3);
  }, [items]);

  if (!uniqueItems.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <p className="mb-5 text-xl font-black">Started From Sanity</p>
      <div className="space-y-4">
        {uniqueItems.map((course) => (
          <Link
            key={course.slug || course.id}
            href={(course.nextLessonHref || `/courses/${course.slug}`) as any}
            className="block rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="line-clamp-1 font-bold">{course.title}</p>
              <span className="text-xs text-muted-foreground capitalize">{course.difficulty || 'beginner'}</span>
            </div>
            <ProgressBar progress={5} showLabel={false} className="h-2 bg-white/10" />
            <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Started</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" /> {course.xp_reward || 0} XP</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
