import React, { useState } from 'react';
import {
  Cloud,
  Moon,
  Sun,
  Lock,
  KeyRound,
  Info,
  Home,
  Compass,
  BookOpen,
  Tractor,
  Bot,
  BarChart3,
  RotateCcw,
  Plus,
  Menu,
  X,
  Sprout,
  LayoutDashboard,
  HelpCircle,
  Package,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { App3DIcon } from './App3DIcon';

export type AppNavTab =
  | 'dashboard'
  | 'classic_dashboard'
  | 'hisab'
  | 'stock'
  | 'simulator'
  | 'reports'
  | 'map'
  | 'ai_doctor'
  | 'about';

interface NavbarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  language: 'hi' | 'en';
  setLanguage: (val: 'hi' | 'en') => void;
  onOpenBackup: () => void;
  onOpenPinSettings: () => void;
  onReplaySplash: () => void;
  onOpenTrashDrawer?: () => void;
  onOpenQuickAcreForm?: () => void;
  onOpenVarietiesModal?: () => void;
  onOpenHelpModal?: () => void;
  trashCount?: number;
  cloudSyncStatus: 'synced' | 'pending' | 'offline';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  language,
  setLanguage,
  onOpenBackup,
  onOpenPinSettings,
  onReplaySplash,
  onOpenTrashDrawer,
  onOpenQuickAcreForm,
  onOpenVarietiesModal,
  onOpenHelpModal,
  trashCount = 0,
}) => {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  // 5 Classic Facebook-Simple Top & Bottom Navigation Destinations
  const primaryTabs: Array<{
    id: AppNavTab;
    labelHi: string;
    labelEn: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      labelHi: 'होम',
      labelEn: 'Home',
      icon: <Home className="w-6 h-6" />,
    },
    {
      id: 'hisab',
      labelHi: 'खर्चा',
      labelEn: 'Expenses',
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      id: 'stock',
      labelHi: 'स्टॉक',
      labelEn: 'Stock',
      icon: <Package className="w-6 h-6" />,
    },
    {
      id: 'map',
      labelHi: 'नक्शा',
      labelEn: 'Map',
      icon: <Compass className="w-6 h-6" />,
    },
    {
      id: 'reports',
      labelHi: 'रिपोर्ट',
      labelEn: 'Reports',
      icon: <BarChart3 className="w-6 h-6" />,
    },
  ];

  return (
    <>
      {/* ==================== EXACT FACEBOOK-STYLE CLEAN TOP BAR (56px) ==================== */}
      <header className="sticky top-0 z-40 h-14 w-full max-w-full bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] border-b border-slate-200/80 dark:border-[#3E4042]">
        <div className="max-w-[1440px] mx-auto h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Left: Clean Brand Wordmark (Just like Facebook logo on left) */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              onClick={onReplaySplash}
              title="ओपनिंग स्क्रीन देखें"
              className="cursor-pointer focus:outline-none active:scale-95 transition-transform shrink-0"
            >
              <App3DIcon size="sm" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer focus:outline-none min-w-0"
            >
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#16A34A] dark:text-emerald-400 truncate block leading-none">
                Naren&apos;s Farm
              </span>
            </button>
          </div>

          {/* Center: Classic Facebook Full-Height 5-Tab Bar with Crisp Bottom Underline (Desktop) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-stretch h-full gap-1 max-w-[600px] flex-1 justify-center"
          >
            {primaryTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 max-w-[116px] flex flex-col items-center justify-center gap-0.5 rounded-lg my-1 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#16A34A] dark:text-emerald-400'
                      : 'text-[#65676B] dark:text-[#B0B3B8] hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C]'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[11px] font-bold leading-none">
                    {language === 'hi' ? tab.labelHi : tab.labelEn}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-t-full bg-[#16A34A] dark:bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Classic Facebook Round Gray Action Circles */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenQuickAcreForm && (
              <button
                type="button"
                onClick={onOpenQuickAcreForm}
                title="नया काम / एकड़ फॉर्म खोलें"
                className="w-10 h-10 rounded-full bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {onOpenTrashDrawer && trashCount > 0 && (
              <button
                type="button"
                onClick={onOpenTrashDrawer}
                title="डिलीट किए गए रिकॉर्ड वापस लाएं (Undo)"
                className="relative w-10 h-10 rounded-full bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E41E3F] text-white text-[10px] font-black flex items-center justify-center">
                  {trashCount}
                </span>
              </button>
            )}

            {onOpenHelpModal && (
              <button
                type="button"
                onClick={onOpenHelpModal}
                title="मदद (Help)"
                className="w-10 h-10 rounded-full bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
              className="w-10 h-10 rounded-full bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer transition-colors"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowMoreDrawer(true)}
              title="मेन्यू (Menu)"
              className="w-10 h-10 rounded-full bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ==================== FACEBOOK-STYLE MOBILE BOTTOM 5-TAB BAR ==================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 w-full max-w-full bg-white dark:bg-[#242526] border-t border-slate-200 dark:border-[#3E4042] grid grid-cols-5 items-stretch"
      >
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                isActive
                  ? 'text-[#16A34A] dark:text-emerald-400 font-black'
                  : 'text-[#65676B] dark:text-[#B0B3B8] font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-3 right-3 h-[3px] rounded-b-full bg-[#16A34A] dark:bg-emerald-400" />
              )}
              {tab.icon}
              <span className="text-[11px] leading-none mt-0.5 whitespace-nowrap">
                {language === 'hi' ? tab.labelHi : tab.labelEn}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ==================== FACEBOOK-STYLE CLEAN MENU DRAWER ==================== */}
      {showMoreDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowMoreDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full bg-[#F0F2F5] dark:bg-[#18191A] p-4 flex flex-col justify-between overflow-y-auto shadow-2xl"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-black text-[#050505] dark:text-[#E4E6EB]">
                  मेन्यू
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMoreDrawer(false)}
                  className="w-9 h-9 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Clean 2-Column Shortcut Grid (Just like Facebook Menu!) */}
              <div className="grid grid-cols-2 gap-2.5">
                {onOpenQuickAcreForm && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickAcreForm();
                      setShowMoreDrawer(false);
                    }}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                  >
                    <Plus className="w-6 h-6 text-[#16A34A]" />
                    <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                      एकड़ फॉर्म
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('simulator');
                    setShowMoreDrawer(false);
                  }}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                >
                  <Tractor className="w-6 h-6 text-amber-500" />
                  <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                    3D खेत देखें
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ai_doctor');
                    setShowMoreDrawer(false);
                  }}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                >
                  <Bot className="w-6 h-6 text-teal-500" />
                  <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                    डॉ. किसान AI
                  </div>
                </button>

                {onOpenVarietiesModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenVarietiesModal();
                      setShowMoreDrawer(false);
                    }}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                  >
                    <Sprout className="w-6 h-6 text-emerald-500" />
                    <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                      बीज किस्में
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('classic_dashboard');
                    setShowMoreDrawer(false);
                  }}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-6 h-6 text-sky-500" />
                  <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                    मौसम डैशबोर्ड
                  </div>
                </button>

                {onOpenTrashDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTrashDrawer();
                      setShowMoreDrawer(false);
                    }}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#242526] shadow-xs hover:bg-slate-50 dark:hover:bg-[#3A3B3C] text-left space-y-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-6 h-6 text-rose-500" />
                    <div className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB]">
                      Undo ({trashCount})
                    </div>
                  </button>
                )}
              </div>

              {/* Clean Settings Card */}
              <div className="rounded-xl bg-white dark:bg-[#242526] shadow-xs divide-y divide-slate-100 dark:divide-[#3E4042] overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    onOpenBackup();
                    setShowMoreDrawer(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-sm font-bold text-[#050505] dark:text-[#E4E6EB] cursor-pointer"
                >
                  <Cloud className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>बैकअप व डेटा रिस्टोर</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenPinSettings();
                    setShowMoreDrawer(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-sm font-bold text-[#050505] dark:text-[#E4E6EB] cursor-pointer"
                >
                  <KeyRound className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>PIN लॉक बदलें</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onReplaySplash();
                    setShowMoreDrawer(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-sm font-bold text-[#050505] dark:text-[#E4E6EB] cursor-pointer"
                >
                  <Lock className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>ऐप लॉक करें</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#3A3B3C] flex items-center justify-between text-sm font-bold text-[#050505] dark:text-[#E4E6EB] cursor-pointer"
                >
                  <span>भाषा (Language)</span>
                  <span className="text-xs font-black text-[#16A34A] dark:text-emerald-400">
                    {language === 'hi' ? 'हिन्दी → EN' : 'EN → हिन्दी'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('about');
                    setShowMoreDrawer(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-sm font-bold text-[#050505] dark:text-[#E4E6EB] cursor-pointer"
                >
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>ऐप की जानकारी</span>
                </button>
              </div>

              <div className="pt-1">
                <PWAInstallButton variant="nav" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
