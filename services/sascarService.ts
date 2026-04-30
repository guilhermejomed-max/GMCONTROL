import type { TrackerSettings } from '../types';

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
      const details = payload.details || payload.error || response.statusText || 'erro sem detalhes';
      const debug = payload.debug ? ` | debug=${JSON.stringify(payload.debug)}` : '';
      throw new Error(`Falha HTTP ${response.status} ao consultar Sascar: ${details}${debug}`);
    }

    return {
      success: true,
      message: payload.message,
      data: Array.isArray(payload.data) ? payload.data : []
    };
  }
};
