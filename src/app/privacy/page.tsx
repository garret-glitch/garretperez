import Link from 'next/link'

export const metadata = {
  title: "Privacy Policy · Garret's World",
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 16px' }}>

      <h1 style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 13, color: '#c89b3c',
        letterSpacing: '0.06em', marginBottom: 6,
      }}>
        Privacy Policy
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
          Garret&apos;s World (<strong style={{ color: '#e8e6e0' }}>garretperez.com</strong>) is a personal
          community site run by Garret Perez. Here&apos;s everything you need to know about how your
          information is handled.
        </p>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            What We Store
          </h2>
          <ul className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>
              <strong style={{ color: '#e8e6e0' }}>Basic account information</strong> — your username
              and a hashed (one-way encrypted) password — stored only to make your account work.
            </li>
            <li>
              <strong style={{ color: '#e8e6e0' }}>User-generated content</strong> — posts, comments,
              recipes, and replies you submit may be publicly visible to other users of the site.
            </li>
            <li>
              <strong style={{ color: '#e8e6e0' }}>XP &amp; skill progress</strong> — earned by
              participating on the site.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            What We Don&apos;t Store
          </h2>
          <ul className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>No payment information of any kind is collected or stored.</li>
            <li>No email address, real name, or phone number is required to register.</li>
            <li>No advertising cookies or third-party tracking scripts.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Your Data, Your Rights
          </h2>
          <ul className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>
              Your information will <strong style={{ color: '#e8e6e0' }}>never be sold</strong> to
              third parties.
            </li>
            <li>
              You may request complete account deletion at any time by emailing{' '}
              <a href="mailto:garret.p92@gmail.com" style={{ color: '#c89b3c', textDecoration: 'none' }}>
                garret.p92@gmail.com
              </a>.
              We will process requests within 30 days.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Age Requirement
          </h2>
          <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
            This site is intended for users <strong style={{ color: '#e8e6e0' }}>13 years of age or older</strong>.
            If you are under 13, please do not create an account.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c', letterSpacing: '0.08em', marginBottom: 10 }}>
            Changes
          </h2>
          <p className="body-text" style={{ fontSize: 12, color: '#a09880', lineHeight: 1.7, margin: 0 }}>
            If this policy changes in a meaningful way, an announcement will be posted on the site.
            Continued use after changes means you accept the updated policy.
          </p>
        </section>

        <div style={{ borderTop: '1px solid rgba(200,155,60,0.12)', paddingTop: 20 }}>
          <p className="body-text" style={{ fontSize: 11, color: '#4a3820', margin: 0 }}>
            Questions?{' '}
            <a href="mailto:garret.p92@gmail.com" style={{ color: '#c89b3c', textDecoration: 'none' }}>
              garret.p92@gmail.com
            </a>
            {' '}·{' '}
            <Link href="/terms" style={{ color: '#6a5030', textDecoration: 'none' }}>
              Terms of Service
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
