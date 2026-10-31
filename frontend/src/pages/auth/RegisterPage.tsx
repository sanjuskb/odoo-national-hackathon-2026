import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Check, X, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { validatePasswordCriteria, isPasswordValid } from '@/lib/validators';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const passwordCriteria = validatePasswordCriteria(password);
  const isValidPass = isPasswordValid(password);
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidPass) {
      setErrorMessage('Please ensure your password satisfies all required security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both entries.');
      return;
    }

    setIsLoading(true);
    const result = await register({
      email,
      password,
      full_name: fullName,
    });
    setIsLoading(false);

    if (result.success) {
      success('Account created successfully', 'You can now sign in with your credentials.');
      navigate('/login');
    } else {
      setErrorMessage(result.message || 'Registration failed. Email may already be in use.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1329] p-4 selection:bg-blue-600 selection:text-white">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-[20%] right-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-900/40 mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Customer Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your subscriptions, invoices and billing portal
          </p>
        </div>

        {/* Register Card */}
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
                label="Full Name / Company Name"
                type="text"
                required
                placeholder="Jane Doe (Acme Corp)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                className="bg-slate-950/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
              />
            </div>

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
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Create secure password"
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

              {/* Password criteria checklist (Official Problem Statement FR-001/SEC-001) */}
              <div className="mt-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Password Requirements:
                </p>
                {passwordCriteria.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    {c.isValid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className={c.isValid ? 'text-slate-300' : 'text-slate-500'}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Re-enter secure password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="cursor-pointer text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className={`bg-slate-950/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 ${
                  confirmPassword && !passwordsMatch ? 'border-rose-500/80 focus:border-rose-500' : ''
                }`}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-rose-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isValidPass || !passwordsMatch || !confirmPassword || !email || !fullName}
              className="w-full mt-3"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Register Account
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

