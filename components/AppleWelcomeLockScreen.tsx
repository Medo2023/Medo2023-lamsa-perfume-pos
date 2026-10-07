import React, { useEffect, useState } from 'react';
import { AppUser, DailyClosure } from '../types';
import { signInWithGoogleAndLoadAppUser } from '../services/firebase';
import { AlertCircle, Clock3, LockKeyhole, ShieldCheck, Sparkles, Store } from 'lucide-react';

interface AppleWelcomeLockScreenProps {
  users: AppUser[];
  currentClosure: DailyClosure | null;
  onUnlock: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  storeName?: string;
  storeSlogan?: string;
}

export const AppleWelcomeLockScreen: React.FC<AppleWelcomeLockScreenProps> = ({
  currentClosure,
  onUnlock,
  storeName = 'لَمْسَةُ عِطْر',
  storeSlogan = 'فخامة العطور الشرقية والفرنسية'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeFormatted = currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateFormatted = currentTime.toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const hours = currentTime.getHours();
  const greeting = hours >= 5 && hours < 12
    ? 'صباح الخير والبركة'
    : hours >= 12 && hours < 17
      ? 'مساء الخير والنشاط'
      : hours >= 17 && hours < 22
        ? 'مساء العطور والجمال'
        : 'أهلاً بك في لَمْسَةُ عِطْر';

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogleAndLoadAppUser();
      onUnlock({ ...user, lastLoginAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تسجيل الدخول. تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] min-h-screen bg-[#0B0D17] text-white flex flex-col overflow-y-auto" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[25%] -right-[15%] w-[700px] h-[700px] bg-gradient-to-br from-amber-500/15 via-[#C49746]/10 to-transparent rounded-full blur-[130px]" />
        <div className="absolute -bottom-[20%] -left-[15%] w-[650px] h-[650px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-transparent rounded-full blur-[140px]" />
      </div>

      <header className="relative z-10 px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#C49746] text-slate-950 flex items-center justify-center shadow-lg">
            <Sparkles size={19} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">{storeName}</h1>
            <p className="text-[10px] text-zinc-400">{storeSlogan}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-zinc-300">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>دخول موثّق وصلاحيات حسب الدور</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-9 w-full max-w-xl mx-auto">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-amber-300/90">
            <span>{greeting}</span>
          </div>
          <div className="text-5xl sm:text-7xl font-extralight tracking-tight text-white/95">{timeFormatted}</div>
          <div className="text-xs sm:text-sm text-zinc-400">{dateFormatted}</div>
        </div>

        <section className="w-full rounded-3xl bg-zinc-900/70 backdrop-blur-2xl border border-white/[0.12] p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-amber-300 flex items-center justify-center">
              <LockKeyhole size={20} />
            </div>
            <div>
              <h2 className="text-base font-black">تسجيل دخول آمن</h2>
              <p className="text-xs text-zinc-400 mt-1">استخدم حساب Google المعتمد لهذا الموظف</p>
            </div>
          </div>

          <div className="rounded-2xl bg-black/25 border border-white/[0.07] p-3 text-xs text-zinc-300 leading-6 flex gap-2.5">
            <Store size={16} className="text-amber-300 shrink-0 mt-1" />
            <span>
              لا توجد رموز مشتركة. يحدد النظام صلاحيات كل حساب من قائمة الموظفين المعتمدة، وتُرفض الحسابات غير المضافة أو الموقوفة.
            </span>
          </div>

          {currentClosure && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <Clock3 size={14} />
              <span>حالة الوردية: {currentClosure.status}</span>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full min-h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-[#C49746] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-wait"
          >
            {isSigningIn ? (
              <><span className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" /><span>جارٍ التحقق من الحساب والصلاحية…</span></>
            ) : (
              <><span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-base font-black text-[#4285F4]">G</span><span>المتابعة باستخدام Google</span></>
            )}
          </button>

          <p className="text-[10px] text-zinc-500 text-center leading-5">
            إذا لم يكن بريدك مضافاً، اطلب من مالك المتجر ربط حساب Google بدورك قبل الدخول.
          </p>
        </section>
      </main>
    </div>
  );
};
