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

    const fetchAllLatest = async (): Promise<any[]> => {
      const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterUltimaPosicaoTodosVeiculos>
         <usuario>${user}</usuario>
         <senha>${pass}</senha>
      </int:obterUltimaPosicaoTodosVeiculos>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

      try {
        console.log(`[Sascar Service] Solicitando última posição de todos os veículos...`);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
          body: soapEnvelope
        }, 60000);

        if (!response.ok) return [];
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        let returns = xmlDoc.getElementsByTagName("return");
        if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagNameNS("*", "return");
        
        const results: any[] = [];
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
          if (v.placa || v.idVeiculo) results.push(v);
        }
        console.log(`[Sascar Service] Recebidos ${results.length} veículos via obterUltimaPosicaoTodosVeiculos.`);
        return results;
      } catch (e) {
        console.error(`[Sascar Service] Erro em obterUltimaPosicaoTodosVeiculos:`, e);
      }
      return [];
    };

    const fetchIndividual = async (idOrPlate: string): Promise<any | null> => {
      const isId = /^\d+$/.test(idOrPlate);
      const methods = isId 
        ? [{ name: 'obterUltimaPosicaoVeiculo', param: 'idVeiculo' }, { name: 'obterUltimaPosicaoVeiculoComPlaca', param: 'placa' }]
        : [{ name: 'obterUltimaPosicaoVeiculoComPlaca', param: 'placa' }, { name: 'obterUltimaPosicaoVeiculo', param: 'idVeiculo' }];

      for (const method of methods) {
        const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:${method.name}>
         <usuario>${user}</usuario>
         <senha>${pass}</senha>
         <${method.param}>${idOrPlate}</${method.param}>
      </int:${method.name}>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

        try {
          const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
            body: soapEnvelope
          }, 30000);

          if (!response.ok) continue;
          const text = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          
          let returns = xmlDoc.getElementsByTagName("return");
          if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagNameNS("*", "return");
          
          if (returns && returns.length > 0) {
            const ret = returns[0];
            const v: any = {};
            for (let k = 0; k < ret.childNodes.length; k++) {
              const node = ret.childNodes[k];
              if (node.nodeType === 1) {
                const element = node as Element;
                const nodeName = element.localName || element.nodeName.replace(/^.*:/, '');
                v[nodeName] = element.textContent;
              }
            }
            if (v.placa || v.idVeiculo) return v;
          }
        } catch (e) {
          console.warn(`Erro no método ${method.name} para ${idOrPlate}:`, e);
        }
      }
      return null;
    };

    const maxRetries = 2;
    let allVehiclesMap = new Map<string, any>();

    // Estratégia 1: Buscar última posição de TODOS os veículos (Mais eficiente e completa)
    const allLatest = await fetchAllLatest();
    allLatest.forEach(v => {
      const placa = v.placa || '';
      const uniqueKey = v.idVeiculo ? String(v.idVeiculo) : placa.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
      
      const normalizedVehicle = {
        ...v,
        idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
        placa: placa,
        plate: placa || v.idVeiculo || '',
        latitude: Number(v.latitude || 0),
        longitude: Number(v.longitude || 0),
        odometer: v.odometro ? parseFloat(v.odometro) : 0,
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
      allVehiclesMap.set(uniqueKey, normalizedVehicle);
    });

    // Estratégia 2: Se ainda faltarem veículos, buscar no pacote de posições (Fallback)
    let hasMoreData = true;
    let loopCount = 0;
    const maxLoops = 5; // Reduzido pois já temos a maioria via Estratégia 1

    while (hasMoreData && loopCount < maxLoops) {
      loopCount++;
      
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
          
          if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

          const text = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          
          const fault = xmlDoc.getElementsByTagName("faultstring")[0] || xmlDoc.getElementsByTagNameNS("*", "faultstring")[0];
          if (fault) throw new Error(`Erro Sascar: ${fault.textContent}`);

          let returns = xmlDoc.getElementsByTagName("return");
          if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagNameNS("*", "return");
          if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagName("ns2:return");
          
          if (returns.length < 3000) hasMoreData = false;

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

            if (placa || v.idVeiculo) {
              const uniqueKey = v.idVeiculo ? String(v.idVeiculo) : placa.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
              
              const normalizedVehicle = {
                ...v,
                idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
                placa: placa,
                plate: placa || v.idVeiculo || '',
                latitude: Number(v.latitude || 0),
                longitude: Number(v.longitude || 0),
                odometer: v.odometro ? parseFloat(v.odometro) : 0,
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

              // Manter apenas a posição mais recente
              const existing = allVehiclesMap.get(uniqueKey);
              if (!existing || new Date(normalizedVehicle.lastLocation.updatedAt).getTime() > new Date(existing.lastLocation.updatedAt).getTime()) {
                allVehiclesMap.set(uniqueKey, normalizedVehicle);
              }
            }
          }
          break; 
        } catch (error: any) {
          if (i === maxRetries) {
            console.error('Erro na integração Sascar (Final):', error);
            hasMoreData = false; 
            if (allVehiclesMap.size === 0 && (!plates || plates.length === 0)) throw error; 
          } else {
            const delay = 2000 * (i + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    // Fallback individual para veículos não encontrados no pacote
    if (plates && plates.length > 0) {
      const platesClean = plates.map(p => p.replace(/[^A-Z0-9]/gi, '').toUpperCase());
      const idsClean = plates.map(p => p.replace(/\D/g, '')).filter(p => p.length > 0);
      
      const missingTerms = plates.filter(p => {
        const pClean = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const pId = p.replace(/\D/g, '');
        
        const alreadyFound = Array.from(allVehiclesMap.values()).some(v => {
          const vPlaca = (v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
          const vId = (v.idVeiculo || '').replace(/\D/g, '');
          return (vPlaca && vPlaca === pClean) || (vId && vId === pId);
        });
        
        return !alreadyFound;
      });

      if (missingTerms.length > 0) {
        console.log(`[Sascar Sync] ${missingTerms.length} termos não encontrados no pacote. Buscando individualmente...`);
        const concurrencyLimit = 5;
        for (let i = 0; i < missingTerms.length; i += concurrencyLimit) {
          const chunk = missingTerms.slice(i, i + concurrencyLimit);
          await Promise.all(chunk.map(async (term) => {
            const v = await fetchIndividual(term);
            if (v) {
              const placa = v.placa || '';
              const uniqueKey = v.idVeiculo ? String(v.idVeiculo) : placa.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
              
              const normalizedVehicle = {
                ...v,
                idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
                placa: placa,
                plate: placa || v.idVeiculo || '',
                latitude: Number(v.latitude || 0),
                longitude: Number(v.longitude || 0),
                odometer: v.odometro ? parseFloat(v.odometro) : 0,
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
              
              const existing = allVehiclesMap.get(uniqueKey);
              if (!existing || new Date(normalizedVehicle.lastLocation.updatedAt).getTime() > new Date(existing.lastLocation.updatedAt).getTime()) {
                allVehiclesMap.set(uniqueKey, normalizedVehicle);
              }
            }
          }));
        }
      }
    }

    const vehicles = Array.from(allVehiclesMap.values());

    // Filter by plates if provided
    let filteredVehicles = vehicles;
    if (plates && plates.length > 0) {
      const platesClean = plates.map(p => p.replace(/[^A-Z0-9]/gi, '').toUpperCase());
      const idsClean = plates.map(p => p.replace(/\D/g, '')).filter(p => p.length > 0);
      
      filteredVehicles = vehicles.filter(v => {
        const placa = v.placa || v.plate || '';
        const idVeiculo = v.idVeiculo || '';
        if (!placa && !idVeiculo) return false;
        
        const vPlacaClean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const vIdClean = idVeiculo.replace(/\D/g, '');
        
        return platesClean.includes(vPlacaClean) || (vIdClean && idsClean.includes(vIdClean));
      });
    }
    
    return { success: true, data: filteredVehicles };
  }
};
