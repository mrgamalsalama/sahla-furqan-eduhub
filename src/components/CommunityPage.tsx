import { useState, useEffect } from 'react';
import {
  Globe, Search, Sparkles, Heart, MessageSquare, Copy,
  Check, FileText, ClipboardList, Layers, Presentation, FileQuestion,
  Send, X, Clock, LogIn
} from 'lucide-react';
import type { SavedLesson, ResourceComment } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN } from '@/types';
import type { UILang } from '@/lib/i18n';
import {
  getPublicCommunityResources,
  likeCommunityResource,
  getResourceComments,
  addResourceComment,
  saveCloudResource,
} from '@/lib/supabase';
import { saveLesson } from '@/lib/storage';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface CommunityPageProps {
  onOpenLesson: (lesson: SavedLesson) => void;
  uiLang: UILang;
  user: SupabaseUser | null;
  onSignIn: () => void;
}

const outputIcons: Record<string, typeof ClipboardList> = {
  'lesson-plan': ClipboardList,
  'worksheet': Layers,
  'quiz': FileQuestion,
  'qti-exam': FileQuestion,
  'slides': Presentation,
  'standardized-test': FileQuestion,
};

const outputLabelsAr: Record<string, string> = {
  'lesson-plan': 'خطة درس معيارية',
  'worksheet': 'ورقة عمل بهرم بلوم',
  'quiz': 'بنك اختبارات',
  'qti-exam': 'اختبار QTI إلكتروني',
  'slides': 'عرض تقديمي شرائح',
  'standardized-test': 'اختبار معياري',
};

export default function CommunityPage({
  onOpenLesson,
  uiLang,
  user,
  onSignIn,
}: CommunityPageProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [resources, setResources] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Comment Drawer state
  const [activeCommentsResource, setActiveCommentsResource] = useState<SavedLesson | null>(null);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Cloned feedback
  const [clonedId, setClonedId] = useState<string | null>(null);
  // Liked set
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Load public resources
  useEffect(() => {
    loadResources();
  }, [selectedSubject, selectedGrade, selectedType]);

  async function loadResources() {
    setLoading(true);
    try {
      const data = await getPublicCommunityResources({
        subject: selectedSubject,
        grade: selectedGrade,
        outputType: selectedType,
        search: search.trim() || undefined,
      });
      setResources(data);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadResources();
  }

  async function handleLike(resourceId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (likedIds.has(resourceId)) return;

    setLikedIds((prev) => new Set(prev).add(resourceId));
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r))
    );

    await likeCommunityResource(resourceId);
  }

  // Clone / Remix into personal workspace
  async function handleClone(resource: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();

    const clonedLesson: SavedLesson = {
      ...resource,
      id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: isAr ? `نسخة: ${resource.title}` : `Copy of ${resource.title}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: false,
      likesCount: 0,
      commentsCount: 0,
    };

    // Save locally
    saveLesson(clonedLesson);

    // If user is logged in, also sync to cloud
    if (user) {
      await saveCloudResource(clonedLesson, user, false);
    }

    setClonedId(resource.id);
    setTimeout(() => setClonedId(null), 2500);
  }

  // Open comments drawer
  async function handleOpenComments(resource: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveCommentsResource(resource);
    setCommentsLoading(true);
    const data = await getResourceComments(resource.id);
    setComments(data);
    setCommentsLoading(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCommentsResource || !newComment.trim() || !user) return;

    setSubmittingComment(true);
    const res = await addResourceComment(activeCommentsResource.id, newComment, user);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewComment('');
      // update resource comment count
      setResources((prev) =>
        prev.map((r) =>
          r.id === activeCommentsResource.id
            ? { ...r, commentsCount: (r.commentsCount || 0) + 1 }
            : r
        )
      );
    }
    setSubmittingComment(false);
  }

  function formatDate(ts?: number | string): string {
    if (!ts) return '';
    try {
      const time = typeof ts === 'string' ? new Date(ts).getTime() : ts;
      return new Date(time).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-6 sm:p-10 mb-8 shadow-xl border border-blue-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 text-xs font-bold mb-3 shadow-xs">
              <Globe className="w-4 h-4 text-teal-400" />
              <span>{isAr ? 'المكتبة العامة المشتركة بين المدارس' : 'Inter-School Shared Educator Hub'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
              {isAr ? 'مجتمع المعلمين والمكتبة العامة للدروس والاختبارات' : 'Teacher Innovation Community & Resource Hub'}
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-medium">
              {isAr
                ? 'استعرض وشارك أفضل خطط الدروس، وأوراق العمل المصنفة بهرم بلوم، والعروض التقديمية، وبنوك الاختبارات المنشورة من قبل نخبة معلمي أكاديمية سهلة ومدارس الفرقان.'
                : 'Browse, clone, and remix quality lesson plans, worksheets, presentations, and exam banks published by accredited educators.'}
            </p>
          </div>

          {!user && (
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center shrink-0 max-w-xs">
              <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-bold mb-1 text-white">
                {isAr ? 'شارك أعمالك مع الزملاء' : 'Share with Colleagues'}
              </div>
              <p className="text-xs text-blue-100 mb-3">
                {isAr ? 'سجل دخولك أو أنشئ حسابك لنشر دروسك في المكتبة العامة وحفظها سحابياً.' : 'Sign in or register to publish to the community and sync across devices.'}
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-950 font-bold text-xs rounded-xl shadow-md hover:bg-blue-50 transition"
              >
                <LogIn className="w-4 h-4 text-blue-900" />
                <span>{isAr ? 'تسجيل الدخول / حساب جديد' : 'Sign In / Register'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card p-5 mb-8 shadow-xs border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search text */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'ابحث عن درس، موضوع، أو اختبار بالكلمات المفتاحية...' : 'Search lessons, worksheets, or exams...'}
              className="w-full ps-9 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Subject Filter */}
          <div className="w-full sm:w-auto min-w-[150px]">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isAr ? 'كل المواد' : 'All Subjects'}</option>
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {isAr ? sub.ar : sub.en}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isAr ? 'كل الصفوف' : 'All Grades'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-auto min-w-[160px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isAr ? 'كل الأنواع' : 'All Types'}</option>
              <option value="lesson-plan">{isAr ? 'خطط الدروس' : 'Lesson Plans'}</option>
              <option value="worksheet">{isAr ? 'أوراق العمل' : 'Worksheets'}</option>
              <option value="slides">{isAr ? 'العروض التقديمية' : 'Slides Decks'}</option>
              <option value="quiz">{isAr ? 'بنوك الاختبارات' : 'Exam Banks'}</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
          >
            {isAr ? 'تصفية النتائج' : 'Filter'}
          </button>
        </form>
      </div>

      {/* Grid of Community Resources */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">
            {isAr ? 'جارٍ تحميل موارد مجتمع المعلمين...' : 'Loading community resources...'}
          </p>
        </div>
      ) : resources.length === 0 ? (
        <div className="card p-16 text-center border-dashed border-2 border-slate-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">
            {isAr ? 'لا توجد موارد منشورة تطابق هذا البحث حالياً' : 'No Community Resources Found'}
          </h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
            {isAr
              ? 'كن أول من يشارك درساً أو ورقة عمل مميزة مع زملائك المعلمين عبر تبويب "مكتبتي" وتفعيل زر "نشر في المجتمع"!'
              : 'Be the first to publish a quality lesson or worksheet from "My Library" by turning on "Publish to Community"!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resources.map((item) => {
            const Icon = outputIcons[item.outputType] || FileText;
            const typeLabel = outputLabelsAr[item.outputType] || (isAr ? 'مستند تعليمي' : 'Resource');
            const isLiked = likedIds.has(item.id);
            const isCloned = clonedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onOpenLesson(item)}
                className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-500 transition-all duration-150 cursor-pointer"
              >
                <div>
                  {/* Top Bar: Teacher Avatar & Affiliation */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.userAvatar ? (
                        <img
                          src={item.userAvatar}
                          alt={item.userName || 'Teacher'}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center text-xs font-bold border border-blue-200">
                          {item.userName ? item.userName.charAt(0) : 'م'}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {item.userName || (isAr ? 'معلم متميز' : 'Educator')}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                      {item.institution === 'furqan' ? (isAr ? 'الفرقان' : 'Furqan') : (isAr ? 'سهلة' : 'Sahlah')}
                    </span>
                  </div>

                  {/* Resource Type & Subject Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                      <Icon className="w-3 h-3 text-teal-600" />
                      <span>{typeLabel}</span>
                    </span>
                    {item.settings?.subject && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.settings.subject}
                      </span>
                    )}
                    {item.settings?.grade && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.settings.grade}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2 mb-2">
                    {item.title || (isAr ? 'بدون عنوان' : 'Untitled Resource')}
                  </h3>
                </div>

                {/* Card Footer: Likes, Comments, Remix / Clone Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={(e) => handleLike(item.id, e)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-rose-600'
                      }`}
                      title={isAr ? 'إعجاب بالدرس' : 'Like'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{item.likesCount || 0}</span>
                    </button>

                    {/* Comments button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenComments(item, e)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-900 transition"
                      title={isAr ? 'نقاشات المعلمين' : 'Discussion'}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>{item.commentsCount || 0}</span>
                    </button>
                  </div>

                  {/* Remix / Clone Button */}
                  <button
                    type="button"
                    onClick={(e) => handleClone(item, e)}
                    disabled={isCloned}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs ${
                      isCloned
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-50 text-blue-950 hover:bg-blue-900 hover:text-white border border-blue-200'
                    }`}
                    title={isAr ? 'نسخ واستخدام في مساحة عملي' : 'Clone to My Library'}
                  >
                    {isCloned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تم النسخ' : 'Cloned'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isAr ? 'استخدام ونسخ' : 'Remix'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Discussion & Comments Drawer */}
      {activeCommentsResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="truncate">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">
                    {isAr ? 'مناقشات وتوصيات المعلمين' : 'Teacher Discussion'}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeCommentsResource.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCommentsResource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {commentsLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {isAr ? 'جارٍ تحميل التعليقات...' : 'Loading comments...'}
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  {isAr
                    ? 'لا توجد تعليقات بعد. شارك رأيك أو توصيتك التدريسية حول هذا المحتوى!'
                    : 'No comments yet. Share your teaching insights or tips for this lesson!'}
                </div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-[10px]">
                          {comm.userName ? comm.userName.charAt(0) : 'م'}
                        </div>
                        <span className="font-bold text-slate-900">{comm.userName}</span>
                        {comm.school && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                            {comm.school}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDate(comm.createdAt)}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium ps-6">
                      {comm.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {user ? (
                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isAr ? 'أضف رأيك أو مقترحاً تدريسياً...' : 'Add a tip or feedback...'}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال' : 'Post'}</span>
                  </button>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-600 mb-2 font-medium">
                    {isAr ? 'قم بتسجيل الدخول للمشاركة في النقاش وتبادل الخبرات مع الزملاء.' : 'Sign in to join the discussion.'}
                  </p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-4 py-1.5 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition"
                  >
                    {isAr ? 'تسجيل الدخول / حساب جديد' : 'Sign In / Register'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
