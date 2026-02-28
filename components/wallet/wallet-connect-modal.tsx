'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { Loader2, Wallet, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

const TARGET_WALLETS = ['Phantom', 'Solflare'];

function WalletBadge({ name }: { name: string }) {
  const map: Record<string, string> = {
    Phantom: 'from-fuchsia-500 to-violet-600',
    Solflare: 'from-amber-500 to-orange-600'
  };
  return (
    <div className={cn('h-11 w-11 rounded-xl bg-gradient-to-br shadow-inner', map[name] || 'from-slate-500 to-slate-600')} />
  );
}

export function WalletConnectModal() {
  const [open, setOpen] = useState(false);
  const [connectingName, setConnectingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { connected, wallets, wallet, select, connect, disconnect, publicKey } = useWallet();

  const walletOptions = useMemo(
    () => wallets.filter((w) => TARGET_WALLETS.includes(w.adapter.name)),
    [wallets]
  );
  const shortAddress = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-3)}`
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (walletName: string) => {
    setError(null);
    setConnectingName(walletName);
    try {
      const target = wallets.find((w) => w.adapter.name === walletName);
      if (!target) {
        throw new Error('Selected wallet is not available');
      }
      if (target.readyState !== 'Installed') {
        throw new Error(`${walletName} is not installed. Install extension to continue.`);
      }

      if (wallet?.adapter?.name !== walletName) {
        select(walletName as any);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      await connect();
      setOpen(false);
    } catch (connectError: unknown) {
      setError(connectError instanceof Error ? connectError.message : 'Wallet connection failed');
    } finally {
      setConnectingName(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant={connected ? 'outline' : 'default'}
        className={cn(
          'h-9 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest',
          connected
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            : 'shadow-[0_0_20px_rgba(18,186,120,0.22)]'
        )}
      >
        {connected ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {shortAddress || 'Wallet Connected'}
          </>
        ) : (
          <>
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </>
        )}
      </Button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm sm:items-center sm:pt-4">
          <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[1.65rem] border border-white/15 bg-[#0b1022] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
                  ST
                </div>
                <h3 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Connect to Superteam Academy</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close wallet modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {walletOptions.map((walletOption) => {
                const name = walletOption.adapter.name;
                const isLoading = connectingName === name;
                const installed = walletOption.readyState === 'Installed';
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleConnect(name)}
                    disabled={isLoading}
                    className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10"
                  >
                    <WalletBadge name={name} />
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-white">{name}</p>
                      <p className="text-sm text-white/55">
                        {installed ? 'Solana Wallet' : 'Install extension to continue'}
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                    ) : (
                      <span className="text-white/50">{'->'}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="my-6 flex items-center gap-3 text-white/45">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-sm">or continue with</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/auth/login">Google</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/auth/login">GitHub</Link>
              </Button>
            </div>

            {connected && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await disconnect();
                  setOpen(false);
                }}
                className="mt-4 w-full rounded-xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              >
                Disconnect Wallet
              </Button>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
