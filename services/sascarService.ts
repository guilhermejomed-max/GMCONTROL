import { TrackerSettings } from '../types';

export const sascarService = {
  getVehicles: async (plates?: string[], trackerSettings?: TrackerSettings, retries = 2) => {
    const fetchWithTimeout = async (url: string, options: any, timeout = 120000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Timeout da requisição (120s)');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }
        throw error;
      }
    };

    const maxRetries = 2;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const user = trackerSettings?.user || 'JOMEDELOGTORREOPENTECH';
        const pass = trackerSettings?.pass || 'sascar';

        const url = '/proxy-sascar/SasIntegraWSService';

        const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterPacotePosicoes>
         <usuario>${user}</usuario>
         <senha>${pass}</senha>
         <quantidade>5000</quantidade>
      </int:obterPacotePosicoes>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8'
          },
          body: soapEnvelope
        }, 180000); // Aumentado para 180s (3 min)
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const text = await response.text();
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Check for SOAP Fault
        const fault = xmlDoc.getElementsByTagName("faultstring")[0];
        if (fault) {
          throw new Error(`Erro Sascar: ${fault.textContent}`);
        }

        const returns = xmlDoc.getElementsByTagName("return");
        const vehicles = [];
        
        for (let j = 0; j < returns.length; j++) {
          const ret = returns[j];
          const v: any = {};
          for (let k = 0; k < ret.childNodes.length; k++) {
            const node = ret.childNodes[k];
            if (node.nodeType === 1) { // Element node
              v[node.nodeName] = node.textContent;
            }
          }
          
          const rawLat = v.latitude || 0;
          const rawLng = v.longitude || 0;
          const odometerKm = v.odometro ? parseFloat(v.odometro) / 1000 : 0;
          const speed = Number(v.velocidade ?? 0);
          const ignition = v.ignicao === 'S' || v.ignicao === 'true' || v.ignicao === '1';

          vehicles.push({
              idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
              placa: v.placa || '',
              plate: v.placa || v.idVeiculo || '',
              latitude: Number(rawLat),
              longitude: Number(rawLng),
              odometer: odometerKm,
              speed: speed,
              ignition: ignition,
              lastLocation: {
                  lat: Number(rawLat),
                  lng: Number(rawLng),
                  address: v.rua || '',
                  city: v.cidade || '',
                  state: v.uf || '',
                  updatedAt: v.dataPosicao || ''
              }
          });
        }

        // Filter by plates if provided
        let filteredVehicles = vehicles;
        if (plates && plates.length > 0) {
          const platesUpper = plates.map(p => p.trim().toUpperCase());
          filteredVehicles = vehicles.filter(v => 
            v.placa && platesUpper.includes(v.placa.trim().toUpperCase())
          );
        }
        
        return { success: true, data: filteredVehicles };
      } catch (error: any) {
        const isLastRetry = i === maxRetries;
        const isTimeout = error.name === 'TimeoutError' || error.message?.includes('Timeout');
        const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('NetworkError');

        if (isLastRetry) {
          console.error('Erro na integração Sascar (Final):', error);
          if (isTimeout) throw new Error('A requisição à Sascar demorou muito tempo. A sincronização continua em segundo plano, tente novamente em alguns instantes.');
          if (isNetworkError) throw new Error('Erro de conexão com o servidor. O servidor pode estar processando uma fila longa da Sascar. Aguarde um momento e tente novamente.');
          throw error;
        }
        
        const delay = 2000 * (i + 1);
        console.warn(`Tentativa ${i + 1}/${maxRetries + 1} falhou (${error.message}), tentando novamente em ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};
