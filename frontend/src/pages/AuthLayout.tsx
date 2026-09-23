import type { ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth__hero" aria-hidden="true">
        <div className="brand brand--light">
          <span className="brand__logo">
            <Icon name="wallet" size={18} />
          </span>
          <span className="brand__name">Spendwise</span>
        </div>
        <div>
          <h2>Know where every rupee goes.</h2>
          <p>Track expenses, set monthly budgets per category and export clean reports in seconds.</p>
        </div>
      </section>
      <section className="auth__panel">
        <div className="auth__card">
          <h1>{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
