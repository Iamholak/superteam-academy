import { createClient } from '@/lib/supabase/server'
import { MessageSquare } from 'lucide-react'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('community_posts')
    .select('id, title, category, upvotes, replies_count, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="container py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">Community</h1>
        <p className="text-muted-foreground">Discuss courses, ask questions, and share solutions.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-6">
        <div className="space-y-3">
          {(posts || []).length > 0 ? (
            (posts || []).map((post: any) => (
              <article key={post.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="font-bold">{post.title}</p>
                <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">
                  {post.category || 'General'} · {post.upvotes || 0} upvotes · {post.replies_count || 0} replies
                </p>
              </article>
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-6 text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
              No posts yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

