import { Icon, type IconName } from './Icon'
export function EmptyState({
  icon,
  title,
  children,
  compact = false
}: {
  icon: IconName
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={`empty-state ${compact ? 'compact-empty' : ''}`}>
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <div className="empty-description">{children}</div>
    </div>
  )
}
