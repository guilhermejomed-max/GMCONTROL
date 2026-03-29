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
