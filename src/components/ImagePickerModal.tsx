import { useState } from 'react';
import {
  X, Search, Image as ImageIcon, Check, Upload, Link as LinkIcon,
  ShieldCheck, Trash2
} from 'lucide-react';
import {
  SAFE_EDUCATIONAL_IMAGES,
  searchSafeImages
} from '@/lib/educationalImages';
import type { EducationalImage } from '@/lib/educationalImages';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, caption?: string) => void;
  currentImageUrl?: string;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl,
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'custom_url' | 'upload'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customUrl, setCustomUrl] = useState('');
  const [customCaption, setCustomCaption] = useState('');

  if (!isOpen) return null;

  // Filter gallery
  let filteredImages = searchSafeImages(searchQuery);
  if (selectedCategory !== 'all') {
    filteredImages = filteredImages.filter((img) => img.category === selectedCategory);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onSelectImage(base64, file.name.replace(/\.[^/.]+$/, ''));
        onClose();
      }
    };
    reader.readAsDataURL(file);
  }

  function handleApplyCustomUrl() {
    if (!customUrl.trim()) return;
    onSelectImage(customUrl.trim(), customCaption.trim() || 'صورة توضيحية');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>إدراج صورة تعليمية متوافقة مع الشريعة الإسلامية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>آمنة ومعتمدة 100%</span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                صور طبيعية وعلمية وأثرية عالية الدقة من الإنترنت بدون استهلاك رصيد الذكاء الاصطناعي.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-white text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 border-b-2 px-3 transition flex items-center gap-1.5 ${
              activeTab === 'gallery'
                ? 'border-indigo-600 text-indigo-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>مكتبة الصور التعليمية المنسقة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_url')}
            className={`pb-3 border-b-2 px-3 transition flex items-center gap-1.5 ${
              activeTab === 'custom_url'
                ? 'border-indigo-600 text-indigo-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>رابط صورة من الإنترنت (URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 border-b-2 px-3 transition flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع صورة من جهازي</span>
          </button>

          {currentImageUrl && (
            <button
              type="button"
              onClick={() => {
                onSelectImage('', '');
                onClose();
              }}
              className="mr-auto pb-3 text-rose-600 hover:text-rose-800 flex items-center gap-1 text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>إزالة الصورة من الشريحة</span>
            </button>
          )}
        </div>

        {/* Tab 1: Curated Safe Gallery */}
        {activeTab === 'gallery' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الصور: مثلاً (كتب، كيمياء، فضاء، مجهر، هندسة، نباتات)..."
                  className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
              >
                <option value="all">جميع التصنيفات</option>
                <option value="arabic_islamic">لغة عربية ودراسات إسلامية</option>
                <option value="science">علوم وأحياء وكيمياء وفيزياء</option>
                <option value="math">رياضيات وهندسة</option>
                <option value="history_geo">تاريخ وجغرافيا</option>
                <option value="tech">تكنولوجيا وحاسوب</option>
                <option value="general">تعليم عام وأدوات صفية</option>
              </select>
            </div>

            {/* Grid of Images */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                لا توجد صور تطابق بحثك حالياً، جرب كلمة أخرى أو اختر تصنيفاً عاماً.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      onSelectImage(img.url, img.titleAr);
                      onClose();
                    }}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition hover:shadow-md hover:scale-[1.02] ${
                      currentImageUrl === img.url
                        ? 'border-teal-500 ring-2 ring-teal-500'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={img.thumbnailUrl}
                        alt={img.titleAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5 bg-white text-right">
                      <p className="text-[11px] font-bold text-slate-800 line-clamp-1">
                        {img.titleAr}
                      </p>
                      <span className="text-[9px] text-slate-500 font-medium">
                        {img.tags.slice(0, 3).join(' · ')}
                      </span>
                    </div>

                    {currentImageUrl === img.url && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custom URL */}
        {activeTab === 'custom_url' && (
          <div className="p-6 space-y-4 max-w-lg mx-auto w-full my-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رابط الصورة المباشر من الإنترنت:
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... أو أي رابط صورة مباشر"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تعليق أو وصف الصورة (اختياري):
              </label>
              <input
                type="text"
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                placeholder="مثال: مجرة درب التبانة"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold transition shadow-sm"
            >
              تطبيق الصورة على الشريحة
            </button>
          </div>
        )}

        {/* Tab 3: Upload from Device */}
        {activeTab === 'upload' && (
          <div className="p-8 text-center max-w-md mx-auto w-full my-auto space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:border-indigo-400 transition bg-slate-50/50 flex flex-col items-center">
              <Upload className="w-10 h-10 text-indigo-500 mb-3" />
              <p className="text-xs font-bold text-slate-800 mb-1">
                اختر صورة من جهاز الكمبيوتر
              </p>
              <p className="text-[11px] text-slate-500 mb-4">
                تنسيقات مدعومة: JPG, PNG, WEBP, SVG
              </p>

              <label className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer shadow-sm transition">
                <span>استعراض الملفات</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>جميع الصور مقتبسة من مكتبات مجانية ومطابقة للشريعة الإسلامية</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
