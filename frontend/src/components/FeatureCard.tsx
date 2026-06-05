import type { FeatureCardProps } from '../types'

/**
 * FeatureCard component displays a feature navigation card with icon, title, description, and CTA.
 * Used on the landing page to showcase all major application features.
 */
export default function FeatureCard({ 
  icon, 
  title, 
  description, 
  ctaText, 
  onClick,
  disabled = false,
  comingSoon = false 
}: FeatureCardProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div 
      className={`feature-card ${disabled ? 'feature-card-disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${title}${comingSoon ? ', coming soon' : ''}`}
      aria-disabled={disabled}
      data-testid="feature-card"
    >
      <div className="feature-card-icon" aria-hidden="true">
        {icon}
      </div>
      
      <div className="feature-card-content">
        <h3 className="feature-card-title">{title}</h3>
        <p className="feature-card-description">{description}</p>
      </div>
      
      <div className="feature-card-footer">
        {comingSoon && (
          <span className="coming-soon-badge" aria-label="coming soon">
            Coming Soon
          </span>
        )}
        
        {!disabled && !comingSoon && onClick && (
          <button 
            className="feature-card-cta btn-primary"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            aria-label={`Go to ${title}`}
          >
            {ctaText}
          </button>
        )}
        
        {disabled && !comingSoon && (
          <span className="feature-card-cta feature-card-cta-disabled">
            {ctaText}
          </span>
        )}
      </div>
    </div>
  )
}
