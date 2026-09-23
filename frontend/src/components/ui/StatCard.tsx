import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface StatCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: IconName;
  tone?: 'default' | 'positive' | 'negative';
  /** Highlighted "hero" card with the brand gradient. */
  featured?: boolean;
}

export function StatCard({ label, value, hint, icon, tone = 'default', featured = false }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}${featured ? ' stat-card--featured' : ''}`}>
      <div className="stat-card__top">
        <p className="stat-card__label">{label}</p>
        {icon && (
          <span className="stat-card__icon" aria-hidden="true">
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <p className="stat-card__value">{value}</p>
      {hint && <p className="stat-card__hint">{hint}</p>}
    </div>
  );
}
