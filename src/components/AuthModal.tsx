import { useState } from 'react';
import {
  X, Mail, Lock, User as UserIcon, School, Loader2,
  AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, LogIn, UserPlus,
  ArrowLeft
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  defaultTab?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTab = 'signin',
}: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up fields
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [schoolSelect, setSchoolSelect] = useState('أكاديمية سهلة الدولية');
  const [customSchool, setCustomSchool] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Status & errors
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [suggestSignUp, setSuggestSignUp] = useState(false);
  const [suggestSignIn, setSuggestSignIn] = useState(false);

  if (!isOpen) return null;

  function handleSwitchToSignUpWithPrefill() {
    setSignUpEmail(signInEmail);
    setSignUpPassword(signInPassword);
    setTab('signup');
    setErrorMessage(null);
    setSuggestSignUp(false);
  }

  function handleSwitchToSignInWithPrefill() {
    setSignInEmail(signUpEmail);
    setSignInPassword(signUpPassword);
    setTab('signin');
    setErrorMessage(null);
    setSuggestSignIn(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSuggestSignUp(false);

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    const { user, error, isCredentialsError } = await signInWithEmail(signInEmail, signInPassword);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      if (isCredentialsError) {
        setSuggestSignUp(true);
      }
      return;
    }

    if (user) {
      setSuccessMessage('مرحباً بك! تم تسجيل الدخول بنجاح.');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 600);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSuggestSignIn(false);

    if (!fullName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMessage('يرجى ملء كافة بيانات التسجيل المطلوبة.');
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMessage('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    const finalSchool = schoolSelect === 'مدرسة أخرى'
      ? (customSchool.trim() || 'مدرسة شقيقة')
      : schoolSelect;

    setLoading(true);
    const { user, session, error, isAlreadyRegistered } = await signUpWithEmail(
      signUpEmail,
      signUpPassword,
      fullName,
      finalSchool
    );
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      if (isAlreadyRegistered) {
        setSuggestSignIn(true);
      }
      return;
    }

    if (user) {
      if (!session) {
        setSuccessMessage('تم إنشاء حسابك بنجاح! إذا كانت رسالة التفعيل مفعلة، يرجى مراجعة بريدك الإلكتروني.');
      } else {
        setSuccessMessage('تم إنشاء الحساب بنجاح! جاري الدخول إلى مساحة العمل...');
      }
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print" dir="rtl">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                منصة سهلة & الفرقان التعليمية
              </h3>
              <p className="text-xs text-blue-200/90 font-medium">
                بوابة المعلم للمزامنة السحابية والمكتبة العامة
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 m-4 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMessage(null);
              setSuggestSignUp(false);
              setSuggestSignIn(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'signin'
                ? 'bg-white text-blue-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-teal-600" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMessage(null);
              setSuggestSignUp(false);
              setSuggestSignIn(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'signup'
                ? 'bg-white text-blue-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-teal-600" />
            <span>إنشاء حساب جديد</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 pb-6 pt-1">
          {/* Error Banner with Smart Action */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-shake">
              <div className="flex items-start gap-2.5 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>

              {/* One-click Action to register if user doesn't exist */}
              {suggestSignUp && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-700 font-semibold">هل الحساب جديد؟</span>
                  <button
                    type="button"
                    onClick={handleSwitchToSignUpWithPrefill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-100/50 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold shadow-2xs transition"
                  >
                    <span>تسجيل حساب جديد بهذه البيانات</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* One-click Action to login if user is already registered */}
              {suggestSignIn && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-700 font-semibold">مسجل مسبقاً؟</span>
                  <button
                    type="button"
                    onClick={handleSwitchToSignInWithPrefill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-100/50 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold shadow-2xs transition"
                  >
                    <span>الانتقال لتسجيل الدخول</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="اسم المستخدم أو البريد (مثل: gamalsalama)"
                    className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleSwitchToSignUpWithPrefill}
                  className="text-xs text-slate-500 hover:text-blue-900 font-medium"
                >
                  ليس لديك حساب بعد؟ <span className="font-bold text-blue-900 underline">أنشئ حساباً جديداً</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المعلم الرباعي / الكامل
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أ/ أحمد محمد سالم"
                    className="w-full pr-10 pl-4 py-2.2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="teacher@school.com أو gamalsalama"
                    className="w-full pr-10 pl-4 py-2.2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المدرسة التابع لها
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={schoolSelect}
                    onChange={(e) => setSchoolSelect(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="أكاديمية سهلة الدولية">أكاديمية سهلة الدولية (Sahlah Academy)</option>
                    <option value="مدارس الفرقان العالمية">مدارس الفرقان العالمية (Al-Furqan Schools)</option>
                    <option value="مدرسة أخرى">مدرسة أخرى / شقيقة</option>
                  </select>
                </div>
                {schoolSelect === 'مدرسة أخرى' && (
                  <input
                    type="text"
                    placeholder="اكتب اسم مدرستك..."
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور (6 أحرف أو أرقام فأكثر)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-10 py-2.2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ إنشاء الحساب...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء حسابي والبدء فوراً</span>
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleSwitchToSignInWithPrefill}
                  className="text-xs text-slate-500 hover:text-blue-900 font-medium"
                >
                  لديك حساب بالفعل؟ <span className="font-bold text-blue-900 underline">سجّل دخولك</span>
                </button>
              </div>
            </form>
          )}

          {/* Optional One-Click Google Sign In */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="relative flex py-1 items-center mb-2.5">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink-0 mx-3 text-[11px] text-slate-400 font-semibold">أو بنقرة واحدة</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'جارٍ الاتصال بـ Google...' : 'تسجيل الدخول السريع بحساب Google'}</span>
            </button>
          </div>

          {/* Gentle Guest Note */}
          <div className="mt-3 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              💡 يمكنك دائماً استخدام المنصة وتوليد وتصدير كافة الدروس كمعلم زائر بدون تسجيل حساب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
