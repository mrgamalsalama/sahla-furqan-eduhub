import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Heart, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { UILang } from '@/lib/i18n';

interface FooterBarakahRibbonProps {
  uiLang?: UILang;
}

const BARAKAH_SUPPLICATIONS = [
  {
    text: '«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ»',
    source: 'الصلاة على النبي ﷺ',
  },
  {
    text: '«رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي»',
    source: 'دعاء موسى عليه السلام في التيسير والبيان',
  },
  {
    text: '«اللَّهُمَّ عَلِّمْنَا مَا يَنْفَعُنَا، وَانْفَعْنَا بِمَا عَلَّمْتَنَا، وَزِدْنَا عِلْماً وَعَمَلاً مُتَقَبَّلاً»',
    source: 'دعاء طلب العلم النافع والبركة',
  },
  {
    text: '«سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ»',
    source: 'الباقيات الصالحات',
  },
  {
    text: '«يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ»',
    source: 'دعاء الكرب وتفويض الأمر لله',
  },
  {
    text: '«اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلاً، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلاً»',
    source: 'دعاء تيسير العمل والتحضير',
  },
  {
    text: '«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ»',
    source: 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان',
  },
  {
    text: '«لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ»',
    source: 'كنز من كنوز الجنة',
  },
];

const STORAGE_COLLAPSED_KEY = 'eduhub_barakah_ribbon_collapsed';

export default function FooterBarakahRibbon({ uiLang = 'ar' }: FooterBarakahRibbonProps) {
  const isAr = uiLang === 'ar';
  const [index, setIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % BARAKAH_SUPPLICATIONS.length);
    }, 45000); // changes every 45s
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % BARAKAH_SUPPLICATIONS.length);
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + BARAKAH_SUPPLICATIONS.length) % BARAKAH_SUPPLICATIONS.length);
  };

  const current = BARAKAH_SUPPLICATIONS[index];

  if (isCollapsed) {
    return (
      <aside aria-label="ركن الأذكار والبركة" className="fixed bottom-3 start-4 z-40 no-print" dir="rtl">
        <button
          type="button"
          onClick={toggleCollapse}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs font-bold shadow-lg backdrop-blur-xs border border-emerald-700/50 transition-all hover:scale-105"
          title={isAr ? 'فتح شريط الأذكار والبركة' : 'Open Dhikr Ribbon'}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{isAr ? 'ركن البركة والذكر' : 'Barakah Corner'}</span>
          <ChevronUp className="w-3.5 h-3.5 text-emerald-300" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="ركن الأذكار والبركة"
      className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white border-t border-emerald-800/40 shadow-2xl backdrop-blur-md px-4 py-2 transition-all duration-300 no-print"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        {/* Title badge & collapse */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-800/60 border border-emerald-600/40 text-emerald-200 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'ركن البركة للمعلم' : 'Educator Barakah'}</span>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-white/10 transition"
            title={isAr ? 'تصغير الشريط' : 'Collapse'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Central Rotating Dhikr Text */}
        <div className="flex-1 text-center truncate px-2">
          <span className="font-serif text-sm sm:text-base font-bold text-amber-200 tracking-wide inline-block drop-shadow-xs">
            {current.text}
          </span>
          <span className="hidden md:inline-block ms-2 text-[10px] text-emerald-400/80">
            ({current.source})
          </span>
        </div>

        {/* Navigation & interactive counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCounter((c) => c + 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-100 border border-emerald-600/40 transition active:scale-95 text-[11px] font-bold"
            title={isAr ? 'احتسب تسبيحة أو صلاة على النبي' : 'Praise counter'}
          >
            <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
            <span>{counter > 0 ? counter : (isAr ? 'صلِّ عليه ﷺ' : 'Praise')}</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-md hover:bg-white/10 text-emerald-300 hover:text-white transition"
              title={isAr ? 'الذكر السابق' : 'Previous'}
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-md hover:bg-white/10 text-emerald-300 hover:text-white transition"
              title={isAr ? 'الذكر التالي' : 'Next'}
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
