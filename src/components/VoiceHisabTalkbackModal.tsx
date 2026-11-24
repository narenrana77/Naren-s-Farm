import React, { useState, useEffect, useRef } from 'react';
import {
  FarmDataStore,
  AcreSubPlot,
  AcreExpenseEntry,
  MachineryRecord,
  LabourRecord,
  MaterialRecord,
  MachineryActivity,
  LabourActivity,
  MaterialType,
} from '../types/farm';
import {
  Mic,
  Volume2,
  CheckCircle2,
  X,
  Send,
} from 'lucide-react';
import {
  findMatchingStockItem,
  mapMaterialTypeToStockCategory,
  applyStockOutTransaction,
} from '../utils/stockUtils';

interface VoiceHisabTalkbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: FarmDataStore;
  onSaveStore: (newStore: FarmDataStore) => void;
  defaultPlotName?: string;
  defaultAcreNumber?: number | string;
}

interface ParsedMaterialItem {
  nameHi: string;
  type: MaterialType;
  quantity: number;
  unit: MaterialRecord['unit'];
  unitLabelHi: string;
  ratePerUnit: number;
  totalAmount: number;
}

interface ParsedVoiceDraft {
  rawTranscript: string;
  plotName: string;
  acreNumber: string;
  date: string;
  workTimeSlot: string;
  isBroadcasting: boolean;
  isManualSpray: boolean;
  machineryActivity: MachineryActivity | null;
  machineryShortHi: string;
  machineryRatePerAcre: number | null;
  labourActivity: LabourActivity | null;
  labourShortHi: string;
  labourCharge: number | null;
  workerName: string;
  materials: ParsedMaterialItem[];
  isPaid: boolean | null;
}

type ConversationStage =
  | 'ask_initial_command'
  | 'ask_acre'
  | 'ask_worker'
  | 'ask_charge'
  | 'ask_payment_status'
  | 'auto_confirm_countdown'
  | 'confirmed_done';

const getOffsetIsoDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const formatDateHi = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

function parseHindiFarmingSpeech(
  text: string,
  defaultPlotName: string,
  defaultAcreNum?: number | string
): ParsedVoiceDraft {
  const lower = text.toLowerCase().trim();

  // 1. Date & Time Slot Detection
  let date = getOffsetIsoDate(0);
  if (lower.includes('परसों') || lower.includes('parso') || lower.includes('parson')) {
    date = getOffsetIsoDate(2);
  } else if (lower.includes('कल') || lower.includes('kal') || lower.includes('yesterday')) {
    date = getOffsetIsoDate(1);
  }

  let workTimeSlot = '🌅 सुबह';
  if (lower.includes('दोपहर') || lower.includes('dopahar') || lower.includes('afternoon')) {
    workTimeSlot = '☀️ दोपहर';
  } else if (lower.includes('शाम') || lower.includes('shaam') || lower.includes('sham') || lower.includes('evening')) {
    workTimeSlot = '🌇 शाम';
  } else if (lower.includes('रात') || lower.includes('raat') || lower.includes('night')) {
    workTimeSlot = '🌙 रात';
  }

  // 2. Acre Number Detection
  let acreNumber = defaultAcreNum ? String(defaultAcreNum) : '';
  const acreRegex =
    /(?:acre|एकड़|किला|killa|नं|नंबर|no\.?|number)\s*(?:no\.?|नंबर|नं\.?)?\s*(\d+(?:\.\d+)?)/i;
  const acreMatch = lower.match(acreRegex);
  if (acreMatch && acreMatch[1]) {
    acreNumber = acreMatch[1];
  } else {
    const hindiNumMap: Array<[RegExp, string]> = [
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:एक|पहला|first|one)\b/i, '1'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:दो|दूसरा|two)\b/i, '2'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:तीन|तीसरा|three)\b/i, '3'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:चार|चौथा|four)\b/i, '4'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:पांच|पाँच|पांचवा|panch|five)\b/i, '5'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:छह|छः|chhe|six)\b/i, '6'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:सात|saat|seven)\b/i, '7'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:आठ|aath|eight)\b/i, '8'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:नौ|nau|nine)\b/i, '9'],
      [/(?:एकड़|acre|किला|killa)\s*(?:नंबर|no)?\s*(?:दस|das|ten)\b/i, '10'],
    ];
    for (const [rgx, val] of hindiNumMap) {
      if (rgx.test(lower)) {
        acreNumber = val;
        break;
      }
    }
  }

  // 3. Fraction / Bag Quantity Detection ("आधा-आधा बैग", "aadha aadha bag", "1 bag")
  let defaultItemQty = 1;
  if (
    lower.includes('आधा-आधा') ||
    lower.includes('आधा आधा') ||
    lower.includes('aadha aadha') ||
    lower.includes('adha adha') ||
    lower.includes('half half') ||
    lower.includes('आधा') ||
    lower.includes('aadha') ||
    lower.includes('adha') ||
    lower.includes('half') ||
    lower.includes('0.5') ||
    lower.includes('1/2')
  ) {
    defaultItemQty = 0.5;
  } else if (lower.includes('पौना') || lower.includes('pauna') || lower.includes('0.75')) {
    defaultItemQty = 0.75;
  } else if (lower.includes('सवा') || lower.includes('sawa') || lower.includes('1.25')) {
    defaultItemQty = 1.25;
  } else if (lower.includes('डेढ़') || lower.includes('dedh') || lower.includes('1.5')) {
    defaultItemQty = 1.5;
  } else if (lower.includes('ढाई') || lower.includes('dhai') || lower.includes('2.5')) {
    defaultItemQty = 2.5;
  } else {
    const qtyMatch = lower.match(
      /(\d+(?:\.\d+)?)\s*(?:bag|bags|बैग|कट्टा|कट्टे|बोरी|बोरे|katta|bori)/i
    );
    if (qtyMatch && qtyMatch[1]) {
      defaultItemQty = Number(qtyMatch[1]) || 1;
    } else if (
      lower.includes('दो बैग') ||
      lower.includes('दो कट्टे') ||
      lower.includes('do bag') ||
      lower.includes('do katte')
    ) {
      defaultItemQty = 2;
    } else if (lower.includes('तीन बैग') || lower.includes('teen bag')) {
      defaultItemQty = 3;
    }
  }

  // 4. Detect Materials (DAP, Urea, Zinc, Potash, Sulphur)
  const materials: ParsedMaterialItem[] = [];

  if (
    lower.includes('dap') ||
    lower.includes('डीएपी') ||
    lower.includes('डी.ए.पी') ||
    lower.includes('डाय')
  ) {
    const rate = 1350;
    materials.push({
      nameHi: 'डीएपी खाद (DAP)',
      type: 'fertiliser',
      quantity: defaultItemQty,
      unit: 'bag',
      unitLabelHi: 'बैग',
      ratePerUnit: rate,
      totalAmount: Math.round(defaultItemQty * rate),
    });
  }

  if (lower.includes('urea') || lower.includes('यूरिया') || lower.includes('युरिया')) {
    const rate = 270;
    materials.push({
      nameHi: 'यूरिया खाद (Urea)',
      type: 'fertiliser',
      quantity: defaultItemQty,
      unit: 'bag',
      unitLabelHi: 'बैग',
      ratePerUnit: rate,
      totalAmount: Math.round(defaultItemQty * rate),
    });
  }

  if (lower.includes('zinc') || lower.includes('जिंक') || lower.includes('ज़िंक')) {
    const qty = defaultItemQty < 1 ? 5 : defaultItemQty;
    const rate = 180;
    materials.push({
      nameHi: 'जिंक सल्फेट (Zinc)',
      type: 'fertiliser',
      quantity: qty,
      unit: 'kg',
      unitLabelHi: 'किलो',
      ratePerUnit: rate,
      totalAmount: Math.round(qty * rate),
    });
  }

  if (lower.includes('potash') || lower.includes('पोटाश') || lower.includes('mop')) {
    const rate = 1700;
    materials.push({
      nameHi: 'पोटाश खाद (MOP)',
      type: 'fertiliser',
      quantity: defaultItemQty,
      unit: 'bag',
      unitLabelHi: 'बैग',
      ratePerUnit: rate,
      totalAmount: Math.round(defaultItemQty * rate),
    });
  }

  if (lower.includes('sulphur') || lower.includes('sulfur') || lower.includes('सल्फर')) {
    const qty = defaultItemQty < 1 ? 3 : defaultItemQty;
    const rate = 160;
    materials.push({
      nameHi: 'सल्फर (Sulphur)',
      type: 'fertiliser',
      quantity: qty,
      unit: 'kg',
      unitLabelHi: 'किलो',
      ratePerUnit: rate,
      totalAmount: Math.round(qty * rate),
    });
  }

  // 5. Detect Broadcasting / Manual Spray / Machinery
  const isBroadcasting =
    lower.includes('broadcast') ||
    lower.includes('ब्रॉडकास्ट') ||
    lower.includes('ब्रोडकास्ट') ||
    lower.includes('छींटा') ||
    lower.includes('छिंटा') ||
    lower.includes('chhinta') ||
    lower.includes('chinta') ||
    lower.includes('छिड़काव') ||
    (materials.length > 0 &&
      (lower.includes('डाला') ||
        lower.includes('डाली') ||
        lower.includes('dala') ||
        lower.includes('kiya')));

  const isManualSpray =
    (lower.includes('spray') || lower.includes('स्प्रे') || lower.includes('सप्रे')) &&
    !lower.includes('tractor') &&
    !lower.includes('ट्रैक्टर') &&
    !lower.includes('drone') &&
    !lower.includes('ड्रोन');

  let labourActivity: LabourActivity | null = null;
  let labourShortHi = '';
  if (isBroadcasting) {
    if (lower.includes('दवाई') || lower.includes('pesticide')) {
      labourActivity = 'Pesticide Broadcasting (दवाई/जिंक छींटा)';
      labourShortHi = 'दवाई/जिंक छींटा (Broadcasting)';
    } else if (lower.includes('बीज') || lower.includes('seed')) {
      labourActivity = 'Seed Broadcasting (बीज छींटा बिजाई)';
      labourShortHi = 'बीज छींटा (Broadcasting)';
    } else {
      labourActivity = 'Fertiliser Broadcasting (खाद/यूरिया छींटा)';
      labourShortHi = 'खाद/यूरिया छींटा (Broadcasting)';
    }
  } else if (isManualSpray) {
    labourActivity = 'Manual Spray (पिट्ठू/बैटरी पंप स्प्रे)';
    labourShortHi = 'पिट्ठू/बैटरी पंप स्प्रे';
  } else if (lower.includes('निराई') || lower.includes('गुड़ाई') || lower.includes('weeding')) {
    labourActivity = 'Weed Management';
    labourShortHi = 'निराई-गुड़ाई मजदूरी';
  }

  let machineryActivity: MachineryActivity | null = null;
  let machineryShortHi = '';
  if (lower.includes('super seeder') || lower.includes('सुपर सीडर')) {
    machineryActivity = 'Super Seeder';
    machineryShortHi = 'सुपर सीडर बुवाई';
  } else if (lower.includes('happy seeder') || lower.includes('हैप्पी सीडर')) {
    machineryActivity = 'Happy Seeder';
    machineryShortHi = 'हैप्पी सीडर बुवाई';
  } else if (lower.includes('rotavator') || lower.includes('रोटावेटर')) {
    machineryActivity = 'Rotavator';
    machineryShortHi = 'रोटावेटर जुताई';
  } else if (lower.includes('cultivator') || lower.includes('कल्टीवेटर') || lower.includes('हल')) {
    machineryActivity = 'Cultivator';
    machineryShortHi = 'कल्टीवेटर जुताई';
  } else if (lower.includes('harrow') || lower.includes('तवियां') || lower.includes('हैरो')) {
    machineryActivity = 'Disc Harrow';
    machineryShortHi = 'तवियां (डिस्क हैरो)';
  } else if (lower.includes('laser') || lower.includes('लेजर') || lower.includes('कंप्यूटर गोड़ी')) {
    machineryActivity = 'Laser Land Leveler';
    machineryShortHi = 'कंप्यूटर गोड़ी (लेजर लेवलर)';
  } else if (lower.includes('drone') || lower.includes('ड्रोन')) {
    machineryActivity = 'Drone Spray';
    machineryShortHi = 'ड्रोन स्प्रे';
  } else if (lower.includes('combine') || lower.includes('कंबाइन')) {
    machineryActivity = 'Combine Harvester';
    machineryShortHi = 'कंबाइन कटाई';
  } else if (lower.includes('reaper') || lower.includes('रीपर') || lower.includes('भूसा') || lower.includes('तूड़ी')) {
    machineryActivity = 'Straw Reaper';
    machineryShortHi = 'भूसा रीपर (तूड़ी मशीन)';
  } else if (lower.includes('रौनी') || lower.includes('rauni') || lower.includes('पलेवा')) {
    machineryActivity = 'Rauni Irrigation';
    machineryShortHi = 'रौनी / पलेवा सिंचाई';
  }

  return {
    rawTranscript: text,
    plotName: defaultPlotName,
    acreNumber,
    date,
    workTimeSlot,
    isBroadcasting,
    isManualSpray,
    machineryActivity,
    machineryShortHi,
    machineryRatePerAcre: null,
    labourActivity,
    labourShortHi,
    labourCharge: null,
    workerName: '',
    materials,
    isPaid: null,
  };
}

export const VoiceHisabTalkbackModal: React.FC<VoiceHisabTalkbackModalProps> = ({
  isOpen,
  onClose,
  store,
  onSaveStore,
  defaultPlotName,
  defaultAcreNumber,
}) => {
  const [stage, setStage] = useState<ConversationStage>('ask_initial_command');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [assistantQuestion, setAssistantQuestion] = useState<string>('');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [textFallbackInput, setTextFallbackInput] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3);
  const [draft, setDraft] = useState<ParsedVoiceDraft | null>(null);

  const stageRef = useRef<ConversationStage>(stage);
  const draftRef = useRef<ParsedVoiceDraft | null>(draft);
  const recognitionRef = useRef<any>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const isOpenRef = useRef<boolean>(isOpen);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const activePlotName = defaultPlotName || store.plots[0]?.name || 'मुख्य खेत';

  // Stop all audio & timers cleanly
  const stopAllVoiceAndTimers = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  // Speak question aloud in Hindi and automatically open microphone when done speaking
  const speakQuestionAndAutoListen = (
    questionHi: string,
    shouldListenAfter = true,
    onDoneCallback?: () => void
  ) => {
    setAssistantQuestion(questionHi);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onDoneCallback) onDoneCallback();
      if (shouldListenAfter && isOpenRef.current) {
        startContinuousListening();
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = questionHi.replace(/[🎙️🌾🖐️🚜🧪✅⏳💰📅⚡🔊🎉]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'hi-IN';
      utterance.rate = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const hiVoice = voices.find(
        (v) => v.lang.includes('hi') || v.lang.includes('IN')
      );
      if (hiVoice) utterance.voice = hiVoice;

      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (!isOpenRef.current) return;
        if (onDoneCallback) onDoneCallback();
        if (shouldListenAfter) {
          startContinuousListening();
        }
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (!isOpenRef.current) return;
        if (onDoneCallback) onDoneCallback();
        if (shouldListenAfter) {
          startContinuousListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      if (onDoneCallback) onDoneCallback();
      if (shouldListenAfter && isOpenRef.current) {
        startContinuousListening();
      }
    }
  };

  // Start native SpeechRecognition automatically after assistant finishes speaking
  const startContinuousListening = () => {
    if (typeof window === 'undefined' || !isOpenRef.current) return;
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRec();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setIsListening(false);
        if (transcript) {
          handleSpokenTurn(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Automatically start the human-like conversation when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage('ask_initial_command');
      setDraft(null);
      setLastUserSpeech('');
      setTextFallbackInput('');
      setCountdownSeconds(3);
      speakQuestionAndAutoListen(
        'नमस्ते किसान भाई! बताइए आज कौन से एकड़ में क्या काम या खाद-बीज का खर्चा हुआ?',
        true
      );
    } else {
      stopAllVoiceAndTimers();
    }
    return () => {
      stopAllVoiceAndTimers();
    };
  }, [isOpen]);

  // Step through the Q&A one question at a time, then trigger 3-second auto-confirm countdown
  const evaluateNextQuestionOrAutoConfirm = (nextDraft: ParsedVoiceDraft) => {
    setDraft({ ...nextDraft });
    draftRef.current = { ...nextDraft };

    // Question 1: Acre Number
    if (!nextDraft.acreNumber) {
      setStage('ask_acre');
      speakQuestionAndAutoListen(
        'यह काम कौन से एकड़ नंबर में हुआ है? एकड़ नंबर बोलिए।',
        true
      );
      return;
    }

    // Question 2: Worker / Driver Name
    if (!nextDraft.workerName) {
      setStage('ask_worker');
      const summaryItems =
        nextDraft.materials.length > 0
          ? nextDraft.materials
              .map(
                (m) =>
                  `${m.quantity === 0.5 ? 'आधा' : m.quantity} ${m.unitLabelHi} ${
                    m.nameHi.split('(')[0]
                  }`
              )
              .join(' और ')
          : nextDraft.machineryShortHi || nextDraft.labourShortHi || 'कृषि कार्य';
      speakQuestionAndAutoListen(
        `एकड़ नंबर ${nextDraft.acreNumber} में ${summaryItems} नोट कर लिया है। यह काम या छींटा किसने किया? नाम बोलिए या बोलिए खुद किया।`,
        true
      );
      return;
    }

    // Question 3: Charge / Rate (for Broadcasting, Labour, or Machinery)
    if (
      (nextDraft.isBroadcasting || nextDraft.labourActivity) &&
      nextDraft.labourCharge === null
    ) {
      setStage('ask_charge');
      speakQuestionAndAutoListen(
        `${nextDraft.workerName} को छींटा या मजदूरी के कितने रुपये लगे?`,
        true
      );
      return;
    }

    if (nextDraft.machineryActivity && nextDraft.machineryRatePerAcre === null) {
      setStage('ask_charge');
      speakQuestionAndAutoListen(
        `${nextDraft.machineryShortHi} का प्रति एकड़ कितना रेट लगा?`,
        true
      );
      return;
    }

    // Question 4: Payment status (Paid or Unpaid)
    if (nextDraft.isPaid === null) {
      setStage('ask_payment_status');
      speakQuestionAndAutoListen(
        'क्या यह पैसा नकद दे दिया है या अभी उधार बाकी है?',
        true
      );
      return;
    }

    // All questions answered! Start 3-Second Auto-Confirm Countdown!
    startThreeSecondAutoConfirm(nextDraft);
  };

  // Handle each spoken turn from the farmer
  const handleSpokenTurn = (speechText: string) => {
    const clean = speechText.trim();
    if (!clean) return;
    setLastUserSpeech(clean);
    setTextFallbackInput('');

    const currentStage = stageRef.current;
    const currentDraft = draftRef.current;

    if (currentStage === 'ask_initial_command' || !currentDraft) {
      const parsed = parseHindiFarmingSpeech(
        clean,
        activePlotName,
        defaultAcreNumber
      );
      evaluateNextQuestionOrAutoConfirm(parsed);
      return;
    }

    const lower = clean.toLowerCase();

    if (currentStage === 'ask_acre') {
      const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
      let acreVal = numMatch ? numMatch[1] : '';
      if (!acreVal) {
        if (lower.includes('पांच') || lower.includes('पाँच') || lower.includes('panch')) acreVal = '5';
        else if (lower.includes('एक') || lower.includes('ek')) acreVal = '1';
        else if (lower.includes('दो') || lower.includes('do')) acreVal = '2';
        else if (lower.includes('तीन') || lower.includes('teen')) acreVal = '3';
        else if (lower.includes('चार') || lower.includes('char')) acreVal = '4';
        else if (lower.includes('छह') || lower.includes('chhe')) acreVal = '6';
        else if (lower.includes('सात') || lower.includes('saat')) acreVal = '7';
        else if (lower.includes('आठ') || lower.includes('aath')) acreVal = '8';
        else acreVal = '1';
      }
      evaluateNextQuestionOrAutoConfirm({
        ...currentDraft,
        acreNumber: acreVal,
      });
      return;
    }

    if (currentStage === 'ask_worker') {
      const isSelf =
        lower.includes('खुद') ||
        lower.includes('khud') ||
        lower.includes('अपना') ||
        lower.includes('मैंने') ||
        lower.includes('maine') ||
        lower.includes('self') ||
        lower.includes('कोई नहीं');

      evaluateNextQuestionOrAutoConfirm({
        ...currentDraft,
        workerName: isSelf ? 'खुद किसान (Self)' : clean,
        labourCharge: isSelf ? 0 : currentDraft.labourCharge,
        isPaid: isSelf ? true : currentDraft.isPaid,
      });
      return;
    }

    if (currentStage === 'ask_charge') {
      const numMatch = lower.match(/(\d+)/);
      let amountVal = numMatch ? Number(numMatch[1]) : 0;
      if (!numMatch) {
        if (lower.includes('सौ') || lower.includes('sau')) amountVal = 100;
        else if (lower.includes('पचास') || lower.includes('pachas')) amountVal = 50;
        else if (lower.includes('दो सौ') || lower.includes('do sau')) amountVal = 200;
        else if (lower.includes('डेढ़ सौ') || lower.includes('dedh sau')) amountVal = 150;
        else amountVal = 100;
      }

      if (currentDraft.machineryActivity && currentDraft.machineryRatePerAcre === null) {
        evaluateNextQuestionOrAutoConfirm({
          ...currentDraft,
          machineryRatePerAcre: amountVal || 1200,
        });
      } else {
        evaluateNextQuestionOrAutoConfirm({
          ...currentDraft,
          labourCharge: amountVal,
        });
      }
      return;
    }

    if (currentStage === 'ask_payment_status') {
      const isUnpaid =
        lower.includes('बाकी') ||
        lower.includes('baki') ||
        lower.includes('उधार') ||
        lower.includes('udhar') ||
        lower.includes('नहीं') ||
        lower.includes('nahi');
      evaluateNextQuestionOrAutoConfirm({
        ...currentDraft,
        isPaid: !isUnpaid,
      });
    }
  };

  // 3-Second Auto-Confirm Countdown -> Confirmed & Saved!
  const startThreeSecondAutoConfirm = (readyDraft: ParsedVoiceDraft) => {
    setStage('auto_confirm_countdown');
    setCountdownSeconds(3);

    const matTotal = readyDraft.materials.reduce((s, m) => s + m.totalAmount, 0);
    const labTotal = readyDraft.labourCharge || 0;
    const machTotal = readyDraft.machineryRatePerAcre || 0;
    const grandTotal = matTotal + labTotal + machTotal;

    speakQuestionAndAutoListen(
      `धन्यवाद! एकड़ नंबर ${readyDraft.acreNumber} का कुल खर्चा ${grandTotal} रुपये पूरा हो गया है। 3 सेकंड में अपने आप कन्फर्म हो रहा है।`,
      false
    );

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }

    let remaining = 3;
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownSeconds(remaining);
      } else {
        if (countdownIntervalRef.current) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdownSeconds(0);
        commitVoiceDraftToStore(readyDraft);
      }
    }, 1000);
  };

  // Commit the voice expense directly into Acre #N and HisabKitab
  const commitVoiceDraftToStore = (finalDraft: ParsedVoiceDraft) => {
    const targetPlot =
      store.plots.find((p) => p.name === finalDraft.plotName) || store.plots[0];
    if (!targetPlot) return;

    const targetAcreNumStr = String(finalDraft.acreNumber || '1');
    const targetAcreNumVal = Number(targetAcreNumStr) || 1;
    const plotWithAcreLabel = `${targetPlot.name} (एकड़ #${targetAcreNumStr})`;
    const nowTs = Date.now();
    const paidFlag = finalDraft.isPaid !== false;

    const newAcreExpenseEntries: AcreExpenseEntry[] = [];
    const newMaterialRecords: MaterialRecord[] = [];
    const newLabourRecords: LabourRecord[] = [];
    const newMachineryRecords: MachineryRecord[] = [];

    let nextStockItems = [...(store.stockItems || [])];
    let nextStockMovements = [...(store.stockMovements || [])];
    let nextPlots = [...store.plots];

    finalDraft.materials.forEach((mat, idx) => {
      const stockCategory = mapMaterialTypeToStockCategory(mat.type);
      const matchedStock = findMatchingStockItem(
        nextStockItems,
        mat.nameHi,
        stockCategory
      );

      // Deduct from Godown Stock & log in Acre #N with zero double-counting in materialRecords
      const stockOutRes = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: nextPlots,
        stockItemId: matchedStock?.id,
        category: stockCategory,
        itemName: matchedStock ? matchedStock.name : mat.nameHi,
        quantity: mat.quantity,
        unit: mat.unit,
        ratePerUnit: mat.ratePerUnit || matchedStock?.ratePerUnit || 0,
        movementType: 'use_in_acre',
        plotName: targetPlot.name,
        acreNumber: targetAcreNumStr,
        reasonOrNote: `🎙️ वॉइस टॉकबैक द्वारा प्रयोग (${
          finalDraft.isBroadcasting
            ? 'खाद छींटा'
            : finalDraft.isManualSpray
            ? 'स्प्रे छिड़काव'
            : 'खेत में डाला'
        })`,
        partyName: finalDraft.workerName || 'खुद किसान',
        date: finalDraft.date,
        workTimeSlot: finalDraft.workTimeSlot,
      });

      nextStockItems = stockOutRes.nextStockItems;
      nextStockMovements = stockOutRes.nextStockMovements;
      nextPlots = stockOutRes.nextPlots;

      // Only add to materialRecords if the farmer had 0 stock beforehand (direct cash purchase + immediate use)
      if (!matchedStock || matchedStock.currentStock <= 0) {
        const matId = `voice-mat-${nowTs}-${idx}`;
        newMaterialRecords.push({
          id: matId,
          type: mat.type,
          itemName: mat.nameHi,
          quantity: mat.quantity,
          unit: mat.unit,
          vendor: finalDraft.workerName || 'किसान खाद भंडार',
          ratePerUnit: mat.ratePerUnit,
          totalAmount: mat.totalAmount,
          plotName: plotWithAcreLabel,
          date: finalDraft.date,
          workTimeSlot: finalDraft.workTimeSlot,
          notes: `🎙️ वॉइस टॉकबैक (सीधी खरीद व प्रयोग): ${mat.quantity} ${mat.unitLabelHi} ${mat.nameHi} (एकड़ #${targetAcreNumStr})`,
        });
      }
    });

    if (
      (finalDraft.isBroadcasting || finalDraft.labourActivity) &&
      (finalDraft.labourCharge ?? 0) > 0
    ) {
      const labId = `voice-lab-${nowTs}`;
      const charge = finalDraft.labourCharge || 0;
      const totalBags = finalDraft.materials.reduce((s, m) => s + m.quantity, 0);
      const act: LabourActivity =
        finalDraft.labourActivity || 'Fertiliser Broadcasting (खाद/यूरिया छींटा)';

      newLabourRecords.push({
        id: labId,
        activity: act,
        mateName: finalDraft.workerName || 'छींटा मजदूर',
        plotName: plotWithAcreLabel,
        workersCount: 1,
        acresCovered: 1,
        bagsOrTanksCount: totalBags > 0 ? totalBags : 1,
        ratePerWorkerOrAcre: charge,
        rateType: 'per_acre',
        totalAmount: charge,
        paidAmount: paidFlag ? charge : 0,
        isPaid: paidFlag,
        date: finalDraft.date,
        workTimeSlot: finalDraft.workTimeSlot,
        notes: `🎙️ वॉइस टॉकबैक: ${finalDraft.labourShortHi || act} (एकड़ #${targetAcreNumStr})`,
      });

      newAcreExpenseEntries.push({
        id: `acre-exp-${labId}`,
        machineryOrJob: `🖐️ ${finalDraft.labourShortHi || act}`,
        workerName: finalDraft.workerName || 'छींटा मजदूर',
        rate: charge,
        totalAmount: charge,
        date: finalDraft.date,
        workTimeSlot: finalDraft.workTimeSlot,
        category: 'labour',
        ledgerRecordId: labId,
        reasonNote: `🎙️ वॉइस टॉकबैक: ${finalDraft.labourShortHi || act}`,
      });
    }

    if (finalDraft.machineryActivity) {
      const machId = `voice-mach-${nowTs}`;
      const rate = finalDraft.machineryRatePerAcre || 1200;
      newMachineryRecords.push({
        id: machId,
        activity: finalDraft.machineryActivity,
        driverName: finalDraft.workerName || 'ट्रैक्टर ड्राइवर',
        plotName: plotWithAcreLabel,
        acres: 1,
        ratePerUnit: rate,
        unitType: 'acre',
        totalAmount: rate,
        paidAmount: paidFlag ? rate : 0,
        isPaid: paidFlag,
        date: finalDraft.date,
        workTimeSlot: finalDraft.workTimeSlot,
        notes: `🎙️ वॉइस टॉकबैक: ${finalDraft.machineryShortHi} (एकड़ #${targetAcreNumStr})`,
      });

      newAcreExpenseEntries.push({
        id: `acre-exp-${machId}`,
        machineryOrJob: `🚜 ${finalDraft.machineryShortHi}`,
        workerName: finalDraft.workerName || 'ट्रैक्टर ड्राइवर',
        rate,
        totalAmount: rate,
        date: finalDraft.date,
        workTimeSlot: finalDraft.workTimeSlot,
        category: 'machinery',
        ledgerRecordId: machId,
        reasonNote: `🎙️ वॉइस टॉकबैक: ${finalDraft.machineryShortHi}`,
      });
    }

    const updatedTargetPlot =
      nextPlots.find((p) => p.id === targetPlot.id) || targetPlot;
    let existingSubPlots = [...(updatedTargetPlot.subPlots || [])];
    const hasAcre = existingSubPlots.some(
      (sp) => String(sp.acreNumber) === targetAcreNumStr
    );

    if (!hasAcre) {
      const newSub: AcreSubPlot = {
        id: `${targetPlot.id}-acre-${targetAcreNumStr}`,
        acreNumber: targetAcreNumVal,
        name: `एकड़ #${targetAcreNumStr}`,
        acres: 1,
        acreStatus: 'Seeded',
        cropName: targetPlot.crop,
        cropVariety: targetPlot.crop,
        sowingDate: targetPlot.sowingDate,
        stage: targetPlot.stage,
        completedActivities: [],
        expenseEntries: [],
      };
      existingSubPlots.push(newSub);
    }

    const addedMatCost = finalDraft.materials.reduce((s, r) => s + r.totalAmount, 0);
    const addedLabCost = newLabourRecords.reduce((s, r) => s + r.totalAmount, 0);
    const addedMachCost = newMachineryRecords.reduce((s, r) => s + r.totalAmount, 0);
    const totalAdded = addedMatCost + addedLabCost + addedMachCost;

    const updatedSubPlots = existingSubPlots.map((sp) => {
      if (String(sp.acreNumber) !== targetAcreNumStr) return sp;
      const nextEntries = [...newAcreExpenseEntries, ...(sp.expenseEntries || [])];
      const nextActivities = [...(sp.completedActivities || [])];
      newAcreExpenseEntries.forEach((e) => {
        if (!nextActivities.includes(e.machineryOrJob)) {
          nextActivities.push(e.machineryOrJob);
        }
      });

      return {
        ...sp,
        expenseEntries: nextEntries,
        completedActivities: nextActivities,
        labourExpense: (sp.labourExpense || 0) + addedLabCost,
        machineryExpense: (sp.machineryExpense || 0) + addedMachCost,
        allocatedExpense: (sp.allocatedExpense || 0) + addedLabCost + addedMachCost,
      };
    });

    const updatedPlots = nextPlots.map((p) =>
      p.id === targetPlot.id
        ? {
            ...p,
            acres: Math.max(p.acres, updatedSubPlots.length),
            subPlots: updatedSubPlots,
          }
        : p
    );

    onSaveStore({
      ...store,
      plots: updatedPlots,
      stockItems: nextStockItems,
      stockMovements: nextStockMovements,
      materialRecords: [...newMaterialRecords, ...(store.materialRecords || [])],
      labourRecords: [...newLabourRecords, ...store.labourRecords],
      machineryRecords: [...newMachineryRecords, ...store.machineryRecords],
    });

    setStage('confirmed_done');
    speakQuestionAndAutoListen(
      `कन्फर्म हो गया! स्टॉक से माल घट गया है और एकड़ नंबर ${targetAcreNumStr} के खाते में ${totalAdded} रुपये जुड़ गए हैं।`,
      false,
      () => {
        window.setTimeout(() => {
          if (isOpenRef.current) onClose();
        }, 1200);
      }
    );
  };

  if (!isOpen) return null;

  const grandTotal = draft
    ? draft.materials.reduce((s, m) => s + m.totalAmount, 0) +
      (draft.labourCharge || 0) +
      (draft.machineryRatePerAcre || 0)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-emerald-500/70 text-white shadow-2xl p-6 space-y-5 relative overflow-hidden"
      >
        {/* Minimal Close Icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Continuous Human-Like Voice Orb */}
        <div className="flex flex-col items-center text-center pt-2 space-y-4">
          {stage === 'auto_confirm_countdown' ? (
            <div className="w-24 h-24 rounded-full bg-amber-400 text-slate-950 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.7)] ring-4 ring-white animate-pulse">
              <span className="text-4xl font-mono font-black leading-none">
                {countdownSeconds}
              </span>
              <span className="text-[10px] font-black uppercase mt-1">
                Auto Confirm
              </span>
            </div>
          ) : stage === 'confirmed_done' ? (
            <div className="w-24 h-24 rounded-full bg-emerald-500 text-slate-950 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.8)] ring-4 ring-white">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              <span className="text-[11px] font-black uppercase mt-1">
                Confirmed!
              </span>
            </div>
          ) : (
            <div
              onClick={() => startContinuousListening()}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all ${
                isListening
                  ? 'bg-rose-600 text-white shadow-[0_0_45px_rgba(225,29,72,0.85)] ring-4 ring-rose-300 scale-105 animate-pulse'
                  : isSpeaking
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.7)] ring-4 ring-emerald-200'
                  : 'bg-slate-800 text-emerald-400 border-2 border-emerald-500/60 hover:bg-slate-700'
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
              <span className="text-[10px] font-black mt-1">
                {isListening
                  ? 'सुन रहा हूँ...'
                  : isSpeaking
                  ? 'बोल रहा हूँ...'
                  : 'बोलिए'}
              </span>
            </div>
          )}

          {/* Current Assistant Spoken Question */}
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              {stage === 'auto_confirm_countdown'
                ? `⏳ ${countdownSeconds} सेकंड में ऑटो-कन्फर्म`
                : stage === 'confirmed_done'
                ? '✅ खर्चा कन्फर्म व सेव हो गया'
                : '🗣️ लाइव किसान टॉकबैक'}
            </span>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {assistantQuestion}
            </h3>
          </div>
        </div>

        {/* Last Heard User Answer */}
        {lastUserSpeech && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 font-bold block">
              आपने बोला:
            </span>
            <p className="text-xs sm:text-sm font-black text-amber-300">
              &ldquo;{lastUserSpeech}&rdquo;
            </p>
          </div>
        )}

        {/* Compact Live Summary Strip */}
        {draft && (
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">🌾 एकड़:</span>
              <span className="font-black text-emerald-400">
                {draft.acreNumber ? `एकड़ #${draft.acreNumber}` : 'पूछ रहे हैं...'}
              </span>
            </div>
            {draft.materials.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">🧪 सामग्री:</span>
                <span className="font-black text-purple-300 text-right">
                  {draft.materials
                    .map((m) => `${m.quantity} ${m.unitLabelHi} ${m.nameHi.split('(')[0]} (₹${m.totalAmount})`)
                    .join(', ')}
                </span>
              </div>
            )}
            {(draft.isBroadcasting || draft.labourActivity || draft.machineryActivity) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">🖐️ कार्य:</span>
                <span className="font-black text-amber-300">
                  {draft.machineryShortHi || draft.labourShortHi || 'खाद/दवाई छींटा'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">👷 किसने किया:</span>
              <span className="font-black text-white">
                {draft.workerName || 'पूछ रहे हैं...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">📅 तारीख व समय:</span>
              <span className="font-bold text-slate-300">
                {formatDateHi(draft.date)} • {draft.workTimeSlot}
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
              <span className="font-black text-emerald-300">कुल खर्चा:</span>
              <span className="font-mono font-black text-base text-white">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Single Minimal Input Box (Fallback if typing instead of speaking) */}
        {stage !== 'auto_confirm_countdown' && stage !== 'confirmed_done' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textFallbackInput.trim()) {
                handleSpokenTurn(textFallbackInput);
              }
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={textFallbackInput}
              onChange={(e) => setTextFallbackInput(e.target.value)}
              placeholder="बोलिए या यहाँ लिखकर Enter दबाएं..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
