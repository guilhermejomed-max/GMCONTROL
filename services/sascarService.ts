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

    const user = trackerSettings?.user || 'JOMEDELOGTORREOPENTECH';
    const pass = trackerSettings?.pass || 'sascar';
    const url = '/proxy-sascar/SasIntegraWSService';

    const maxRetries = 2;
    let allVehiclesMap = new Map<string, any>();
    let hasMoreData = true;
    let loopCount = 0;
    const maxLoops = 20; // Prevent infinite loops, max 100,000 positions

    while (hasMoreData && loopCount < maxLoops) {
      loopCount++;
      let successInThisLoop = false;
      
      for (let i = 0; i <= maxRetries; i++) {
        try {
          const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterPacotePosicoesComPlaca>
         <usuario>${user}</usuario>
         <senha>${pass}</senha>
         <quantidade>5000</quantidade>
      </int:obterPacotePosicoesComPlaca>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

          const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml;charset=UTF-8'
            },
            body: soapEnvelope
          }, 180000);
          
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          const text = await response.text();
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          
          const fault = xmlDoc.getElementsByTagName("faultstring")[0] || xmlDoc.getElementsByTagNameNS("*", "faultstring")[0];
          if (fault) {
            throw new Error(`Erro Sascar: ${fault.textContent}`);
          }

          let returns = xmlDoc.getElementsByTagName("return");
          if (!returns || returns.length === 0) {
            returns = xmlDoc.getElementsByTagNameNS("*", "return");
          }
          if (!returns || returns.length === 0) {
            returns = xmlDoc.getElementsByTagName("ns2:return");
          }
          
          if (returns.length < 3000) {
            hasMoreData = false;
          }

          for (let j = 0; j < returns.length; j++) {
            const ret = returns[j];
            const v: any = {};
            for (let k = 0; k < ret.childNodes.length; k++) {
              const node = ret.childNodes[k];
              if (node.nodeType === 1) {
                const element = node as Element;
                const nodeName = element.localName || element.nodeName.replace(/^.*:/, '');
                v[nodeName] = element.textContent;
              }
            }
            
            const placa = v.placa || '';

            if (placa) {
              const placaClean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
              
              // Keep the raw object but add/normalize key fields for the components
              const normalizedVehicle = {
                ...v,
                idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
                placa: placa,
                plate: placa || v.idVeiculo || '',
                latitude: Number(v.latitude || 0),
                longitude: Number(v.longitude || 0),
                odometer: v.odometro ? parseFloat(v.odometro) / 1000 : 0,
                speed: Number(v.velocidade ?? 0),
                ignition: v.ignicao === 'S' || v.ignicao === 'true' || v.ignicao === '1',
                lastLocation: {
                    lat: Number(v.latitude || 0),
                    lng: Number(v.longitude || 0),
                    address: v.rua || '',
                    city: v.cidade || '',
                    state: v.uf || '',
                    updatedAt: v.dataPosicao || ''
                }
              };

              // Keep the latest position
              allVehiclesMap.set(placaClean, normalizedVehicle);
            }
          }
          
          successInThisLoop = true;
          break; // Break the retry loop if successful
        } catch (error: any) {
          const isLastRetry = i === maxRetries;
          if (isLastRetry) {
            console.error('Erro na integração Sascar (Final):', error);
            hasMoreData = false; // Stop the main loop on final error
            if (allVehiclesMap.size === 0) {
                throw error; // Only throw if we got nothing at all
            }
          } else {
            const delay = 2000 * (i + 1);
            console.warn(`Tentativa ${i + 1}/${maxRetries + 1} falhou (${error.message}), tentando novamente em ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    const vehicles = Array.from(allVehiclesMap.values());

    // Filter by plates if provided
    let filteredVehicles = vehicles;
    if (plates && plates.length > 0) {
      const platesClean = plates.map(p => p.replace(/[^A-Z0-9]/gi, '').toUpperCase());
      console.log(`[Sascar Debug] Procurando por ${platesClean.length} placas limpas. Exemplo:`, platesClean.slice(0, 5));
      console.log(`[Sascar Debug] Sascar retornou ${vehicles.length} veículos únicos no total.`);
      
      filteredVehicles = vehicles.filter(v => {
        const vPlacaClean = v.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return platesClean.includes(vPlacaClean);
      });
      
      console.log(`[Sascar Debug] Após filtro, restaram ${filteredVehicles.length} veículos.`);
    }
    
    return { success: true, data: filteredVehicles };
  }
};
