import { useState } from 'react';
import { HelpCircle, Eye, EyeOff, CheckCircle2, QrCode, Sparkles, X } from 'lucide-react';
import type { FormativePoll } from '@/lib/gammaPptx';

interface InteractivePollCardProps {
  poll: FormativePoll;
  onUpdate?: (updated: FormativePoll) => void;
  isPresenter?: boolean;
}

export default function InteractivePollCard({ poll, onUpdate, isPresenter: _isPresenter = false }: InteractivePollCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(poll.revealed || false);
  const [showQrModal, setShowQrModal] = useState(false);

  const letters = ['أ', 'ب', 'ج', 'د', 'هـ'];

  function handleToggleReveal() {
    const next = !isRevealed;
    setIsRevealed(next);
    if (onUpdate) onUpdate({ ...poll, revealed: next });
  }

  // Generate an instant SVG QR code data URI cleanly
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    poll.qrUrl || window.location.href
  )}`;

  return (
    <div className="w-full my-4 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 p-5 sm:p-7 shadow-xl text-white select-none animate-in fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>سؤال التقييم التكويني والتصويت الصفي</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                تفاعل حي 📊
              </span>
            </h4>
            <p className="text-xs text-slate-400">فكّر جيداً ثم اختر الإجابة أو صوّت مع مجموعتك</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* QR Code Button */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition"
            title="عرض باركود المشاركة للجوال"
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>رمز المشاركة (QR)</span>
          </button>

          {/* Reveal Answer Toggle */}
          <button
            type="button"
            onClick={handleToggleReveal}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
              isRevealed
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>إخفاء الحل</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>👁️ كشف الإجابة والتعليل</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Question Text */}
      <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug mb-5">
        {poll.question}
      </h3>

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {poll.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = poll.correctIndex === idx;

          let cardStyle = 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200';
          if (isRevealed && isCorrect) {
            cardStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold ring-2 ring-emerald-400/50';
          } else if (isSelected) {
            cardStyle = 'bg-indigo-600/30 border-indigo-400 text-white font-bold';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOption(idx)}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between text-xs sm:text-sm font-medium ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isRevealed && isCorrect
                      ? 'bg-emerald-500 text-slate-950'
                      : isSelected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {letters[idx] || idx + 1}
                </span>
                <span className="leading-snug">{opt}</span>
              </div>

              {isRevealed && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box (Visible when revealed) */}
      {isRevealed && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm leading-relaxed animate-fade-in flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-emerald-300 font-bold mb-1">
              التعليل والشرح النموذجي:
            </strong>
            <p className="text-slate-200 font-medium">
              {poll.explanation ||
                `الإجابة الصحيحة هي (${letters[poll.correctIndex ?? 0] || '1'}) لأنها تطابق المفهوم العلمي وتستوفي شروط القاعدة بدقة.`}
            </p>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 max-w-xs w-full text-center text-white relative shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold mb-1">رمز مشاركة الطلاب (QR Code)</h4>
            <p className="text-xs text-slate-400 mb-4">وجّه الطلاب لمسح الرمز بالجوال للتصويت والمشاركة</p>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-md mb-3">
              <img
                src={qrSvgUrl}
                alt="QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            </div>

            <p className="text-[11px] text-teal-300 font-semibold">
              سهلة & الفرقان - استديو التصويت الصفي
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
