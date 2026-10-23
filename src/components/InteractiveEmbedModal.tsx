import { useState } from 'react';
import { X, Beaker, Check, ExternalLink, Video, Sparkles } from 'lucide-react';
import { CURATED_SIMULATIONS } from '@/lib/gammaPptx';
import type { SimulationEmbed, VideoEmbed } from '@/lib/gammaPptx';

interface InteractiveEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSimulation: (sim: SimulationEmbed) => void;
  onSelectVideo: (video: VideoEmbed) => void;
  currentSimulation?: SimulationEmbed;
  currentVideo?: VideoEmbed;
}

export default function InteractiveEmbedModal({
  isOpen,
  onClose,
  onSelectSimulation,
  onSelectVideo,
  currentSimulation,
  currentVideo,
}: InteractiveEmbedModalProps) {
  const [activeTab, setActiveTab] = useState<'phet' | 'geogebra' | 'video' | 'custom'>('phet');

  // Video Inputs
  const [videoUrl, setVideoUrl] = useState(currentVideo?.url || '');
  const [videoTitle, setVideoTitle] = useState(currentVideo?.title || '');
  const [startSec, setStartSec] = useState<number>(currentVideo?.startSeconds || 0);
  const [endSec, setEndSec] = useState<number>(currentVideo?.endSeconds || 120);

  // Custom Iframe Input
  const [customUrl, setCustomUrl] = useState(currentSimulation?.embedUrl || '');
  const [customTitle, setCustomTitle] = useState(currentSimulation?.titleAr || '');

  if (!isOpen) return null;

  function handleSaveVideo() {
    if (!videoUrl.trim()) return;
    onSelectVideo({
      url: videoUrl.trim(),
      title: videoTitle.trim() || 'مقطع فيديو تعليمي',
      startSeconds: Number(startSec) || 0,
      endSeconds: Number(endSec) || undefined,
    });
    onClose();
  }

  function handleSaveCustom() {
    if (!customUrl.trim()) return;
    onSelectSimulation({
      id: `custom-${Date.now()}`,
      type: 'custom',
      titleAr: customTitle.trim() || 'محاكاة تفاعلية مخصصة',
      titleEn: 'Custom Simulation',
      subject: 'عام',
      embedUrl: customUrl.trim(),
    });
    onClose();
  }

  const phetSims = CURATED_SIMULATIONS.filter((s) => s.type === 'phet');
  const geogebraSims = CURATED_SIMULATIONS.filter((s) => s.type === 'geogebra');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-white select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Beaker className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>تضمين الوسائط التفاعلية والمحاكاة الحية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                  PhET & GeoGebra 🧪
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                أدرج تجارب علمية ومجسمات هندسية أو مقاطع فيديو تعمل مباشرة داخل الشريحة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 py-4 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('phet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'phet'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Beaker className="w-3.5 h-3.5" />
            <span>محاكاة PhET العلمية ({phetSims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geogebra')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'geogebra'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>رياضيات GeoGebra ({geogebraSims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>فيديو تعليمي آمن محدد الثواني</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>رابط محاكاة مخصص</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'phet' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {phetSims.map((sim) => {
                const isSelected = currentSimulation?.id === sim.id;
                return (
                  <div
                    key={sim.id}
                    onClick={() => {
                      onSelectSimulation(sim);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-400 ring-2 ring-teal-400/40'
                        : 'bg-slate-800/60 border-slate-700 hover:border-teal-500/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold">
                          {sim.subject}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{sim.titleAr}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{sim.titleEn}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                      <span>تضمين في الشريحة</span>
                      <span>➔</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'geogebra' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {geogebraSims.map((sim) => {
                const isSelected = currentSimulation?.id === sim.id;
                return (
                  <div
                    key={sim.id}
                    onClick={() => {
                      onSelectSimulation(sim);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-400 ring-2 ring-teal-400/40'
                        : 'bg-slate-800/60 border-slate-700 hover:border-teal-500/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold">
                          {sim.subject}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{sim.titleAr}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{sim.titleEn}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                      <span>تضمين في الشريحة</span>
                      <span>➔</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رابط فيديو YouTube التعليمي:
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان المقطع (اختياري):
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="تجربة عملية توضيحية..."
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    بدء المقطع عند (بالثواني):
                  </label>
                  <input
                    type="number"
                    value={startSec}
                    onChange={(e) => setStartSec(Number(e.target.value))}
                    min={0}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">مثال: 30 ثانية</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    إنهاء المقطع عند (بالثواني):
                  </label>
                  <input
                    type="number"
                    value={endSec}
                    onChange={(e) => setEndSec(Number(e.target.value))}
                    min={1}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">مثال: 95 ثانية</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 leading-relaxed">
                🛡️ <strong>بيئة تشغيل آمنة للطلاب:</strong> يتم تضمين الفيديو بدون إعلانات أو مقاطع مقترحة مشتتة مع التقيد التام ببدء ونهاية الثواني المحددة.
              </div>

              <button
                type="button"
                onClick={handleSaveVideo}
                disabled={!videoUrl.trim()}
                className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-40"
              >
                تضمين الفيديو في الشريحة الحالية
              </button>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رابط المحاكاة التفاعلية (HTML5 Embed / Iframe URL):
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان التجربة:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="اسم التجربة أو النشاط التفاعلي..."
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={!customUrl.trim()}
                className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-40"
              >
                تضمين الرابط التفاعلي في الشريحة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
