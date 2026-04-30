import type { TrackerSettings } from '../types';

type SascarResponse = {
  success?: boolean;
  message?: string;
  data?: any[];
  error?: string;
  details?: string;
  debug?: any;
};

type SascarRequestItem = {
  code: string;
  plate?: string;
};

const SASCAR_VEHICLES_ENDPOINT = '/api/sascar-vehicles';
const REQUEST_CHUNK_SIZE = 1;

const normalizeSascarCode = (value: any) => {
  const text = String(value || '').trim();
  const digits = text.replace(/\D/g, '');
  return digits.length >= 4 ? digits : text;
};

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
  getVehicles: async (plates: Array<string | SascarRequestItem> = [], trackerSettings?: TrackerSettings): Promise<SascarResponse> => {
    const endpoint = resolveEndpoint(trackerSettings);
    const requestItems = plates.map(value => {
      if (typeof value === 'object' && value) {
        return {
          code: normalizeSascarCode(value.code),
          plate: String(value.plate || '').trim()
        };
      }
      return { code: normalizeSascarCode(value) };
    }).filter(item => item.code);
    const dedupedItems = Array.from(new Map(requestItems.map(item => [item.code, item])).values());
    const uniquePlates = dedupedItems.map(item => item.code);

    if (uniquePlates.length > REQUEST_CHUNK_SIZE) {
      const chunks: SascarRequestItem[][] = [];
      for (let i = 0; i < dedupedItems.length; i += REQUEST_CHUNK_SIZE) {
        chunks.push(dedupedItems.slice(i, i + REQUEST_CHUNK_SIZE));
      }

      const responses: SascarResponse[] = [];
      const errors: string[] = [];

      for (const chunk of chunks) {
        try {
          responses.push(await sascarService.getVehicles(chunk, {
            ...trackerSettings,
            apiUrl: endpoint
          } as TrackerSettings));
        } catch (error: any) {
          errors.push(error?.message || String(error));
        }
      }

      if (responses.length === 0 && errors.length > 0) {
        throw new Error(errors.join(' | '));
      }

      return {
        success: errors.length === 0 || responses.length > 0,
        message: errors.length > 0
          ? `Sincronizacao parcial em ${responses.length}/${chunks.length} lotes.`
          : `Sincronizacao concluida em ${responses.length} lotes.`,
        details: errors.join(' | '),
        data: responses.flatMap(response => response.data || []),
        debug: {
          chunkSize: REQUEST_CHUNK_SIZE,
          chunks: chunks.length,
          successfulChunks: responses.length,
          errors,
          responses: responses.map((response, index) => ({
            chunk: index + 1,
            message: response.message,
            count: response.data?.length || 0,
            debug: response.debug
          }))
        }
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plates: uniquePlates,
        vehicles: dedupedItems,
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
