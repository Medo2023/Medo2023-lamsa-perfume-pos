import React from 'react';
import { CalculationBreakdown } from '../types';
import { HelpCircle, X, ArrowLeft, CheckCircle2, Calculator } from 'lucide-react';

interface CalculationBreakdownModalProps {
  breakdown: CalculationBreakdown | null;
  onClose: () => void;
  currency?: string;
}

const CalculationBreakdownModal: React.FC<CalculationBreakdownModalProps> = ({
  breakdown,
  onClose,
  currency = 'ج.م'
}) => {
  if (!breakdown) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="apple-glass rounded-3xl p-6 sm:p-7 w-full max-w-lg border border-white/60 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1D1D1F]">{breakdown.title}</h3>
              <p className="text-[11px] text-[#86868B]">{breakdown.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#86868B] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Big Final Highlight Number */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0071E3]/5 to-[#0071E3]/15 border border-[#0071E3]/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#86868B] block">النتيجة النهائية المعتمدة:</span>
            <span className="text-2xl font-black text-[#0071E3] font-mono">
              {breakdown.finalValue.toLocaleString('ar-EG')} {breakdown.unit || currency}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-[#0071E3]/20 text-[11px] font-bold text-[#0071E3] flex items-center gap-1 shadow-2xs">
            <CheckCircle2 size={14} />
            <span>معادلة دقيقة</span>
          </div>
        </div>

        {/* Step-by-Step Flow Chain (الأسهم دائماً من اليمين إلى اليسار: ←) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#1D1D1F] block text-right">
            سلسلة التتبع والاحتساب المحاسبي:
          </span>
          <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.06] text-xs font-bold text-[#1D1D1F] flex items-center gap-2 overflow-x-auto py-3 leading-relaxed">
            {breakdown.steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-black/[0.08] shadow-2xs whitespace-nowrap">
                  {step.label}
                </span>
                {idx < breakdown.steps.length - 1 && (
                  <span className="text-[#0071E3] font-bold text-sm shrink-0">←</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Detailed Itemized Math Breakdown */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <span className="text-xs font-bold text-[#86868B] block text-right">
            تفاصيل كل بند وأثره المالي:
          </span>
          <div className="space-y-2">
            {breakdown.steps.map((step, idx) => {
              const isFinal = idx === breakdown.steps.length - 1;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isFinal
                      ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-950'
                      : 'bg-white border-black/[0.06] text-[#1D1D1F]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {step.sign && (
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                          step.sign === '+' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : step.sign === '-' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {step.sign}
                        </span>
                      )}
                      <span className="font-bold">{step.label}</span>
                    </div>
                    {step.note && (
                      <p className="text-[10px] text-[#86868B]">{step.note}</p>
                    )}
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-sm font-black">
                      {step.value >= 0 ? step.value.toLocaleString('ar-EG') : `(${Math.abs(step.value).toLocaleString('ar-EG')})`} {breakdown.unit || currency}
                    </span>
                    {step.formula && (
                      <span className="block text-[10px] text-[#86868B]">{step.formula}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-black/[0.06] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold transition-colors shadow-sm"
          >
            إغلاق نافذة التتبع
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalculationBreakdownModal;
