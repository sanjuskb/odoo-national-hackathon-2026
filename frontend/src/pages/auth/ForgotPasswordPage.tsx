import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { Input, Button, Card } from '@/components/ui';
import { authApi } from '@/api/auth';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setIsLoading(false);
      // In accordance with security best practices, confirmation is shown even if email is not found
      if (res.success || res.message) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.message || 'Unable to request password reset');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1329] p-4 selection:bg-blue-600 selection:text-white">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[30%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-900/40 mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            We will send a recovery link to your registered email
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md p-6 sm:p-8">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Check your email</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  If <strong className="text-slate-200">{email}</strong> is registered with Brightloop, you will receive a secure password reset link shortly.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="outline" size="md" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Input
                label="Registered Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-950/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2"
                rightIcon={<Send className="w-4 h-4" />}
              >
                Send Reset Link
              </Button>

              <div className="pt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

