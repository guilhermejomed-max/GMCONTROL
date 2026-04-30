import type { TrackerSettings } from '../types';

type SascarResponse = {
  success?: boolean;
  message?: string;
  data?: any[];
  error?: string;
  details?: string;
};

const SASCAR_VEHICLES_ENDPOINT = '/api/sascar-vehicles';
const REQUEST_CHUNK_SIZE = 4;

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
    const endpoint = resolveEndpoint(trackerSettings);
    const uniquePlates = Array.from(new Set(plates.map(value => String(value || '').trim()).filter(Boolean)));

    if (uniquePlates.length > REQUEST_CHUNK_SIZE) {
      const chunks: string[][] = [];
      for (let i = 0; i < uniquePlates.length; i += REQUEST_CHUNK_SIZE) {
        chunks.push(uniquePlates.slice(i, i + REQUEST_CHUNK_SIZE));
      }

      const responses = await Promise.all(chunks.map(chunk => sascarService.getVehicles(chunk, {
        ...trackerSettings,
        apiUrl: endpoint
      } as TrackerSettings)));

      return {
        success: responses.every(response => response.success !== false),
        message: `Sincronizacao concluida em ${responses.length} lotes.`,
        data: responses.flatMap(response => response.data || [])
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plates: uniquePlates,
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
