import type { TrackerSettings } from '../types';

type SascarResponse = {
  success?: boolean;
  message?: string;
  data?: any[];
  error?: string;
  details?: string;
};

const SASCAR_VEHICLES_ENDPOINT = '/api/sascar-vehicles';

const isLegacyProxyUrl = (value?: string) => {
  const url = String(value || '').trim();
  return !url ||
    url.includes('/proxy-sascar') ||
    url.includes('/SasIntegraWSService') ||
    url.includes('sasintegra.sascar.com.br');
};

const resolveEndpoint = (settings?: TrackerSettings) => {
  if (isLegacyProxyUrl(settings?.apiUrl)) return SASCAR_VEHICLES_ENDPOINT;
  return settings?.apiUrl || SASCAR_VEHICLES_ENDPOINT;
};

export const sascarService = {
  getVehicles: async (plates: string[] = [], trackerSettings?: TrackerSettings): Promise<SascarResponse> => {
    const response = await fetch(resolveEndpoint(trackerSettings), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plates,
        trackerSettings
      })
    });

    const rawText = await response.text();
    let payload: SascarResponse = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = {
        error: rawText.slice(0, 500)
      };
    }

    if (!response.ok || payload.success === false) {
      throw new Error(payload.details || payload.error || `Falha ao consultar Sascar (${response.status})`);
    }

    return {
      ...payload,
      data: Array.isArray(payload.data) ? payload.data : []
    };
  }
};
