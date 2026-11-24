import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Mic,
  BookOpen,
  Compass,
  RotateCcw,
  CheckCircle2,
  Bot,
  Database,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AppHelpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppHelpTutorialModal: React.FC<AppHelpTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const guides = [
    {
      icon: <Database className="w-5 h-5 text-emerald-400" />,
      title: '1. गोदाम स्टॉक व ग्राफिकल पैकेजिंग (कट्टे, बोतल, पैकेट, साइलो)',
      steps: [
        'जब भी खाद, बीज या स्प्रे दवाई की खरीद (Purchase) या अनाज की उपज (Harvest) दर्ज करें, वह अपने-आप गोदाम स्टॉक में जुड़ जाएगी (+)',
        'आइटम के प्रकार के अनुसार ग्राफिक्स दिखते हैं: खाद/बीज के लिए कट्टों की चट्टी (Bags), लिक्विड स्प्रे के लिए बोतल (Bottle), पाउडर दवाई के लिए सीलबंद पैकेट (Pouch), किलो वाले सामान के लिए ड्रम और अनाज के लिए साइलो (Grain Silo)।',
        'जैसे ही किसी एकड़ में माल इस्तेमाल होगा या मंडी में बिकेगा, गोदाम का स्टॉक अपने-आप घट जाएगा (-)।',
        'एकड़ में इस्तेमाल किया गया स्टॉक दोबारा मुख्य खरीद बिल में डबल-काउंट नहीं होता — वह सिर्फ प्रति-एकड़ तुलना और ज़्यादा खर्च की वजह जानने के लिए दर्ज होता है।',
      ],
    },
    {
      icon: <Mic className="w-5 h-5 text-amber-400" />,
      title: '2. बोलकर खर्चा कैसे लिखें (Continuous Voice Talkback)',
      steps: [
        'स्क्रीन पर दिख रहे मूवेबल "🎙️ बोलकर खर्चा" बटन को दबाएं।',
        'सीधे बोलें — जैसे: "आज एकड़ नंबर 5 में DAP और UREA का आधा-आधा बैग ब्रॉडकास्ट किया है"।',
        'ऐप एक असली इंसान की तरह आपसे एक-एक करके ज़रूरी सवाल पूछेगा (किसने किया → कितनी मजदूरी लगी → नकद दिया या बाकी)।',
        'सब पूरा होते ही 3 सेकंड का ऑटो-कन्फर्म काउंटडाउन चलेगा, गोदाम स्टॉक घट जाएगा और खर्चा उस एकड़ के खाते में सेव हो जाएगा।',
      ],
    },
    {
      icon: <BookOpen className="w-5 h-5 text-sky-400" />,
      title: '3. हिसाब-किताब व प्रति-एकड़ फॉर्म',
      steps: [
        'गोल एकड़ नंबर (#1, #2, #5...) पर टैप करके एकड़ चुनें।',
        'ट्रैक्टर/मशीनरी, इंसान से छींटा व स्प्रे, या खाद-बीज खरीद चुनें।',
        'कामगार का नाम और रेट एक बार लिखने पर ऐप अगली बार के लिए अपने-आप याद रखता है।',
        'किसी भी खर्चे के कार्ड पर "✏️ एडिट" से बदलाव करें, "🗑️ हटाएं" से डिलीट करें, या 1-टैप से Paid/बाकी बदलें।',
      ],
    },
    {
      icon: <Compass className="w-5 h-5 text-purple-400" />,
      title: '4. खेत नक्शा (बाउंड्री P1–P4 व एकड़ मार्किंग) और 3D खेत',
      steps: [
        'खेत नक्शा टैब में "1. खेत बाउंड्री" दबाकर पूरे खेत के बाहरी कोने (P1, P2, P3, P4) क्लिक या ड्रैग करें।',
        '"2. एकड़ मार्क करें" दबाकर हर एकड़ (#1, #2...) के मल्टी-पॉइंट कोने (A1, A2, A3, A4) सेट व सेव करें।',
        '3D खेत टैब में आपके चिह्नित खेत के असली आकार में फसल की उम्र (बुवाई से दिन) और स्टेज का लाइव सिमुलेशन दिखता है।',
      ],
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-amber-400" />,
      title: '5. डिलीट आइटम वापस लाना (Undo) व स्मार्ट सुरक्षा',
      steps: [
        'कोई भी खर्चा, एकड़ या खेत डिलीट होने पर ऊपर "Undo" बटन में पिछले 20 डिलीट आइटम सुरक्षित रहते हैं।',
        'ऐप बैक बटन दबाने पर गलती से बंद नहीं होता — पहले कन्फर्मेशन पूछता है।',
        'ऑटो-लॉक तुरंत होने के बजाय 5 मिनट निष्क्रिय (Inactive) रहने के बाद लागू होता है।',
      ],
    },
    {
      icon: <Bot className="w-5 h-5 text-teal-400" />,
      title: '6. मूवेबल फ्लोटिंग बटन (AI सलाहकार व वॉइस टॉकबैक)',
      steps: [
        '"🎙️ बोलकर खर्चा" और "AI सलाहकार" दोनों बटन पूरे स्क्रीन पर कहीं भी खींचकर (Drag & Move) रखे जा सकते हैं।',
      ],
    },
  ];

  const handleSpeakGuide = (idx: number, title: string, steps: string[]) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) {
      setSpeakingIdx(null);
      return;
    }
    const text = `${title}। ${steps.join('। ')}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.rate = 0.98;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  };

  const handleClose = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-emerald-500/50 text-white shadow-2xl p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                ऐप उपयोग गाइड व ऑडियो ट्यूटोरियल (Help &amp; Voice Tutorials)
              </h3>
              <p className="text-xs text-slate-400">
                किसी भी फीचर को पढ़ने या 🔊 सुनकर समझने के लिए नीचे देखें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tutorial Cards with Voice Narration Button */}
        <div className="space-y-3">
          {guides.map((g, idx) => {
            const isSpeaking = speakingIdx === idx;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {g.icon}
                    <h4 className="text-sm sm:text-base font-black text-white">
                      {g.title}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSpeakGuide(idx, g.title, g.steps)}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                      isSpeaking
                        ? 'bg-amber-400 text-slate-950 animate-pulse'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>रोकें</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>🔊 सुनें</span>
                      </>
                    )}
                  </button>
                </div>

                <ul className="space-y-1.5 pl-1">
                  {g.steps.map((st, sIdx) => (
                    <li
                      key={sIdx}
                      className="text-xs sm:text-sm text-slate-300 flex items-start gap-2 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-lg"
          >
            समझ गया, बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
