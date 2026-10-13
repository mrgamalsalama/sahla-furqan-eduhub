import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Sparkles, Loader2, Play, Square,
  X, Check, AlertCircle, ArrowLeft, ArrowRight, Wand2
} from 'lucide-react';
import { parseAndGenerateVoiceToLesson } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import type { GenerationResult, OutputType } from '@/types';

interface VoiceToLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResult?: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
  defaultSubject?: string;
  defaultGrade?: string;
}

// Preset examples for instant testing and inspiration
const PRESET_EXAMPLES_AR = [
  {
    title: 'الانقسام الميتوزي (علوم 9)',
    text: 'أريد خطة لدرس عن الانقسام الميتوزي للصف التاسع، مع نشاط مجموعات مدته 10 دقائق وتجربة مجهرية واختبار قصير من 5 أسئلة.',
  },
  {
    title: 'الطاقة المتجددة وتغير المناخ',
    text: 'خطة درس تفاعلية عن مصادر الطاقة المتجددة للصف الثامن، تتضمن محاكاة عملية لتصميم توربين رياح ومسألة استقصائية واقعية.',
  },
  {
    title: 'المفعول المطلق (لغة عربية 7)',
    text: 'تحضير درس نموذجي عن المفعول المطلق وأنواعه للصف السابع، مع أنشطة تمايز تراعي الفروق الفردية وأمثلة قرآنية وأدبية.',
  },
  {
    title: 'الاحتمالات والإحصاء (رياضيات 10)',
    text: 'خطة درس عن حساب الاحتمال المشروط للصف العاشر مع لعبة نرد تفاعلية ومسائل حياتية في الطب والتأمين.',
  },
];

const PRESET_EXAMPLES_EN = [
  {
    title: 'Mitosis Cell Division (Grade 9)',
    text: 'I want a comprehensive lesson plan on Mitosis for 9th grade, with a 10-minute collaborative group activity, a microscope laboratory station, and a 5-question formative assessment.',
  },
  {
    title: 'Renewable Clean Energy (Grade 8)',
    text: 'A lesson plan on renewable energy sources for 8th grade with a hands-on wind turbine prototyping challenge and DOK-3 critical thinking prompts.',
  },
];

export default function VoiceToLessonModal({
  isOpen,
  onClose,
  onOpenResult,
  uiLang,
  defaultSubject,
  defaultGrade,
}: VoiceToLessonModalProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setError(null);
    }
  }, [isOpen]);

  function startRecording() {
    setError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setError(
        isAr
          ? 'المتصفح لا يدعم ميزة التعرف الصوتي المباشر. يمكنك كتابة أو لصق أفكارك في الصندوق أدناه.'
          : 'Direct speech recognition is not supported in this browser. You can type or paste your thoughts below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = isAr ? 'ar-SA' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError(
            isAr
              ? 'تم رفض إذن استخدام الميكروفون. يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.'
              : 'Microphone permission was denied. Please allow microphone access in browser settings.'
          );
        } else if (event.error !== 'no-speech') {
          setError(isAr ? `تنبيه الميكروفون: ${event.error}` : `Mic alert: ${event.error}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
      setError(err?.message || 'تعذر تشغيل الميكروفون.');
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function formatTimer(totalSecs: number) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async function handleGenerateFromVoice() {
    if (!transcript.trim()) {
      setError(
        isAr
          ? 'يرجى تسجيل صوتك أولاً أو كتابة فكرة الدرس في الصندوق.'
          : 'Please record your voice or write your lesson idea first.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    stopRecording();

    try {
      const response = await parseAndGenerateVoiceToLesson({
        voiceTranscript: transcript.trim(),
        autoGenerate: true,
        targetSubject: defaultSubject,
        targetGrade: defaultGrade,
        contentLanguage: isAr ? 'ar' : 'en',
      });

      if (response?.contentHtml && response?.title) {
        onClose();
        if (onOpenResult) {
          onOpenResult(
            { contentHtml: response.contentHtml, title: response.title },
            'lesson-plan'
          );
        }
      } else {
        throw new Error('لم يتم استلام خطة درس صالحة.');
      }
    } catch (err: any) {
      console.error('Voice-to-Lesson error:', err);
      setError(err?.message || 'حدث خطأ أثناء معالجة التسجيل وتوليد الخطة.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const presets = isAr ? PRESET_EXAMPLES_AR : PRESET_EXAMPLES_EN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span>{isAr ? 'تحويل التسجيل الصوتي إلى خطة درس كاملة' : 'Voice-to-Lesson Plan AI'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-blue-950">
                  {isAr ? 'صوتي فوري 🎤' : 'Live Voice 🎤'}
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                {isAr
                  ? 'تحدث لمدة دقيقة بأفكارك وتوجيهاتك وسيقوم الذكاء الاصطناعي ببناء خطة درس رسمية متكاملة'
                  : 'Speak your lesson goals, duration, group work, and activities to build an official plan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Microphone Interactive Stage */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 relative overflow-hidden text-center">
            {/* Visual Pulses when recording */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-rose-500/10 animate-ping" />
                <div className="w-44 h-44 rounded-full bg-rose-500/10 animate-pulse" />
              </div>
            )}

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-300'
                  : 'bg-gradient-to-br from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 text-white hover:scale-105'
              }`}
            >
              {isRecording ? <Square className="w-7 h-7 fill-white" /> : <Mic className="w-8 h-8" />}
            </button>

            {/* Recording Status & Timer */}
            <div className="mt-4 relative z-10">
              {isRecording ? (
                <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>{isAr ? 'جارٍ الاستماع والتسجيل...' : 'Listening & transcribing...'}</span>
                  <span className="font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md text-xs">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>
              ) : (
                <div className="text-slate-600 text-xs font-semibold">
                  {isAr
                    ? 'اضغط على الميكروفون للتحدث، أو اكتب أفكارك مباشرة في المربع أدناه'
                    : 'Click the mic to speak, or write/edit your thoughts directly below'}
                </div>
              )}
            </div>
          </div>

          {/* Transcript Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-900" />
                <span>{isAr ? 'التفريغ الصوتي وأفكار المعلم (يمكنك التعديل والإضافة):' : 'Speech Transcript & Teacher Thoughts:'}</span>
              </span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  {isAr ? 'مسح النص' : 'Clear'}
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال صوتي: أريد خطة لدرس عن الانقسام الميتوزي للصف التاسع، مع نشاط مجموعات مدته 10 دقائق وتجربة مجهرية واختبار قصير من 5 أسئلة...'
                  : 'Example: I want a lesson plan on Mitosis for 9th grade, with a 10-minute collaborative group activity, a microscope lab, and a 5-question quiz...'
              }
              className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 leading-relaxed resize-none shadow-xs"
            />
          </div>

          {/* Quick Presets / Test Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isAr ? 'أمثلة سريعة للتجربة الفورية بنقرة زر:' : 'Quick Voice Prompts to Try:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTranscript(preset.text)}
                  className="text-start p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition text-xs group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-blue-900 flex items-center justify-between">
                    <span>{preset.title}</span>
                    <Arrow className="w-3 h-3 text-slate-400 group-hover:text-blue-900 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{preset.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleGenerateFromVoice}
            disabled={loading || !transcript.trim()}
            className="btn-primary py-2.5 px-6 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جارٍ تحليل الصوت وبناء الخطة...' : 'Analyzing voice & building plan...'}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>{isAr ? 'توليد الخطة التعليمية فوراً (Instant AI)' : 'Generate Full Lesson Plan'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
