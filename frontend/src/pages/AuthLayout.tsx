import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/ui/Icon';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'receipt', title: 'Every expense in one place', text: 'Filter by date, category or amount in seconds.' },
  { icon: 'target', title: 'Budgets that warn you early', text: 'Monthly limits per category with live progress.' },
  { icon: 'reports', title: 'Reports ready to share', text: 'Charts plus CSV and Excel exports.' },
];

/** Split-screen layout for the sign-in and sign-up pages. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth__hero">
        <div className="brand brand--light">
          <span className="brand__logo">
            <Icon name="wallet" size={18} />
          </span>
          <span className="brand__name">Spendwise</span>
        </div>

        <div className="auth__pitch">
          <h2>Know where every rupee goes.</h2>
          <ul className="auth__features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="auth__feature-icon" aria-hidden="true">
                  <Icon name={f.icon} size={18} />
                </span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative preview of the budget widget */}
        <div className="auth__preview" aria-hidden="true">
          <div className="auth__preview-head">
            <span>September budget</span>
            <strong>72% used</strong>
          </div>
          <div className="auth__preview-bar">
            <span style={{ width: '72%' }} />
          </div>
          <div className="auth__preview-rows">
            <span><i style={{ background: '#2A78D6' }} />Food &amp; Dining<b>₹6,480</b></span>
            <span><i style={{ background: '#EB6834' }} />Transport<b>₹3,120</b></span>
            <span><i style={{ background: '#1BAF7A' }} />Shopping<b>₹2,940</b></span>
          </div>
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth__card">
          <div className="brand auth__mobile-brand">
            <span className="brand__logo">
              <Icon name="wallet" size={18} />
            </span>
            <span className="brand__name">Spendwise</span>
          </div>
          <h1>{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
          <DemoButton />
        </div>
      </section>
    </div>
  );
}

function DemoButton() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await startDemo();
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth__demo">
      <div className="divider">
        <span>or</span>
      </div>
      <button type="button" className="btn btn--ghost btn--block" onClick={start} disabled={busy}>
        <Icon name="sparkle" size={18} /> {busy ? 'Preparing sample data…' : 'Explore with demo data'}
      </button>
      <p className="auth__demo-note">No sign-up needed: you get a private account with 6 months of sample expenses.</p>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
