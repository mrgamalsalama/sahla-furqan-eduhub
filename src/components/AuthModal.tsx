import { useState } from 'react';
import {
  X, Mail, Lock, User as UserIcon, School, Loader2,
  AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, LogIn, UserPlus
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    const { user, error } = await signInWithEmail(signInEmail, signInPassword);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (user) {
      setSuccessMessage('مرحباً بك! تم تسجيل الدخول بنجاح.');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 700);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
    const { user, error } = await signUpWithEmail(
      signUpEmail,
      signUpPassword,
      fullName,
      finalSchool
    );
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (user) {
      setSuccessMessage('تم إنشاء الحساب بنجاح! جاري الدخول إلى مساحة العمل...');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 900);
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

          <div className="flex items-center gap-3 mb-2">
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
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني للمعلم
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="teacher@school.edu"
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

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    setErrorMessage(null);
                  }}
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
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="teacher@school.com"
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
                  onClick={() => {
                    setTab('signin');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-blue-900 font-medium"
                >
                  لديك حساب بالفعل؟ <span className="font-bold text-blue-900 underline">سجّل دخولك</span>
                </button>
              </div>
            </form>
          )}

          {/* Gentle Guest Note */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              💡 يمكنك دائماً استخدام المنصة وتوليد وتصدير كافة الدروس كمعلم زائر بدون تسجيل حساب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
