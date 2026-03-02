'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function WalletConnectModal() {
  const { connected, publicKey, disconnect } = useWallet();
  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}....${publicKey.toBase58().slice(-2)}`
    : null;

  return (
    connected ? (
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await disconnect();
        }}
        className="h-9 rounded-xl px-3 sm:px-4 text-[10px] font-black uppercase tracking-widest"
      >
        {shortAddress || 'Connected'}
        <LogOut className="ml-2 h-3.5 w-3.5" />
      </Button>
    ) : (
      <WalletMultiButton className="!h-9 !rounded-xl !px-3 sm:!px-4 !text-[10px] !font-black !uppercase !tracking-widest !bg-primary !text-primary-foreground hover:!bg-primary/90" />
    )
  );
}
