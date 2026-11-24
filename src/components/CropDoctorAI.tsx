import React, { useState, useRef, useEffect } from 'react';
import { FarmPlot, WeatherData, Language, FarmTask } from '../types/farm';
import {
  Bot,
  Send,
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  FileText,
  Thermometer,
  Wind,
  Droplets,
  Check,
  Calendar,
  X
} from 'lucide-react';

interface CropDoctorAIProps {
  plots: FarmPlot[];
  currentWeather?: WeatherData | null;
  onAddTask?: (task: FarmTask) => void;
  onNavigateTab?: (tab: 'dashboard' | 'hisab' | 'simulator' | 'reports' | 'map' | 'ai_doctor') => void;
  language: Language;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  image?: string;
  suggestedAction?: {
    title: string;
    category: 'spray' | 'irrigation' | 'machinery' | 'ledger_payment';
    dose?: string;
  };
}

const COMMON_QUERIES = [
  {
    title: '🌾 गेहूं पीला रतुआ (Yellow Rust)',
    query: 'खेत नं. 1 (गेहूं) में पत्तियों पर पीली धारियां व हल्दी जैसा पाउडर दिख रहा है। क्या यह पीला रतुआ है और इसका तुरंत उपचार क्या करें?',
  },
  {
    title: '🟡 सरसों में माहू / चेपा (Aphids)',
    query: 'सरसों के फूलों और फलियों पर हरे-काले माहू कीट चिपके हैं। कम खर्चे में सबसे असरदार स्प्रे बताएं।',
  },
  {
    title: '🎋 गन्ने में तना छेदक (Shoot Borer)',
    query: 'गन्ने की गोभ सूख रही है और खींचने पर आसानी से निकल रही है। कोराजन या अन्य दवा की मात्रा बताएं।',
  },
  {
    title: '🧪 आज के मौसम में स्प्रे का सही समय?',
    query: 'वर्तमान मौसम और हवा की गति को देखते हुए क्या आज खेत में फोलियर स्प्रे करना सुरक्षित रहेगा?',
  },
  {
    title: '🌿 देसी / जैविक कीटनाशक का नुस्खा',
    query: 'रसायन मुक्त खेती के लिए खट्टी छाछ और नीम तेल का घोल बनाने की सही विधि और अनुपात क्या है?',
  },
];

export const CropDoctorAI: React.FC<CropDoctorAIProps> = ({
  plots,
  currentWeather,
  onAddTask,
  onNavigateTab,
  language,
}) => {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(plots[0]?.id || '');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `**राम राम नरेन जी! मैं हूँ आपका AI फसल डॉक्टर (Dr. Kisan)।**\n\nमैं आपके खेतों की फसल, मिट्टी की नमी और करनाल के रियल-टाइम मौसम के अनुसार फसलों के रोगों, फंगस, कीटों एवं पोषण की सटीक जांच करता हूँ।\n\n- किसी भी बीमारी या कीट का लक्षण बताएं\n- पत्ते/पौधे का फोटो अपलोड करें\n- नीचे दिए गए सामान्य प्रश्नों में से कोई भी चुन सकते हैं।`,
      timestamp: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [taskAddedNotice, setTaskAddedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const activePlot = plots.find((p) => p.id === selectedPlotId) || plots[0];

  const handleSendMessage = async (customMessage?: string, customImage?: string) => {
    const textToSend = customMessage || inputText.trim();
    const imageToSend = customImage || selectedImage;

    if (!textToSend && !imageToSend) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: textToSend,
      image: imageToSend || undefined,
      timestamp: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/ai/crop-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          imageBase64: imageToSend || undefined,
          plotContext: activePlot
            ? {
                name: activePlot.name,
                crop: activePlot.crop,
                acres: activePlot.acres,
                stage: activePlot.stage,
                moisturePct: activePlot.moisturePct,
              }
            : undefined,
          weatherContext: currentWeather
            ? {
                temperature: currentWeather.temperature,
                humidity: currentWeather.humidity,
                windSpeed: currentWeather.windSpeed,
                windDirectionCardinal: currentWeather.windDirectionCardinal,
                precipitationChance: currentWeather.precipitationChance,
                conditionText: currentWeather.conditionText,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || 'माफ़ करें, उत्तर प्राप्त नहीं हुआ।';

      // Detect if advice mentions a spray or task
      let suggestedAction: ChatMessage['suggestedAction'] = undefined;
      if (replyText.includes('स्प्रे') || replyText.includes('spray') || replyText.includes('दवा')) {
        suggestedAction = {
          title: `${activePlot?.name.split('(')[0] || 'खेत'}: AI डॉक्टर द्वारा अनुशंसित स्प्रे छिड़काव`,
          category: 'spray',
          dose: activePlot ? `${activePlot.acres} एकड़` : '1 एकड़',
        };
      }

      const aiMsg: ChatMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_err_' + Date.now(),
          sender: 'ai',
          text: 'नेटवर्क में रुकावट आई। कृपया अपने इंटरनेट या कनेक्शन की जांच करें।',
          timestamp: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('फोटो 5MB से छोटी होनी चाहिए।');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTaskFromAI = (action: { title: string; category: any }) => {
    if (onAddTask) {
      const newTask: FarmTask = {
        id: 'task_' + Date.now(),
        title: action.title,
        plotName: activePlot?.name,
        category: action.category || 'spray',
        dueDate: new Date().toISOString().split('T')[0],
        isCompleted: false,
        priority: 'high',
      };
      onAddTask(newTask);
      setTaskAddedNotice('कार्य सफलतापूर्वक "Today\'s Tasks" में जोड़ दिया गया!');
      setTimeout(() => setTaskAddedNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Liquid Glass Effect */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900/70 via-teal-950/80 to-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/60 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  डॉ. किसान (AI Crop Doctor)
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                फसल रोग पहचान, कीटनाशक/फफूंदनाशक खुराक, जैविक उपाय एवं रियल-टाइम मौसम आधारित कृषि परामर्श
              </p>
            </div>
          </div>

          {/* Context Pills: Active Plot & Live Weather */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Plot Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 text-white border border-white/15 backdrop-blur-md">
              <span className="text-emerald-400 font-semibold">खेत:</span>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="bg-transparent font-bold focus:outline-none text-slate-100 cursor-pointer"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.name.split('(')[0]} ({p.crop.split('(')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Weather Metric Chip */}
            {currentWeather && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md font-mono">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  {currentWeather.temperature}°C
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  {currentWeather.humidity}%
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  {currentWeather.windSpeed} km/h
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Added Notification Toast */}
      {taskAddedNotice && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{taskAddedNotice}</span>
          </div>
          <button onClick={() => setTaskAddedNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Discussion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chat Conversation Stream (8 cols) */}
        <div className="lg:col-span-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col h-[620px] overflow-hidden">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-3xl p-4 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-sm'
                }`}>
                  {/* Uploaded Image Preview */}
                  {msg.image && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-white/20 max-h-48">
                      <img src={msg.image} alt="Crop sample" className="w-full object-cover" />
                    </div>
                  )}

                  {/* Message Text with simple Markdown formatting */}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} className="font-bold text-sm sm:text-base text-emerald-800 dark:text-emerald-300 mt-2 mb-1">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={idx} className="font-bold text-slate-900 dark:text-white mt-1.5">{line.replace(/\*\*/g, '')}</p>;
                      }
                      return <p key={idx} className="my-0.5">{line}</p>;
                    })}
                  </div>

                  {/* Action Suggestion Bar (1-Click Convert to Task / Ledger) */}
                  {msg.suggestedAction && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCreateTaskFromAI(msg.suggestedAction!)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>कार्य सूची (Today's Tasks) में जोड़ें</span>
                      </button>

                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab('hisab')}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] border border-slate-300 dark:border-slate-600 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                          <span>दवा का खर्च दर्ज करें (Ledger)</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                  }`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-slate-500 dark:text-slate-400 text-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>डॉ. किसान विश्लेषण कर रहे हैं (Analyzing crop symptoms & weather)...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Image Uploaded Draft Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  पौधे का फोटो तैयार है (Ready for diagnosis)
                </span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Box & Toolbar */}
          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Image Picker Trigger */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="पत्ते या पौधे का फोटो अपलोड करें"
                className="p-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-300 dark:border-slate-700 shrink-0"
              >
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="फसल के लक्षण, रोग या कीट के बारे में पूछें..."
                className="flex-1 py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || (!inputText.trim() && !selectedImage)}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all shadow-md cursor-pointer shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Quick Discussion Starters & Reference Guide (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Quick Query Cards */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>शीघ्र चर्चा प्रश्न (Quick Topics)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              एक क्लिक में रोग व दवा के बारे में विस्तृत सलाह पाएं:
            </p>

            <div className="space-y-2">
              {COMMON_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.query)}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 transition-all cursor-pointer group"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {q.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {q.query}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Plot Micro-Health Card */}
          {activePlot && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  चयनित खेत स्थिति
                </h4>
                <span className="text-xs font-bold text-emerald-600">
                  {activePlot.acres} एकड़
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1.5">
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">फसल:</span> {activePlot.crop}</p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">अवस्था:</span> {activePlot.stage} ({activePlot.progressPct}%)</p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">मिट्टी स्वास्थ्य:</span> {activePlot.soilHealth}/100</p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">नमी:</span> {activePlot.moisturePct}%</p>
                {activePlot.currentActivity && (
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">वर्तमान गतिविधि:</span> {activePlot.currentActivity}</p>
                )}
              </div>
            </div>
          )}

          {/* Organic Formula Reference Box */}
          <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs space-y-2">
            <h5 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>🌾</span>
              <span>डॉ. किसान का देसी नुस्खा (Organic Tip)</span>
            </h5>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
              फंगस व माहू की शुरुआती अवस्था में 500 मिली नीम का तेल + 200 ग्राम कपड़े धोने का पाउडर (घोलक हेतु) 150 लीटर पानी में मिलाकर छिड़कने से मित्र कीटों को नुकसान पहुँचाए बिना कीटों पर नियंत्रण होता है।
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
