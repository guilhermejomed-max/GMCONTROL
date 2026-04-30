import { TrackerSettings } from '../types';

interface SascarVehiclesResponse {
  success: boolean;
  message?: string;
  data?: any[];
  error?: string;
  details?: string;
}

export const sascarService = {
  async getVehicles(plates: string[] = [], trackerSettings?: TrackerSettings): Promise<SascarVehiclesResponse> {
    const response = await fetch('/api/sascar/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plates,
        trackerSettings
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.details || payload.error || `Falha HTTP ${response.status} ao consultar Sascar`);
    }

    return {
      success: true,
      message: payload.message,
      data: Array.isArray(payload.data) ? payload.data : []
    };
  }
};
