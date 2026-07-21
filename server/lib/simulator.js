import {
  AIRCRAFT_TYPES,
  AIRLINES,
  AIRPORTS,
  HELICOPTER_TYPES,
  nearestAirports
} from './airports.js';
import {
  bearingDeg,
  destinationPoint,
  feetToMeters,
  haversineKm,
  knotsToKmh,
  slantRangeKm
} from './geo.js';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function flightNumber(airline) {
  return `${airline.callsignPrefix}${Math.floor(rand(100, 9999))}`;
}

function icao24() {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
}

/**
 * Stateful flight simulation around a home location.
 */
export class FlightSimulator {
  constructor(options = {}) {
    this.home = options.home || { lat: 41.0082, lng: 28.9784, altM: 40, name: 'Ev' };
    this.radiusKm = options.radiusKm || 80;
    this.wideRadiusKm = options.wideRadiusKm || 900;
    this.planeCount = options.planeCount ?? 36;
    this.heliCount = options.heliCount ?? 5;
    this.aircraft = [];
    this.lastTick = Date.now();
    this.seedFleet();
  }

  setHome(home) {
    this.home = { ...this.home, ...home };
  }

  setRadius(km) {
    this.radiusKm = Math.max(10, Math.min(400, Number(km) || 80));
  }

  setWideRadius(km) {
    this.wideRadiusKm = Math.max(100, Math.min(1500, Number(km) || 900));
  }

  seedFleet() {
    this.aircraft = [];
    const nearPlanes = Math.ceil(this.planeCount * 0.4);
    const farPlanes = this.planeCount - nearPlanes;
    for (let i = 0; i < nearPlanes; i++) {
      this.aircraft.push(this.createPlane({ preferNear: true }));
    }
    for (let i = 0; i < farPlanes; i++) {
      this.aircraft.push(this.createPlane({ preferNear: false }));
    }
    for (let i = 0; i < this.heliCount; i++) {
      this.aircraft.push(this.createHelicopter());
    }
  }

  createPlane({ preferNear = Math.random() < 0.4 } = {}) {
    const nearby = nearestAirports(this.home.lat, this.home.lng, 10);
    let origin = preferNear ? pick(nearby) : pick(AIRPORTS);
    let destination = pick(AIRPORTS);
    let guard = 0;
    while (destination.icao === origin.icao && guard++ < 30) {
      destination = pick(AIRPORTS);
    }

    const type = pick(AIRCRAFT_TYPES);
    const airline = pick(AIRLINES);
    const totalDist = Math.max(
      haversineKm(origin.lat, origin.lng, destination.lat, destination.lng),
      30
    );
    const progress = rand(0.08, 0.92);
    const pos = destinationPoint(
      origin.lat,
      origin.lng,
      bearingDeg(origin.lat, origin.lng, destination.lat, destination.lng),
      totalDist * progress
    );

    let lat = pos.lat;
    let lng = pos.lng;
    if (preferNear) {
      const near = destinationPoint(
        this.home.lat,
        this.home.lng,
        rand(0, 360),
        rand(5, this.radiusKm * 0.9)
      );
      lat = near.lat;
      lng = near.lng;
    } else if (Math.random() < 0.35) {
      // Keep some long-haul traffic visible in the wide ring
      const far = destinationPoint(
        this.home.lat,
        this.home.lng,
        rand(0, 360),
        rand(this.radiusKm * 1.2, this.wideRadiusKm * 0.95)
      );
      lat = far.lat;
      lng = far.lng;
    }

    const heading = bearingDeg(lat, lng, destination.lat, destination.lng);
    const phase = progress < 0.15 ? 'climb' : progress > 0.85 ? 'descent' : 'cruise';
    let altFt = type.cruiseFt;
    if (phase === 'climb') altFt = rand(8000, type.cruiseFt * 0.7);
    if (phase === 'descent') altFt = rand(3000, type.cruiseFt * 0.55);

    const groundSpeedKt =
      phase === 'cruise' ? type.cruiseKt + rand(-25, 25) : type.cruiseKt * rand(0.55, 0.85);

    return {
      id: `sim-${icao24()}`,
      icao24: icao24(),
      callsign: flightNumber(airline),
      airline: airline.name,
      category: 'plane',
      aircraftType: type.name,
      typeCode: type.icao,
      origin: {
        icao: origin.icao,
        iata: origin.iata,
        name: origin.name,
        city: origin.city,
        lat: origin.lat,
        lng: origin.lng
      },
      destination: {
        icao: destination.icao,
        iata: destination.iata,
        name: destination.name,
        city: destination.city,
        lat: destination.lat,
        lng: destination.lng
      },
      lat,
      lng,
      altitudeFt: altFt,
      altitudeM: feetToMeters(altFt),
      groundSpeedKt,
      groundSpeedKmh: knotsToKmh(groundSpeedKt),
      verticalSpeedFpm:
        phase === 'climb' ? rand(800, 2200) : phase === 'descent' ? rand(-1800, -600) : rand(-80, 80),
      heading,
      squawk: String(Math.floor(rand(1000, 7777))),
      onGround: false,
      phase,
      trail: [{ lat, lng, t: Date.now() }],
      source: 'simulation'
    };
  }

  createHelicopter() {
    const type = pick(HELICOPTER_TYPES);
    const dist = rand(1, Math.min(25, this.radiusKm * 0.4));
    const pos = destinationPoint(this.home.lat, this.home.lng, rand(0, 360), dist);
    const heading = rand(0, 360);
    const groundSpeedKt = type.cruiseKt * rand(0.6, 1.05);
    const altFt = type.cruiseFt * rand(0.4, 1.1);

    const missions = [
      { from: 'Hastane Heliport', to: 'Şehir Merkezi' },
      { from: 'Polis Heliport', to: 'Devriye Sahası' },
      { from: 'Özel Heliport', to: 'İş Merkezi' },
      { from: 'Sahil Güvenlik', to: 'Kıyı Taraması' },
      { from: 'Haber Heliport', to: 'Canlı Yayın' }
    ];
    const mission = pick(missions);

    return {
      id: `heli-${icao24()}`,
      icao24: icao24(),
      callsign: `TC-H${Math.floor(rand(10, 99))}${String.fromCharCode(65 + Math.floor(rand(0, 26)))}`,
      airline: 'Genel Havacılık',
      category: 'helicopter',
      aircraftType: type.name,
      typeCode: type.icao,
      origin: {
        icao: null,
        iata: null,
        name: mission.from,
        city: this.home.name || 'Yerel',
        lat: this.home.lat,
        lng: this.home.lng
      },
      destination: {
        icao: null,
        iata: null,
        name: mission.to,
        city: this.home.name || 'Yerel',
        lat: this.home.lat,
        lng: this.home.lng
      },
      lat: pos.lat,
      lng: pos.lng,
      altitudeFt: altFt,
      altitudeM: feetToMeters(altFt),
      groundSpeedKt,
      groundSpeedKmh: knotsToKmh(groundSpeedKt),
      verticalSpeedFpm: rand(-200, 200),
      heading,
      squawk: String(Math.floor(rand(1000, 7777))),
      onGround: false,
      phase: 'cruise',
      trail: [{ lat: pos.lat, lng: pos.lng, t: Date.now() }],
      orbitAngularDegPerSec: rand(1.5, 4),
      source: 'simulation'
    };
  }

  tick() {
    const now = Date.now();
    const dtSec = Math.min(2, Math.max(0.05, (now - this.lastTick) / 1000));
    this.lastTick = now;

    for (const ac of this.aircraft) {
      if (ac.category === 'helicopter') this.tickHelicopter(ac, dtSec, now);
      else this.tickPlane(ac, dtSec, now);
      this.trimTrail(ac);
    }

    this.aircraft = this.aircraft.filter((ac) => {
      const d = haversineKm(this.home.lat, this.home.lng, ac.lat, ac.lng);
      return d < this.wideRadiusKm * 1.35;
    });

    while (this.aircraft.filter((a) => a.category === 'plane').length < this.planeCount) {
      const nearCount = this.aircraft.filter(
        (a) =>
          a.category === 'plane' &&
          haversineKm(this.home.lat, this.home.lng, a.lat, a.lng) <= this.radiusKm
      ).length;
      this.aircraft.push(this.createPlane({ preferNear: nearCount < this.planeCount * 0.4 }));
    }
    while (this.aircraft.filter((a) => a.category === 'helicopter').length < this.heliCount) {
      this.aircraft.push(this.createHelicopter());
    }
  }

  tickPlane(ac, dtSec, now) {
    const destLat = ac.destination.lat;
    const destLng = ac.destination.lng;
    const remaining = haversineKm(ac.lat, ac.lng, destLat, destLng);
    const desiredHeading = bearingDeg(ac.lat, ac.lng, destLat, destLng);
    const headingDiff = ((desiredHeading - ac.heading + 540) % 360) - 180;
    const turnRate = 3;
    const turn = Math.max(-turnRate * dtSec, Math.min(turnRate * dtSec, headingDiff));
    ac.heading = (ac.heading + turn + 360) % 360;

    if (remaining < 40) {
      ac.phase = 'descent';
      ac.verticalSpeedFpm = -Math.min(1800, 200 + remaining * 30);
      ac.groundSpeedKt = Math.max(160, ac.groundSpeedKt - 8 * dtSec);
    } else if (ac.altitudeFt < 30000 && ac.phase === 'climb') {
      ac.verticalSpeedFpm = rand(1200, 2000);
      ac.groundSpeedKt = Math.min(ac.groundSpeedKt + 5 * dtSec, 460);
    } else {
      ac.phase = 'cruise';
      ac.verticalSpeedFpm = rand(-40, 40);
    }

    ac.altitudeFt = Math.max(800, ac.altitudeFt + (ac.verticalSpeedFpm / 60) * dtSec);
    ac.altitudeM = feetToMeters(ac.altitudeFt);
    ac.groundSpeedKmh = knotsToKmh(ac.groundSpeedKt);

    const distKm = (ac.groundSpeedKmh / 3600) * dtSec;
    const next = destinationPoint(ac.lat, ac.lng, ac.heading, distKm);
    ac.lat = next.lat;
    ac.lng = next.lng;

    if (remaining < 3) {
      const kept = { id: ac.id, icao24: ac.icao24, trail: ac.trail };
      Object.assign(ac, this.createPlane(), kept);
    }

    if (!ac.trail.length || now - ac.trail[ac.trail.length - 1].t > 2000) {
      ac.trail.push({ lat: ac.lat, lng: ac.lng, t: now });
    }
  }

  tickHelicopter(ac, dtSec, now) {
    ac.heading = (ac.heading + (ac.orbitAngularDegPerSec || 2) * dtSec + 360) % 360;
    const distKm = (ac.groundSpeedKmh / 3600) * dtSec;
    const next = destinationPoint(ac.lat, ac.lng, ac.heading, distKm);
    ac.lat = next.lat;
    ac.lng = next.lng;

    const fromHome = haversineKm(this.home.lat, this.home.lng, ac.lat, ac.lng);
    if (fromHome > Math.min(30, this.radiusKm * 0.5)) {
      const homeBearing = bearingDeg(ac.lat, ac.lng, this.home.lat, this.home.lng);
      const diff = ((homeBearing - ac.heading + 540) % 360) - 180;
      ac.heading =
        (ac.heading + Math.sign(diff) * Math.min(Math.abs(diff), 8 * dtSec) + 360) % 360;
    }

    ac.altitudeFt = Math.max(200, ac.altitudeFt + (ac.verticalSpeedFpm / 60) * dtSec);
    if (Math.random() < 0.02) ac.verticalSpeedFpm = rand(-250, 250);
    ac.altitudeM = feetToMeters(ac.altitudeFt);
    ac.groundSpeedKmh = knotsToKmh(ac.groundSpeedKt);

    if (!ac.trail.length || now - ac.trail[ac.trail.length - 1].t > 1500) {
      ac.trail.push({ lat: ac.lat, lng: ac.lng, t: now });
    }
  }

  trimTrail(ac) {
    const cutoff = Date.now() - 90000;
    ac.trail = (ac.trail || []).filter((p) => p.t >= cutoff).slice(-40);
  }

  getSnapshot(radiusKm = this.wideRadiusKm, homeRadiusKm = this.radiusKm) {
    this.tick();
    const r = radiusKm || this.wideRadiusKm;
    const nearR = homeRadiusKm || this.radiusKm;
    const homeAlt = this.home.altM || 0;

    return this.aircraft
      .map((ac) => {
        const groundDistanceKm = haversineKm(this.home.lat, this.home.lng, ac.lat, ac.lng);
        const distance3dKm = slantRangeKm(
          this.home.lat,
          this.home.lng,
          homeAlt,
          ac.lat,
          ac.lng,
          ac.altitudeM
        );
        const bearingFromHome = bearingDeg(this.home.lat, this.home.lng, ac.lat, ac.lng);
        const zone = groundDistanceKm <= nearR ? 'near' : 'far';
        return {
          id: ac.id,
          icao24: ac.icao24,
          callsign: ac.callsign,
          airline: ac.airline,
          category: ac.category,
          aircraftType: ac.aircraftType,
          typeCode: ac.typeCode,
          origin: {
            icao: ac.origin.icao,
            iata: ac.origin.iata,
            name: ac.origin.name,
            city: ac.origin.city
          },
          destination: {
            icao: ac.destination.icao,
            iata: ac.destination.iata,
            name: ac.destination.name,
            city: ac.destination.city
          },
          lat: Number(ac.lat.toFixed(5)),
          lng: Number(ac.lng.toFixed(5)),
          altitudeFt: Math.round(ac.altitudeFt),
          altitudeM: Math.round(ac.altitudeM),
          heightAboveHomeM: Math.round(ac.altitudeM - homeAlt),
          groundSpeedKt: Math.round(ac.groundSpeedKt),
          groundSpeedKmh: Math.round(ac.groundSpeedKmh),
          verticalSpeedFpm: Math.round(ac.verticalSpeedFpm),
          heading: Math.round(ac.heading),
          squawk: ac.squawk,
          onGround: ac.onGround,
          phase: ac.phase,
          zone,
          passengersVisible: false,
          passengerNote:
            'Yolcu listesi bu sistemde görünmez. ADS-B yalnızca uçak konum/kimlik yayınlar; yolcu verisi özel ve yasal olarak kapalıdır.',
          groundDistanceKm: Number(groundDistanceKm.toFixed(2)),
          distance3dKm: Number(distance3dKm.toFixed(2)),
          bearingFromHome: Math.round(bearingFromHome),
          trail: ac.trail.map((p) => ({ lat: p.lat, lng: p.lng })),
          source: 'simulation',
          updatedAt: Date.now()
        };
      })
      .filter((ac) => ac.groundDistanceKm <= r)
      .sort((a, b) => a.groundDistanceKm - b.groundDistanceKm);
  }
}
