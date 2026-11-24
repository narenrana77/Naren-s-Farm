import React, { useState } from 'react';
import { App3DIcon } from './App3DIcon';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import {
  ShieldCheck,
  Compass,
  CloudSun,
  Sprout,
  Bot,
  BookOpen,
  Download,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Cloud,
  Smartphone,
  ArrowRight,
  Layers,
  Info,
} from 'lucide-react';

interface AboutAppViewProps {
  farmName: string;
  ownerName: string;
  location: string;
  plotsCount: number;
  totalAcres: number;
  language: 'hi' | 'en';
  onNavigateTab: (
    tab: 'dashboard' | 'hisab' | 'simulator' | 'reports' | 'map' | 'ai_doctor' | 'about'
  ) => void;
  onOpenBackup: () => void;
  onOpenPinModal: () => void;
  onOpenVarietiesModal: () => void;
}

export const AboutAppView: React.FC<AboutAppViewProps> = ({
  farmName,
  ownerName,
  location,
  plotsCount,
  totalAcres,
  language,
  onNavigateTab,
  onOpenBackup,
  onOpenPinModal,
  onOpenVarietiesModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) setShowInstallModal(true);
    } else {
      setShowInstallModal(true);
    }
  };

  const featureUpdates = [
    {
      id: 'map-boundary',
      badge: 'NEW UPDATE',
      titleHi: '🛰️ लाइव खेत मार्किंग एवं मल्टी-पॉइंट बाउंड्री सिस्टम',
      titleEn: 'Live Khet Marking & Multi-Point Boundary Studio',
      descHi:
        'सैटेलाइट नक्शे पर सीधे क्लिक करके अपने खेत के कोने (P1, P2, P3, P4...) मार्क करें। रकबा (एकड़ व बीघा) अपने-आप गिना जाता है और प्रति-एकड़ (1-1 Acre) पिन व मुनाफा ट्रैक होता है।',
      descEn:
        'Tap directly on the satellite map to mark multi-point polygon boundaries, auto-calculate area in Acres & Bighas, and place 1-acre pins.',
      actionLabelHi: 'खेत नक्शा व मार्किंग खोलें',
      actionLabelEn: 'Open Farm Map & Marking',
      onClick: () => onNavigateTab('map'),
      icon: Compass,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'one-ui-weather',
      badge: 'ONE UI 7',
      titleHi: '⛈️ Samsung One UI 7 फुल-स्क्रीन मौसम पुश अलर्ट',
      titleEn: 'Samsung One UI 7 Full-Screen Weather Push Alerts',
      descHi:
        'भारी बारिश, भीषण लू, तेज आंधी/ओलावृष्टि और पाले की चेतावनी अब पूरी स्क्रीन पर 60FPS लाइव आसमान एनिमेशन और फसल सुरक्षा टास्क के साथ दिखती है।',
      descEn:
        'Full-screen atmospheric weather takeover with 60FPS rain, lightning, solar heatwave, hail, and frost physics plus 1-click crop protection tasks.',
      actionLabelHi: 'डैशबोर्ड पर मौसम अलर्ट देखें',
      actionLabelEn: 'View Weather on Dashboard',
      onClick: () => onNavigateTab('dashboard'),
      icon: CloudSun,
      accent: 'from-sky-500 to-blue-600',
    },
    {
      id: 'crop-varieties',
      badge: '40+ VARIETIES',
      titleHi: '🌾 सभी फसलों की 40+ उन्नत किस्में (All Crop Varieties)',
      titleEn: '40+ High-Yield Crop Varieties Directory',
      descHi:
        'गेहूं (DBW 303, HD 3226, PBW 826), धान/बासमती (1509, 1121, Pusa 44), सरसों (RH 725, Pusa Bold), गन्ना (Co 0238), मक्का, कपास, दालें, सब्जियां और चारे की सभी किस्में शामिल।',
      descEn:
        'Complete catalog of Wheat, Basmati/Paddy, Mustard, Sugarcane, Maize, Cotton, Pulses, Vegetables, and Fodder varieties with yield & maturity data.',
      actionLabelHi: 'सभी फसल किस्में ब्राउज़ करें',
      actionLabelEn: 'Browse All Crop Varieties',
      onClick: onOpenVarietiesModal,
      icon: Sprout,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      id: 'pin-security',
      badge: 'SECURITY',
      titleHi: '🔒 4-अंकीय सुरक्षा PIN लॉक एवं 3D ट्रैक्टर लॉन्च',
      titleEn: '4-Digit Security PIN Lock & 60FPS 3D Tractor Launch',
      descHi:
        'ऐप खुलते समय 60FPS 3D ट्रैक्टर एनिमेशन और सुरक्षित PIN लॉक। लॉगिन स्क्रीन से कोई भी बिना पुराना PIN डाले नया PIN नहीं बना सकता।',
      descEn:
        'Protected by a 4-digit PIN lock on launch. Changing the PIN strictly requires verifying the current PIN inside the unlocked app.',
      actionLabelHi: 'सुरक्षा PIN बदलें',
      actionLabelEn: 'Manage Security PIN',
      onClick: onOpenPinModal,
      icon: KeyRound,
      accent: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'hisab-kitab',
      badge: 'LEDGER',
      titleHi: '📖 स्मार्ट बही-खाता एवं मंडी आढ़ती पासबुक',
      titleEn: 'Smart Hisab-Kitab & Mandi Aadti Passbook',
      descHi:
        'मशीनरी (जुताई, रोटावेटर, सुपर सीडर), मजदूरी, खाद-बीज और आढ़ती के लेन-देन का पूरा हिसाब व पुराने रेट की ऑटो-मेमोरी।',
      descEn:
        'Track machinery, labour, seeds/fertilisers, and Mandi commission agent (Aadti) passbook with automatic vendor rate memory.',
      actionLabelHi: 'हिसाब-किताब खोलें',
      actionLabelEn: 'Open Hisab Kitab',
      onClick: () => onNavigateTab('hisab'),
      icon: BookOpen,
      accent: 'from-teal-500 to-emerald-600',
    },
    {
      id: 'ai-doctor',
      badge: 'AGRI DOCTOR',
      titleHi: '🤖 डॉ. किसान — फसल रोग एवं उपचार सलाहकार',
      titleEn: 'Dr. Kisan — Crop Disease & Spray Advisor',
      descHi:
        'गेहूं पीला रतुआ, सरसों माहू (Aphid), गन्ना टॉप बोरर और खाद/स्प्रे की सटीक मात्रा व मौसम अनुकूलता की तुरंत जानकारी।',
      descEn:
        'Instant guidance on crop pests, fungal diseases, chemical dosages, and weather-safe spraying windows.',
      actionLabelHi: 'डॉ. किसान से सलाह लें',
      actionLabelEn: 'Consult Dr. Kisan',
      onClick: () => onNavigateTab('ai_doctor'),
      icon: Bot,
      accent: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. App Identity & Overview Card */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <App3DIcon size="lg" showBadge />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Version 3.5 · Smart Edition</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-display">
                {farmName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {ownerName} · {location} ·{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {plotsCount} खेत ({totalAcres.toFixed(1)} एकड़)
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenBackup}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span>
                {language === 'hi' ? 'क्लाउड बैकअप व रिस्टोर' : 'Cloud Backup & Restore'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenPinModal}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>{language === 'hi' ? 'सुरक्षा PIN बदलें' : 'Change Security PIN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Standalone App Installation Card (Moved from Dashboard for a cleaner workspace) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900/95 via-teal-900/90 to-slate-900/95 p-5 sm:p-6 border border-emerald-500/40 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base sm:text-lg">
                  {language === 'hi'
                    ? '📲 स्टैंडअलोन मोबाइल ऐप (Standalone PWA App)'
                    : '📲 Install as Standalone Mobile App'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black">
                  {isInstalled ? 'INSTALLED' : 'WHATSAPP STYLE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {language === 'hi'
                  ? 'बिना ब्राउज़र खोले सीधे अपने फोन की होमस्क्रीन से 3D आइकन दबाकर ऐप चलाएं और ऑफलाइन भी अपना हिसाब-किताब देखें।'
                  : 'Launch directly from your phone homescreen with a 3D icon and full offline support.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isInstalled ? (
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>फोन में इंस्टॉल है (Installed)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>
                  {language === 'hi' ? 'फोन में ऐप इंस्टॉल करें' : 'Install App Now'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. All App Features & Recent Updates Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {language === 'hi'
                ? '✨ ऐप के प्रमुख फीचर्स एवं नए अपडेट्स (App Features & Updates)'
                : '✨ Core App Features & Recent Updates'}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {language === 'hi'
              ? 'सीधे किसी भी फीचर को यहाँ से खोलें'
              : 'Quick launch any module below'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureUpdates.map((feat) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={feat.id}
                className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-lg flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${feat.accent} flex items-center justify-center text-white shadow-md`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {language === 'hi' ? feat.titleHi : feat.titleEn}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {language === 'hi' ? feat.descHi : feat.descEn}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={feat.onClick}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-800 hover:text-white dark:text-slate-200 dark:hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span>
                    {language === 'hi' ? feat.actionLabelHi : feat.actionLabelEn}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick User Guide for Farmers */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            {language === 'hi'
              ? '📋 ऐप उपयोग करने की संक्षिप्त गाइड (Quick Usage Guide)'
              : '📋 Quick App Usage Guide'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span className="font-black text-emerald-700 dark:text-emerald-400 block">
              1. नक्शे पर खेत मार्क कैसे करें?
            </span>
            <p>
              ऊपर <strong>"🛰️ खेत नक्शा व एकड़"</strong> टैब में जाएं ➔{' '}
              <strong>"📐 खेत बाउंड्री मार्क करें"</strong> चालू करें ➔ नक्शे पर
              अपने खेत के कोनों (P1, P2, P3, P4) पर क्लिक करें और सेव दबाएं।
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span className="font-black text-emerald-700 dark:text-emerald-400 block">
              2. खेत व फसल किस्म कैसे बदलें?
            </span>
            <p>
              किसी भी खेत कार्ड पर <strong>"✏️ एडिट"</strong> बटन दबाकर उसका नाम,
              रकबा (एकड़), और 40+ फसलों की किस्मों में से अपनी फसल चुनें।
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span className="font-black text-emerald-700 dark:text-emerald-400 block">
              3. प्रति-एकड़ खर्च और मुनाफा कैसे देखें?
            </span>
            <p>
              <strong>"हिसाब-किताब"</strong> में खर्च जोड़ें और{' '}
              <strong>"खेत नक्शा ➔ 📊 एकड़-वार खर्च व आमदनी"</strong> में हर 1
              एकड़ का अलग शुद्ध मुनाफा देखें।
            </p>
          </div>
        </div>
      </div>

      {/* Standalone PWA Install Guide Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onInstallDirectly={isInstallable ? install : undefined}
        isInstallable={isInstallable}
        isIOS={isIOS}
      />
    </div>
  );
};
