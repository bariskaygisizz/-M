const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = 6371000;

export function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance in kilometers */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from point A to B in degrees (0–360) */
export function bearingDeg(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Move point by distanceKm along bearingDeg */
export function destinationPoint(lat, lng, bearing, distanceKm) {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = toRad(bearing);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** Slant range (3D) from observer to aircraft in km */
export function slantRangeKm(lat1, lng1, altM1, lat2, lng2, altM2) {
  const groundKm = haversineKm(lat1, lng1, lat2, lng2);
  const dAltKm = (altM2 - altM1) / 1000;
  return Math.sqrt(groundKm * groundKm + dAltKm * dAltKm);
}

export function knotsToKmh(kt) {
  return kt * 1.852;
}

export function kmhToKnots(kmh) {
  return kmh / 1.852;
}

export function feetToMeters(ft) {
  return ft * 0.3048;
}

export function metersToFeet(m) {
  return m / 0.3048;
}

export { EARTH_RADIUS_KM, EARTH_RADIUS_M };
