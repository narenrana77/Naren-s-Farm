import React, { useState, useEffect } from 'react';
import { FarmDataStore } from '../types/farm';
import { FarmStorage } from '../services/storage';
import { 
  Cloud, 
  CloudRain, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  HardDrive, 
  Calendar,
  Smartphone,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: FarmDataStore;
  onRestoreStore: (restored: FarmDataStore) => void;
  language: 'hi' | 'en';
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  store,
  onRestoreStore,
  language,
}) => {
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load cloud backup history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setLoadingList(true);
    try {
      const list = await FarmStorage.listCloudBackups();
      setCloudBackups(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCloudSyncNow = async () => {
    setSyncingNow(true);
    setStatusMessage(null);
    try {
      const res = await FarmStorage.syncToCloud(store, false);
      if (res.success) {
        setStatusMessage({
          text: language === 'hi' ? 'क्लाउड बैकअप सफलतापूर्वक सुरक्षित हो गया!' : 'Cloud backup created successfully!',
          type: 'success',
        });
        await loadBackups();
      } else {
        setStatusMessage({
          text: (language === 'hi' ? 'सिंक विफल: ' : 'Sync failed: ') + res.message,
          type: 'error',
        });
      }
    } catch (e: any) {
      setStatusMessage({ text: e.message, type: 'error' });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const confirmMsg = language === 'hi'
      ? 'क्या आप इस बैकअप को पुनर्स्थापित (Restore) करना चाहते हैं? आपका वर्तमान डेटा इस बैकअप से बदल जाएगा।'
      : 'Do you want to restore this backup? Your current data will be replaced by the snapshot.';
    if (!window.confirm(confirmMsg)) return;

    setRestoringId(backupId);
    try {
      const restored = await FarmStorage.restoreFromCloud(backupId);
      onRestoreStore(restored);
      setStatusMessage({
        text: language === 'hi' ? 'डेटा सफलतापूर्वक पुनर्स्थापित हो गया!' : 'Data restored successfully!',
        type: 'success',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setStatusMessage({ text: e.message, type: 'error' });
    } finally {
      setRestoringId(null);
    }
  };

  const handleExportOfflineJson = () => {
    FarmStorage.exportToJsonFile(store);
    setStatusMessage({
      text: language === 'hi' ? 'ऑफलाइन JSON बैकअप फाइल डाउनलोड हो गई!' : 'Offline JSON backup file downloaded!',
      type: 'success',
    });
  };

  const handleImportOfflineJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    FarmStorage.importFromJsonFile(file)
      .then((restored) => {
        onRestoreStore(restored);
        setStatusMessage({
          text: language === 'hi' ? 'ऑफलाइन फाइल से डेटा पुनर्स्थापित हो गया!' : 'Data restored from offline JSON file!',
          type: 'success',
        });
        setTimeout(() => onClose(), 1200);
      })
      .catch((err) => {
        setStatusMessage({ text: err.message, type: 'error' });
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 shadow-2xl border border-white/40 dark:border-white/10 my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg font-display">
                {language === 'hi' ? 'क्लाउड बैकअप एवं डेटा सुरक्षा' : 'Cloud Backup & Secure Sync'}
              </h3>
              <p className="text-xs text-slate-500">
                ऑफ़लाइन-प्रथम आर्किटेक्चर + सुरक्षित क्लाउड बैकअप
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/50'
          }`}>
            {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Primary Sync Bar */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-900 dark:text-white block">
              {language === 'hi' ? 'सर्वर क्लाउड सिंक' : 'Server Cloud Sync'}
            </span>
            <span className="text-[11px] text-slate-500">
              अंतिम सिंक: {store.farmSettings.lastCloudBackup ? new Date(store.farmSettings.lastCloudBackup).toLocaleString('hi-IN') : 'अभी तक नहीं'}
            </span>
          </div>

          <button
            onClick={handleCloudSyncNow}
            disabled={syncingNow}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
            <span>{language === 'hi' ? 'अभी क्लाउड बैकअप लें' : 'Sync to Cloud Now'}</span>
          </button>
        </div>

        {/* Cloud Snapshots List (Restore Functionality) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {language === 'hi' ? 'उपलब्ध क्लाउड बैकअप स्नैपशॉट' : 'Available Cloud Snapshots'}
            </span>
            <button
              onClick={loadBackups}
              className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश</span>
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {cloudBackups.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                कोई क्लाउड बैकअप मौजूद नहीं है। ऊपर दिए बटन से पहला बैकअप बनाएं।
              </div>
            ) : (
              cloudBackups.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {b.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(b.createdAt).toLocaleString('hi-IN')} · {b.counts?.machinery || 0} मशीनरी, {b.counts?.plots || 0} खेत
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreBackup(b.id)}
                    disabled={restoringId === b.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                    <span>{language === 'hi' ? 'पुनर्स्थापित (Restore)' : 'Restore'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Offline File Export / Import Section */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            {language === 'hi' ? 'ऑफलाइन फाइल बैकअप (Offline JSON File)' : 'Offline JSON File'}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportOfflineJson}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'JSON फाइल डाउनलोड' : 'Download JSON'}</span>
            </button>

            <label className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'JSON फाइल से लोड' : 'Upload JSON'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportOfflineJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
