export interface TelemetryFuelPoint {
  timestamp: string; // ISO format
  odometer: number; // KM
  litrometer: number; // Measured accumulated liters
}

export const telemetryFuelService = {
  /**
   * Calculates the fuel efficiency (km/l) using a rolling average 
   * over the last targetKm (default 100km).
   * It handles litrometer resets and ignores anomalous odometer jumps.
   */
  calculateRollingAverage: (
    history: TelemetryFuelPoint[], 
    targetKm: number = 100
  ): { avgKml: number; evaluatedKm: number; consumedLiters: number } | null => {
    
    if (!history || history.length < 2) return null;

    // Ensure sorted by timestamp/odometer ascending
    const sorted = [...history].sort((a, b) => a.odometer - b.odometer);
    
    let totalKm = 0;
    let totalLiters = 0;

    // Iterate backwards from the most recent data
    for (let i = sorted.length - 1; i > 0; i--) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      let diffKm = current.odometer - prev.odometer;
      
      // If odometer resets or jumps wildly, we might want to discard the segment
      if (diffKm < 0 || diffKm > 500) {
          continue; // ignore anomaly
      }

      let diffLiters = current.litrometer - prev.litrometer;

      // Handle litrometer reset or negative values
      if (diffLiters < 0) {
        // If the litrometer resets, the fuel consumed in this gap 
        // can be estimated by assuming it started from 0 and reached current.litrometer
        // but if it's very large, it might be a sensor error.
        // We'll conservatively take current.litrometer as the consumption since reset.
        if (current.litrometer >= 0 && current.litrometer < 300) {
           diffLiters = current.litrometer;
        } else {
           continue; // invalid reading
        }
      }

      // Ignore zero km with high fuel consumed implies anomaly
      if (diffKm === 0 && diffLiters > 10) {
          continue;
      }

      totalKm += diffKm;
      totalLiters += diffLiters;

      // Stop once we have evaluated the target distance
      if (totalKm >= targetKm) {
        break;
      }
    }

    if (totalLiters === 0 || totalKm === 0) return null;

    return {
      avgKml: totalKm / totalLiters,
      evaluatedKm: totalKm,
      consumedLiters: totalLiters
    };
  }
};
