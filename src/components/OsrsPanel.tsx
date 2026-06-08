export default function OsrsPanel({
  children,
  className = '',
  dark = false,
}: {
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <div className={`${dark ? 'osrs-panel-dark' : 'osrs-panel'} ${className}`}>
      {children}
    </div>
  )
}
