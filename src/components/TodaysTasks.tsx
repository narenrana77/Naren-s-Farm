import React, { useState } from 'react';
import { FarmTask, FarmDataStore } from '../types/farm';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Calendar, 
  ArrowRight, 
  Droplets, 
  Tractor, 
  Landmark, 
  Sparkles,
  Volume2,
  Trash2,
  Edit3,
  Check,
  Wheat,
  X,
  CreditCard,
  MapPin,
  User,
  Zap
} from 'lucide-react';

interface TodaysTasksProps {
  store: FarmDataStore;
  onUpdateTasks: (tasks: FarmTask[]) => void;
  onNavigateTab: (tab: 'dashboard' | 'hisab' | 'simulator' | 'reports') => void;
  language: 'hi' | 'en';
}

export const TodaysTasks: React.FC<TodaysTasksProps> = ({
  store,
  onUpdateTasks,
  onNavigateTab,
  language,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<FarmTask['category']>('irrigation');
  const [taskPlot, setTaskPlot] = useState<string>(store.plots[0]?.name || 'खेत नं. 1 (बड़ा खेत)');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [taskAmount, setTaskAmount] = useState<number | undefined>(undefined);
  const [taskVendor, setTaskVendor] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Known vendors from store for quick 1-tap select in form
  const knownVendors = React.useMemo(() => {
    const set = new Set<string>();
    (store.machineryRecords || []).forEach((m) => {
      if (m.driverName) set.add(m.driverName);
    });
    (store.materialRecords || []).forEach((m) => {
      if (m.vendor) set.add(m.vendor);
    });
    (store.aadtiRecords || []).forEach((a) => {
      if (a.aadtiName) set.add(a.aadtiName);
    });
    // Add default popular ones if empty
    if (set.size === 0) {
      set.add('Ramesh Tractor Works');
      set.add('Aggarwal Fertilizers');
      set.add('Surender Harvester');
    }
    return Array.from(set);
  }, [store]);

  // Quick suggestions for farmer to prefill form in one tap
  const quickTaskTemplates = [
    {
      title: 'रमेश ट्रैक्टर वर्क्स - रोटावेटर की बकाया रकम ₹525 का भुगतान करें',
      category: 'ledger_payment' as const,
      priority: 'high' as const,
      amount: 525,
      vendor: 'Ramesh Tractor Works',
      plot: store.plots[0]?.name || 'Khet No. 1 (Bada Khet)',
      label: '🚜 रोटावेटर बकाया भुगतान (₹525)',
    },
    {
      title: 'खेत नं. 1 - द्वितीय कोर सिंचाई (2nd Kor Sinchai) ट्यूबवेल पानी चलाएं',
      category: 'irrigation' as const,
      priority: 'high' as const,
      plot: store.plots[0]?.name || 'Khet No. 1',
      label: '💧 ट्यूबवेल सिंचाई (कोर पानी)',
    },
    {
      title: 'सरसों खेत - माहू (Aphid) कीट निरीक्षण एवं सुरक्षा स्प्रे',
      category: 'spray' as const,
      priority: 'medium' as const,
      plot: store.plots[1]?.name || 'Khet No. 2',
      label: '🚁 माहू कीट सुरक्षा स्प्रे',
    },
    {
      title: 'गेहूं फसल - यूरिया खाद का छिड़काव व यूरिया ड्रिप देना',
      category: 'general' as const,
      priority: 'medium' as const,
      plot: store.plots[0]?.name || 'Khet No. 1',
      label: '🌾 यूरिया खाद छिड़काव',
    },
    {
      title: 'ट्रैक्टर इंजन सर्विस, मोबिल ऑयल और एयर फिल्टर चेक',
      category: 'machinery' as const,
      priority: 'low' as const,
      label: '🔧 ट्रैक्टर मेंटेनेंस चेक',
    },
  ];

  // Play pleasant notification sound via Web Audio API
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // AudioContext muted/unsupported
    }
  };

  // Request native browser Push Notification permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert(language === 'hi' ? 'यह ब्राउज़र पुश नोटिफिकेशन सपोर्ट नहीं करता।' : 'Push notifications not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        sendTestNotification();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Push Notification
  const sendTestNotification = () => {
    playChimeSound();
    setTestNotificationSent(true);

    const pendingCount = (store.tasks || []).filter((t) => !t.isCompleted).length;
    const title = language === 'hi' ? "🌾 नरेन फार्म: आज के जरूरी कार्य अनुस्मारक" : "🌾 Naren's Farm: Daily Task Reminder";
    const body = language === 'hi'
      ? `आज आपके ${pendingCount} जरूरी कृषि कार्य व भुगतान बाकी हैं। तुरंत विवरण देखें।`
      : `You have ${pendingCount} pending farm tasks & payments today. Tap to view.`;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/src/assets/images/tractor_app_icon_1794206733329.jpg',
        });
      } catch (e) {
        console.warn('Native notification suppressed:', e);
      }
    }

    setTimeout(() => setTestNotificationSent(false), 3500);
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    const updated = (store.tasks || []).map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: !t.isCompleted,
          completedAt: !t.isCompleted ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updated = (store.tasks || []).filter((t) => t.id !== taskId);
    onUpdateTasks(updated);
  };

  // Start editing an existing task
  const handleStartEditTask = (task: FarmTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskCategory(task.category);
    setTaskPlot(task.plotName || '');
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate);
    setTaskAmount(task.pendingAmount);
    setTaskVendor(task.vendorName || '');
    setShowAddTaskModal(true);
  };

  // Add or Update task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTaskId) {
      const updated = (store.tasks || []).map((t) =>
        t.id === editingTaskId
          ? {
              ...t,
              title: taskTitle.trim(),
              category: taskCategory,
              plotName: taskPlot || undefined,
              priority: taskPriority,
              dueDate: taskDueDate,
              pendingAmount: taskCategory === 'ledger_payment' ? taskAmount : undefined,
              vendorName:
                taskCategory === 'ledger_payment'
                  ? taskVendor.trim() || undefined
                  : undefined,
            }
          : t
      );
      onUpdateTasks(updated);
    } else {
      const newTask: FarmTask = {
        id: 'task_' + Date.now(),
        title: taskTitle.trim(),
        category: taskCategory,
        plotName: taskPlot || undefined,
        priority: taskPriority,
        dueDate: taskDueDate,
        isCompleted: false,
        pendingAmount: taskCategory === 'ledger_payment' ? taskAmount : undefined,
        vendorName: taskCategory === 'ledger_payment' ? (taskVendor.trim() || undefined) : undefined,
      };
      onUpdateTasks([newTask, ...(store.tasks || [])]);
    }

    setEditingTaskId(null);
    setShowAddTaskModal(false);
    // Reset form
    setTaskTitle('');
    setTaskAmount(undefined);
    setTaskVendor('');
    setTaskCategory('irrigation');
    setTaskPriority('high');
  };

  const applyTemplate = (tmpl: typeof quickTaskTemplates[0]) => {
    setTaskTitle(tmpl.title);
    setTaskCategory(tmpl.category);
    setTaskPriority(tmpl.priority);
    if (tmpl.amount) setTaskAmount(tmpl.amount);
    if (tmpl.vendor) setTaskVendor(tmpl.vendor);
    if (tmpl.plot) setTaskPlot(tmpl.plot);
  };

  const tasksList = store.tasks || [];
  const pendingTasks = tasksList.filter((t) => !t.isCompleted);
  const completedTasks = tasksList.filter((t) => t.isCompleted);

  const displayTasks = filterMode === 'pending'
    ? pendingTasks
    : filterMode === 'completed'
    ? completedTasks
    : tasksList;

  // Category visual metadata
  const getCategoryMeta = (cat: FarmTask['category']) => {
    switch (cat) {
      case 'irrigation':
        return {
          label: 'सिंचाई (Irrigation)',
          shortLabel: 'सिंचाई',
          icon: <Droplets className="w-3.5 h-3.5 text-blue-500" />,
          chipBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          accentBorder: 'border-l-blue-500',
        };
      case 'spray':
        return {
          label: 'स्प्रे (Spray)',
          shortLabel: 'स्प्रे',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" />,
          chipBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
          accentBorder: 'border-l-purple-500',
        };
      case 'machinery':
        return {
          label: 'मशीनरी (Machinery)',
          shortLabel: 'मशीनरी',
          icon: <Tractor className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          chipBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          accentBorder: 'border-l-emerald-500',
        };
      case 'ledger_payment':
        return {
          label: 'बही-खाता भुगतान (Payment)',
          shortLabel: 'बही-खाता',
          icon: <Landmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          chipBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          accentBorder: 'border-l-amber-500',
        };
      case 'harvest':
        return {
          label: 'कटाई (Harvest)',
          shortLabel: 'कटाई',
          icon: <Wheat className="w-3.5 h-3.5 text-amber-500" />,
          chipBg: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/60',
          accentBorder: 'border-l-yellow-500',
        };
      default:
        return {
          label: 'सामान्य (General)',
          shortLabel: 'सामान्य',
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
          chipBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          accentBorder: 'border-l-slate-400',
        };
    }
  };

  const categoriesOptions: Array<{
    id: FarmTask['category'];
    name: string;
    sub: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'irrigation',
      name: 'सिंचाई (Irrigation)',
      sub: 'ट्यूबवेल / नहरी पानी',
      icon: <Droplets className="w-5 h-5 text-blue-500" />,
      color: 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40',
    },
    {
      id: 'spray',
      name: 'स्प्रे (Spray)',
      sub: 'कीटनाशक व फोलियर',
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      color: 'border-purple-400 text-purple-600 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-950/40',
    },
    {
      id: 'machinery',
      name: 'मशीनरी (Machinery)',
      sub: 'जुताई, रोटावेटर, सेवा',
      icon: <Tractor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      color: 'border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40',
    },
    {
      id: 'ledger_payment',
      name: 'बही-खाता (Payment)',
      sub: 'वेंडर / बकाया रकम',
      icon: <Landmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      color: 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40',
    },
    {
      id: 'harvest',
      name: 'कटाई (Harvest)',
      sub: 'कंबाइन व मड़ाई',
      icon: <Wheat className="w-5 h-5 text-yellow-500" />,
      color: 'border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-yellow-50/60 dark:bg-yellow-950/40',
    },
    {
      id: 'general',
      name: 'सामान्य (General)',
      sub: 'फार्म रखरखाव व अन्य',
      icon: <Clock className="w-5 h-5 text-slate-500" />,
      color: 'border-slate-400 text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-900/40',
    },
  ];

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      
      {/* Top Banner: Title + Push Notification Permission Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            <BellRing className="w-4 h-4 text-amber-500" />
            <span>{language === 'hi' ? 'दैनिक कार्य एवं अनुस्मारक' : "Daily Tasks & Farm Reminders"}</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
            {language === 'hi' ? 'आज के मुख्य कृषि कार्य एवं भुगतान (Today’s Tasks)' : "Today's Scheduled Tasks & Pending Dues"}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {language === 'hi'
              ? 'आगामी रखरखाव, सिंचाई चक्र और बही-खाते की बकाया देनदारियों की समय पर याद दिलाना।'
              : 'Automated reminders for field maintenance, irrigation schedules, and pending ledger dues.'}
          </p>
        </div>

        {/* Action Controls: Enable Push + Add Task */}
        <div className="flex items-center gap-2">
          {pushPermission !== 'granted' ? (
            <button
              onClick={requestPushPermission}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'hi' ? 'पुश सूचना चालू करें' : 'Enable Push Alert'}</span>
            </button>
          ) : (
            <button
              onClick={sendTestNotification}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-900 dark:text-emerald-200 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs"
              title="पुश सूचना टेस्ट करें"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'hi' ? 'अनुस्मारक भेजें' : 'Send Reminder'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddTaskModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'hi' ? 'नया कार्य जोड़ें' : 'Add Task'}</span>
          </button>
        </div>
      </div>

      {/* Push Notification In-App Banner if sent */}
      {testNotificationSent && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <span className="font-semibold">
              {language === 'hi'
                ? `सूचना भेजी गई: आज ${pendingTasks.length} कृषि कार्य एवं भुगतान लंबित हैं!`
                : `Notification triggered: ${pendingTasks.length} tasks/payments pending today!`}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">Just Now</span>
        </div>
      )}

      {/* Filter Tabs (Pending, Completed, All) */}
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            बाकी कार्य ({pendingTasks.length})
          </button>

          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            पूर्ण हुए ({completedTasks.length})
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            सभी ({tasksList.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          {pendingTasks.length > 0 ? (
            <span className="text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {pendingTasks.length} कार्य आज पूरे होने हैं
            </span>
          ) : (
            <span className="text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              आज के सभी कार्य पूर्ण!
            </span>
          )}
        </div>
      </div>

      {/* Tasks List: Redesigned Spacious Cards with Rearranged Buttons */}
      <div className="space-y-3">
        {displayTasks.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            {filterMode === 'completed'
              ? 'अभी तक कोई कार्य पूरा नहीं हुआ है।'
              : 'आज के लिए कोई लंबित कार्य नहीं है। नया कार्य जोड़ने के लिए ऊपर "नया कार्य जोड़ें" बटन दबाएं।'}
          </div>
        ) : (
          displayTasks.map((task) => {
            const meta = getCategoryMeta(task.category);
            return (
              <div
                key={task.id}
                className={`group rounded-2xl border transition-all duration-200 p-4 sm:p-4.5 flex flex-col gap-3 ${
                  task.isCompleted
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-65'
                    : task.category === 'ledger_payment'
                    ? 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900/60 dark:to-slate-900/40 border-amber-300/80 dark:border-amber-800/60 border-l-4 border-l-amber-500 shadow-sm hover:shadow-md'
                    : task.priority === 'high'
                    ? 'bg-gradient-to-br from-rose-50/40 via-white to-orange-50/20 dark:from-rose-950/20 dark:via-slate-900/60 dark:to-slate-900/40 border-rose-300/70 dark:border-rose-800/50 border-l-4 border-l-rose-500 shadow-sm hover:shadow-md'
                    : 'bg-white/85 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md'
                }`}
              >
                {/* 1. TOP BAR: Category + Priority + Balance Badge on Left, Action Buttons on Right */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Category Chip */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.chipBg}`}>
                      {meta.icon}
                      <span>{meta.shortLabel}</span>
                    </span>

                    {/* Priority Badge */}
                    {task.priority === 'high' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                        🔥 जरूरी
                      </span>
                    ) : task.priority === 'medium' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                        ⚡ मध्यम
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                        सामान्य
                      </span>
                    )}

                    {/* Pending Amount Badge */}
                    {task.pendingAmount !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
                        💰 बकाया: ₹{task.pendingAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* REARRANGED BUTTONS: Dedicated position in top-right, never squishing title text! */}
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {task.category === 'ledger_payment' && (
                      <button
                        onClick={() => onNavigateTab('hisab')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                        title="खाते में जाएं और भुगतान देखें"
                      >
                        <span>खाता देखें</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleStartEditTask(task)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs active:scale-90 transition-all cursor-pointer flex items-center gap-1"
                      title="कार्य एडिट करें (Edit)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>एडिट</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs active:scale-90 transition-all cursor-pointer flex items-center gap-1"
                      title="कार्य हटाएं (Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>हटाएं</span>
                    </button>
                  </div>
                </div>

                {/* 2. MAIN BODY ROW: Checkbox and Task Title - FULL WIDTH, unconstrained and neat */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="mt-0.5 p-0.5 text-slate-400 hover:text-emerald-600 transition-transform active:scale-90 cursor-pointer shrink-0"
                    title={task.isCompleted ? 'अपूर्ण चिह्नित करें' : 'पूर्ण चिह्नित करें'}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed break-words ${
                        task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                </div>

                {/* 3. METADATA FOOTER: Plot, Vendor, and Due Date badges with proper spacing */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 dark:text-slate-400 pl-8 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  {task.plotName && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{task.plotName}</span>
                    </span>
                  )}

                  {task.vendorName && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{task.vendorName}</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>तारीख: {task.dueDate}</span>
                  </span>

                  {task.isCompleted && task.completedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-auto">
                      <Check className="w-3 h-3" />
                      <span>सफलतापूर्वक पूर्ण</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Redesigned & Beautiful Add Task Modal (Liquid Glass + Visual Category Grid + Quick Templates) */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/40 dark:border-white/10 space-y-4.5 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                    {language === 'hi' ? 'नया कृषि कार्य या अनुस्मारक जोड़ें' : 'Schedule Farm Task / Ledger Alert'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    सिंचाई, स्प्रे, मशीनरी सर्विस या बही-खाता भुगतान का समयबद्ध रिकॉर्ड
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddTaskModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prefill Templates */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>त्वरित सुझाव (1-क्लिक से भरें):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickTaskTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              
              {/* Category Visual Grid (3 columns on desktop, 2 on mobile) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. कार्य श्रेणी चुनें (Select Category)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoriesOptions.map((cat) => {
                    const isSelected = taskCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTaskCategory(cat.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-1 rounded-lg bg-white dark:bg-slate-800 shadow-2xs">
                            {cat.icon}
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {cat.name.split(' ')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {cat.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task Title Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. कार्य विवरण / शीर्षक (Task Title)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रमेश ट्रैक्टर वर्क्स - रोटावेटर बकाया ₹525 का भुगतान करें"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                />
              </div>

              {/* 2-Column Grid: Plot Selection and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Plot Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    3. संबंधित खेत (Plot / Location)
                  </label>
                  <select
                    value={taskPlot}
                    onChange={(e) => setTaskPlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                  >
                    <option value="">कोई विशेष खेत नहीं (पूरा फार्म)</option>
                    {store.plots.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.crop || 'खाली'})</option>
                    ))}
                  </select>
                </div>

                {/* Priority Radios */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    4. प्राथमिकता (Priority)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTaskPriority('high')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        taskPriority === 'high'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50/50'
                      }`}
                    >
                      🔥 जरूरी
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskPriority('medium')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        taskPriority === 'medium'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50/50'
                      }`}
                    >
                      ⚡ मध्यम
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskPriority('low')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        taskPriority === 'low'
                          ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      🌱 सामान्य
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Ledger Payment Panel: When category is ledger_payment */}
              {taskCategory === 'ledger_payment' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-slate-900/60 border border-amber-300/80 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>बही-खाता भुगतान विवरण (Ledger Payment Details)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        बकाया रकम (₹ Amount)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          placeholder="525"
                          value={taskAmount || ''}
                          onChange={(e) => setTaskAmount(parseFloat(e.target.value) || undefined)}
                          className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        वेंडर / ड्राइवर / लेनदार
                      </label>
                      <input
                        type="text"
                        placeholder="उदा. Ramesh Tractor Works"
                        value={taskVendor}
                        onChange={(e) => setTaskVendor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Vendor quick selection chips */}
                  {knownVendors.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-500 block mb-1">मौजूदा वेंडर चुनें:</span>
                      <div className="flex flex-wrap gap-1">
                        {knownVendors.slice(0, 4).map((vendor, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTaskVendor(vendor)}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer"
                          >
                            + {vendor}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Due Date Input with Quick Today / Tomorrow buttons */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  5. पूर्ण करने की तारीख (Target Date)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTaskDueDate(new Date().toISOString().split('T')[0])}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    आज
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setTaskDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    कल
                  </button>
                </div>
              </div>

              {/* Action Buttons: Cancel + Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTaskId(null);
                    setShowAddTaskModal(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingTaskId
                      ? '✏️ बदलाव सेव करें (Update Task)'
                      : 'कार्य जोड़ें (Save Task)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

