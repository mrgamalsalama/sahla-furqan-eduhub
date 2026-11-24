import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video, Play, Pause, RotateCcw, Plus, Trash2, Edit3, CheckCircle2,
  AlertCircle, Sparkles, Download, Printer, FileSpreadsheet, FileText,
  Clock, X, Eye, RefreshCw, Share2, Copy, Check, QrCode, ExternalLink
} from 'lucide-react';
import type { UILang } from '@/lib/i18n';
import type { VideoQuestion, InteractiveVideoProject } from '@/types';
import { generateInteractiveVideoQuestions } from '@/lib/gemini';
import { exportToKahootExcel, exportToDocxWorksheet, printVideoWorksheet, formatTime } from '@/lib/interactiveVideoExport';

interface InteractiveVideoStudioProps {
  uiLang: UILang;
  onNavigate?: (view: any) => void;
}

// Extract YouTube ID safely from various formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Standard watch?v=
  const match1 = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (match1 && match1[1]) return match1[1];
  // Direct 11 char ID
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

const STORAGE_PROJECTS_KEY = 'eduhub_interactive_video_projects';

// Toggle to false once QA verification of Interactive Video Studio is complete
const INTERACTIVE_VIDEO_COMING_SOON = true;

export default function InteractiveVideoStudio({ uiLang, onNavigate }: InteractiveVideoStudioProps) {
  if (INTERACTIVE_VIDEO_COMING_SOON) {
    const isAr = uiLang === 'ar';
    return (
      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full animate-fade-in"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/40 p-8 sm:p-12 text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-6">
            <Video className="w-10 h-10 text-white" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-4">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {isAr ? 'استوديو الفيديو التفاعلي الذكي' : 'Interactive Video & Quiz Studio'}
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {isAr ? 'انتظروا قريباً' : 'Coming Soon'}
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8 font-medium">
            {isAr
              ? 'نعمل حالياً على الفحص النهائي وتطوير استوديو الفيديو التفاعلي لضمان عمله بأعلى دقة وكفاءة دون أي أخطاء. سيتاح قريباً لجميع المعلمين والطلاب.'
              : 'We are currently completing final testing and quality assurance for the Interactive Video Studio to ensure a seamless, error-free experience. It will be available soon.'}
          </p>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors cursor-pointer shadow-sm"
            >
              <span>{isAr ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return <InteractiveVideoStudioWorkspace uiLang={uiLang} onNavigate={onNavigate} />;
}

function InteractiveVideoStudioWorkspace({ uiLang }: InteractiveVideoStudioProps) {
  const isAr = uiLang === 'ar';

  // ── Project State ──
  const [videoInputUrl, setVideoInputUrl] = useState('https://www.youtube.com/watch?v=L0k-enzoeOM');
  const [activeYoutubeId, setActiveYoutubeId] = useState('L0k-enzoeOM');
  const [videoTitle, setVideoTitle] = useState('Mitosis: Splitting Up is Complicated - Crash Course Biology #12');
  const [grade, setGrade] = useState('Grade 9');
  const [subject, setSubject] = useState('الأحياء والعلوم (Biology)');
  const [dokLevel, setDokLevel] = useState('DOK 2 (تطبيق ومفاهيم)');
  const [questionCount, setQuestionCount] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [videoContext, setVideoContext] = useState('');
  const [isLoadingVideoMeta, setIsLoadingVideoMeta] = useState(false);

  // ── Video Timing State ──
  const [videoDuration, setVideoDuration] = useState(630); // In seconds
  const [currentTime, setCurrentTime] = useState(0);
  const [startTrim, setStartTrim] = useState(0);
  const [endTrim, setEndTrim] = useState(630);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Questions & Editing ──
  const [questions, setQuestions] = useState<VideoQuestion[]>([
    {
      id: 'q1',
      timestamp: 45,
      timeFormatted: '00:45',
      question: 'ما هي المرحلة الأولى من دورة حياة الخلية التي تتضاعف فيها المادة الوراثية؟',
      type: 'mcq',
      options: ['الطور البيني (Interphase)', 'الطور التمهيدي (Prophase)', 'الطور الاستوائي (Metaphase)', 'الطور الانفصالي (Anaphase)'],
      correctAnswer: 'الطور البيني (Interphase)',
      explanation: 'الطور البيني يمثل أكثر من 90% من زمن الدورة وفيه يتم تضاعف الـ DNA ونمو الخلية.',
      dokLevel: 'DOK 1',
    },
    {
      id: 'q2',
      timestamp: 120,
      timeFormatted: '02:00',
      question: 'في الطور الاستوائي، تصطف الكروموسومات على خط استواء الخلية.',
      type: 'true_false',
      options: ['صحيح (True)', 'خطأ (False)'],
      correctAnswer: 'صحيح (True)',
      explanation: 'تصطف الكروموسومات المزدوجة بدقة في منتصف الخلية بفضل خيوط المغزل.',
      dokLevel: 'DOK 2',
    },
    {
      id: 'q3',
      timestamp: 210,
      timeFormatted: '03:30',
      question: 'ماذا سيحدث للخلية إذا انفصلت الكروماتيدات دون تنظيم صحيح لخيوط المغزل؟',
      type: 'open',
      options: [],
      correctAnswer: 'حدوث اختلال في عدد الكروموسومات في الخلايا الناتجة وتلف جيني',
      explanation: 'عدم التوزيع المتساوي يؤدي لحدوث طفرات أو موت مبرمج للخلية (Aneuploidy).',
      dokLevel: 'DOK 3',
    },
  ]);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // ── Modes: 'editor' | 'student-preview' ──
  const [mode, setMode] = useState<'editor' | 'student-preview'>('editor');

  // ── Student Preview Interactivity State ──
  const [activePromptQuestion, setActivePromptQuestion] = useState<VideoQuestion | null>(null);
  const [studentSelectedOption, setStudentSelectedOption] = useState<string>('');
  const [studentAnswerSubmitted, setStudentAnswerSubmitted] = useState(false);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [studentScore, setStudentScore] = useState({ correct: 0, total: 0 });

  // ── Generation & Loading State ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // YouTube IFrame Player API Ref
  const playerIframeRef = useRef<HTMLIFrameElement>(null);
  const timeTrackerIntervalRef = useRef<any>(null);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Load new YouTube URL and automatically fetch actual video title & metadata
  async function handleApplyVideoUrl() {
    const id = extractYouTubeId(videoInputUrl);
    if (!id) {
      showToast(isAr ? 'يرجى إدخال رابط يوتيوب صحيح' : 'Please enter a valid YouTube URL', 'error');
      return;
    }
    setActiveYoutubeId(id);
    setCurrentTime(0);
    setAnsweredQuestionIds([]);
    setActivePromptQuestion(null);

    // Fetch official video metadata (title, author) via YouTube oEmbed
    setIsLoadingVideoMeta(true);
    try {
      const fullUrl = `https://www.youtube.com/watch?v=${id}`;
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(fullUrl)}&format=json`);
      if (oembedRes.ok) {
        const meta = await oembedRes.json();
        if (meta.title) {
          setVideoTitle(meta.title);
          showToast(
            isAr
              ? `تم تحميل وتحديد الفيديو: "${meta.title.slice(0, 45)}..."`
              : `Loaded: "${meta.title.slice(0, 45)}..."`,
            'success'
          );
        }
      } else {
        showToast(isAr ? 'تم تحميل مشغل الفيديو بنجاح!' : 'Video player loaded!', 'success');
      }
    } catch {
      showToast(isAr ? 'تم تحميل مشغل الفيديو بنجاح!' : 'Video player loaded!', 'success');
    } finally {
      setIsLoadingVideoMeta(false);
    }
  }

  // Handle AI Question Generation
  async function handleGenerateAiQuestions() {
    setIsGenerating(true);
    setGenerationMsg(isAr ? 'جاري تحليل محتوى الفيديو وتوليد الأسئلة المتزامنة بدقة...' : 'Analyzing video content & generating questions...');
    try {
      const res = await generateInteractiveVideoQuestions({
        videoTitle,
        videoUrl: `https://www.youtube.com/watch?v=${activeYoutubeId}`,
        duration: videoDuration,
        startTrim,
        endTrim,
        questionCount,
        dokLevel,
        grade,
        subject,
        lang: isAr ? 'ar' : 'en',
        customPrompt,
        videoContext,
      });

      if (res && res.questions && res.questions.length > 0) {
        // Sort questions chronologically
        const sorted = [...res.questions].sort((a, b) => a.timestamp - b.timestamp);
        setQuestions(sorted);
        showToast(
          isAr
            ? `تم توليد ${sorted.length} أسئلة تفاعلية ذكية بنجاح عبر (${res.engine || 'AI Engine'})!`
            : `Generated ${sorted.length} interactive questions!`,
          'success'
        );
      } else {
        throw new Error('لم يتم استرجاع أسئلة');
      }
    } catch (err: any) {
      console.error(err);
      showToast(isAr ? 'حدث خطأ أثناء التوليد، يرجى المحاولة مرة أخرى.' : 'Error generating questions.', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationMsg('');
    }
  }

  // Add question at current timestamp
  function handleAddQuestionAtCurrentTime() {
    const timestamp = Math.floor(currentTime);
    const newQ: VideoQuestion = {
      id: `q_${Date.now()}`,
      timestamp,
      timeFormatted: formatTime(timestamp),
      question: isAr ? 'سؤال تفاعلي جديد عند هذه النقطة...' : 'New interactive question at this timestamp...',
      type: 'mcq',
      options: ['الخيار 1 (صحيح)', 'الخيار 2', 'الخيار 3', 'الخيار 4'],
      correctAnswer: 'الخيار 1 (صحيح)',
      explanation: isAr ? 'تغذية راجعة توضح المفهوم للطلاب.' : 'Explanation for student understanding.',
      dokLevel: 'DOK 2',
    };

    const updated = [...questions, newQ].sort((a, b) => a.timestamp - b.timestamp);
    setQuestions(updated);
    setSelectedQuestionId(newQ.id);
    showToast(isAr ? `تمت إضافة سؤال عند الدقيقة ${formatTime(timestamp)}` : `Added question at ${formatTime(timestamp)}`, 'success');
  }

  function handleDeleteQuestion(id: string) {
    setQuestions(questions.filter((q) => q.id !== id));
    if (selectedQuestionId === id) setSelectedQuestionId(null);
  }

  function handleUpdateQuestion(id: string, updates: Partial<VideoQuestion>) {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, ...updates };
          if (updates.timestamp !== undefined) {
            updated.timeFormatted = formatTime(updates.timestamp);
          }
          return updated;
        }
        return q;
      }).sort((a, b) => a.timestamp - b.timestamp)
    );
  }

  // Seek video to specific second
  function seekTo(seconds: number) {
    setCurrentTime(seconds);
    if (playerIframeRef.current?.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
    }
  }

  // Play / Pause video via postMessage
  function togglePlayPause() {
    const willPlay = !isPlaying;
    setIsPlaying(willPlay);
    if (playerIframeRef.current?.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: willPlay ? 'playVideo' : 'pauseVideo' }),
        '*'
      );
    }
  }

  // Continuous timer simulation for interactive trigger check
  useEffect(() => {
    if (isPlaying && !activePromptQuestion) {
      timeTrackerIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;

          // Check if we hit an interactive question in student preview mode
          if (mode === 'student-preview') {
            const hitQuestion = questions.find(
              (q) => Math.abs(q.timestamp - next) <= 1 && !answeredQuestionIds.includes(q.id)
            );

            if (hitQuestion) {
              setIsPlaying(false);
              setActivePromptQuestion(hitQuestion);
              setStudentSelectedOption('');
              setStudentAnswerSubmitted(false);
              // Pause YouTube
              if (playerIframeRef.current?.contentWindow) {
                playerIframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'pauseVideo' }),
                  '*'
                );
              }
            }
          }

          if (next >= endTrim) {
            setIsPlaying(false);
            return endTrim;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timeTrackerIntervalRef.current) clearInterval(timeTrackerIntervalRef.current);
    }

    return () => {
      if (timeTrackerIntervalRef.current) clearInterval(timeTrackerIntervalRef.current);
    };
  }, [isPlaying, activePromptQuestion, mode, questions, answeredQuestionIds, endTrim]);

  // Submit student answer in preview mode
  function handleStudentSubmitAnswer() {
    if (!activePromptQuestion || !studentSelectedOption) return;
    setStudentAnswerSubmitted(true);
    const isCorrect =
      studentSelectedOption.trim().toLowerCase() ===
      activePromptQuestion.correctAnswer.trim().toLowerCase();

    setStudentScore((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  }

  // Resume video after answering
  function handleStudentResumeVideo() {
    if (activePromptQuestion) {
      setAnsweredQuestionIds([...answeredQuestionIds, activePromptQuestion.id]);
    }
    setActivePromptQuestion(null);
    setStudentSelectedOption('');
    setStudentAnswerSubmitted(false);
    setIsPlaying(true);
    if (playerIframeRef.current?.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo' }),
        '*'
      );
    }
  }

  // Active Project Data
  const currentProject: InteractiveVideoProject = useMemo(() => {
    return {
      id: `proj_${activeYoutubeId}`,
      title: videoTitle,
      videoUrl: `https://www.youtube.com/watch?v=${activeYoutubeId}`,
      youtubeId: activeYoutubeId,
      duration: videoDuration,
      startTrim,
      endTrim,
      grade,
      subject,
      dokLevel,
      questions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [activeYoutubeId, videoTitle, videoDuration, startTrim, endTrim, grade, subject, dokLevel, questions]);

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 🌿 Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>نمط Edpuzzle & Wayground الذكي</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                {questions.length} أسئلة تفاعلية متزامنة
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Video className="w-8 h-8 text-indigo-400 shrink-0" />
              <span>{isAr ? 'استوديو الفيديو التفاعلي والأسئلة المتزامنة' : 'Interactive Video & Quiz Studio'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'حوّل أي فيديو تعليمي إلى تجربة تعلم نشطة وتفاعلية: أسئلة تتوقف تلقائياً عند الدقيقة المحددة، تصدير لكاهوت، وأوراق عمل ذكية مطبوعة.'
                : 'Turn any educational video into an engaging interactive quiz with timestamps, Kahoot export, and printable worksheets.'}
            </p>
          </div>

          {/* Actions & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Share Interactive Link Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition shadow-lg hover:shadow-amber-500/20"
            >
              <Share2 className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'مشاركة الرابط مع الطلاب 🚀' : 'Share Student Link 🚀'}</span>
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-indigo-500/30">
              <button
                type="button"
                onClick={() => {
                  setMode('editor');
                  setActivePromptQuestion(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  mode === 'editor'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{isAr ? 'المحرر' : 'Authoring'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('student-preview');
                  setCurrentTime(0);
                  seekTo(0);
                  setAnsweredQuestionIds([]);
                  setStudentScore({ correct: 0, total: 0 });
                  setActivePromptQuestion(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  mode === 'student-preview'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4 text-emerald-300" />
                <span>{isAr ? 'تجربة الطالب' : 'Student Mode'}</span>
              </button>
            </div>
          </div>

          {mode === 'student-preview' && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-4 py-2 flex items-center gap-3 text-xs text-emerald-200">
              <span className="font-bold">{isAr ? 'نقاط الطالب:' : 'Student Score:'}</span>
              <span className="font-extrabold text-white text-sm bg-emerald-600/60 px-2.5 py-0.5 rounded-md">
                {studentScore.correct} / {studentScore.total} ({questions.length} {isAr ? 'أسئلة متزامنة' : 'questions'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Setup & Video URL Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={videoInputUrl}
              onChange={(e) => setVideoInputUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=kYUP7h37b60 or Video ID"
              className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            <Video className="w-4 h-4 text-slate-400 absolute inset-y-0 start-3 my-auto" />
          </div>

          <button
            type="button"
            disabled={isLoadingVideoMeta}
            onClick={handleApplyVideoUrl}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingVideoMeta ? 'animate-spin' : ''}`} />
            <span>{isLoadingVideoMeta ? (isAr ? 'جاري التحقق...' : 'Loading...') : (isAr ? 'تحميل الفيديو' : 'Load Video')}</span>
          </button>
        </div>

        {/* Video Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'عنوان الدرس / الفيديو:' : 'Lesson / Video Title:'}
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder={isAr ? 'اكتب عنوان الفيديو الدقيق لربط الأسئلة به...' : 'Exact video title...'}
              className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'المادة الدراسية:' : 'Subject:'}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'المرحلة والصف:' : 'Grade Level:'}
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'عمق المعرفة DOK:' : 'DOK Depth:'}
            </label>
            <select
              value={dokLevel}
              onChange={(e) => setDokLevel(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="DOK 1">DOK 1 (تذكر واسترجاع)</option>
              <option value="DOK 2">DOK 2 (تطبيق ومفاهيم)</option>
              <option value="DOK 3">DOK 3 (تفكير استراتيجي وتحليل)</option>
              <option value="DOK 4">DOK 4 (تفكير ممتد وبحث)</option>
            </select>
          </div>
        </div>

        {/* Video Key Concepts & Discussion Summary */}
        <div className="pt-1">
          <label className="font-bold text-slate-700 block mb-1 text-xs flex items-center justify-between">
            <span>{isAr ? 'المفاهيم المحورية ونقاط الشرح داخل الفيديو (لضمان تطابق الأسئلة 100%):' : 'Key Concepts / Discussion Points in Video (for 100% Quiz Match):'}</span>
            <span className="text-[10px] text-slate-400 font-normal">{isAr ? 'اختياري ولكن يُوصى به لربط أدق' : 'Optional but recommended'}</span>
          </label>
          <input
            type="text"
            value={videoContext}
            onChange={(e) => setVideoContext(e.target.value)}
            placeholder={isAr ? 'مثال: أطوار الانقسام المتساوي، دور الخيوط المغزلية، وظيفة السنترومير، الفرق بين الخلايا الحيوانية والنباتية...' : 'e.g. Mitosis phases, spindle fibers function, cytokinesis...'}
            className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── Main Workspace: Player & Interactive Timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Video Player & Visual Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 relative aspect-video flex items-center justify-center">
            {activeYoutubeId ? (
              <iframe
                ref={playerIframeRef}
                className="w-full h-full object-cover"
                src={`https://www.youtube.com/embed/${activeYoutubeId}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&rel=0`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="text-center p-8 text-slate-400 text-xs">
                {isAr ? 'يرجى إدخال رابط يوتيوب صالح لعرض المشغل' : 'Enter a valid YouTube URL to view the player'}
              </div>
            )}

            {/* Student Mode Interactive Modal Overlay */}
            {mode === 'student-preview' && activePromptQuestion && (
              <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md p-5 flex flex-col justify-center items-center text-white animate-in fade-in duration-200">
                <div className="max-w-lg w-full bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-start">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs">
                        ?
                      </span>
                      <div>
                        <span className="text-xs font-bold text-indigo-300 block">
                          {isAr ? 'سؤال توقف تفاعلي' : 'Interactive Stop Point'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          عند الدقيقة {formatTime(activePromptQuestion.timestamp)}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {activePromptQuestion.dokLevel || 'DOK 2'}
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <h3 className="font-black text-base sm:text-lg text-white leading-relaxed">
                    {activePromptQuestion.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2">
                    {activePromptQuestion.type === 'mcq' || activePromptQuestion.type === 'true_false' ? (
                      activePromptQuestion.options.map((opt, idx) => {
                        const isSelected = studentSelectedOption === opt;
                        const isCorrect = opt.trim().toLowerCase() === activePromptQuestion.correctAnswer.trim().toLowerCase();

                        let optClass = 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200';
                        if (studentAnswerSubmitted) {
                          if (isCorrect) {
                            optClass = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                          } else if (isSelected) {
                            optClass = 'bg-rose-950/80 border-rose-500 text-rose-200';
                          }
                        } else if (isSelected) {
                          optClass = 'bg-indigo-900/60 border-indigo-400 text-white ring-2 ring-indigo-400/30';
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={studentAnswerSubmitted}
                            onClick={() => setStudentSelectedOption(opt)}
                            className={`w-full p-3 rounded-2xl border text-start text-xs sm:text-sm font-semibold transition flex items-center justify-between ${optClass}`}
                          >
                            <span>{opt}</span>
                            {studentAnswerSubmitted && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            {studentAnswerSubmitted && !isCorrect && isSelected && (
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div>
                        <textarea
                          rows={3}
                          value={studentSelectedOption}
                          disabled={studentAnswerSubmitted}
                          onChange={(e) => setStudentSelectedOption(e.target.value)}
                          placeholder={isAr ? 'اكتب إجابتك التحليلية هنا...' : 'Type your answer here...'}
                          className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Explanation after submit */}
                  {studentAnswerSubmitted && activePromptQuestion.explanation && (
                    <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAr ? 'التغذية الراجعة والشرح:' : 'Explanation:'}</span>
                      </div>
                      <p className="leading-relaxed">{activePromptQuestion.explanation}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {!studentAnswerSubmitted ? (
                      <button
                        type="button"
                        disabled={!studentSelectedOption}
                        onClick={handleStudentSubmitAnswer}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition disabled:opacity-40"
                      >
                        {isAr ? 'تأكيد الإجابة والتحقق' : 'Submit Answer'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStudentResumeVideo}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>{isAr ? 'استئناف مشاهدة الفيديو' : 'Continue Video'}</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Player Controls & Interactive Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            
            {/* Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ps-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => seekTo(0)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
                </div>
              </div>

              {/* Add Question at current time */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestionAtCurrentTime}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs border border-indigo-200 transition shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? `إضافة سؤال عند (${formatTime(currentTime)})` : `Add Question at ${formatTime(currentTime)}`}</span>
                </button>
              </div>
            </div>

            {/* Visual Timeline Bar with Pins */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{isAr ? 'المحرر الزمني التفاعلي للأسئلة (Interactive Timeline):' : 'Interactive Timeline:'}</span>
                <span className="text-[11px] text-indigo-600 font-bold">
                  {questions.length} {isAr ? 'نقاط توقف تفاعلية' : 'Stops'}
                </span>
              </div>

              <div className="relative w-full h-8 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden cursor-pointer select-none">
                {/* Progress bar */}
                <div
                  className="h-full bg-indigo-500/20 transition-all duration-100"
                  style={{ width: `${Math.min(100, (currentTime / Math.max(1, videoDuration)) * 100)}%` }}
                />

                {/* Range Trim Visualization */}
                <div
                  className="absolute inset-y-0 bg-teal-500/10 border-x border-teal-500/40 pointer-events-none"
                  style={{
                    left: `${(startTrim / videoDuration) * 100}%`,
                    width: `${((endTrim - startTrim) / videoDuration) * 100}%`,
                  }}
                />

                {/* Markers / Pins for each question */}
                {questions.map((q, idx) => {
                  const leftPercent = Math.min(98, Math.max(2, (q.timestamp / Math.max(1, videoDuration)) * 100));
                  const isSelected = selectedQuestionId === q.id;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(q.timestamp);
                        setSelectedQuestionId(q.id);
                      }}
                      style={{ left: `${leftPercent}%` }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all shadow-md z-20 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-125'
                          : 'bg-indigo-600 text-white hover:scale-110'
                      }`}
                      title={`${formatTime(q.timestamp)}: ${q.question}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Range Trimming Sliders */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-bold">{isAr ? 'وقت البداية:' : 'Start:'}</span>
                  <input
                    type="range"
                    min={0}
                    max={endTrim - 10}
                    value={startTrim}
                    onChange={(e) => setStartTrim(Number(e.target.value))}
                    className="w-24 sm:w-32 accent-indigo-600"
                  />
                  <span className="font-mono text-indigo-700 font-bold">{formatTime(startTrim)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold">{isAr ? 'وقت النهاية:' : 'End:'}</span>
                  <input
                    type="range"
                    min={startTrim + 10}
                    max={videoDuration}
                    value={endTrim}
                    onChange={(e) => setEndTrim(Number(e.target.value))}
                    className="w-24 sm:w-32 accent-indigo-600"
                  />
                  <span className="font-mono text-indigo-700 font-bold">{formatTime(endTrim)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Multi-Format Export Hub */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>{isAr ? 'أدوات التصدير المتعددة (Multi-Format Export Hub)' : 'Export Hub'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr ? 'صدّر بنك الأسئلة المتزامنة لكاهوت، أو ملف Word، أو ورقة عمل مطبوعة برمز QR' : 'Export synchronized questions to Kahoot, Word, or printable worksheet'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Share Interactive Student Link */}
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 text-start transition group shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-950 block">{isAr ? 'رابط الطالب التفاعلي' : 'Student Interactive Link'}</span>
                    <span className="text-[10px] text-amber-800 font-bold">{isAr ? 'مشاركة مباشرة + QR' : 'Share Link + QR'}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {isAr ? 'إنشاء رابط مباشر ورمز QR يفتح وضع الطالب التفاعلي فوراً للمشاهدة وحل الأسئلة.' : 'Generate live student URL and QR code for student mode.'}
                </p>
              </button>

              {/* Kahoot Excel */}
              <button
                type="button"
                onClick={() => {
                  exportToKahootExcel(currentProject);
                  showToast(isAr ? 'تم تصدير ملف كاهوت Excel بنجاح!' : 'Kahoot Excel exported!', 'success');
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-start transition group shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-purple-950 block">تصدير كاهوت (Excel)</span>
                    <span className="text-[10px] text-purple-700">قالب Kahoot المعتمد</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  ملف .xlsx جاهز للاستيراد المباشر في كاهوت مع المؤقت والخيارات.
                </p>
              </button>

              {/* Word Docx */}
              <button
                type="button"
                onClick={async () => {
                  await exportToDocxWorksheet(currentProject);
                  showToast(isAr ? 'تم تصدير ملف Word بنجاح!' : 'Word Worksheet exported!', 'success');
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 border border-blue-200 text-start transition group shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-blue-950 block">مستند Word (.docx)</span>
                    <span className="text-[10px] text-blue-700">ورقة عمل رسمية</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  ملف وورد منسق ومروّس بشعار المدرسة ونموذج إجابة في النهاية.
                </p>
              </button>

              {/* Print Worksheet with QR */}
              <button
                type="button"
                onClick={() => {
                  printVideoWorksheet(currentProject);
                  showToast(isAr ? 'جاري فتح نافذة الطباعة...' : 'Opening print preview...', 'info');
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 text-start transition group shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block">طباعة ورقة عمل (QR)</span>
                    <span className="text-[10px] text-emerald-700">جاهزة للتوزيع الفوري</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  ورقة عمل مطبوعة مزودة برمز QR يتيح للطالب فتح الفيديو بالجوال.
                </p>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): AI Generation & Question Editor */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* AI Generator Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 rounded-3xl border border-indigo-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'توليد الأسئلة الذكية (AI)' : 'AI Question Generator'}</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Groq 70B & Gemini
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'عدد الأسئلة المطلوب توليدها:' : 'Number of Questions:'}
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'توجيهات إضافية للمعلم (اختياري):' : 'Custom Teacher Prompt:'}
                </label>
                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={isAr ? 'مثال: ركز على المصطلحات بالإنجليزية مع شرح بالعربية...' : 'e.g. Focus on definitions and problem solving...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateAiQuestions}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-xs sm:text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{generationMsg || (isAr ? 'جاري التوليد...' : 'Generating...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isAr ? 'توليد الأسئلة المتزامنة بالذكاء الاصطناعي' : 'Generate Timestamped Questions'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Question Editor Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black text-slate-900">
                {selectedQuestion ? (isAr ? `تعديل السؤال (${selectedQuestion.timeFormatted})` : 'Edit Question') : (isAr ? 'قائمة الأسئلة التفاعلية' : 'Interactive Questions')}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {questions.length} أسئلة
              </span>
            </div>

            {selectedQuestion ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">التوقيت الزمني (بالثواني):</label>
                    <span className="font-mono text-indigo-700 font-bold">{formatTime(selectedQuestion.timestamp)}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={videoDuration}
                    value={selectedQuestion.timestamp}
                    onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { timestamp: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نص السؤال التفاعلي:</label>
                  <textarea
                    rows={2}
                    value={selectedQuestion.question}
                    onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { question: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع السؤال:</label>
                  <select
                    value={selectedQuestion.type}
                    onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { type: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="mcq">اختيار من متعدد (MCQ)</option>
                    <option value="true_false">صح أو خطأ (True / False)</option>
                    <option value="open">سؤال مقالي مفتوح (Open-ended)</option>
                  </select>
                </div>

                {selectedQuestion.type === 'mcq' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">الخيارات (حدد الصحيح في الحقل التالي):</label>
                    {selectedQuestion.options.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...selectedQuestion.options];
                          newOpts[idx] = e.target.value;
                          handleUpdateQuestion(selectedQuestion.id, { options: newOpts });
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                      />
                    ))}
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الإجابة الصحيحة بالضبط:</label>
                  <input
                    type="text"
                    value={selectedQuestion.correctAnswer}
                    onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { correctAnswer: e.target.value })}
                    className="w-full p-2 rounded-xl border border-emerald-300 bg-emerald-50/50 font-bold text-emerald-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الشرح والتغذية الراجعة الفورية:</label>
                  <textarea
                    rows={2}
                    value={selectedQuestion.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { explanation: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                    className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف هذا السؤال</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQuestionId(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    إغلاق التعديل
                  </button>
                </div>
              </div>
            ) : (
              /* Questions List View */
              <div className="space-y-2 max-h-[460px] overflow-y-auto pe-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestionId(q.id);
                      seekTo(q.timestamp);
                    }}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/70 hover:border-indigo-300 transition cursor-pointer text-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-indigo-700 font-mono">
                        #{idx + 1} ⏱️ {formatTime(q.timestamp)}
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-700">
                        {q.type.toUpperCase()}
                      </span>
                    </div>

                    <div className="font-black text-slate-800 line-clamp-2">
                      {q.question}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="truncate text-emerald-700 font-bold">
                        ✓ {q.correctAnswer}
                      </span>
                      <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 🚀 Share Interactive Video Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {isAr ? 'مشاركة الفيديو التفاعلي مع الطلاب' : 'Share Interactive Video with Students'}
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    {isAr ? 'روابط مباشرة، رمز QR، وتضمين لمنصات LMS' : 'Direct student link, QR code, and LMS embed'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Direct Student Link Box */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 flex items-center justify-between">
                  <span>{isAr ? 'رابط المشاركة المباشر للطلاب:' : 'Direct Student Link:'}</span>
                  <span className="text-[11px] text-emerald-600 font-bold">{isAr ? 'يفتح وضع الطالب التفاعلي فوراً' : 'Opens Student Mode'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/?view=interactive-video&v=${activeYoutubeId}` : `https://ais-pre-re4y64m44xrgn26t43hi4p-913035130719.europe-west2.run.app/?view=interactive-video&v=${activeYoutubeId}`}
                    className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-slate-50 text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?view=interactive-video&v=${activeYoutubeId}` : `https://ais-pre-re4y64m44xrgn26t43hi4p-913035130719.europe-west2.run.app/?view=interactive-video&v=${activeYoutubeId}`;
                      navigator.clipboard.writeText(shareUrl);
                      setIsCopied(true);
                      showToast(isAr ? 'تم نسخ الرابط بنجاح!' : 'Link copied to clipboard!', 'success');
                      setTimeout(() => setIsCopied(false), 2500);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
                <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                      typeof window !== 'undefined' ? `${window.location.origin}/?view=interactive-video&v=${activeYoutubeId}` : `https://ais-pre-re4y64m44xrgn26t43hi4p-913035130719.europe-west2.run.app/?view=interactive-video&v=${activeYoutubeId}`
                    )}`}
                    alt="Student QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'رمز QR للمسح بالجوال' : 'Mobile QR Code'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isAr
                      ? 'يمكن للطلاب فتح الكاميرا في هواتفهم أو أجهزتهم اللوحية ومسح الرمز لبدء مشاهدة الفيديو وحل الأسئلة التفاعلية فوراً.'
                      : 'Students can scan this code with their phones/tablets to immediately begin the quiz.'}
                  </p>
                </div>
              </div>

              {/* Embed Code / Google Classroom instructions */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-800 block">
                  {isAr ? '💡 طرق النشر المقترحة للطلاب:' : '💡 Recommended Sharing Methods:'}
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
                  <li>
                    <strong className="text-slate-800">{isAr ? 'منصة سهلة / الفرقان / Canvas / Cypher:' : 'School LMS:'}</strong>{' '}
                    {isAr ? 'الصق الرابط كنشاط تفاعلي أو واجب إلكتروني.' : 'Paste link as an interactive assignment.'}
                  </li>
                  <li>
                    <strong className="text-slate-800">{isAr ? 'مجموعات Teams / WhatsApp:' : 'Teams / WhatsApp:'}</strong>{' '}
                    {isAr ? 'أرسل الرابط مباشرة لأولياء الأمور أو الطلاب للمذاكرة الذاتية.' : 'Share directly for flipped classroom study.'}
                  </li>
                  <li>
                    <strong className="text-slate-800">{isAr ? 'العرض الصفي المباشر:' : 'In-Class Display:'}</strong>{' '}
                    {isAr ? 'اعرض رمز الـ QR على الشاشة التفاعلية أو البروجكتور في بداية الحصة أو نهايتها.' : 'Display the QR code on the smartboard.'}
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode('student-preview');
                  setIsShareModalOpen(false);
                }}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>{isAr ? 'تجربة ما سيشاهده الطالب الآن' : 'Test Student View'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 end-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : feedbackToast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {feedbackToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedbackToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {feedbackToast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="ms-2 opacity-70 hover:opacity-100 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
