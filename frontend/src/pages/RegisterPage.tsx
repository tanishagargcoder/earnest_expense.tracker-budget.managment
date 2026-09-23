import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ui/Feedback';
import { FormField } from '../components/ui/FormField';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { AuthLayout } from './AuthLayout';

interface Values {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegistration(v: Values): Partial<Values> {
  const errors: Partial<Values> = {};
  if (v.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errors.email = 'Enter a valid email address';
  if (v.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) errors.password = 'Use at least one letter and one number';
  if (v.confirmPassword !== v.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateRegistration(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start tracking in under a minute. We'll set up common categories for you.">
      <form className="form" onSubmit={handleSubmit} noValidate>
        {formError && <ErrorBanner message={formError} />}
        <FormField label="Full name" error={errors.name}>
          <input type="text" autoComplete="name" value={values.name} onChange={update('name')} />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={values.email} onChange={update('email')} />
        </FormField>
        <FormField label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
          <input type="password" autoComplete="new-password" value={values.password} onChange={update('password')} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword}>
          <input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={update('confirmPassword')} />
        </FormField>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth__switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
