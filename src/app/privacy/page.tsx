export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-[14px] mb-2" style={{ color: 'var(--gold)' }}>Privacy Policy</h1>
      <p className="body-text text-[11px] mb-8" style={{ color: 'var(--text-3)' }}>
        Last updated: June 8, 2026
      </p>

      <div className="rp-card space-y-6 p-6">

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Who we are</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            Garret&apos;s World (<strong style={{ color: 'var(--text-1)' }}>garretperez.com</strong>) is a personal
            community site run by Garret Perez. Questions? Email{' '}
            <a href="mailto:garret.p92@gmail.com" style={{ color: 'var(--gold)' }}>
              garret.p92@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>What we collect</h2>
          <ul className="body-text text-[11px] space-y-1 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
            <li><strong style={{ color: 'var(--text-1)' }}>Username</strong> — chosen by you at registration, displayed publicly on posts.</li>
            <li><strong style={{ color: 'var(--text-1)' }}>Password</strong> — stored as a one-way hash (bcrypt). We never see your plain-text password.</li>
            <li><strong style={{ color: 'var(--text-1)' }}>Posts, recipes, and replies</strong> — content you submit to the site.</li>
            <li><strong style={{ color: 'var(--text-1)' }}>XP &amp; skill progress</strong> — earned by posting and playing games.</li>
            <li><strong style={{ color: 'var(--text-1)' }}>Game scores</strong> — your personal bests in site mini-games.</li>
            <li><strong style={{ color: 'var(--text-1)' }}>Login timestamps</strong> — to award daily XP and track account activity.</li>
          </ul>
          <p className="body-text text-[11px] mt-3" style={{ color: 'var(--text-2)' }}>
            We do <strong style={{ color: 'var(--text-1)' }}>not</strong> collect email addresses, real names,
            phone numbers, payment info, or any government IDs.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>How we use your data</h2>
          <ul className="body-text text-[11px] space-y-1 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
            <li>To operate your account and display your posts/progress on the site.</li>
            <li>To calculate XP, levels, and badges.</li>
            <li>To prevent abuse (banning accounts that violate community rules).</li>
          </ul>
          <p className="body-text text-[11px] mt-3" style={{ color: 'var(--text-2)' }}>
            We do <strong style={{ color: 'var(--text-1)' }}>not</strong> sell, rent, or share your data with
            third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Cookies &amp; sessions</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            We use a single session cookie to keep you logged in. No advertising cookies, no tracking pixels,
            no third-party analytics.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Where data is stored</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            The site is hosted on <strong style={{ color: 'var(--text-1)' }}>Vercel</strong> (US) and the
            database runs on <strong style={{ color: 'var(--text-1)' }}>Neon PostgreSQL</strong> (US). Both
            providers have their own security and data practices.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Age requirement</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            This site is intended for users <strong style={{ color: 'var(--text-1)' }}>13 years of age or older</strong>.
            If you are under 13, please do not create an account.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Your rights</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            You can request deletion of your account and all associated data at any time by emailing{' '}
            <a href="mailto:garret.p92@gmail.com" style={{ color: 'var(--gold)' }}>
              garret.p92@gmail.com
            </a>. We will process deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>Changes to this policy</h2>
          <p className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
            If we materially change this policy, we will post an announcement on the site. Continued use
            after changes constitutes acceptance.
          </p>
        </section>

      </div>
    </div>
  )
}
