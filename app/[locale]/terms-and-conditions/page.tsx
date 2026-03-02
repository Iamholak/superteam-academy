export default function TermsAndConditionsPage() {
  return (
    <div className="container max-w-4xl py-16 space-y-8">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">Terms and Conditions</h1>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Use of Service</h2>
        <p className="text-muted-foreground">
          You agree to use Superteam Academy lawfully and not abuse platform features, APIs, or user accounts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Accounts and Wallets</h2>
        <p className="text-muted-foreground">
          You are responsible for wallet/account security. Keep credentials and signing permissions under your control.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Certificates and Progress</h2>
        <p className="text-muted-foreground">
          Course completion and certificate issuance depend on platform and on-chain conditions. We may update course requirements over time.
        </p>
      </section>
    </div>
  )
}

