import { TrackerSettings } from '../types';
import { parseTrackerOdometerKm } from '../lib/odometerUtils';

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

    const parseOptionalNumber = (...values: any[]): number | undefined => {
      for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const parsed = Number(String(value).trim().replace(',', '.'));
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    };

    const normalizeVehicle = (vehicle: any) => {
      const plate = vehicle.placa || vehicle.plate || '';
      const latitude = parseOptionalNumber(vehicle.latitude) || 0;
      const longitude = parseOptionalNumber(vehicle.longitude) || 0;
      const litrometer = parseOptionalNumber(
        vehicle.litrometro,
        vehicle.litrometro2,
        vehicle.litrometroTotal,
        vehicle.totalLitros,
        vehicle.totalCombustivel
      );

      return {
        ...vehicle,
        idVeiculo: vehicle.idVeiculo ? String(vehicle.idVeiculo) : '',
        placa: plate,
        plate: plate || vehicle.idVeiculo || '',
        latitude,
        longitude,
        odometer: parseTrackerOdometerKm(vehicle),
        speed: Number(vehicle.velocidade ?? 0),
        ignition: vehicle.ignicao === 'S' || vehicle.ignicao === true || vehicle.ignicao === 'true' || vehicle.ignicao === '1' || vehicle.ignicao === 1,
        ...(litrometer !== undefined ? { litrometer } : {}),
        consumoInstantaneo: parseOptionalNumber(vehicle.consumoInstantaneo) || 0,
        lastLocation: {
          lat: latitude,
          lng: longitude,
          address: vehicle.rua || '',
          city: vehicle.cidade || '',
          state: vehicle.uf || '',
          updatedAt: vehicle.dataPosicao || vehicle.dataHora || ''
        }
      };
    };

    const parseReturn = (xmlText: string): any | null => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      let returns = xmlDoc.getElementsByTagName('return');
      if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagNameNS('*', 'return');
      if (!returns || returns.length === 0) return null;

      const ret = returns[0];
      const vehicle: any = {};

      for (let index = 0; index < ret.childNodes.length; index++) {
        const node = ret.childNodes[index];
        if (node.nodeType !== 1) continue;
        const element = node as Element;
        const key = element.localName || element.nodeName.replace(/^.*:/, '');
        vehicle[key] = element.textContent;
      }

      if (!vehicle.placa && !vehicle.idVeiculo && ret.textContent) {
        try {
          const parsed = JSON.parse(ret.textContent);
          if (parsed && typeof parsed === 'object') Object.assign(vehicle, parsed);
        } catch {}
      }

      return vehicle.placa || vehicle.idVeiculo ? vehicle : null;
    };

    const fetchDirectLatestByPlate = async (): Promise<any[]> => {
      if (!plates || plates.length === 0) return [];

      const user = trackerSettings?.user || 'JOMEDELOGTORREOPENTECH';
      const pass = trackerSettings?.pass || 'sascar';
      const url = '/proxy-sascar/SasIntegraWSService';
      const results: any[] = [];

      for (const plate of plates) {
        const cleanPlate = String(plate || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (!cleanPlate) continue;

        const methods = [
          { name: 'obterUltimaPosicaoVeiculoComPlaca', param: 'placa', value: cleanPlate },
          { name: 'obterUltimaPosicaoVeiculo', param: 'idVeiculo', value: cleanPlate }
        ];

        for (const method of methods) {
          const envelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <int:${method.name}>
      <usuario>${user}</usuario>
      <senha>${pass}</senha>
      <${method.param}>${method.value}</${method.param}>
    </int:${method.name}>
  </soapenv:Body>
</soapenv:Envelope>`.trim();

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
              body: envelope
            });

            if (!response.ok) continue;

            const vehicle = parseReturn(await response.text());
            if (vehicle) {
              results.push(normalizeVehicle(vehicle));
              break;
            }
          } catch (error) {
            console.warn(`[Sascar Sync] Fallback direto falhou para ${cleanPlate}:`, error);
          }
        }
      }

      return results;
    };

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

      console.warn('[Sascar Sync] Endpoint interno falhou. Tentando fallback direto por placa...', error);
      const fallbackVehicles = await fetchDirectLatestByPlate();
      if (fallbackVehicles.length > 0) {
        return {
          success: true,
          data: fallbackVehicles
        };
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
