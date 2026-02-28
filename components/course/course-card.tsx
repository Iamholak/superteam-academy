import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Star, Trophy, ArrowUpRight } from 'lucide-react';
import type { Course } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const difficultyColors = {
    beginner: 'text-primary border-primary/30 bg-primary/10',
    intermediate: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    advanced: 'text-rose-500 border-rose-500/30 bg-rose-500/10'
  };
  const xpReward = course.xp_reward || 0;
  const duration = course.duration_minutes || 0;
  const durationText = duration >= 60 ? `${Math.max(1, Math.round(duration / 60))}h` : `${Math.max(1, duration)}m`;

  return (
    <Link href={`/courses/${course.slug}` as any} className="h-full">
      <Card className="group relative h-full overflow-hidden border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
        <CardHeader className="p-0">
          <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-transparent">
                <BookOpen className="h-12 w-12 text-primary/40" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80 transition-opacity group-hover:opacity-60" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
              <Star className="h-3 w-3 fill-primary" />
              <span>{xpReward.toLocaleString()} XP</span>
            </div>
            <div className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/50 p-1.5 text-white/80 transition-colors group-hover:text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            {course.difficulty && (
              <Badge variant="outline" className={cn("h-5 rounded-full px-2 text-[9px] font-black uppercase tracking-wider", difficultyColors[course.difficulty])}>
                {course.difficulty}
              </Badge>
            )}
            <Badge variant="outline" className="h-5 rounded-full border-white/20 bg-white/5 px-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              {course.category || 'Development'}
            </Badge>
          </div>
          <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        </CardContent>
        <CardFooter className="mt-auto flex items-center justify-between border-t border-white/10 px-4 py-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{durationText}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Trophy className="h-3.5 w-3.5" />
            <span>cNFT</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
