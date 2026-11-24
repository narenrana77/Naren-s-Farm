import express, { type Request, type Response } from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Lazy helper to initialize Gemini Client only when a valid API key is present
function getGeminiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.use(express.json({ limit: '15mb' }));

// Ensure data directory exists for cloud/server backup storage (with safe /tmp fallback for read-only Cloud Run containers)
let backupsFile = path.resolve(__dirname, 'data', 'farm_backups.json');
try {
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(backupsFile)) {
    fs.writeFileSync(backupsFile, JSON.stringify([]), 'utf-8');
  }
} catch {
  try {
    const tmpDir = path.resolve(os.tmpdir(), 'naren_farm_data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    backupsFile = path.resolve(tmpDir, 'farm_backups.json');
    if (!fs.existsSync(backupsFile)) {
      fs.writeFileSync(backupsFile, JSON.stringify([]), 'utf-8');
    }
  } catch (err) {
    console.warn('Backup storage fallback warning:', err);
  }
}

// Helper to read backups
function getBackups(): any[] {
  try {
    if (!fs.existsSync(backupsFile)) return [];
    const raw = fs.readFileSync(backupsFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading backups file:', err);
    return [];
  }
}

// Helper to write backups
function saveBackups(list: any[]) {
  try {
    fs.writeFileSync(backupsFile, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing backups file:', err);
  }
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: "Naren's Farm Tracker",
    timestamp: new Date().toISOString(),
  });
});

// Cloud Backup: Save new backup snapshot
app.post('/api/backup', (req: Request, res: Response) => {
  try {
    const { name, note, data, device = 'Web Browser' } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Data payload is required for backup' });
    }

    const backups = getBackups();
    const backupId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newEntry = {
      id: backupId,
      name: name || `Backup ${new Date().toLocaleDateString('hi-IN')}`,
      note: note || 'Auto / Manual Snapshot',
      createdAt: new Date().toISOString(),
      device,
      counts: {
        machinery: data.machineryRecords?.length || 0,
        labour: data.labourRecords?.length || 0,
        materials: data.materialRecords?.length || 0,
        aadti: data.aadtiRecords?.length || 0,
        plots: data.plots?.length || 0,
      },
      data,
    };

    // Keep up to 25 latest backups
    const updated = [newEntry, ...backups].slice(0, 25);
    saveBackups(updated);

    return res.json({
      success: true,
      backupId,
      timestamp: newEntry.createdAt,
      message: 'Cloud backup created successfully',
    });
  } catch (error: any) {
    console.error('Backup save error:', error);
    return res.status(500).json({ error: 'Failed to create backup: ' + error.message });
  }
});

// Cloud Backup: List all snapshots (without heavy payload)
app.get('/api/backups', (_req: Request, res: Response) => {
  try {
    const backups = getBackups();
    const summaries = backups.map(({ id, name, note, createdAt, device, counts }) => ({
      id,
      name,
      note,
      createdAt,
      device,
      counts,
    }));
    return res.json({ success: true, backups: summaries });
  } catch (error: any) {
    console.error('List backups error:', error);
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Cloud Backup: Restore a snapshot
app.get('/api/backup/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const backups = getBackups();
    const found = backups.find((b) => b.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Backup snapshot not found' });
    }
    return res.json({
      success: true,
      backup: found,
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return res.status(500).json({ error: 'Failed to restore snapshot' });
  }
});

// Maps Config API
app.get('/api/maps/config', (_req: Request, res: Response) => {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  return res.json({
    apiKey,
    configured: Boolean(apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY'),
  });
});

let gmpWeatherAvailable = true;

// Helper to resolve village/city/state name from Khet GPS coordinates
async function resolveLocationLabelFromCoords(
  lat: number,
  lon: number,
  providedLocation?: string
): Promise<string> {
  const isDefaultKarnal =
    !providedLocation ||
    providedLocation.trim() === '' ||
    providedLocation.trim().toLowerCase() === 'karnal, haryana' ||
    providedLocation.trim() === 'Live Location';

  // If user already provided a specific Khet label (that isn't the old default Karnal string), keep it
  if (!isDefaultKarnal && providedLocation) {
    return providedLocation;
  }

  try {
    const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const resp = await fetch(geoUrl);
    if (resp.ok) {
      const geo = await resp.json();
      const locality = geo.locality || geo.city || geo.principalSubdivision || '';
      const state = geo.principalSubdivision || '';
      if (locality && state && locality !== state) {
        return `${locality}, ${state}`;
      }
      if (locality || state) {
        return locality || state;
      }
    }
  } catch {
    // ignore reverse geocode error
  }

  return providedLocation || `खेत लोकेशन (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
}

// Real-time Meteorological Data Synced to Khet Coordinates (Google Maps Weather API with Open-Meteo Fallback)
app.get('/api/weather', async (req: Request, res: Response) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : 29.6872;
  const lon = req.query.lon ? parseFloat(req.query.lon as string) : 76.9890;
  const rawLocation = (req.query.location as string) || '';
  const locationName = await resolveLocationLabelFromCoords(lat, lon, rawLocation);
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  // 1. Try Google Maps Platform Weather API if key is present and service is available
  if (gmpWeatherAvailable && apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY') {
    try {
      const gmpWeatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lon}&unitsSystem=METRIC`;
      const gmpResp = await fetch(gmpWeatherUrl, {
        headers: {
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
      });

      if (gmpResp.ok) {
        const gmpData = await gmpResp.json();
        return res.json({
          success: true,
          provider: 'google_maps_weather',
          location: locationName,
          coordinates: { lat, lon },
          gmpData,
          fetchedAt: new Date().toISOString(),
        });
      } else if (gmpResp.status === 403 || gmpResp.status === 400 || gmpResp.status === 404) {
        gmpWeatherAvailable = false;
      }
    } catch {
      // Silently proceed to Open-Meteo fallback
    }
  }

  // 2. Open-Meteo Meteorological Fallback (Uses exact Khet lat/lon for real hyper-local weather & 3-day predictions!)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;

    const weatherResp = await fetch(url);
    if (!weatherResp.ok) {
      throw new Error(`Weather API returned status ${weatherResp.status}`);
    }

    const weatherData = await weatherResp.json();
    return res.json({
      success: true,
      provider: 'open_meteo',
      location: locationName,
      coordinates: { lat, lon },
      data: weatherData,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return res.json({
      success: true,
      provider: 'offline_fallback',
      location: locationName,
      coordinates: { lat, lon },
      data: {
        current: {
          temperature_2m: 26.5,
          relative_humidity_2m: 54,
          apparent_temperature: 27.2,
          precipitation: 0.0,
          rain: 0.0,
          weather_code: 1,
          wind_speed_10m: 8.5,
          wind_direction_10m: 140,
        },
        daily: {
          temperature_2m_max: [31.0, 30.5, 29.0],
          temperature_2m_min: [18.0, 17.5, 16.8],
          precipitation_probability_max: [10, 5, 15],
          weather_code: [1, 2, 3],
        },
      },
      fallback: true,
      fetchedAt: new Date().toISOString(),
    });
  }
});

// AI Crop Disease & Agronomy Advisory Agent (Powered by Gemini)
app.post('/api/ai/crop-doctor', async (req: Request, res: Response) => {
  try {
    const { message, history = [], plotContext, weatherContext, imageBase64 } = req.body;
    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackResponse = generateAgronomistFallback(message, plotContext, weatherContext);
      return res.json({
        success: true,
        reply: fallbackResponse,
        model: 'dr-kisan-offline-expert',
        timestamp: new Date().toISOString(),
      });
    }

    const syncedLocation =
      weatherContext?.location ||
      plotContext?.locationName ||
      (plotContext?.coordinates
        ? `${plotContext.name} (${plotContext.coordinates.lat.toFixed(4)}°N, ${plotContext.coordinates.lng.toFixed(4)}°E)`
        : 'Synced Farm Location');

    let contextHeader = `=== FARM CONTEXT ===\nSynced Khet Location: ${syncedLocation}\nFarmer: Naren Rana\n`;
    if (plotContext) {
      contextHeader += `Selected Plot: ${plotContext.name} (${plotContext.crop}, ${plotContext.acres} Acres, Stage: ${plotContext.stage}, Soil Moisture: ${plotContext.moisturePct}%)\n`;
    }
    if (weatherContext) {
      contextHeader += `Current Real-time Weather at Khet: ${weatherContext.temperature}°C, Humidity: ${weatherContext.humidity}%, Wind: ${weatherContext.windSpeed} km/h ${weatherContext.windDirectionCardinal || ''}, Rain Chance: ${weatherContext.precipitationChance}%, Condition: ${weatherContext.conditionText}\n`;
    }
    contextHeader += `=====================\n\n`;

    const systemInstruction = `You are "डॉ. किसान (Dr. Kisan)", an expert agricultural scientist, plant pathologist, and agronomist specialized in Indian agriculture and North Indian cropping systems (Wheat, Mustard, Sugarcane, Basmati Rice, Vegetables, Cotton, Pulses).
Your tone is respectful, deeply knowledgeable, practical, and empathetic ("किसान हितैषी").
Language: Respond in Hindi mixed with commonly understood agricultural terms (or English if the user writes in English).

Your Core Duties:
1. Diagnose crop diseases, leaf spots, pest infestations (e.g. Yellow Rust/पीला रतुआ, Aphids/माहू/चेपा, Stem Borer/कंसुआ, Blight/झुलसा, Powdery Mildew, Termites/दीमक), or nutrient deficiencies (Nitrogen, Zinc, Iron, Potassium).
2. Ground your advice using the provided real-time weather and farm plot details (e.g., if humidity > 75%, warn about fungal spread; if wind > 14 km/h, advise against immediate spray).
3. Provide a structured action plan:
   - 🔍 **पहचान (Diagnosis)**: Disease or pest name, symptoms, and severity.
   - 🧪 **रासायनिक उपचार (Chemical Solution)**: Exact chemical molecule name (e.g., Propiconazole 25% EC, Mancozeb 75% WP, Chlorantraniliprole 18.5% SC, Imidacloprid 17.8% SL), recommended dose per acre (e.g., 200 ml in 150-200 L water).
   - 🌿 **जैविक / देसी समाधान (Organic Remedy)**: Neem oil (1500 PPM), Trichoderma viride, cow urine/butter-milk spray (खट्टी छाछ), or wood ash.
   - ⏱️ **स्प्रे का समय व मौसम सावधानी (Spray Timing & Weather Alert)**: When to spray based on current wind/rain conditions.
   - 🛡️ **रोकथाम व पोषण (Prevention)**: Irrigation timing, balanced fertilizer advice.

Keep your explanation clear, well-formatted with markdown bolding, bullet points, and highlight exact dosages so the farmer can directly consult their dealer or take action.`;

    const contents: any[] = [];
    
    // Add history if present (up to 6 previous turns)
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
    }

    const currentParts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    currentParts.push({
      text: `${contextHeader}Farmer Query: ${message || 'कृपया इस पौधे / पत्ते की बीमारी की जांच करें और उपचार बताएं।'}`,
    });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'माफ़ करें, इस समय प्रतिक्रिया प्राप्त नहीं हो सकी। कृपया पुनः प्रयास करें।';
    return res.json({
      success: true,
      reply,
      model: 'gemini-3.8-flash',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const fallbackResponse = generateAgronomistFallback(req.body.message, req.body.plotContext, req.body.weatherContext);
    return res.json({
      success: true,
      reply: fallbackResponse,
      model: 'dr-kisan-offline-expert',
      warning: error?.status || 'offline-fallback',
      timestamp: new Date().toISOString(),
    });
  }
});

function generateAgronomistFallback(query?: string, plotContext?: any, weatherContext?: any): string {
  const q = (query || '').toLowerCase();
  const crop = (plotContext?.crop || '').toLowerCase();

  if (q.includes('रतुआ') || q.includes('rust') || q.includes('पीली') || q.includes('yellow') || crop.includes('wheat') || crop.includes('गेहूं')) {
    return `### 🌾 गेहूं पीला रतुआ (Yellow Rust / Stripe Rust) एवं पोषण प्रबंधन

**🔍 पहचान (Diagnosis):**
गेहूं की पत्तियों पर हल्दी जैसा पीला पाउडर धारियों के रूप में दिखाई देना पीला रतुआ (*Puccinia striiformis*) का लक्षण है। यदि पाउडर उंगली पर लग रहा है तो यह फफूंद है, अन्यथा जिंक या नाइट्रोजन की कमी हो सकती है।

**🧪 रासायनिक उपचार (Chemical Solution):**
1. **प्रोपिकोनाजोल 25% EC (Propiconazole - Tilt):** 200 मिली प्रति एकड़, 200 लीटर पानी में घोलकर छिड़कें।
2. अथवा **टेबुकोनाजोल 25.9% EC (Folicur):** 200 मिली प्रति एकड़।
3. गंभीर स्थिति में 15 दिन बाद दूसरा छिड़काव दोहराएं।

**🌿 जैविक / देसी उपाय:**
- **खट्टी छाछ (Sour Buttermilk):** 5 लीटर पुरानी छाछ को तांबे के बर्तन में 5 दिन रखकर 150 लीटर पानी में मिलाकर स्प्रे करें।
- **नीम का तेल (Neem Oil 1500 PPM):** 500 मिली प्रति एकड़ फफूंद की रोकथाम हेतु।

**⏱️ मौसम व स्प्रे सावधानी:**
वर्तमान आर्द्रता ${weatherContext?.humidity ?? 55}% है। दोपहर बाद जब ओस सूख जाए और हवा शांत हो, तभी स्प्रे करें ताकि दवा पत्तियों पर अच्छी तरह टिक सके।`;
  }

  if (q.includes('माहू') || q.includes('aphid') || q.includes('चेपा') || crop.includes('mustard') || crop.includes('सरसों')) {
    return `### 🟡 सरसों में माहू / चेपा (Mustard Aphid) नियंत्रण

**🔍 पहचान (Diagnosis):**
सरसों के फूल व फलियों पर छोटे हरे/काले कीटों का झुंड चिपककर रस चूसता है, जिससे फलियां कमजोर होकर सिकुड़ जाती हैं।

**🧪 रासायनिक उपचार (Chemical Solution):**
1. **इमिडाक्लोप्रिड 17.8% SL (Confidor):** 60-70 मिली प्रति एकड़, 150 लीटर पानी में।
2. अथवा **थियामेथोक्सम 25% WG (Actara):** 80-100 ग्राम प्रति एकड़।
3. अथवा **डाइमेथोएट 30% EC (Rogor):** 250 मिली प्रति एकड़।

**🌿 जैविक / प्राकृतिक उपचार:**
- **येलो स्टिकी ट्रैप (Yellow Sticky Traps):** खेत में 8-10 पीले चिपचिपे कार्ड लगाएं, कीट आकर्षित होकर चिपक जाएंगे।
- **नीम अर्क (NSKE 5%):** 5 किलोग्राम नीम बीज की गिरी का घोल बनाकर स्प्रे करें।

**⏱️ मौसम सावधानी:**
यदि हवा की गति 12 km/h से कम है तो छिड़काव सुरक्षित है। मधुमक्खियों की सुरक्षा के लिए छिड़काव शाम 4 बजे के बाद करें।`;
  }

  if (q.includes('गन्ना') || q.includes('sugarcane') || q.includes('कंसुआ') || q.includes('borer')) {
    return `### 🎋 गन्ने में तना छेदक / कंसुआ (Shoot Borer) व लाल सड़न प्रबंधन

**🔍 पहचान (Diagnosis):**
गन्ने के बीच का गोभ सूख जाना ("डेड हार्ट"), जिसे खींचने पर आसानी से बदबू के साथ निकल आना।

**🧪 रासायनिक उपचार (Chemical Solution):**
1. **कोराजन (Chlorantraniliprole 18.5% SC):** 150 मिली प्रति एकड़, 400 लीटर पानी में जड़ों के पास ड्रेंचिंग करें।
2. अथवा **फिप्रोनिल 0.3% GR (Regent):** 8-10 किलो प्रति एकड़ मिट्टी में मिलाएँ और तुरंत सिंचाई करें।

**🌿 देसी व सुरक्षा सलाह:**
- प्रकाश प्रपंच (Light Trap) खेत के कोने में लगाएं।
- ट्राइकोग्रामा परजीवी मित्र कीट के ट्राइकोकार्ड (2-3 कार्ड प्रति एकड़) का प्रयोग करें।`;
  }

  // General Comprehensive Crop Solution
  return `### 🚜 डॉ. किसान - फसल स्वास्थ्य व समाधान रिपोर्ट

**नमस्कार नरेन जी!** आपके फार्म के संदर्भ अनुसार सलाह:

1. **फसल निरीक्षण (Scouting):** सुबह ओस छंटने के बाद खेत का 'W' आकार में चक्कर लगाकर पत्तियों के ऊपरी व निचले हिस्से का निरीक्षण करें।
2. **पोषक तत्व व स्प्रे घोल:**
   - यदि पत्तियां हल्की पीली हैं तो **19:19:19 (NPK)** 1 किलो + **चिलेटेड जिंक 12%** 100 ग्राम प्रति 150 लीटर पानी में स्प्रे करें।
   - कीटनाशक व फफूंदनाशक मिलाते समय पहले थोड़ी मात्रा में बाल्टी में घोल बनाकर जांचें कि घोल फट तो नहीं रहा।
3. **सिंचाई एवं मौसम अनुकूलता:**
   - वर्तमान तापमान ${weatherContext?.temperature ?? 26}°C एवं नमी ${weatherContext?.humidity ?? 55}% है।
   - हवा सामान्य रहने पर सुबह 10 से शाम 4 बजे के बीच स्प्रे सर्वोत्तम परिणाम देता है।

*किसी विशिष्ट पत्ते का फोटो अपलोड करें या बीमारी के लक्षण (जैसे धब्बे, कीड़े या सूखना) बताएं, मैं सटीक दवा का नाम व मात्रा बता दूंगा।*`;
}

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🌾 Naren's Farm Tracker server running at http://0.0.0.0:${port}`);
  });
}

startServer();
