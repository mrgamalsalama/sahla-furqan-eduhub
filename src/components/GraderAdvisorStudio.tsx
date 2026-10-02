import { useState } from 'react';
import {
  FileCheck2, MessageSquareText
} from 'lucide-react';
import GraderPage from '@/components/GraderPage';
import AdvisorPage from '@/components/AdvisorPage';
import type { GenerationResult, OutputType } from '@/types';
import type { UILang } from '@/lib/i18n';

interface GraderAdvisorStudioProps {
  onBack: () => void;
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function GraderAdvisorStudio({
  onBack,
  onOpenResult,
  uiLang,
}: GraderAdvisorStudioProps) {
  const isAr = uiLang === 'ar';
  const [activeTab, setActiveTab] = useState<'grader' | 'advisor'>('grader');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 animate-fade-in">
      {/* Top Switcher Tabs */}
      <div className="flex justify-center mb-6 no-print">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl shadow-inner border border-slate-300/80">
          <button
            type="button"
            onClick={() => setActiveTab('grader')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              activeTab === 'grader'
                ? 'bg-white text-blue-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'المُصحح الذكي للخط اليدوي' : 'Handwriting Grader'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              activeTab === 'advisor'
                ? 'bg-white text-blue-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquareText className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'المستشار التربوي الذكي' : 'Pedagogical Advisor'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'grader' ? (
        <GraderPage onBack={onBack} onOpenResult={onOpenResult} uiLang={uiLang} />
      ) : (
        <AdvisorPage onBack={onBack} uiLang={uiLang} />
      )}
    </div>
  );
}
