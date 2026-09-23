import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page page--center">
      <h1>Page not found</h1>
      <p className="page__subtitle">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn--primary">
        Go to dashboard
      </Link>
    </div>
  );
}
