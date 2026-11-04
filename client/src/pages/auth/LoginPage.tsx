import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a1217] flex flex-col justify-center items-center px-4 py-12 sm:py-20">
      {/* Sana Editorial Serif Hero Display Headline */}
      <div className="max-w-2xl w-full text-center mb-10 sm:mb-14">
        <h1 className="text-5xl sm:text-7xl lg:text-[72px] font-normal leading-[1.10] font-serif text-[#0a1217] tracking-tight">
          Nyota.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#85898b] font-normal">
          RSVP and headcount for Indian family functions.
        </p>
      </div>

      {/* Sana Dark Sign-Up / Login Panel (24px radius, Ink Black surface) */}
      <div className="max-w-md w-full bg-[#0a1217] text-white rounded-[24px] p-8 sm:p-12 border border-[#0a1217]">
        <div className="mb-8">
          <p className="text-[13px] text-[#85898b] font-normal uppercase tracking-wider mb-1.5">
            Host & Planner Portal
          </p>
          <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
            Sign in to your account
          </h2>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-[24px] bg-[#e4eff7]/10 border border-[#e4eff7]/20 flex items-start gap-3 text-[#e4eff7] text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#cdfe00] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-normal text-[#85898b] mb-2">
              Work or Personal Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="planner@demo.com"
                className="w-full pl-11 pr-4 py-3 rounded-[24px] bg-white text-[#0a1217] text-sm placeholder:text-[#85898b] border border-[#000000] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[13px] font-normal text-[#85898b]">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-[24px] bg-white text-[#0a1217] text-sm placeholder:text-[#85898b] border border-[#000000] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Electric Lime Accent Pill Button on Ink Black Surface */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 py-3.5 px-6 rounded-full bg-[#cdfe00] hover:bg-[#bfee00] active:scale-[0.99] text-[#0a1217] text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0a1217]" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#85898b]/20 text-center">
          <p className="text-[13px] text-[#85898b]">
            Need a planner account?{' '}
            <Link to="/register" className="font-medium text-white hover:text-[#cdfe00] underline underline-offset-4 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
