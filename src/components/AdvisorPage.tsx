import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import type { UILang } from '@/lib/i18n';
import { askEducationalAdvisor, type ChatMessage } from '@/lib/gemini';

interface AdvisorPageProps {
  onBack: () => void;
  uiLang: UILang;
}

const QUICK_PROMPTS_AR = [
  'عندي طالب ذكي لكنه قليل التركيز وسريع التشتت، كيف أتعامل معه؟',
  'اقترح عليّ نشاط تمهيدي مشوق وحركي لدرس قواعد جاف.',
  'كيف أطبق التعلم بالتمايز في فصل يحتوي على 30 طالباً متفاوتي المستوى؟',
  'أحتاج خطة سريعة لاجتماع مع ولي أمر طالب يرفض حل الواجبات المنزلية.',
];

const QUICK_PROMPTS_EN = [
  'I have a bright student who is easily distracted. How should I engage them?',
  'Suggest an engaging kinesthetic warm-up activity for a dry grammar lesson.',
  'How do I implement differentiated learning in a large class with diverse abilities?',
  'I need a quick action plan for a meeting with a parent whose child refuses homework.',
];

export default function AdvisorPage({ onBack, uiLang }: AdvisorPageProps) {
  const isAr = uiLang === 'ar';
  const quickPrompts = isAr ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await askEducationalAdvisor(messages, text, uiLang);
      setMessages([...updatedHistory, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: isAr
            ? 'عذراً، تشهد الخدمة ضغطاً حالياً، يرجى المحاولة بعد لحظات.'
            : 'Service is temporarily busy, please try again shortly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 flex flex-col min-h-[600px] h-[calc(100vh-12rem)]">
      {/* شريط علوي */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4 bg-white/70 p-3.5 rounded-2xl shadow-xs">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-slate-700 hover:text-blue-900">
          <BackIcon className="w-4 h-4" />
          {isAr ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse"></span>
          <span className="text-xs sm:text-sm font-bold text-slate-800">
            {isAr ? 'المستشار التربوي جاهز' : 'Pedagogical Advisor Ready'}
          </span>
        </div>
      </div>

      {/* منطقة المحادثة */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 bg-gray-50/50 rounded-2xl border border-gray-100">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {isAr ? 'مرحباً بك يا معلمنا العزيز' : 'Welcome, Educator'}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm mb-6">
              {isAr
                ? 'أنا مستشارك التربوي المساعد. اطرح أي تحدٍ صفي، أو استفسار عن استراتيجيات التدريس، أو حلول لسلوكيات الطلاب.'
                : 'I am your AI pedagogical advisor. Ask about classroom strategies, student engagement, or behavioral management.'}
            </p>

            {/* بطاقات الأسئلة السريعة */}
            <div className="grid sm:grid-cols-2 gap-3 text-start max-w-2xl mx-auto">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="p-3 text-sm text-gray-700 bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-200 rounded-xl transition text-start flex items-start gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-1">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none text-sm text-gray-500 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-xs mr-2">{isAr ? 'جاري صياغة الاستشارة...' : 'Formulating guidance...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* شريط الإدخال */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-4 flex items-center gap-2 bg-white border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 rounded-xl p-1.5 shadow-sm"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isAr ? 'اطرح استفسارك أو مشكلتك التعليمية هنا...' : 'Type your question or teaching challenge here...'}
          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent text-gray-800"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn-primary p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </form>
    </div>
  );
}
