import Link from 'next/link'

export const metadata = {
  title: "Terms of Service · Garret's World",
}

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 16px' }}>

      <h1 style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 13, color: '#c89b3c',
        letterSpacing: '0.06em', marginBottom: 6,
      }}>
        Terms of Service
      </h1>
      <p className="body-text" style={{ fontSize: 11, color: '#4a3820', marginBottom: 28 }}>
        Last updated: June 10, 2026
      </p>

      <div style={{
        background: '#13131c',
        border: '1px solid rgba(200,155,60,0.18)',
        padding: '28px 28px',
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>

        <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
          By using Garret&apos;s World (<strong style={{ color: '#e8e6e0' }}>garretperez.com</strong>), you agree
          to these terms. This is a personal community site, so the rules are simple and human.
        </p>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Your Content
          </h2>
          <ul className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>You are responsible for everything you post — posts, comments, recipes, and replies.</li>
            <li>By posting, you grant this site permission to display your content publicly.</li>
            <li>Don&apos;t post anything you don&apos;t have the right to share.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Community Rules
          </h2>
          <ul className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>No harassment, hate speech, or targeted attacks against other users.</li>
            <li>No spam, unsolicited promotion, or bot activity.</li>
            <li>No illegal content of any kind.</li>
            <li>Keep it respectful — this is a community, not a battlefield.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Moderation
          </h2>
          <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
            Admins may remove content or suspend accounts that violate these rules, at their discretion
            and without prior notice. We&apos;ll try to be fair, but the final call is ours.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Disclaimer
          </h2>
          <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
            This website is provided as-is, for fun and community. There are no guarantees of uptime,
            data preservation, or fitness for any particular purpose. Use it at your own risk.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Changes
          </h2>
          <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
            These terms may be updated at any time. Continuing to use the site means you accept the
            current version.
          </p>
        </section>

        <div style={{ borderTop: '1px solid rgba(200,155,60,0.12)', paddingTop: 20 }}>
          <p className="body-text" style={{ fontSize: 11, color: '#4a3820', margin: 0 }}>
            Questions?{' '}
            <a href="mailto:garret.p92@gmail.com" style={{ color: '#c89b3c', textDecoration: 'none' }}>
              garret.p92@gmail.com
            </a>
            {' '}·{' '}
            <Link href="/privacy" style={{ color: '#6a5030', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
