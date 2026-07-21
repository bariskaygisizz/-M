/** Turkish & nearby airports used for simulated routes */
export const AIRPORTS = [
  { icao: 'LTFM', iata: 'IST', name: 'İstanbul Havalimanı', city: 'İstanbul', lat: 41.275278, lng: 28.751944 },
  { icao: 'LTFJ', iata: 'SAW', name: 'Sabiha Gökçen', city: 'İstanbul', lat: 40.898333, lng: 29.309167 },
  { icao: 'LTAC', iata: 'ESB', name: 'Esenboğa', city: 'Ankara', lat: 40.128083, lng: 32.995083 },
  { icao: 'LTBJ', iata: 'ADB', name: 'Adnan Menderes', city: 'İzmir', lat: 38.292392, lng: 27.156953 },
  { icao: 'LTAI', iata: 'AYT', name: 'Antalya', city: 'Antalya', lat: 36.898731, lng: 30.800461 },
  { icao: 'LTBS', iata: 'BJV', name: 'Milas-Bodrum', city: 'Muğla', lat: 37.250519, lng: 27.664314 },
  { icao: 'LTFE', iata: 'DLM', name: 'Dalaman', city: 'Muğla', lat: 36.713056, lng: 28.7925 },
  { icao: 'LTAF', iata: 'ADA', name: 'Şakirpaşa', city: 'Adana', lat: 36.982222, lng: 35.280278 },
  { icao: 'LTCG', iata: 'TZX', name: 'Trabzon', city: 'Trabzon', lat: 40.995098, lng: 39.789728 },
  { icao: 'LTCI', iata: 'VAN', name: 'Ferit Melen', city: 'Van', lat: 38.468219, lng: 43.3323 },
  { icao: 'LTFH', iata: 'SZF', name: 'Çarşamba', city: 'Samsun', lat: 41.2545, lng: 36.5671 },
  { icao: 'LTAS', iata: 'ONQ', name: 'Çaycuma', city: 'Zonguldak', lat: 41.506401, lng: 32.0886 },
  { icao: 'LTBQ', iata: 'KCO', name: 'Cengiz Topel', city: 'Kocaeli', lat: 40.735028, lng: 30.083336 },
  { icao: 'LTBU', iata: 'TEQ', name: 'Çorlu', city: 'Tekirdağ', lat: 41.138198, lng: 27.9191 },
  { icao: 'LTFG', iata: 'GZP', name: 'Gazipaşa-Alanya', city: 'Antalya', lat: 36.299217, lng: 32.300598 },
  { icao: 'LTCD', iata: 'ERC', name: 'Erzincan', city: 'Erzincan', lat: 39.710203, lng: 39.527002 },
  { icao: 'LTCC', iata: 'DIY', name: 'Diyarbakır', city: 'Diyarbakır', lat: 37.893902, lng: 40.201 },
  { icao: 'LTCK', iata: 'MQM', name: 'Muş', city: 'Muş', lat: 38.747999, lng: 41.661201 },
  { icao: 'LTAE', iata: null, name: 'Akıncı', city: 'Ankara', lat: 40.078899, lng: 32.5656 },
  { icao: 'LGAV', iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Atina', lat: 37.936401, lng: 23.9445 }
];

export const AIRLINES = [
  { code: 'THY', name: 'Turkish Airlines', callsignPrefix: 'THY' },
  { code: 'PGT', name: 'Pegasus', callsignPrefix: 'PGT' },
  { code: 'SXS', name: 'SunExpress', callsignPrefix: 'SXS' },
  { code: 'TKJ', name: 'AJet', callsignPrefix: 'TKJ' },
  { code: 'OHY', name: 'Onur Air', callsignPrefix: 'OHY' },
  { code: 'KKK', name: 'Atlasglobal', callsignPrefix: 'KKK' }
];

export const AIRCRAFT_TYPES = [
  { icao: 'B738', name: 'Boeing 737-800', category: 'plane', cruiseKt: 450, cruiseFt: 37000 },
  { icao: 'A321', name: 'Airbus A321', category: 'plane', cruiseKt: 447, cruiseFt: 36000 },
  { icao: 'A320', name: 'Airbus A320', category: 'plane', cruiseKt: 447, cruiseFt: 36000 },
  { icao: 'B77W', name: 'Boeing 777-300ER', category: 'plane', cruiseKt: 490, cruiseFt: 39000 },
  { icao: 'A333', name: 'Airbus A330-300', category: 'plane', cruiseKt: 470, cruiseFt: 38000 },
  { icao: 'E190', name: 'Embraer E190', category: 'plane', cruiseKt: 430, cruiseFt: 35000 },
  { icao: 'AT76', name: 'ATR 72-600', category: 'plane', cruiseKt: 275, cruiseFt: 22000 },
  { icao: 'B38M', name: 'Boeing 737 MAX 8', category: 'plane', cruiseKt: 453, cruiseFt: 37000 }
];

export const HELICOPTER_TYPES = [
  { icao: 'EC35', name: 'Eurocopter EC135', category: 'helicopter', cruiseKt: 135, cruiseFt: 3500 },
  { icao: 'A139', name: 'AgustaWestland AW139', category: 'helicopter', cruiseKt: 165, cruiseFt: 4500 },
  { icao: 'B407', name: 'Bell 407', category: 'helicopter', cruiseKt: 133, cruiseFt: 3000 },
  { icao: 'S76', name: 'Sikorsky S-76', category: 'helicopter', cruiseKt: 155, cruiseFt: 4000 },
  { icao: 'R44', name: 'Robinson R44', category: 'helicopter', cruiseKt: 110, cruiseFt: 2500 }
];

export function findAirport(icao) {
  return AIRPORTS.find((a) => a.icao === icao) || null;
}

export function nearestAirports(lat, lng, count = 6) {
  return [...AIRPORTS]
    .map((a) => ({
      ...a,
      dist: Math.hypot(a.lat - lat, a.lng - lng)
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);
}
