import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, MessageSquare, LifeBuoy } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="container py-16 space-y-8">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Contact</h1>
        <p className="text-muted-foreground text-lg">
          Need help with courses, certificates, or account issues? Reach out through any channel below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            support@superteam.academy
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Discord
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Join the Superteam Discord community for fast support.
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Help Desk
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Include your username, wallet address, and screenshots when reporting issues.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

