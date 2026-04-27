export const MAX_REASONABLE_ODOMETER_KM = 2000000;

export const isImplausibleImportedOdometer = (odometerKm: number): boolean => {
  return !Number.isFinite(odometerKm) || odometerKm <= 0 || odometerKm > MAX_REASONABLE_ODOMETER_KM;
};

export const chooseAuthoritativeOdometer = (currentOdometerKm: number, trackerOdometerKm: number): number => {
  const current = Number(currentOdometerKm) || 0;
  const tracker = Number(trackerOdometerKm) || 0;

  if (tracker <= 0) return current;
  if (current <= 0) return tracker;

  const currentLooksLikeDocumentNumber =
    current > MAX_REASONABLE_ODOMETER_KM &&
    tracker > 1000 &&
    tracker <= MAX_REASONABLE_ODOMETER_KM;

  const currentIsFarAboveTracker =
    current > tracker * 5 &&
    current - tracker > 1000000 &&
    tracker > 1000 &&
    tracker <= MAX_REASONABLE_ODOMETER_KM;

  if (currentLooksLikeDocumentNumber || currentIsFarAboveTracker) {
    return tracker;
  }

  return Math.max(current, tracker);
};
