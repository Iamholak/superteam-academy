import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { blockchainService } from '@/lib/services/blockchain.service'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Wallet } from 'lucide-react'

type Props = {
  params: Promise<{ locale: string }>
}

function shortAddress(address: string) {
  if (address.length <= 16) return address
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

export default async function CredentialsPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('id', user.id)
    .single()

  const wallet = profile?.wallet_address
  const credentials = wallet ? await blockchainService.getUserCredentials(wallet) : []
  const xp = wallet ? await blockchainService.getXPBalance(wallet) : 0

  return (
    <div className="container py-12 space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">On-chain Credentials</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Credential Vault</h1>
        <p className="mt-2 text-muted-foreground">
          Live wallet-read credentials detected on Solana Devnet.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-white/20 bg-black/20">
            <Wallet className="mr-1 h-3.5 w-3.5" />
            {wallet ? shortAddress(wallet) : 'Wallet not linked'}
          </Badge>
          <Badge variant="outline" className="border-white/20 bg-black/20">
            XP Balance: {xp.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="border-white/20 bg-black/20">
            Credentials Found: {credentials.length}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {credentials.length > 0 ? (
          credentials.map((credential) => (
            <article key={credential.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </p>
              <h3 className="mt-3 text-lg font-black">{credential.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{credential.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">Mint</p>
              <p className="break-all font-mono text-xs">{credential.metadata.mint}</p>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-card/20 p-8 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            {wallet
              ? 'No NFT-style credentials detected in this wallet yet.'
              : 'Link a wallet in settings to load on-chain credentials.'}
          </div>
        )}
      </section>
    </div>
  )
}
