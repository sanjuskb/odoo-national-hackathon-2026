import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Input, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      success('Logged in successfully', 'Welcome back to Brightloop.');
      // If customer, default to portal; if staff/admin, default to dashboard
      if (from) {
        navigate(from, { replace: true });
      } else {
        // Retrieve updated session to decide path
        try {
          const session = JSON.parse(localStorage.getItem('brightloop_user_session') || '{}');
          if (session.role === 'customer') {
            navigate('/portal', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch {
          navigate('/dashboard', { replace: true });
        }
      }
    } else {
      setErrorMessage(result.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1329] p-4 selection:bg-blue-600 selection:text-white">
      {/* Background subtle gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-900/40 mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to Brightloop</h1>
          <p className="text-xs text-slate-400 mt-1">
            Subscription Management & Recurring Billing Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-950/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="cursor-pointer text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className="bg-slate-950/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Create customer account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

