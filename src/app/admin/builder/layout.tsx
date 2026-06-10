// Full-screen layout for the builder — overrides the admin sidebar padding
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh' }}>{children}</div>
}
