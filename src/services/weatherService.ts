import { WeatherData, WeatherRiskAlert, DailyForecastItem } from '../types/farm';

export type WeatherScenarioMode =
  | 'live'
  | 'heavy_rain'
  | 'extreme_heat'
  | 'high_wind_hail'
  | 'frost_rust';

export const WeatherService = {
  /**
   * Resolves the real village/district/state name for any Khet's GPS coordinates (lat, lng)
   */
  async reverseGeocodeKhet(
    lat: number,
    lng: number,
    plotTitle?: string
  ): Promise<string> {
    const cleanPlot = plotTitle ? plotTitle.split('(')[0].trim() : '';
    try {
      const resp = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (resp.ok) {
        const geo = await resp.json();
        const locality = geo.locality || geo.city || '';
        const state = geo.principalSubdivision || '';
        const place =
          locality && state && locality !== state
            ? `${locality}, ${state}`
            : locality || state;
        if (place) {
          return cleanPlot ? `${cleanPlot} — ${place}` : place;
        }
      }
    } catch {
      // ignore network error
    }
    return cleanPlot
      ? `${cleanPlot} (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`
      : `खेत लोकेशन (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  },

  async getWeather(lat?: number, lon?: number, locationName?: string): Promise<WeatherData> {
    try {
      const params = new URLSearchParams();
      if (lat !== undefined && lon !== undefined) {
        params.append('lat', lat.toString());
        params.append('lon', lon.toString());
      }
      if (locationName) {
        params.append('location', locationName);
      }

      const response = await fetch(`/api/weather?${params.toString()}`);
      if (!response.ok) throw new Error('Weather API request failed');
      const json = await response.json();

      // Case A: Google Maps Platform Weather API Response
      if (json.provider === 'google_maps_weather' && json.gmpData) {
        return parseGoogleMapsWeather(json);
      }

      // Case B: Open-Meteo Meteorological API Response
      if (json.provider === 'open_meteo' && json.data) {
        return parseOpenMeteoWeather(json);
      }

      // Case C: Offline Fallback
      return parseFallbackWeather(json);
    } catch (error) {
      console.warn('Weather service error, using offline agricultural fallback', error);
      return parseFallbackWeather({
        location:
          locationName ||
          (lat !== undefined && lon !== undefined
            ? `खेत लोकेशन (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`
            : 'सक्रिय खेत लोकेशन'),
        coordinates: lat !== undefined && lon !== undefined ? { lat, lon } : undefined,
      });
    }
  },

  /**
   * Applies a live or simulated high-risk weather scenario so farmers can test and experience
   * proactive push notifications and UI warnings for Heavy Rainfall, Extreme Heat, Hail/Wind, etc.
   */
  applyScenario(base: WeatherData, scenario: WeatherScenarioMode): WeatherData {
    if (scenario === 'live') {
      return base;
    }

    if (scenario === 'heavy_rain') {
      const temp = 21.5;
      const humidity = 92;
      const windSpeed = 28.0;
      const windGust = 38.0;
      const precipitationChance = 88;
      const thunderstormChance = 75;
      const agriAdvice = calculateAgriPredictions({
        temp,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        dewPoint: 19.5,
        uvIndex: 2,
      });
      const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'heavy_rain');
      const riskAlerts = buildWeatherRiskAlerts({
        temp,
        maxTemp: 24.0,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        uvIndex: 2,
        dailyForecast,
      });

      return {
        ...base,
        temperature: temp,
        apparentTemp: 22.0,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        conditionText: 'भारी बारिश व गरज-चमक चेतावनी (Heavy Rain Alert)',
        agriAdvice,
        dailyForecast,
        riskAlerts,
      };
    }

    if (scenario === 'extreme_heat') {
      const temp = 42.4;
      const humidity = 22;
      const windSpeed = 19.5;
      const windGust = 26.0;
      const precipitationChance = 2;
      const thunderstormChance = 0;
      const agriAdvice = calculateAgriPredictions({
        temp,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        dewPoint: 11.0,
        uvIndex: 10,
      });
      const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'extreme_heat');
      const riskAlerts = buildWeatherRiskAlerts({
        temp,
        maxTemp: 43.2,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        uvIndex: 10,
        dailyForecast,
      });

      return {
        ...base,
        temperature: temp,
        apparentTemp: 45.1,
        humidity,
        windSpeed,
        windGust,
        uvIndex: 10,
        precipitationChance,
        thunderstormChance,
        conditionText: 'भीषण गर्मी व गर्म लू (Extreme Heatwave)',
        agriAdvice,
        dailyForecast,
        riskAlerts,
      };
    }

    if (scenario === 'high_wind_hail') {
      const temp = 23.0;
      const humidity = 76;
      const windSpeed = 42.0;
      const windGust = 54.0;
      const precipitationChance = 65;
      const thunderstormChance = 82;
      const agriAdvice = calculateAgriPredictions({
        temp,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        dewPoint: 17.5,
        uvIndex: 3,
      });
      const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'high_wind_hail');
      const riskAlerts = buildWeatherRiskAlerts({
        temp,
        maxTemp: 25.0,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        uvIndex: 3,
        dailyForecast,
      });

      return {
        ...base,
        temperature: temp,
        apparentTemp: 21.8,
        humidity,
        windSpeed,
        windGust,
        precipitationChance,
        thunderstormChance,
        conditionText: 'तेज आंधी व ओलावृष्टि आशंका (Gale & Hail Risk)',
        agriAdvice,
        dailyForecast,
        riskAlerts,
      };
    }

    // frost_rust
    const temp = 9.2;
    const humidity = 89;
    const windSpeed = 6.5;
    const windGust = 9.0;
    const precipitationChance = 20;
    const thunderstormChance = 0;
    const agriAdvice = calculateAgriPredictions({
      temp,
      humidity,
      windSpeed,
      windGust,
      precipitationChance,
      thunderstormChance,
      dewPoint: 7.8,
      uvIndex: 2,
    });
    const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'frost_rust');
    const riskAlerts = buildWeatherRiskAlerts({
      temp,
      maxTemp: 17.5,
      humidity,
      windSpeed,
      windGust,
      precipitationChance,
      thunderstormChance,
      uvIndex: 2,
      dailyForecast,
    });

    return {
      ...base,
      temperature: temp,
      apparentTemp: 7.5,
      humidity,
      windSpeed,
      windGust,
      precipitationChance,
      thunderstormChance,
      conditionText: 'घना कोहरा, शीतलहर व पीला रतुआ जोखिम (Cold Wave & Rust Risk)',
      agriAdvice,
      dailyForecast,
      riskAlerts,
    };
  },

  /**
   * Dispatches a proactive Browser / PWA Push Notification for high-risk weather
   */
  async triggerBrowserPushNotification(
    alert: WeatherRiskAlert,
    location: string,
    language: 'hi' | 'en' = 'hi'
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return false;
      }

      const title =
        language === 'hi'
          ? `⚠️ ${alert.titleHi} (${location})`
          : `⚠️ ${alert.titleEn} (${location})`;
      const body =
        language === 'hi'
          ? `${alert.descriptionHi}\nसलाह: ${alert.recommendedActionsHi[0] || ''}`
          : `${alert.descriptionEn}\nAction: ${alert.recommendedActionsEn[0] || ''}`;

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-3d-192.png',
            badge: '/pwa-3d-192.png',
            tag: `farm-weather-alert-${alert.id}`,
          });
          return true;
        }
      }

      try {
        new Notification(title, {
          body,
          icon: '/pwa-3d-192.png',
          tag: `farm-weather-alert-${alert.id}`,
        });
        return true;
      } catch {
        // Mobile browsers disallow direct Notification constructor without active SW; UI banner handles it cleanly
        return true;
      }
    } catch (err) {
      console.warn('Browser notification fallback:', err);
      return false;
    }
  },
};

function parseGoogleMapsWeather(json: any): WeatherData {
  const gmp = json.gmpData;
  const temp = gmp.temperature?.degrees ?? 26.5;
  const apparentTemp = gmp.feelsLikeTemperature?.degrees ?? temp;
  const dewPoint = gmp.dewPoint?.degrees ?? 14.0;
  const humidity = gmp.relativeHumidity ?? 55;
  const windSpeed = gmp.wind?.speed?.value ?? 8; // km/h
  const windGust = gmp.wind?.gust?.value ?? windSpeed * 1.3;
  const windDirCardinal = gmp.wind?.direction?.cardinal || 'NW';
  const windDirDegrees = gmp.wind?.direction?.degrees || 315;
  const uvIndex = gmp.uvIndex ?? 4;
  const cloudCover = gmp.cloudCover ?? 15;
  const precipitationChance = gmp.precipitation?.probability?.percent ?? 0;
  const precipitationQuantity = gmp.precipitation?.qpf?.quantity ?? 0;
  const thunderstormChance = gmp.thunderstormProbability ?? 0;
  const conditionText = gmp.weatherCondition?.description?.text || 'साफ मौसम (Clear Sky)';
  const iconUri = gmp.weatherCondition?.iconBaseUri
    ? `${gmp.weatherCondition.iconBaseUri}.png`
    : undefined;

  const agriAdvice = calculateAgriPredictions({
    temp,
    humidity,
    windSpeed,
    windGust,
    precipitationChance,
    thunderstormChance,
    dewPoint,
    uvIndex,
  });

  const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'live');
  const riskAlerts = buildWeatherRiskAlerts({
    temp,
    maxTemp: Math.max(temp, dailyForecast[0]?.maxTemp || temp),
    humidity,
    windSpeed,
    windGust,
    precipitationChance,
    thunderstormChance,
    uvIndex,
    dailyForecast,
  });

  return {
    provider: 'google_maps_weather',
    temperature: Math.round(temp * 10) / 10,
    apparentTemp: Math.round(apparentTemp * 10) / 10,
    dewPoint: Math.round(dewPoint * 10) / 10,
    humidity: Math.round(humidity),
    windSpeed: Math.round(windSpeed * 10) / 10,
    windGust: Math.round(windGust * 10) / 10,
    windDirectionCardinal: formatCardinalHindi(windDirCardinal),
    windDirectionDegrees: windDirDegrees,
    uvIndex,
    cloudCover,
    precipitationChance,
    precipitationQuantity,
    thunderstormChance,
    weatherCode: 1,
    conditionText,
    iconUri,
    location:
      json.location ||
      (json.coordinates
        ? `खेत (${Number(json.coordinates.lat).toFixed(4)}°N, ${Number(json.coordinates.lon).toFixed(4)}°E)`
        : 'सक्रिय खेत लोकेशन'),
    coordinates: json.coordinates,
    fetchedAt: json.fetchedAt || new Date().toISOString(),
    dailyForecast,
    riskAlerts,
    agriAdvice,
  };
}

function parseOpenMeteoWeather(json: any): WeatherData {
  const current = json.data?.current || {};
  const daily = json.data?.daily || {};

  const temp = current.temperature_2m ?? 26;
  const humidity = current.relative_humidity_2m ?? 55;
  const apparentTemp = current.apparent_temperature ?? temp;
  const windSpeed = current.wind_speed_10m ?? 8;
  const windGust = Math.round(windSpeed * 1.25 * 10) / 10;
  const windDirDegrees = current.wind_direction_10m ?? 140;
  const weatherCode = current.weather_code ?? 0;
  const rainChance = daily.precipitation_probability_max?.[0] ?? 5;
  const conditionText = getWeatherDescription(weatherCode);

  const agriAdvice = calculateAgriPredictions({
    temp,
    humidity,
    windSpeed,
    windGust,
    precipitationChance: rainChance,
    thunderstormChance: weatherCode >= 95 ? 70 : 0,
    dewPoint: temp - (100 - humidity) / 5,
    uvIndex: 5,
  });

  const dailyForecast = parseOpenMeteoDaily(daily, temp, rainChance, windSpeed);
  const riskAlerts = buildWeatherRiskAlerts({
    temp,
    maxTemp: Math.max(temp, dailyForecast[0]?.maxTemp || temp),
    humidity,
    windSpeed,
    windGust,
    precipitationChance: Math.max(rainChance, dailyForecast[1]?.rainProbability || 0),
    thunderstormChance: weatherCode >= 95 ? 70 : 0,
    uvIndex: 5,
    dailyForecast,
  });

  return {
    provider: 'open_meteo',
    temperature: Math.round(temp * 10) / 10,
    humidity: Math.round(humidity),
    apparentTemp: Math.round(apparentTemp * 10) / 10,
    dewPoint: Math.round((temp - (100 - humidity) / 5) * 10) / 10,
    windSpeed: Math.round(windSpeed * 10) / 10,
    windGust,
    windDirectionCardinal: degreesToCardinal(windDirDegrees),
    windDirectionDegrees: windDirDegrees,
    uvIndex: 5,
    cloudCover: 20,
    precipitationChance: rainChance,
    weatherCode,
    conditionText,
    location:
      json.location ||
      (json.coordinates
        ? `खेत (${Number(json.coordinates.lat).toFixed(4)}°N, ${Number(json.coordinates.lon).toFixed(4)}°E)`
        : 'सक्रिय खेत लोकेशन'),
    coordinates: json.coordinates,
    fetchedAt: json.fetchedAt || new Date().toISOString(),
    dailyForecast,
    riskAlerts,
    agriAdvice,
  };
}

function parseFallbackWeather(json: any): WeatherData {
  const temp = 26.2;
  const humidity = 52;
  const windSpeed = 8.5;
  const windGust = 11.0;
  const precipitationChance = 10;

  const agriAdvice = calculateAgriPredictions({
    temp,
    humidity,
    windSpeed,
    windGust,
    precipitationChance,
    thunderstormChance: 0,
    dewPoint: 15.0,
    uvIndex: 4,
  });

  const dailyForecast = buildDailyForecast(temp, precipitationChance, windSpeed, 'live');
  const riskAlerts = buildWeatherRiskAlerts({
    temp,
    maxTemp: 31.0,
    humidity,
    windSpeed,
    windGust,
    precipitationChance,
    thunderstormChance: 0,
    uvIndex: 4,
    dailyForecast,
  });

  return {
    provider: 'offline_fallback',
    temperature: temp,
    humidity,
    apparentTemp: 26.8,
    dewPoint: 15.0,
    windSpeed,
    windGust,
    windDirectionCardinal: 'उत्तर-पश्चिम (NW)',
    windDirectionDegrees: 310,
    uvIndex: 4,
    cloudCover: 10,
    precipitationChance,
    weatherCode: 1,
    conditionText: 'खुशनुमा धूप (Mainly Sunny)',
    location: json?.location || 'सक्रिय खेत लोकेशन',
    coordinates: json?.coordinates || { lat: 29.6872, lon: 76.989 },
    fetchedAt: new Date().toISOString(),
    dailyForecast,
    riskAlerts,
    agriAdvice,
  };
}

function parseOpenMeteoDaily(
  daily: any,
  fallbackTemp: number,
  fallbackRain: number,
  fallbackWind: number
): DailyForecastItem[] {
  const maxArr: number[] = daily?.temperature_2m_max || [];
  const minArr: number[] = daily?.temperature_2m_min || [];
  const rainArr: number[] = daily?.precipitation_probability_max || [];

  if (maxArr.length < 3) {
    return buildDailyForecast(fallbackTemp, fallbackRain, fallbackWind, 'live');
  }

  const dayLabelsHi = ['आज (Today)', 'कल (Tomorrow)', 'परसों (Day 3)'];
  const dayLabelsEn = ['Today', 'Tomorrow', 'Day 3'];

  return [0, 1, 2].map((i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const maxT = Math.round((maxArr[i] ?? fallbackTemp + 3) * 10) / 10;
    const minT = Math.round((minArr[i] ?? fallbackTemp - 8) * 10) / 10;
    const rainP = Math.round(rainArr[i] ?? fallbackRain);
    const windM = Math.round((fallbackWind + i * 2.5) * 10) / 10;

    let riskSeverity: 'critical' | 'warning' | 'normal' = 'normal';
    let riskTagHi = 'अनुकूल';
    if (rainP >= 60 || maxT >= 39) {
      riskSeverity = 'critical';
      riskTagHi = rainP >= 60 ? 'भारी बारिश खतरा' : 'भीषण लू खतरा';
    } else if (rainP >= 35 || maxT >= 35) {
      riskSeverity = 'warning';
      riskTagHi = rainP >= 35 ? 'बारिश संभावना' : 'तेज धूप';
    }

    return {
      date: d.toISOString().split('T')[0],
      dayLabelHi: dayLabelsHi[i],
      dayLabelEn: dayLabelsEn[i],
      maxTemp: maxT,
      minTemp: minT,
      rainProbability: rainP,
      windSpeedMax: windM,
      conditionHi: rainP >= 50 ? 'तेज बारिश आशंका' : maxT >= 37 ? 'तेज गर्म धूप' : 'साफ व अनुकूल',
      conditionEn: rainP >= 50 ? 'Heavy Rain Likely' : maxT >= 37 ? 'Hot & Sunny' : 'Mostly Clear',
      riskTagHi,
      riskSeverity,
    };
  });
}

function buildDailyForecast(
  baseTemp: number,
  baseRain: number,
  baseWind: number,
  mode: WeatherScenarioMode
): DailyForecastItem[] {
  const dayLabelsHi = ['आज (Today)', 'कल (Tomorrow)', 'परसों (Day 3)'];
  const dayLabelsEn = ['Today', 'Tomorrow', 'Day 3'];

  return [0, 1, 2].map((i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);

    let maxT = Math.round((baseTemp + 3 - i * 0.5) * 10) / 10;
    let minT = Math.round((baseTemp - 8 - i * 0.4) * 10) / 10;
    let rainP = Math.min(100, Math.max(0, Math.round(baseRain + (i === 1 ? 15 : 0))));
    let windM = Math.round((baseWind + i * 2) * 10) / 10;
    let conditionHi = 'साफ व सुहावना';
    let conditionEn = 'Clear & Pleasant';
    let riskTagHi = 'अनुकूल';
    let riskSeverity: 'critical' | 'warning' | 'normal' = 'normal';

    if (mode === 'heavy_rain') {
      maxT = 23 - i;
      minT = 17 - i;
      rainP = i === 0 ? 88 : i === 1 ? 92 : 65;
      windM = i === 0 ? 32 : i === 1 ? 38 : 22;
      conditionHi = i <= 1 ? 'भारी मूसलाधार बारिश (45mm+)' : 'बादल व मध्यम बारिश';
      conditionEn = i <= 1 ? 'Heavy Downpour (45mm+)' : 'Cloudy & Showers';
      riskTagHi = i <= 1 ? 'अति-गंभीर बारिश' : 'जलभराव सतर्कता';
      riskSeverity = i <= 1 ? 'critical' : 'warning';
    } else if (mode === 'extreme_heat') {
      maxT = 42.4 + i * 0.6;
      minT = 27.5 + i * 0.5;
      rainP = 0;
      windM = 22 + i * 2;
      conditionHi = 'भीषण लू व तपती धूप (Heatwave)';
      conditionEn = 'Extreme Heatwave & Dry Winds';
      riskTagHi = 'भीषण गर्मी (Red Alert)';
      riskSeverity = 'critical';
    } else if (mode === 'high_wind_hail') {
      maxT = 24 - i;
      minT = 15 - i;
      rainP = i === 0 ? 65 : 40;
      windM = i === 0 ? 48 : 34;
      conditionHi = i === 0 ? 'तेज आंधी व ओलावृष्टि खतरा' : 'तेज हवाएं';
      conditionEn = i === 0 ? 'Squall & Hailstorm Risk' : 'Gusty Winds';
      riskTagHi = i === 0 ? 'फसल गिरने का खतरा' : 'तेज हवा चेतावनी';
      riskSeverity = i === 0 ? 'critical' : 'warning';
    } else if (mode === 'frost_rust') {
      maxT = 16.5;
      minT = 4.2;
      rainP = 20;
      windM = 7.0;
      conditionHi = 'घना कोहरा व पाला (Frost)';
      conditionEn = 'Dense Fog & Ground Frost';
      riskTagHi = 'पीला रतुआ / पाला खतरा';
      riskSeverity = 'warning';
    }

    return {
      date: d.toISOString().split('T')[0],
      dayLabelHi: dayLabelsHi[i],
      dayLabelEn: dayLabelsEn[i],
      maxTemp: maxT,
      minTemp: minT,
      rainProbability: rainP,
      windSpeedMax: windM,
      conditionHi,
      conditionEn,
      riskTagHi,
      riskSeverity,
    };
  });
}

function buildWeatherRiskAlerts(params: {
  temp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  precipitationChance: number;
  thunderstormChance: number;
  uvIndex: number;
  dailyForecast: DailyForecastItem[];
}): WeatherRiskAlert[] {
  const {
    temp,
    maxTemp,
    humidity,
    windSpeed,
    windGust,
    precipitationChance,
    thunderstormChance,
    uvIndex,
    dailyForecast,
  } = params;

  const alerts: WeatherRiskAlert[] = [];
  const maxForecastRain = Math.max(
    precipitationChance,
    ...dailyForecast.map((d) => d.rainProbability)
  );
  const maxForecastTemp = Math.max(temp, maxTemp, ...dailyForecast.map((d) => d.maxTemp));

  // 1. HEAVY RAINFALL / WATERLOGGING RISK
  if (maxForecastRain >= 50 || thunderstormChance >= 50) {
    const isCritical = maxForecastRain >= 75 || thunderstormChance >= 70;
    alerts.push({
      id: 'alert-heavy-rain',
      type: 'heavy_rain',
      severity: isCritical ? 'critical' : 'warning',
      titleHi: isCritical
        ? 'भारी बारिश एवं जलभराव रेड अलर्ट (Heavy Rainfall Warning)'
        : 'तेज बारिश की संभावना - कृषि सतर्कता',
      titleEn: isCritical
        ? 'Heavy Rainfall & Waterlogging Red Alert'
        : 'Moderate to Heavy Rain Forecast Warning',
      descriptionHi: `अगले 24-48 घंटों में ${maxForecastRain}% बारिश और गरज-चमक की प्रबल संभावना है। निचले खेतों (विशेषकर गेहूं, सरसों और आलू) में पानी भरने से जड़ सड़न हो सकती है।`,
      descriptionEn: `${maxForecastRain}% probability of heavy rainfall in the next 24-48 hours. Risk of waterlogging and fertilizer leaching in standing crops.`,
      impactHi: 'खड़ी फसल में जलभराव, यूरिया/कीटनाशक का बहना और खेत की निचली मेड़ टूटने का जोखिम।',
      impactEn: 'Waterlogging in low-lying plots, washing away of foliar sprays and basal fertilizers.',
      recommendedActionsHi: [
        'खेतों में सिंचाई (ट्यूबवेल/नहर पानी) तुरंत बंद करें।',
        'खेत के निकासी नालों (Drainage Channels) को तुरंत खोलें ताकि अतिरिक्त बरसाती पानी बाहर निकल सके।',
        'अगले 48 घंटे तक यूरिया, खाद या कीटनाशक स्प्रे बिल्कुल न करें।',
        'कटाई के करीब पहुँची फसल या खुले में रखे अनाज को तिरपाल से सुरक्षित ढकें।',
      ],
      recommendedActionsEn: [
        'Halt all tube-well or canal irrigation immediately.',
        'Clear field drainage outlets to prevent standing water in Wheat & Mustard plots.',
        'Postpone chemical spraying and top-dressing of Urea for 48 hours.',
      ],
      triggerMetric: `बारिश संभावना: ${maxForecastRain}%`,
      forecastWindowHi: 'अगले 24 - 48 घंटे',
      forecastWindowEn: 'Next 24 - 48 Hours',
      taskSuggestionHi: 'भारी बारिश अलर्ट: खेतों की जल-निकासी नालियां खोलें व सिंचाई रोकें',
      taskCategory: 'irrigation',
    });
  }

  // 2. EXTREME HEAT / TERMINAL HEATWAVE RISK
  if (maxForecastTemp >= 35 || (temp >= 33 && uvIndex >= 8)) {
    const isCritical = maxForecastTemp >= 39;
    alerts.push({
      id: 'alert-extreme-heat',
      type: 'extreme_heat',
      severity: isCritical ? 'critical' : 'warning',
      titleHi: isCritical
        ? 'भीषण गर्मी व लू (Extreme Heatwave) अलर्ट'
        : 'उच्च तापमान व तेज वाष्पोत्सर्जन चेतावनी',
      titleEn: isCritical
        ? 'Extreme Heatwave (Terminal Heat Stress) Alert'
        : 'High Temperature & Moisture Stress Warning',
      descriptionHi: `अधिकतम तापमान ${maxForecastTemp}°C तक पहुँचने का अनुमान है। अत्यधिक गर्मी से गेहूं के दाने सिकुड़ने (Terminal Heat Stress) और मिट्टी की नमी तेजी से सूखने का खतरा है।`,
      descriptionEn: `Peak temperature forecasted at ${maxForecastTemp}°C. High risk of grain shriveling, rapid soil moisture depletion, and crop wilting.`,
      impactHi: 'दाने का वजन घटना (15-20% उपज हानि), पत्तियों का झुलसना और 2 गुना तेज नमी ह्रास।',
      impactEn: 'Grain shriveling during milking/dough stage and severe evapotranspiration water loss.',
      recommendedActionsHi: [
        'शाम के समय (हवा शांत होने पर) खेत में हल्की सिंचाई करें ताकि मिट्टी का तापमान ठंडा रहे।',
        'फसल को हीट-स्ट्रेस से बचाने के लिए 2% पोटेशियम नाइट्रेट (13:0:45 - 2 किलो/एकड़) का शाम को छिड़काव करें।',
        'दोपहर 11 बजे से शाम 4 बजे के बीच कोई भी रासायनिक कीटनाशक स्प्रे न करें।',
      ],
      recommendedActionsEn: [
        'Apply light evening irrigation (when wind is calm) to cool the crop canopy.',
        'Foliar spray of 2% Potassium Nitrate (NPK 13:0:45 @ 2 kg/acre) to mitigate terminal heat stress.',
        'Avoid spraying agro-chemicals during peak afternoon heat (11 AM - 4 PM).',
      ],
      triggerMetric: `अधिकतम तापमान: ${maxForecastTemp}°C (UV: ${uvIndex})`,
      forecastWindowHi: 'दोपहर 12:00 से शाम 4:30 तक',
      forecastWindowEn: '12:00 PM - 4:30 PM Peak Heat',
      taskSuggestionHi: 'भीषण गर्मी बचाव: शाम को हल्की सिंचाई व 13:0:45 (पोटेशियम नाइट्रेट) स्प्रे करें',
      taskCategory: 'irrigation',
    });
  }

  // 3. HIGH WIND / HAILSTORM & CROP LODGING RISK
  if (windSpeed >= 22 || windGust >= 32) {
    const isCritical = windSpeed >= 35 || windGust >= 45;
    alerts.push({
      id: 'alert-high-wind',
      type: 'high_wind_hail',
      severity: isCritical ? 'critical' : 'warning',
      titleHi: isCritical
        ? 'तेज आंधी व फसल गिरने (Lodging) का गंभीर खतरा'
        : 'तेज हवा चेतावनी - स्प्रे व सिंचाई सावधानी',
      titleEn: isCritical
        ? 'Severe Gale & Crop Lodging Alert'
        : 'High Wind Speed Warning',
      descriptionHi: `हवा की रफ्तार ${windSpeed} km/h (झोंके ${Math.round(windGust)} km/h) दर्ज की गई है। तेज हवा में सिंचाई करने से गेहूं, सरसों और गन्ने की फसल जमीन पर गिर (Lodging) सकती है।`,
      descriptionEn: `Wind speeds of ${windSpeed} km/h (gusts up to ${Math.round(windGust)} km/h). Irrigating during high winds causes tall crops to lodge.`,
      impactHi: 'गेहूं, गन्ना व सरसों के पौधे गिरने से 25% तक उपज नुकसान व स्प्रे दवा का हवा में उड़ना।',
      impactEn: 'Stem lodging in Wheat/Sugarcane and severe chemical spray drift.',
      recommendedActionsHi: [
        'तेज हवा रुकने तक गेहूं व सरसों में पानी (सिंचाई) बिल्कुल न लगाएं।',
        'कीटनाशक या फफूंदनाशक स्प्रे अभी रोक दें (हवा में दवा उड़ जाएगी)।',
        'गन्ने के खेत में बंधाई (Propping) की जांच करें।',
      ],
      recommendedActionsEn: [
        'Strictly avoid irrigating Wheat or Mustard until wind subsides below 12 km/h.',
        'Halt pesticide spraying to prevent wind drift.',
      ],
      triggerMetric: `हवा की गति: ${windSpeed} km/h (झोंके ${Math.round(windGust)} km/h)`,
      forecastWindowHi: 'आज अगले 12-24 घंटे',
      forecastWindowEn: 'Next 12 - 24 Hours',
      taskSuggestionHi: 'तेज आंधी सतर्कता: हवा शांत होने तक सिंचाई व स्प्रे स्थगित रखें',
      taskCategory: 'general',
    });
  }

  // 4. COLD WAVE / FROST OR HIGH HUMIDITY FUNGAL (YELLOW RUST) RISK
  if (temp <= 11 || (humidity >= 78 && temp >= 12 && temp <= 25)) {
    const isFrost = temp <= 11;
    alerts.push({
      id: 'alert-frost-fungal',
      type: isFrost ? 'frost_fog' : 'fungal_humid',
      severity: 'warning',
      titleHi: isFrost
        ? 'शीतलहर, पाला व घना कोहरा चेतावनी (Frost & Cold Wave)'
        : 'अधिक नमी से पीला रतुआ (Yellow Rust) व माहू का खतरा',
      titleEn: isFrost
        ? 'Cold Wave, Ground Frost & Fog Warning'
        : 'High Humidity Fungal & Yellow Rust Alert',
      descriptionHi: isFrost
        ? `तापमान ${temp}°C और नमी ${humidity}% है। पाला पड़ने से सरसों की फलियों व आलू/मटर की पत्तियों को नुकसान हो सकता है तथा गेहूं में पीला रतुआ पनप सकता है।`
        : `वातावरण में ${humidity}% नमी और ${temp}°C तापमान फफूंद (Yellow Rust / झुलसा) व सरसों के माहू (Aphid) के लिए अनुकूल है।`,
      descriptionEn: isFrost
        ? `Low temperature (${temp}°C) and ${humidity}% humidity create frost risk for Mustard/Potato and favor Yellow Rust in Wheat.`
        : `High relative humidity (${humidity}%) at ${temp}°C strongly favors Yellow Rust and Aphid outbreaks.`,
      impactHi: 'गेहूं की पत्तियों पर पीली धारियां (रतुआ) और सरसों/आलू में पाला या झुलसा रोग।',
      impactEn: 'Stripe rust pustules on wheat leaves and frost/blight damage in oilseeds & vegetables.',
      recommendedActionsHi: [
        'सुबह खेत का निरीक्षण करें; गेहूं पर पीला पाउडर दिखे तो प्रोपिकोनाजोल 25% EC (200 ml/एकड़) का स्प्रे करें।',
        'पाले से बचाव हेतु सरसों व सब्जी वाले खेतों में शाम को हल्की सिंचाई करें।',
        'सरसों में माहू (चेपा) दिखने पर इमिडाक्लोप्रिड 17.8% SL (70 ml/एकड़) का छिड़काव करें।',
      ],
      recommendedActionsEn: [
        'Scout wheat plots for yellow stripes; spray Propiconazole 25% EC @ 200ml/acre if detected.',
        'Apply light irrigation in Mustard/Potato fields to protect against night frost.',
      ],
      triggerMetric: `नमी: ${humidity}% · तापमान: ${temp}°C`,
      forecastWindowHi: 'सुबह और रात का समय',
      forecastWindowEn: 'Overnight & Early Morning',
      taskSuggestionHi: 'खेत में पीला रतुआ व माहू (Aphid) की जांच और सुरक्षात्मक स्प्रे करें',
      taskCategory: 'spray',
    });
  }

  return alerts;
}

// Agricultural predictions helper
function calculateAgriPredictions(params: {
  temp: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  precipitationChance: number;
  thunderstormChance: number;
  dewPoint: number;
  uvIndex: number;
}) {
  const { temp, humidity, windSpeed, windGust, precipitationChance, thunderstormChance, uvIndex } =
    params;

  // 1. Spray Safety Window
  const isSuitableForSpray =
    windSpeed < 14 &&
    windGust < 18 &&
    precipitationChance < 25 &&
    thunderstormChance < 20 &&
    humidity < 82 &&
    temp < 36;
  let sprayWindowAdvice = 'दवा व पोषण स्प्रे के लिए उत्तम मौसम। हवा मंद है (ड्रिफ्ट खतरा नहीं)।';
  if (windSpeed >= 14 || windGust >= 18) {
    sprayWindowAdvice = `तेज हवा चेतावनी (${windSpeed} km/h, झोंके ${Math.round(windGust)} km/h): कीटनाशक उड़कर पास के खेत या व्यर्थ बिखर सकता है। शाम को हवा मंद होने पर ही स्प्रे करें।`;
  } else if (precipitationChance >= 30 || thunderstormChance >= 20) {
    sprayWindowAdvice = `बारिश की आशंका (${precipitationChance}%): स्प्रे बहने का खतरा। छिड़काव स्थगित रखें।`;
  } else if (temp >= 36) {
    sprayWindowAdvice = `अत्यधिक गर्मी (${temp}°C): तेज धूप में स्प्रे करने से पत्तियां झुलस (Phytotoxicity) सकती हैं। शाम को ही स्प्रे करें।`;
  } else if (humidity >= 85) {
    sprayWindowAdvice = `अत्यधिक नमी (${humidity}%): पत्तों पर पानी जमा रहने से दवा का अवशोषण धीमा होगा। धूप खिलने तक रुकें।`;
  }

  // 2. Evapotranspiration & Irrigation Need
  let evapotranspirationIndex: 'low' | 'moderate' | 'high' = 'moderate';
  let evapotranspirationAdvice = 'सामान्य वाष्पोत्सर्जन दर। मिट्टी की नमी नियमित बनी हुई है।';
  if (temp > 29 && humidity < 45 && uvIndex >= 5) {
    evapotranspirationIndex = 'high';
    evapotranspirationAdvice =
      'उच्च वाष्पोत्सर्जन (High Water Loss): तेज धूप व कम नमी से जमीन की नमी तेजी से घटेगी। ट्यूबवेल सिंचाई का प्रबंध रखें।';
  } else if (temp < 22 || humidity > 70) {
    evapotranspirationIndex = 'low';
    evapotranspirationAdvice =
      'धीमा वाष्पोत्सर्जन (Low Water Loss): नमी देर तक टिकेगी। अतिरिक्त सिंचाई की आवश्यकता नहीं है।';
  }

  // 3. Fungal / Pest Risk
  let fungalRiskLevel: 'low' | 'moderate' | 'high' = 'low';
  let fungalAdvice = 'फफूंद व कीट जोखिम सामान्य।';
  if (humidity >= 78 && temp >= 10 && temp <= 25) {
    fungalRiskLevel = 'high';
    fungalAdvice =
      'गेहूं में पीला रतुआ (Yellow Rust) और सरसों में सफेद फफूंद (White Rust) का अनुकूल मौसम। खेत में पत्तियों का निरीक्षण करें।';
  } else if (humidity >= 65) {
    fungalRiskLevel = 'moderate';
    fungalAdvice =
      'हल्की नमी से माहू (Aphid) व फंगस पनपने की शुरुआत संभव है। नीम तेल या हल्की रोकथाम रखें।';
  }

  // 4. Overall Title & Description
  let title = 'मौसम कृषि अनुकूल (Favorable Agronomic Conditions)';
  let description =
    'हवा की गति शांत है और धूप अनुकूल है। खेत में जुताई, बिजाई या स्प्रे के सभी कार्य सुचारू किए जा सकते हैं।';

  if (precipitationChance >= 60) {
    title = '⚠️ भारी बारिश चेतावनी: सिंचाई व स्प्रे रोकें';
    description = sprayWindowAdvice;
  } else if (temp >= 37) {
    title = '🔥 भीषण गर्मी व लू अलर्ट: हल्की शाम सिंचाई करें';
    description = evapotranspirationAdvice;
  } else if (!isSuitableForSpray) {
    title = 'स्प्रे एवं रासायनिक छिड़काव से बचें';
    description = sprayWindowAdvice;
  } else if (evapotranspirationIndex === 'high') {
    title = 'तेज धूप व वाष्पोत्सर्जन अलर्ट';
    description = evapotranspirationAdvice;
  }

  const isSuitableForIrrigation = precipitationChance < 25 && windSpeed < 20;

  return {
    title,
    description,
    isSuitableForSpray,
    isSuitableForIrrigation,
    sprayWindowAdvice,
    evapotranspirationIndex,
    evapotranspirationAdvice,
    fungalRiskLevel,
    fungalAdvice,
  };
}

function formatCardinalHindi(cardinal: string): string {
  const map: Record<string, string> = {
    NORTH: 'उत्तर (N)',
    SOUTH: 'दक्षिण (S)',
    EAST: 'पूर्व (E)',
    WEST: 'पश्चिम (W)',
    NORTH_NORTHWEST: 'उत्तर-उत्तर-पश्चिम (NNW)',
    NORTH_NORTH_WEST: 'उत्तर-उत्तर-पश्चिम (NNW)',
    NORTHWEST: 'उत्तर-पश्चिम (NW)',
    WEST_NORTHWEST: 'पश्चिम-उत्तर-पश्चिम (WNW)',
    WEST_NORTH_WEST: 'पश्चिम-उत्तर-पश्चिम (WNW)',
    NORTH_NORTHEAST: 'उत्तर-उत्तर-पूर्व (NNE)',
    NORTH_NORTH_EAST: 'उत्तर-उत्तर-पूर्व (NNE)',
    NORTHEAST: 'उत्तर-पूर्व (NE)',
    EAST_NORTHEAST: 'पूर्व-उत्तर-पूर्व (ENE)',
    EAST_NORTH_EAST: 'पूर्व-उत्तर-पूर्व (ENE)',
    EAST_SOUTHEAST: 'पूर्व-दक्षिण-पूर्व (ESE)',
    EAST_SOUTH_EAST: 'पूर्व-दक्षिण-पूर्व (ESE)',
    SOUTHEAST: 'दक्षिण-पूर्व (SE)',
    SOUTH_SOUTHEAST: 'दक्षिण-दक्षिण-पूर्व (SSE)',
    SOUTH_SOUTH_EAST: 'दक्षिण-दक्षिण-पूर्व (SSE)',
    SOUTH_SOUTHWEST: 'दक्षिण-दक्षिण-पश्चिम (SSW)',
    SOUTH_SOUTH_WEST: 'दक्षिण-दक्षिण-पश्चिम (SSW)',
    SOUTHWEST: 'दक्षिण-पश्चिम (SW)',
    WEST_SOUTHWEST: 'पश्चिम-दक्षिण-पश्चिम (WSW)',
    WEST_SOUTH_WEST: 'पश्चिम-दक्षिण-पश्चिम (WSW)',
  };
  return map[cardinal] || cardinal;
}

function degreesToCardinal(deg: number): string {
  const directions = [
    'उत्तर (N)',
    'उत्तर-पूर्व (NE)',
    'पूर्व (E)',
    'दक्षिण-पूर्व (SE)',
    'दक्षिण (S)',
    'दक्षिण-पश्चिम (SW)',
    'पश्चिम (W)',
    'उत्तर-पश्चिम (NW)',
  ];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

function getWeatherDescription(code: number): string {
  switch (code) {
    case 0:
      return 'साफ आसमान (Clear Sky)';
    case 1:
      return 'हल्के बादल (Mainly Clear)';
    case 2:
      return 'आंशिक बादल (Partly Cloudy)';
    case 3:
      return 'बादल छाए हुए (Overcast)';
    case 45:
    case 48:
      return 'सुबह का कोहरा (Morning Fog)';
    case 51:
    case 53:
    case 55:
      return 'हल्की बूंदाबांदी (Drizzle)';
    case 61:
    case 63:
    case 65:
      return 'बारिश (Rainfall)';
    case 80:
    case 81:
    case 82:
      return 'तेज बौछार (Showers)';
    case 95:
      return 'गरज के साथ बारिश (Thunderstorm)';
    default:
      return 'सुहावना मौसम (Pleasant Weather)';
  }
}
