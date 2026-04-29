import { TrackerSettings } from '../types';

type SascarResponse = {
  success?: boolean;
  data?: any[];
  error?: string;
  details?: string;
  message?: string;
};

export const sascarService = {
  getVehicles: async (plates?: string[], trackerSettings?: TrackerSettings, retries = 2) => {
    void retries;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const response = await fetch('/api/sascar/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: plates || [], trackerSettings }),
        signal: controller.signal
      });

      const responseText = await response.text();
      let json: SascarResponse | null = null;

      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        json = null;
      }

      if (!response.ok || json?.success === false) {
        const details = json?.details || json?.error || responseText || `Erro HTTP: ${response.status}`;
        throw new Error(details);
      }

      return {
        success: true,
        data: Array.isArray(json?.data) ? json.data : []
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Timeout da sincronizacao Sascar. Tente novamente em alguns segundos.');
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
