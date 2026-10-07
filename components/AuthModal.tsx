import React, { useState } from 'react';
import { AppUser } from '../types';
import { getGoogleSignInErrorMessage, signInWithGoogleAndLoadAppUser } from '../services/firebase';
import { AlertCircle, CheckCircle2, Crown, Loader2, X } from 'lucide-react';

interface AuthModalProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onLoginSuccess: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onClose?: () => void;
  forceOpen?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ currentUser, onLoginSuccess, onClose, forceOpen = false }) => {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogleAndLoadAppUser();
      if (user) onLoginSuccess({ ...user, lastLoginAt: new Date().toISOString() });
    } catch (err) {
      setError(getGoogleSignInErrorMessage(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[115] bg-black/55 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <section className="apple-glass rounded-[28px] p-6 sm:p-7 w-full max-w-md border border-black/[0.1] shadow-2xl space-y-5 bg-white/95">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1D1D1F] text-[#C49746] flex items-center justify-center shadow-md">
              <Crown size={21} className="fill-[#C49746]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1D1D1F]">{currentUser ? 'تبديل الحساب' : 'تسجيل الدخول'}</h2>
              <p className="text-xs text-[#86868B] mt-1">الدخول باستخدام حساب Google موثّق ومصرّح به</p>
            </div>
          </div>
          {!forceOpen && onClose && (
            <button type="button" onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#86868B] flex items-center justify-center">
              <X size={16} />
            </button>
          )}
        </header>

        {error && (
          <div role="alert" className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full min-h-12 px-4 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-sm font-black shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isSigningIn ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          <span>{isSigningIn ? 'جارٍ التحقق من الحساب والصلاحية…' : 'المتابعة باستخدام Google'}</span>
        </button>

        <p className="text-[11px] leading-5 text-center text-[#6E6E73]">
          لا يكفي امتلاك حساب Google للدخول؛ يجب أن يضيف المالك البريد الإلكتروني ويحدد الدور والصلاحيات.
        </p>
      </section>
    </div>
  );
};

export default AuthModal;
