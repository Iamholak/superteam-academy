import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, Sparkles } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="container py-16 space-y-10">
      <div className="max-w-3xl space-y-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          About Superteam Academy
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Building Elite Solana Talent</h1>
        <p className="text-muted-foreground text-lg">
          Superteam Academy helps builders learn Solana through practical, structured courses with measurable progress and on-chain credentials.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Make high-quality Solana education accessible, rigorous, and outcome-focused for developers worldwide.
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Who It Is For
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Beginners entering Web3, developers upskilling into Solana, and teams preparing for real product shipping.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

