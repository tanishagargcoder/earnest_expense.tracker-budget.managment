import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { validateRegistration } from '../pages/RegisterPage';

function renderLogin(auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    user: null,
    status: 'unauthenticated',
    login: vi.fn(),
    register: vi.fn(),
    startDemo: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}

describe('<LoginPage />', () => {
  it('validates before calling the API', async () => {
    const auth = renderLogin({});
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('signs in and redirects to the dashboard', async () => {
    const auth = renderLogin({ login: vi.fn().mockResolvedValue(undefined) });
    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Demo@1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(auth.login).toHaveBeenCalledWith('demo@example.com', 'Demo@1234');
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
  });

  it('shows the error returned by the API', async () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError('401', 'ERR_BAD_REQUEST', config, {}, {
      status: 401, statusText: '', headers: {}, config,
      data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
    });
    renderLogin({ login: vi.fn().mockRejectedValue(error) });
    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('demo access', () => {
  it('starts a demo session and opens the dashboard', async () => {
    const auth = renderLogin({ startDemo: vi.fn().mockResolvedValue(undefined) });
    await userEvent.click(screen.getByRole('button', { name: /explore with demo data/i }));
    expect(auth.startDemo).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
  });
});

describe('validateRegistration', () => {
  const valid = { name: 'Asha', email: 'asha@example.com', password: 'secret123', confirmPassword: 'secret123' };

  it('accepts valid data', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('checks password strength and confirmation', () => {
    expect(validateRegistration({ ...valid, password: 'short1', confirmPassword: 'short1' }).password).toBeDefined();
    expect(validateRegistration({ ...valid, password: 'lettersonly', confirmPassword: 'lettersonly' }).password).toBeDefined();
    expect(validateRegistration({ ...valid, confirmPassword: 'different1' }).confirmPassword).toBe('Passwords do not match');
  });
});
