export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl py-16 space-y-8">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">Privacy Policy</h1>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Data We Collect</h2>
        <p className="text-muted-foreground">
          We collect account data, wallet address, course progress, and certificate records required to provide learning and credential services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">How We Use Data</h2>
        <p className="text-muted-foreground">
          Data is used to authenticate users, track progress, issue certificates, display rankings, and improve platform reliability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Your Controls</h2>
        <p className="text-muted-foreground">
          You can update profile information, link/unlink connected accounts, and request support for account-related data issues.
        </p>
      </section>
    </div>
  )
}

