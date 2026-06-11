import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{
      borderTop: '1px solid rgba(200,155,60,0.14)',
      background: '#0d0d14',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '18px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Left: copyright */}
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          color: '#4a3820',
        }}>
          © {year} Garret Perez · Garret&apos;s World
        </span>

        {/* Right: links */}
        <nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms',   label: 'Terms of Service' },
            { href: 'mailto:garret.p92@gmail.com', label: 'Contact' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                color: '#6a5030',
                textDecoration: 'none',
              }}
              className="footer-link"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
