import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import soap from "soap";
import path from "path";
// ATENÇÃO: O pacote 'fs' e o 'vite' (estático) foram removidos do topo para a Vercel não capotar!

dotenv.config();

// VERCEL É SERVERLESS (Não tem disco rígido). 
// Usar fs derruba o servidor instantaneamente. Substituímos para console.log.
function logToFile(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

process.on('uncaughtException', (err) => {
  logToFile(`Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logToFile(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

function parseSascarDate(dateStr: any): Date {
    if (!dateStr) return new Date();
    
    if (dateStr instanceof Date) {
        if (isNaN(dateStr.getTime())) return new Date();
        // @ts-ignore
        if (dateStr._isCorrected) return dateStr;
        dateStr.setHours(dateStr.getHours() + 3);
        // @ts-ignore
        dateStr._isCorrected = true;
        return dateStr;
    }

    if (typeof dateStr === 'number') {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    const str = String(dateStr).trim();
    if (!str) return new Date();

    if (/^\d+$/.test(str)) {
        const d = new Date(parseInt(str));
        return isNaN(d.getTime()) ? new Date() : d;
    }

    if (str.includes('T') && !isNaN(new Date(str).getTime())) {
        return new Date(str);
    }

    const cleanStr = str.split('.')[0];
    const parts = cleanStr.match(/(\d+)/g);
    if (parts && parts.length >= 3) {
        let day, month, year, hour = "00", min = "00", sec = "00";
        if (parts[0].length === 4) {
            year = parts[0]; month = parts[1]; day = parts[2];
        } else {
            day = parts[0]; month = parts[1]; year = parts[2];
        }
        if (parts.length >= 6) {
            hour = parts[3]; min = parts[4]; sec = parts[5];
        }
        try {
            const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}-03:00`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) return d;
        } catch (e) {}
    }

    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;

    return new Date(0); 
}

function parseSascarVehicle(raw: any): any {
    let sv = raw;
    if (typeof sv === 'string') {
        try {
            sv = JSON.parse(sv);
            if (typeof sv === 'string') sv = JSON.parse(sv);
        } catch(e) { return null; }
    }

    if (typeof sv === 'object' && sv !== null) {
        let lat = parseFloat(sv.latitude || sv.lat || sv.posicao?.latitude || 0);
        let lng = parseFloat(sv.longitude || sv.lng || sv.posicao?.longitude || 0);

        if (Math.abs(lat) > 1000) lat /= 1000000;
        if (Math.abs(lng) > 1000) lng /= 1000000;

        if (lat > 0) lat = -lat;
        if (lng > 0) lng = -lng;

        const result = {
            ...sv,
            idVeiculo: sv.idVeiculo || sv.id,
            placa: sv.placa || sv.plate,
            latitude: lat,
            longitude: lng,
            odometroExato: parseFloat(sv.odometroExato || sv.odometro || 0),
            dataPosicaoIso: parseSascarDate(sv.dataPosicao || sv.dataHora).toISOString()
        };
        return result;
    }
    return null;
}

// -------------------------------------------------------------
// ESTADO GLOBAL DO SERVIDOR (Cache e Locks)
// -------------------------------------------------------------
const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";
const SASCAR_WSDL_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';

// Na Vercel, forçamos o uso da URL online para evitar crash de "Arquivo não encontrado".
const isProduction = process.env.NODE_ENV === "production";
const SASCAR_WSDL = isProduction ? SASCAR_WSDL_URL : path.join(process.cwd(), 'sascar-wsdl.xml');

const soapClients = new Map<string, any>();
let sascarRequestLock = Promise.resolve();

let sascarCache = {
    idToPlateMap: new Map<string, string>(),
    latestPositions: new Map<string, any>(),
    lastFetchTime: 0,
    lastMapFetchTime: 0,
    fetchPromise: null as Promise<void> | null
};

async function synchronizedSascarCall<T>(fn: () => Promise<T>, timeoutMs: number = 90000): Promise<T> {
  const currentLock = sascarRequestLock;
  let resolveLock: () => void;
  sascarRequestLock = new Promise((resolve) => {
    resolveLock = resolve as () => void;
  });

  try {
    await currentLock;
    await new Promise(resolve => setTimeout(resolve, 50));
    return await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Sascar API Timeout")), timeoutMs))
    ]) as T;
  } finally {
    if (resolveLock) resolveLock();
  }
}

async function getSoapClient(wsdl: string) {
  const targetWsdl = (wsdl === SASCAR_WSDL_URL || wsdl.includes('sascar-wsdl')) ? SASCAR_WSDL : wsdl;
  
  if (!soapClients.has(targetWsdl)) {
    logToFile(`[Sascar] Criando cliente SOAP para: ${targetWsdl}`);
    try {
      const client = await soap.createClientAsync(targetWsdl, { disableCache: false });
      soapClients.set(targetWsdl, client);
    } catch (error: any) {
      logToFile(`[Sascar] Erro ao criar cliente SOAP (${targetWsdl}): ${error.message}`);
      throw error;
    }
  }
  return soapClients.get(targetWsdl);
}

async function drainSascarQueue(
    user: string, pass: string, client: any, latestPositions: Map<string, any>, 
    idToPlateMap: Map<string, string>, maxIterations: number, fetchStartTime: number, currentTimeout: number
) {
    logToFile(`[Sascar] INICIANDO DRENAGEM DA FILA FIFO...`);
    let total = 0; let iterations = 0;
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let reachedRealTime = false; let hasMore = true;

    while (hasMore && iterations < maxIterations) {
        if (Date.now() - fetchStartTime > currentTimeout) break;
        
        iterations++;
        try {
            const result = await synchronizedSascarCall(() => 
                client.obterPacotePosicoesJSONAsync({ usuario: user, senha: pass, quantidade: 5000 }, { timeout: 60000 }).then(([res]: any) => res)
            ) as any;
            
            const frotaEmTexto = result ? (result.return || result.retornar) : null;
            if (frotaEmTexto) {
                let frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                
                if (frotaArray.length > 0) {
                    const lastItemStr = frotaArray[frotaArray.length - 1];
                    let lastItem = lastItemStr;
                    if (typeof lastItem === 'string') {
                        try { lastItem = JSON.parse(lastItem); } catch(e) { lastItem = {}; }
                    }
                    const lastDate = parseSascarDate(lastItem.dataPosicao || lastItem.dataHora);
                    if (lastDate >= targetDate) reachedRealTime = true;
                }
                
                total += frotaArray.length;
                for (const item of frotaArray) {
                    let sv = item;
                    if (typeof item === 'string') {
                        try { sv = JSON.parse(item); if (typeof sv === 'string') sv = JSON.parse(sv); } catch (e) { continue; }
                    }
                    const idVeiculo = String(sv.idVeiculo || sv.id || "");
                    if (idVeiculo) {
                        if (!sv.placa && idToPlateMap.has(idVeiculo)) sv.placa = idToPlateMap.get(idVeiculo);
                        latestPositions.set(idVeiculo, sv);
                    }
                }
                if (frotaArray.length < 500) hasMore = false;
            } else {
                hasMore = false;
            }
        } catch (error: any) {
            logToFile(`[Sascar Drenagem] Erro: ${error.message}`);
            hasMore = false; 
        }
    }
    return { total_flushed: total, iterations, reachedRealTime };
}

// -------------------------------------------------------------
// INICIALIZAÇÃO DO APP EXPRESS (BACKEND)
// -------------------------------------------------------------
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  logToFile(`[Server] ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/sascar/vehicles", async (req, res) => {
  logToFile("[Server] Received request for /api/sascar/vehicles");
  let user = SASCAR_USER;
  try {
    const platesQuery = req.body.plates;
    const trackerSettings = req.body.trackerSettings;
    user = trackerSettings?.user || SASCAR_USER;
    const pass = trackerSettings?.pass || SASCAR_PASS;
    const wsdl = trackerSettings?.wsdl || SASCAR_WSDL;
    
    const client = await getSoapClient(wsdl);
    let allVehiclesRaw: any[] = [];
    let latestPositions = new Map<string, any>();
    let idToPlateMap = new Map<string, string>();

    const startTime = Date.now();
    const MAX_REQUEST_TIME = 90000; 
    const CACHE_TTL = 2 * 60 * 1000; 
    const MAP_CACHE_TTL = 60 * 60 * 1000; 

    const formatDateBRT = (d: Date) => {
        const brtDate = new Date(d.getTime() - (3 * 60 * 60 * 1000));
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${brtDate.getFullYear()}-${pad(brtDate.getMonth() + 1)}-${pad(brtDate.getDate())} ${pad(brtDate.getHours())}:${pad(brtDate.getMinutes())}:${pad(brtDate.getSeconds())}`;
    };

    const performFetch = async (isBackground: boolean = false) => {
        const fetchStartTime = Date.now();
        const currentTimeout = isBackground ? 600000 : MAX_REQUEST_TIME; 

        try {
            if (sascarCache.idToPlateMap.size === 0 || (Date.now() - sascarCache.lastMapFetchTime > MAP_CACHE_TTL)) {
                const result = await synchronizedSascarCall(() => 
                    client.obterVeiculosJsonAsync({ usuario: user, senha: pass, quantidade: 5000 }, { timeout: 60000 }).then(([res]: any) => res)
                ) as any;
                
                const veiculosEmTexto = result ? (result.return || result.retornar) : null;
                if (veiculosEmTexto) {
                    let veiculosArray = [];
                    if (typeof veiculosEmTexto === 'string') {
                        try { veiculosArray = JSON.parse(veiculosEmTexto); } catch(e) {}
                    } else if (Array.isArray(veiculosEmTexto)) {
                        veiculosArray = veiculosEmTexto;
                    }
                    
                    for (const item of veiculosArray) {
                        let v = item;
                        if (typeof item === 'string') { try { v = JSON.parse(item); } catch(e) { continue; } }
                        if (v.idVeiculo && v.placa) {
                            idToPlateMap.set(String(v.idVeiculo), String(v.placa).trim().toUpperCase());
                        }
                    }
                    sascarCache.idToPlateMap = idToPlateMap;
                    sascarCache.lastMapFetchTime = Date.now();
                }
            } else {
                idToPlateMap = sascarCache.idToPlateMap;
            }
        } catch (error: any) {
            idToPlateMap = sascarCache.idToPlateMap;
        }

        const MAX_QUEUE_ITERATIONS = isBackground ? 100 : 0; 
        await drainSascarQueue(user, pass, client, latestPositions, idToPlateMap, MAX_QUEUE_ITERATIONS, fetchStartTime, currentTimeout);
        
        sascarCache.idToPlateMap = idToPlateMap;
        sascarCache.latestPositions = new Map(latestPositions);
        sascarCache.lastFetchTime = Date.now();
    };

    if (sascarCache.lastFetchTime > 0) {
        if (Date.now() - sascarCache.lastFetchTime > CACHE_TTL) {
            if (!sascarCache.fetchPromise) {
                sascarCache.fetchPromise = performFetch(true).finally(() => { sascarCache.fetchPromise = null; });
            }
        }
        idToPlateMap = sascarCache.idToPlateMap;
        latestPositions = new Map(sascarCache.latestPositions);
    } else {
        if (!sascarCache.fetchPromise) {
            sascarCache.fetchPromise = performFetch(false).finally(() => { sascarCache.fetchPromise = null; });
        }
        try { await sascarCache.fetchPromise; } catch (e: any) {}
        idToPlateMap = sascarCache.idToPlateMap;
        latestPositions = new Map(sascarCache.latestPositions);
    }

    if (platesQuery && Array.isArray(platesQuery) && platesQuery.length > 0) {
        const plateToIdMap = new Map<string, string>();
        for (const [id, plate] of idToPlateMap.entries()) {
            plateToIdMap.set(plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(), id);
        }

        const missingPlates = platesQuery.map(p => String(p).trim()).filter(p => {
            const cleanP = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            const id = plateToIdMap.get(cleanP) || p;
            return !latestPositions.has(id);
        });
        
        if (missingPlates.length > 0) {
            const MAX_HISTORICAL_FETCHES = 3;
            const platesToFetch = missingPlates.slice(0, MAX_HISTORICAL_FETCHES);
            const now = new Date();
            const dataInicio = formatDateBRT(new Date(now.getTime() - 24 * 60 * 60 * 1000));
            const dataFinal = formatDateBRT(now);

            const fetchPromises = platesToFetch.map(async (idStr) => {
                const cleanP = idStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                const resolvedId = plateToIdMap.get(cleanP) || idStr;
                const idVeiculo = parseInt(resolvedId, 10);
                if (isNaN(idVeiculo)) return;

                try {
                    const result = await synchronizedSascarCall(() => 
                        client.obterPacotePosicaoHistoricoAsync({
                            usuario: user, senha: pass, idVeiculo: idVeiculo, dataInicio: dataInicio, dataFinal: dataFinal
                        }, { timeout: 60000 }).then(([res]: any) => res)
                    ) as any;

                    const frotaEmTexto = result ? (result.return || result.retornar) : null;
                    if (frotaEmTexto) {
                        const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                        if (frotaArray.length > 0) {
                            let latest = frotaArray[frotaArray.length - 1];
                            if (typeof latest === 'string') { try { latest = JSON.parse(latest); } catch(e) {} }
                            if (!latest.placa && idToPlateMap.has(String(idVeiculo))) latest.placa = idToPlateMap.get(String(idVeiculo));
                            latestPositions.set(String(idVeiculo), latest);
                            sascarCache.latestPositions.set(String(idVeiculo), latest);
                        }
                    }
                } catch (error: any) {}
            });

            const timeRemaining = MAX_REQUEST_TIME - (Date.now() - startTime);
            if (timeRemaining > 0) {
                await Promise.race([
                    Promise.all(fetchPromises),
                    new Promise(resolve => setTimeout(resolve, timeRemaining))
                ]);
            }
        }
    }

    allVehiclesRaw = Array.from(latestPositions.values());
    const vehicleMap = new Map<string, any>();

    allVehiclesRaw.forEach((rawItem: any) => {
        try {
            let parsed = rawItem;
            if (typeof rawItem === 'string' && (rawItem.trim().startsWith('{') || rawItem.trim().startsWith('['))) {
                try { parsed = JSON.parse(rawItem); } catch (e) {}
            }
            const itemsToProcess = Array.isArray(parsed) ? parsed : [parsed];
            itemsToProcess.forEach(item => {
                const vehicleData = parseSascarVehicle(item);
                if (!vehicleData) return;
                const plate = vehicleData.placa ? vehicleData.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '';
                const sascarId = vehicleData.idVeiculo ? vehicleData.idVeiculo.toString() : '';
                const key = sascarId || plate;
                if (!key) return;

                const existing = vehicleMap.get(key);
                const currentDate = vehicleData.dataPosicaoIso ? new Date(vehicleData.dataPosicaoIso).getTime() : 0;
                const existingDate = existing?.dataPosicaoIso ? new Date(existing.dataPosicaoIso).getTime() : 0;

                if (!existing || currentDate > existingDate) vehicleMap.set(key, vehicleData);
            });
        } catch (e: any) {}
    });

    const rawValues = Array.from(vehicleMap.values());
    const processedVehicles = rawValues.map((v: any) => {
        const rawLat = v.latitude ?? 0; const rawLng = v.longitude ?? 0;
        const rawOdometer = v.odometroExato ?? v.odometro ?? 0;

        return {
            idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', placa: v.placa || '', plate: v.placa || v.idVeiculo || '',
            latitude: Number(rawLat), longitude: Number(rawLng), odometer: Number(rawOdometer),
            lastLocation: {
                lat: Number(rawLat), lng: Number(rawLng), address: v.rua || '', city: v.cidade || '',
                state: v.uf || '', updatedAt: parseSascarDate(v.dataPosicao || v.dataHora).toISOString()
            }
        };
    });

    res.json({ success: true, message: `Sincronização concluída.`, data: processedVehicles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Falha ao comunicar com a Sascar", details: error.message });
  }
});

// -------------------------------------------------------------
// CONFIGURAÇÃO DE ROTEAMENTO FINAL
// -------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  // O SEGREDO ESTÁ AQUI: Importação Dinâmica!
  // A Vercel ignora isso, mas o seu PC consegue ler.
  import("vite").then(({ createServer: createViteServer }) => {
    createViteServer({ server: { middlewareMode: true }, appType: "spa" }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => { console.log(`Rodando localmente`); });
    });
  });
} else {
  app.use(express.static("dist"));
}

export default app;
