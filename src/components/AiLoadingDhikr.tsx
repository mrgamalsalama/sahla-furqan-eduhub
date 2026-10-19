import { useState, useEffect } from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface AiLoadingDhikrProps {
  loading: boolean;
  message?: string;
  uiLang?: 'ar' | 'en';
}

const DHIKR_PHRASES = [
  'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ ﷺ',
  'صلّ على الحبيب قلبك يطيب ﷺ',
  'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
  'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
  'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلاً، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلاً',
  'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
];

export default function AiLoadingDhikr({
  loading,
  message = 'جاري إعداد وصياغة المحتوى التعليمي بأعلى جودة...',
  uiLang = 'ar',
}: AiLoadingDhikrProps) {
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [fade, setFade] = useState(true);
  const isAr = uiLang === 'ar';

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setDhikrIndex((prev) => (prev + 1) % DHIKR_PHRASES.length);
        setFade(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in no-print" dir="rtl">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-emerald-100 flex flex-col items-center relative overflow-hidden">
        {/* Subtle decorative glowing background */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-teal-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Spiritual Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-4 shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{isAr ? 'استثمر ثواني الانتظار في ذكر الله' : 'Remember Allah while waiting'}</span>
        </div>

        {/* Dynamic Glowing Pulsing Orb */}
        <div className="relative w-20 h-20 flex items-center justify-center mb-5">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-lg transform rotate-3">
            <span className="text-2xl font-serif font-bold">ﷺ</span>
          </div>
        </div>

        {/* Main Processing Message */}
        <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mb-1 leading-snug">
          {message}
        </h4>
        <p className="text-xs text-slate-500 mb-6 font-medium">
          {isAr ? 'يتم الآن ضبط المعايير بدقة عالية والتشكيل والتحقق الأكاديمي' : 'Applying academic standards & verification'}
        </p>

        {/* Rotating Dhikr / Salawat Box */}
        <div
          onClick={() => setClickCount((c) => c + 1)}
          className="w-full p-4 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 cursor-pointer hover:border-emerald-400 transition-all duration-300 shadow-2xs group active:scale-[0.99]"
          title={isAr ? 'اضغط لترديد الصلاة على النبي' : 'Tap to praise'}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1.5">
            <span>{isAr ? '🌿 عِطْرُ الْأَوْقَاتِ' : 'Spiritual Blessing'}</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>{clickCount > 0 ? `${clickCount} صلوات` : (isAr ? 'اضغط للترديد' : 'Tap')}</span>
            </span>
          </div>
          <div
            className={`font-serif text-base sm:text-lg text-emerald-950 font-bold transition-opacity duration-300 min-h-[52px] flex items-center justify-center ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {DHIKR_PHRASES[dhikrIndex]}
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-400 font-medium">
          {isAr ? 'قال ﷺ: «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا»' : 'Whoever sends blessings upon me, Allah sends ten upon them.'}
        </div>
      </div>
    </div>
  );
}
