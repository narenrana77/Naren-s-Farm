import React, { useState, useMemo } from 'react';
import { DeletedHistoryEntry, DeletedItemCategory } from '../types/farm';
import { CATEGORY_LABELS } from '../utils/undoManager';
import {
  RotateCcw,
  Trash2,
  X,
  History,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface FloatingUndoBannerProps {
  latestDeletedEntry: DeletedHistoryEntry | null;
  restoredFeedbackMessage: string | null;
  totalTrashCount: number;
  onUndoLatest: (entryId: string) => void;
  onDismissBanner: () => void;
  onOpenTrashDrawer: () => void;
}

export const FloatingUndoBanner: React.FC<FloatingUndoBannerProps> = ({
  latestDeletedEntry,
  restoredFeedbackMessage,
  totalTrashCount,
  onUndoLatest,
  onDismissBanner,
  onOpenTrashDrawer,
}) => {
  if (!latestDeletedEntry && !restoredFeedbackMessage) return null;

  if (restoredFeedbackMessage && !latestDeletedEntry) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="rounded-2xl bg-slate-900/95 border-2 border-emerald-400 px-4 py-3 text-white shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-black text-emerald-200 truncate">
              {restoredFeedbackMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismissBanner}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!latestDeletedEntry) return null;

  const catInfo = CATEGORY_LABELS[latestDeletedEntry.category] || {
    labelHi: 'डिलीट किया गया आइटम',
    labelEn: 'Deleted Item',
    icon: '🗑️',
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="rounded-2xl bg-slate-950/95 border-2 border-amber-400 px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-base shrink-0">
            {catInfo.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
              <span>🗑️ डिलीट हुआ ({catInfo.labelHi.split('(')[0].trim()})</span>
              {latestDeletedEntry.amount !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-black text-rose-300 tabular-nums">
                    ₹{latestDeletedEntry.amount.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm font-black text-white truncate">
              {latestDeletedEntry.title}
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              {latestDeletedEntry.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onUndoLatest(latestDeletedEntry.id)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-lg transition-all whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>वापस लाएं (Undo)</span>
          </button>

          {totalTrashCount > 1 && (
            <button
              type="button"
              onClick={onOpenTrashDrawer}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="सभी डिलीट किए गए आइटम देखें"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono tabular-nums">({totalTrashCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismissBanner}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer shrink-0"
            title="बंद करें (इतिहास में सुरक्षित रहेगा)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface TrashHistoryDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedHistory: DeletedHistoryEntry[];
  onRestoreEntry: (entryId: string) => void;
  onRestoreAll: () => void;
  onPermanentDeleteEntry: (entryId: string) => void;
  onClearAllHistory: () => void;
}

export const TrashHistoryDrawerModal: React.FC<TrashHistoryDrawerModalProps> = ({
  isOpen,
  onClose,
  deletedHistory,
  onRestoreEntry,
  onRestoreAll,
  onPermanentDeleteEntry,
  onClearAllHistory,
}) => {
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'expenses' | 'khet_acre' | 'other'
  >('all');

  const filteredList = useMemo(() => {
    if (activeFilter === 'all') return deletedHistory;
    if (activeFilter === 'expenses') {
      return deletedHistory.filter((item) =>
        ['acre_expense', 'machinery', 'labour', 'material'].includes(
          item.category
        )
      );
    }
    if (activeFilter === 'khet_acre') {
      return deletedHistory.filter((item) =>
        ['plot', 'acre_subplot'].includes(item.category)
      );
    }
    return deletedHistory.filter((item) =>
      ['aadti', 'task'].includes(item.category)
    );
  }, [deletedHistory, activeFilter]);

  if (!isOpen) return null;

  const formatTimeAgo = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString('hi-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                डिलीट इतिहास व रिकवरी (Undo / Trash History)
              </h3>
              <p className="text-xs text-slate-300 truncate">
                पिछले 20 डिलीट किए गए खर्च, खेत, एकड़ व कार्य ऐप बंद करने के बाद भी यहाँ सुरक्षित रहते हैं
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Segmented Bar & Bulk Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl overflow-x-auto">
            {[
              { id: 'all', label: `सभी (${deletedHistory.length})` },
              { id: 'expenses', label: 'खर्चे (Expenses)' },
              { id: 'khet_acre', label: 'खेत व एकड़ (Khet & Acre)' },
              { id: 'other', label: 'मंडी व कार्य' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {deletedHistory.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                किसी भी आइटम को 1-क्लिक में उसके मूल स्थान पर वापस लाएं:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRestoreAll}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>सभी वापस लाएं</span>
                </button>
                <button
                  type="button"
                  onClick={onClearAllHistory}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>इतिहास खाली करें</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable List of Deleted Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                डिलीट इतिहास खाली है (No Deleted Items)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                जब भी आप कोई खर्चा (प्रति-एकड़ या हिसाब-किताब), खेत (Khet), एकड़ (Acre), मंडी खाता प्रविष्टि या कृषि कार्य डिलीट करेंगे, वह यहाँ रिकवरी के लिए सुरक्षित रहेगा।
              </p>
            </div>
          ) : (
            filteredList.map((entry) => {
              const catMeta = CATEGORY_LABELS[
                entry.category as DeletedItemCategory
              ] || {
                labelHi: 'डिलीट आइटम',
                labelEn: 'Deleted Item',
                icon: '🗑️',
              };
              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/60 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    {/* Unboxed Metadata Line with · separators */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{catMeta.icon}</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {catMeta.labelHi.split('(')[0].trim()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(entry.deletedAt)}
                      </span>
                      {entry.amount !== undefined && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            ₹{entry.amount.toLocaleString('en-IN')}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {entry.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {entry.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreEntry(entry.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>वापस लाएं (Undo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPermanentDeleteEntry(entry.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer shrink-0"
                      title="स्थायी रूप से हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
