import React, { useState } from 'react';
import { generatePerfumeDescription, suggestMarketingCampaign } from '../services/geminiService';
import { Sparkles, Loader2, Copy, Send, Feather, Megaphone, Check, Wand2 } from 'lucide-react';
import { Product } from '../types';

interface AIMarketingProps {
  products: Product[];
}

const AIMarketing: React.FC<AIMarketingProps> = ({ products }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'campaign'>('desc');

  const [descName, setDescName] = useState('');
  const [descBrand, setDescBrand] = useState('لمسة عطر');
  const [descNotes, setDescNotes] = useState('');
  const [descMood, setDescMood] = useState('فاخر وجذاب');
  const [generatedDesc, setGeneratedDesc] = useState('');
  const [generatedCampaign, setGeneratedCampaign] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick preset loader from existing perfumes
  const handleSelectExistingPerfume = (product: Product) => {
    setDescName(product.name);
    setDescBrand(product.brand);
    setDescNotes(`عطر ${product.type} أصيل من منشأ ${product.origin}، مخصص لـ ${product.gender} ومناسب لموسم ${product.season}`);
    setDescMood(product.type === 'عود' ? 'ملكي فخم ودافئ' : product.type === 'مسك' ? 'هادئ نقي وجذاب' : 'منعش وأنيق');
  };

  const handleGenerateDescription = async () => {
    if (!descName) return;
    setLoading(true);
    setCopied(false);
    try {
      const result = await generatePerfumeDescription(descName, descBrand, descNotes || 'مزيج عطري فاخر', descMood || 'فاخر');
      setGeneratedDesc(result);
    } catch (err) {
      setGeneratedDesc('حدث خطأ أثناء الاتصال بالخدمة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCampaign = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const inventorySummary = products
        .slice(0, 30)
        .map((p) => `${p.name} (${p.type} - ${p.gender})`)
        .join(', ');
      const result = await suggestMarketingCampaign(inventorySummary);
      setGeneratedCampaign(result);
    } catch (err) {
      setGeneratedCampaign('حدث خطأ أثناء إنشاء الحملة.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
            <Sparkles size={14} />
            <span>Apple Intelligence AI Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight">
            مساعد التسويق الذكي
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            ابتكر نصوصاً إعلانية ووصفاً شاعرياً لعطورك وخططاً تسويقية متكاملة
          </p>
        </div>

        {/* Tab Selector (Apple Segmented Bar) */}
        <div className="apple-segmented-bg flex items-center self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('desc')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'desc'
                ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Feather size={14} />
            <span>وصف العطر</span>
          </button>
          <button
            onClick={() => setActiveTab('campaign')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'campaign'
                ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Megaphone size={14} />
            <span>حملة ترويجية</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Panel (lg:col-span-6) */}
        <div className="lg:col-span-6 apple-glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-black/[0.06] shadow-apple-card">
          {activeTab === 'desc' ? (
            <div className="space-y-4 text-xs">
              {/* Quick Preset Selector */}
              <div>
                <label className="font-bold text-[#1D1D1F] mb-1.5 block">
                  اختر عطراً من المخزون لملء البيانات سريعاً:
                </label>
                <select
                  onChange={(e) => {
                    const found = products.find((p) => p.id.toString() === e.target.value);
                    if (found) handleSelectExistingPerfume(found);
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>-- اضغط لاختيار عطر جاهز من المخزون --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand} - {p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">اسم العطر *</label>
                  <input
                    type="text"
                    placeholder="مثال: كلمات، روز مسك"
                    value={descName}
                    onChange={(e) => setDescName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] mb-1.5 block">العلامة التجارية</label>
                  <input
                    type="text"
                    placeholder="مثال: لمسة عطر"
                    value={descBrand}
                    onChange={(e) => setDescBrand(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] mb-1.5 block">النوتات والمكونات العطرية</label>
                <textarea
                  placeholder="مثال: افتتاحية من البرغموت والخزامى، قلب من الياسمين الأبيض، وقاعدة من العود والمسك والعنبر..."
                  value={descNotes}
                  onChange={(e) => setDescNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] mb-1.5 block">الطابع والمزاج العطري</label>
                <input
                  type="text"
                  placeholder="مثال: ملكي، رومانسي هادئ، صيفي منعش، فاخر للمناسبات"
                  value={descMood}
                  onChange={(e) => setDescMood(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-black/[0.08] text-xs font-medium text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <button
                onClick={handleGenerateDescription}
                disabled={loading || !descName}
                className="apple-btn w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-apple-sm disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                <span>توليد وصف عطر جذاب</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.06] space-y-2">
                <h4 className="font-bold text-[#1D1D1F]">تحليل مخزون المتجر الذكي</h4>
                <p className="text-[#86868B] leading-relaxed">
                  سيقوم الذكاء الاصطناعي بدراسة قائمة عطور متجرك الحالية ({products.length} صنف) واقتراح خطة ترويجية مخصصة تشمل عنوان الحملة، العطور المقترحة للباقة، ورسائل دعائية مقنعة للعملاء.
                </p>
              </div>

              <button
                onClick={handleGenerateCampaign}
                disabled={loading || products.length === 0}
                className="apple-btn w-full py-3.5 rounded-2xl bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-apple-sm disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Megaphone size={16} />}
                <span>ابتكار خطة الحملة الترويجية</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Output Panel (lg:col-span-6) */}
        <div className="lg:col-span-6 apple-glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between min-h-[380px] border border-black/[0.06] shadow-apple-card relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#0071E3]" />
              <h3 className="font-bold text-xs text-[#1D1D1F]">النتيجة المولدة</h3>
            </div>
            {((activeTab === 'desc' && generatedDesc) || (activeTab === 'campaign' && generatedCampaign)) && (
              <button
                onClick={() => handleCopy(activeTab === 'desc' ? generatedDesc : generatedCampaign)}
                className="apple-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-xs font-semibold text-[#1D1D1F]"
              >
                {copied ? <Check size={14} className="text-[#34C759]" /> : <Copy size={14} />}
                <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 size={36} className="animate-spin mx-auto text-[#0071E3]" />
                <p className="text-xs font-medium text-[#1D1D1F]">جاري كتابة الكلمات الإبداعية...</p>
                <p className="text-[11px] text-[#86868B]">يتم صياغة نصوص تسويقية بأسلوب فاخر</p>
              </div>
            ) : (activeTab === 'desc' && generatedDesc) || (activeTab === 'campaign' && generatedCampaign) ? (
              <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs text-xs sm:text-sm font-normal text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
                {activeTab === 'desc' ? generatedDesc : generatedCampaign}
              </div>
            ) : (
              <div className="py-16 text-center text-[#86868B] space-y-2">
                <Sparkles size={36} className="mx-auto text-[#AEAEB2]" />
                <p className="font-medium text-xs text-[#1D1D1F]">المساحة جاهزة لإنشاء المحتوى</p>
                <p className="text-[11px]">املأ البيانات واضغط على زر التوليد في الجانب الأيمن</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMarketing;
