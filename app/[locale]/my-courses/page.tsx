import { Link, redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { courseService } from '@/lib/services/course.service';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle2 } from 'lucide-react';

interface MyCoursesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MyCoursesPage({ params }: MyCoursesPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/auth/login', locale });
    return null;
  }

  const enrollments = await courseService.getUserEnrollments(user.id);
  const active = enrollments.filter((e: any) => !e.completed_at);
  const completed = enrollments.filter((e: any) => Boolean(e.completed_at));

  return (
    <div className="container py-12 space-y-10">
      <section className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">My Courses</h1>
        <p className="text-muted-foreground">View all enrolled and completed courses in one place.</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Enrolled</h2>
          <Badge variant="outline" className="font-bold">{active.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {active.length > 0 ? active.map((enrollment: any) => (
            <Link
              key={enrollment.id}
              href={(enrollment.courses?.slug ? `/courses/${enrollment.courses.slug}` : '/courses') as any}
              className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/40"
            >
              <p className="line-clamp-1 text-lg font-bold">{enrollment.courses?.title || 'Course'}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{enrollment.courses?.description}</p>
              <div className="mt-3">
                <ProgressBar progress={enrollment.progress_percentage || 0} showLabel={false} className="h-2.5 bg-white/10" />
                <p className="mt-2 text-xs text-muted-foreground">{enrollment.progress_percentage || 0}% complete</p>
              </div>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
              No enrolled courses yet. <Link href="/courses" className="text-primary hover:underline">Browse courses</Link>.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Completed</h2>
          <Badge variant="outline" className="font-bold">{completed.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {completed.length > 0 ? completed.map((enrollment: any) => (
            <Link
              key={enrollment.id}
              href={(enrollment.courses?.slug ? `/courses/${enrollment.courses.slug}` : '/courses') as any}
              className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-1 text-lg font-bold">{enrollment.courses?.title || 'Course'}</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{enrollment.courses?.description}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                Finished on {new Date(enrollment.completed_at).toLocaleDateString()}
              </p>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
              No completed courses yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
