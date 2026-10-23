import { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Shuffle, CheckCircle2, RotateCcw,
  Edit3, Check, Trophy, UserCheck
} from 'lucide-react';

interface RandomStudentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_STUDENTS = [
  'أحمد بن خالد', 'عمر الفاروق', 'سعود العتيبي', 'عبد الرحمن الزهراني',
  'محمد الشهري', 'يوسف القحطاني', 'زياد الغامدي', 'علي الحربي',
  'فاطمة المطيري', 'سارة الدوسري', 'مريم القرني', 'نور السبيعي',
  'ريماس المالكي', 'ليان الشمري', 'خالد العمري', 'إبراهيم التميمي'
];

function playTickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    console.debug('Tick sound skipped:', err);
  }
}

function playWinSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.9);
    });
  } catch (err) {
    console.debug('Win sound skipped:', err);
  }
}

export default function RandomStudentPickerModal({ isOpen, onClose }: RandomStudentPickerModalProps) {
  const [students, setStudents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sahla_classroom_roster');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.debug('Failed to load roster:', err);
    }
    return DEFAULT_STUDENTS;
  });

  const [excludeCalled, setExcludeCalled] = useState(true);
  const [calledStudents, setCalledStudents] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedName, setHighlightedName] = useState<string>('');
  const [winner, setWinner] = useState<string | null>(null);

  // Roster Editor State
  const [isEditingRoster, setIsEditingRoster] = useState(false);
  const [rosterInput, setRosterInput] = useState('');

  const spinTimerRef = useRef<any>(null);

  useEffect(() => {
    if (students.length > 0 && !highlightedName) {
      setHighlightedName(students[0]);
    }
  }, [students, highlightedName]);

  if (!isOpen) return null;

  const eligibleStudents = excludeCalled
    ? students.filter((s) => !calledStudents.includes(s))
    : students;

  function handleStartSpin() {
    if (isSpinning || eligibleStudents.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    let speed = 60;
    let iterations = 0;
    const maxIterations = 28 + Math.floor(Math.random() * 8);

    function spinStep() {
      iterations++;
      const randomIdx = Math.floor(Math.random() * eligibleStudents.length);
      const chosen = eligibleStudents[randomIdx];
      setHighlightedName(chosen);
      playTickSound();

      if (iterations >= maxIterations) {
        setIsSpinning(false);
        setWinner(chosen);
        playWinSound();
        if (excludeCalled) {
          setCalledStudents((prev) => [...prev, chosen]);
        }
      } else {
        if (iterations > maxIterations - 10) {
          speed += 30; // decelerate smoothly
        }
        spinTimerRef.current = setTimeout(spinStep, speed);
      }
    }

    spinStep();
  }

  function handleResetRound() {
    setCalledStudents([]);
    setWinner(null);
  }

  function handleOpenRosterEditor() {
    setRosterInput(students.join('\n'));
    setIsEditingRoster(true);
  }

  function handleSaveRoster() {
    const cleaned = rosterInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const finalList = cleaned.length > 0 ? cleaned : DEFAULT_STUDENTS;
    setStudents(finalList);
    try {
      localStorage.setItem('sahla_classroom_roster', JSON.stringify(finalList));
    } catch (err) {
      console.debug('Failed to save roster:', err);
    }
    setCalledStudents([]);
    setWinner(null);
    setIsEditingRoster(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-white select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>قرعة اختيار الطلاب العشوائية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold">
                  تحفيز وتكافؤ الفرص
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                المتاحون للسحب: {eligibleStudents.length} من أصل {students.length} طالب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenRosterEditor}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="تعديل قائمة طلاب الفصل"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Roster Editor Mode */}
        {isEditingRoster ? (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الصق أسماء طلاب الفصل (اسم في كل سطر أو مفصولة بفواصل):
              </label>
              <textarea
                value={rosterInput}
                onChange={(e) => setRosterInput(e.target.value)}
                rows={7}
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white leading-relaxed focus:border-teal-500 focus:outline-none"
                placeholder="أحمد علي&#10;محمد خالد&#10;سارة أحمد..."
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRosterInput(DEFAULT_STUDENTS.join('\n'))}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                استعادة القائمة النموذجية
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingRoster(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoster}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-xs font-bold text-slate-950 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ القائمة</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stage / Lucky Card Display */}
            <div
              className={`relative py-10 px-6 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ${
                winner
                  ? 'bg-gradient-to-b from-teal-950/60 to-slate-900 border-teal-400 shadow-2xl shadow-teal-500/20'
                  : isSpinning
                  ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              {winner && (
                <div className="absolute top-3 inset-x-0 flex justify-center items-center gap-1.5 text-xs font-bold text-teal-300 animate-bounce">
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>طالبنا البطل المتألق للإجابة!</span>
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
              )}

              <div className="text-center">
                <span
                  className={`block text-2xl sm:text-4xl font-extrabold tracking-tight transition-all duration-150 ${
                    winner
                      ? 'text-teal-300 scale-110 drop-shadow-lg'
                      : isSpinning
                      ? 'text-indigo-300 opacity-90 scale-100'
                      : 'text-white'
                  }`}
                >
                  {highlightedName || 'جاهز للسحب...'}
                </span>

                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {isSpinning
                    ? 'جاري القرعة العشوائية...'
                    : winner
                    ? 'حظاً موفقاً! دورك للإجابة عن سؤال الشريحة 🌟'
                    : 'انقر على الزر بالأسفل لاختيار طالب عشوائياً'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="my-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeCalled}
                  onChange={(e) => setExcludeCalled(e.target.checked)}
                  className="rounded text-teal-500 focus:ring-teal-400 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <span>استبعاد الطالب المختار حتى نهاية الجولة (لتكافؤ الفرص)</span>
              </label>

              {calledStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetRound}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                  title="إعادة شمل جميع الطلاب في السحب"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بدء جولة جديدة ({calledStudents.length} شاركوا)</span>
                </button>
              )}
            </div>

            {/* Big Action Button */}
            <button
              type="button"
              disabled={isSpinning || eligibleStudents.length === 0}
              onClick={handleStartSpin}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                eligibleStudents.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 active:scale-98'
              }`}
            >
              <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>
                {eligibleStudents.length === 0
                  ? 'تمت مشاركة جميع طلاب الفصل! أعد ضبط الجولة'
                  : isSpinning
                  ? 'جارٍ سحب القرعة...'
                  : '🎯 سحب اسم عشوائي الآن'}
              </span>
            </button>

            {/* Participation History Drawer */}
            {calledStudents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>سجل المشاركين في هذه الحصة ({calledStudents.length}):</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {calledStudents.map((name, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                      <span>{name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
