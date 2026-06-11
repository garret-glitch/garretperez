// Full-screen layout for the builder — fixed overlay covering sidebar/header
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      top: 38,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      overflowY: 'auto',
      background: 'var(--bg-page)',
    }}>
      {children}
    </div>
  )
}
