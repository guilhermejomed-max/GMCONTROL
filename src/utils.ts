import { Tire } from '../types';

export const calculatePredictedTreadDepth = (tire: Tire, currentOdometer: number): number => {
    if (!tire.lastMeasuredDepth || !tire.lastMeasuredOdometer || !tire.installOdometer) {
        return tire.currentTreadDepth;
    }
    
    // Wear Rate = (InitialDepth - LastMeasuredDepth) / (LastMeasuredOdometer - InstallOdometer)
    // InitialDepth = tire.originalTreadDepth
    
    const wearRate = (tire.originalTreadDepth - tire.lastMeasuredDepth) / (tire.lastMeasuredOdometer - tire.installOdometer);
    
    const kmsDrivenSinceLastMeasurement = currentOdometer - tire.lastMeasuredOdometer;
    
    const predictedDepth = tire.lastMeasuredDepth - (kmsDrivenSinceLastMeasurement * wearRate);
    
    return Math.max(0, predictedDepth); // Should not be negative
};

export const parseSascarDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    // Formatos comuns da Sascar: dd/mm/yyyy hh:mm:ss ou ISO
    if (dateStr.includes('/')) {
        const parts = dateStr.split(/[\/\s:]/);
        if (parts.length >= 6) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const hour = parseInt(parts[3], 10);
            const minute = parseInt(parts[4], 10);
            const second = parseInt(parts[5], 10);
            return new Date(year, month, day, hour, minute, second).getTime();
        }
    }
    const timestamp = new Date(dateStr).getTime();
    return isNaN(timestamp) ? 0 : timestamp;
};
