import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import soap from "soap";
import path from "path";
import fs from "fs";
import https from "https";
import axios from "axios";
import { db } from "./services/firebaseAdmin";
import { chooseAuthoritativeOdometer, parseTrackerOdometerKm } from "./lib/odometerUtils";

dotenv.config();

const logFile = path.join(process.cwd(), 'server-debug.log');
function logToFile(msg: string) {
  const time = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
  } catch (e) {
    // Ignore file write errors in serverless environments
  }
  console.log(msg);
}

// Sascar API credentials from environment variables
const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";
const SASCAR_WSDL_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';
const SASCAR_WSDL_LOCAL = path.join(process.cwd(), 'api', 'sascar-wsdl.xml');
const SASCAR_WSDL = SASCAR_WSDL_LOCAL; // Prefer local WSDL to avoid fetch errors

const soapClients = new Map<string, any>();

// Cache for Sascar API results to optimize chunked requests from frontend
let sascarCache = {
    idToPlateMap: new Map<string, string>(),
    latestPositions: new Map<string, any>(),
    lastFetchTime: 0,
    lastMapFetchTime: 0,
    fetchPromise: null as Promise<any> | null,
    reachedRealTimeOnce: false
};

let activeSascarCalls = 0;
const MAX_CONCURRENT_SASCAR_CALLS = 1; // Limitado a 1 para respeitar o limite estrito da Sascar por conta/gerenciadora
const sascarCallQueue: ((value: void | PromiseLike<void>) => void)[] = [];

const QUEUE_TIMEOUT_FOREGROUND = 15000; // 15s para foreground
const QUEUE_TIMEOUT_BACKGROUND = 180000; // 3 min para background

async function synchronizedSascarCall<T>(fn: () => Promise<T>, retries = 2, isBackground = false): Promise<T> {
  const queueTimeout = isBackground ? QUEUE_TIMEOUT_BACKGROUND : QUEUE_TIMEOUT_FOREGROUND;
  
  if (activeSascarCalls >= MAX_CONCURRENT_SASCAR_CALLS) {
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout na fila de sincronização Sascar')), queueTimeout)
    );
    
    let resolveFn: () => void;
    const queuePromise = new Promise<void>((resolve) => {
      resolveFn = resolve;
      sascarCallQueue.push(resolve);
    });

    try {
      await Promise.race([queuePromise, timeoutPromise]);
    } catch (err) {
      // Se deu timeout, remove da fila para não vazar memória
      const index = sascarCallQueue.indexOf(resolveFn!);
      if (index > -1) {
        sascarCallQueue.splice(index, 1);
      }
      throw err;
    }
  }

  activeSascarCalls++;
  try {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        const isNetworkError = error.code === 'ECONNRESET' || 
                               error.code === 'ETIMEDOUT' || 
                               error.message?.includes('socket disconnected') ||
                               error.message?.includes('socket hang up') ||
                               error.message?.includes('Client network socket disconnected') ||
                               error.message?.includes('ECONNRESET') ||
                               error.message?.includes('ETIMEDOUT') ||
                               error.message?.includes('TimeoutError');
        
        if (isNetworkError && attempt <= retries) {
          logToFile(`[Sascar] Network error (${error.message}), retrying attempt ${attempt}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // exponential backoff
        } else {
          throw error;
        }
      }
    }
  } finally {
    activeSascarCalls--;
    if (sascarCallQueue.length > 0) {
      const next = sascarCallQueue.shift();
      if (next) next();
    }
  }
}

async function getSoapClient(wsdl: string = SASCAR_WSDL, retries = 3): Promise<any> {
  const targetWsdl = (wsdl === SASCAR_WSDL_URL || wsdl === 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService') 
    ? SASCAR_WSDL_LOCAL 
    : wsdl;

  if (!soapClients.has(targetWsdl)) {
    logToFile(`[Sascar] Criando cliente SOAP para: ${targetWsdl}`);
    let attempt = 0;
    while (true) {
      try {
        const client = await soap.createClientAsync(targetWsdl, {
          disableCache: true
        });
        soapClients.set(targetWsdl, client);
        break;
      } catch (error: any) {
        attempt++;
        const isNetworkError = error.code === 'ECONNRESET' || 
                               error.code === 'ETIMEDOUT' || 
                               error.message?.includes('socket disconnected') ||
                               error.message?.includes('socket hang up') ||
                               error.message?.includes('Client network socket disconnected');
        
        if (isNetworkError && attempt <= retries) {
          logToFile(`[Sascar] Network error creating SOAP client (${error.message}), retrying attempt ${attempt}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          throw error;
        }
      }
    }
  }
  return soapClients.get(targetWsdl);
}

function parseSascarDate(dateStr: any): Date {
    if (!dateStr) return new Date(0);
    
    // If it's already a Date object, return it
    if (dateStr instanceof Date) return dateStr;
    
    // Ensure it's a string
    const str = String(dateStr);
    
    // Try native parsing first (handles ISO, RFC2822, etc.)
    const nativeDate = new Date(str);
    if (!isNaN(nativeDate.getTime())) return nativeDate;
    
    // Sascar format: "DD/MM/YYYY HH:MM:SS"
    if (str.includes('/')) {
        const parts = str.split(' ');
        if (parts.length >= 2) {
            const [date, time] = parts;
            const dateParts = date.split('/');
            if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const d = new Date(`${year}-${month}-${day}T${time}-03:00`);
                if (!isNaN(d.getTime())) return d;
            }
        }
    }
    
    // Handle "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.0"
    const normalized = str.replace(' ', 'T');
    const withOffset = normalized.includes('-03:00') ? normalized : normalized + '-03:00';
    const d = new Date(withOffset);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

function parseSascarNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return 0;
  
  // Se for hexadecimal (contém A-F ou é explicitamente hex)
  if (/^[0-9A-Fa-f]+$/.test(s) && (/[A-Fa-f]/.test(s) || s.length > 6)) {
    return parseInt(s, 16);
  }
  
  return parseFloat(s) || 0;
}

function parseSascarOptionalNumber(...values: any[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseSascarOdometerKm(vehicle: any): number {
  return parseTrackerOdometerKm(vehicle);
}

function normalizeVehicleKey(value: any): string {
  return String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function escapeXml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function parseSascarSoapReturns(xml: string): any[] {
  const fault = xml.match(/<[^>]*faultstring[^>]*>([\s\S]*?)<\/[^>]*faultstring>/i);
  if (fault?.[1]) throw new Error(`Erro Sascar: ${decodeXml(fault[1])}`);

  const items: any[] = [];
  const returnRegex = /<[^>]*return[^>]*>([\s\S]*?)<\/[^>]*return>/gi;
  let match: RegExpExecArray | null;

  while ((match = returnRegex.exec(xml))) {
    const content = decodeXml(match[1]);
    if (!content) continue;

    try {
      const parsed = JSON.parse(content);
      items.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      continue;
    } catch {
      const output: Record<string, any> = {};
      const tagRegex = /<[^:/>\s]*(?::)?([A-Za-z0-9_]+)[^>]*>([\s\S]*?)<\/[^:/>\s]*(?::)?\1>/g;
      let tagMatch: RegExpExecArray | null;
      while ((tagMatch = tagRegex.exec(content))) {
        const key = tagMatch[1];
        const value = decodeXml(tagMatch[2].replace(/<[^>]+>/g, ''));
        if (key && key !== 'return' && value !== '') output[key] = value;
      }
      if (Object.keys(output).length > 0) items.push(output);
    }
  }

  return items;
}

async function postSascarSoap(method: string, body: string, timeout = 60000): Promise<any[]> {
  const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:${method}>
         ${body}
      </int:${method}>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

  const response = await axios.post(
    'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService',
    soapEnvelope,
    {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: '""'
      },
      timeout,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }
  );

  return parseSascarSoapReturns(String(response.data || ''));
}

async function fetchLatestSascarPositionsManually(user: string, pass: string, timeout = 60000): Promise<any[]> {
  const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;
  return postSascarSoap('obterUltimaPosicaoTodosVeiculos', auth, timeout);
}

function addSascarPositionsToMap(items: any[], latestPositions: Map<string, any>, idToPlateMap: Map<string, string>) {
  for (const item of items) {
    let pos = item;
    if (typeof item === 'string') {
      try { pos = JSON.parse(item); } catch { continue; }
    }
    if (!pos || typeof pos !== 'object') continue;

    const sascarId = pos.idVeiculo ? String(pos.idVeiculo) : '';
    const plate = pos.placa ? String(pos.placa).trim().toUpperCase() : '';
    const mappedPlate = sascarId ? idToPlateMap.get(sascarId) : '';
    if (!pos.placa && mappedPlate) pos.placa = mappedPlate;

    const key = sascarId || normalizeVehicleKey(plate);
    if (!key) continue;

    const existing = latestPositions.get(key);
    const newDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
    const oldDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
    if (!existing || newDate >= oldDate) latestPositions.set(key, pos);
  }
}

async function findPublicVehicleDoc(vehicleId: string, plate?: string): Promise<any | null> {
  const targetId = String(vehicleId || '').trim();
  const targetKey = normalizeVehicleKey(targetId);
  const plateKey = normalizeVehicleKey(plate);

  if (targetId) {
    const directDoc = await db.collection("vehicles").doc(targetId).get();
    if (directDoc.exists) return directDoc;
  }

  const vehiclesSnap = await db.collection("vehicles").get();
  return vehiclesSnap.docs.find(doc => {
    const data = doc.data() as any;
    const keys = [
      doc.id,
      data.id,
      data.plate,
      data.fleetNumber,
      data.sascarCode
    ].map(normalizeVehicleKey);

    return keys.includes(targetKey) || (!!plateKey && keys.includes(plateKey));
  }) || null;
}

function parseSascarVehicle(item: any): any {
    if (typeof item === 'string') {
        try { return JSON.parse(item); } catch(e) { return null; }
    }
    return item;
}

/**
 * Função para drenar a fila FIFO da Sascar até alcançar o tempo real.
 * Descarta pacotes antigos e só começa a salvar quando atingir a data de hoje ou a fila esvaziar.
 */
async function drainSascarQueue(
    user: string, 
    pass: string, 
    client: any, 
    latestPositions: Map<string, any>, 
    idToPlateMap: Map<string, string>,
    maxIterations: number,
    fetchStartTime: number,
    currentTimeout: number,
    isBackground: boolean = false
) {
    logToFile(`[Sascar] INICIANDO DRENAGEM DA FILA FIFO...`);
    
    let total = 0;
    let iterations = 0;
    
    // Data alvo: Hoje (início do dia em BRT)
    const now = new Date();
    const brtFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: "America/Sao_Paulo",
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const brtParts = brtFormatter.formatToParts(now);
    const getPart = (type: string) => brtParts.find(p => p.type === type)?.value;
    
    const targetDateIso = `${getPart('year')}-${getPart('month')}-${getPart('day')}T00:00:00-03:00`;
    const targetDate = new Date(targetDateIso);
    
    // Também definimos um alvo de "agora" para tentar chegar o mais perto possível do tempo real
    const nowBrt = new Date(Date.now() - (15 * 60 * 1000)); // 15 minutos atrás
    
    logToFile(`[Sascar Drenagem] Alvo Real-Time (Hoje): ${targetDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);
    logToFile(`[Sascar Drenagem] Alvo Atual (15min atrás): ${nowBrt.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);
    
    let reachedRealTime = false;
    let reachedNow = false;
    let hasMore = true;

    while (hasMore && iterations < maxIterations) {
        if (Date.now() - fetchStartTime > currentTimeout) {
            logToFile(`[Sascar] Timeout iminente (${currentTimeout}ms). Interrompendo limpeza da fila na iteração ${iterations}.`);
            break;
        }
        
        iterations++;
        try {
            // Se for background, damos um pequeno respiro para não monopolizar o lock
            if (isBackground) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const result = await synchronizedSascarCall(async () => {
                const remainingTime = Math.max(5000, currentTimeout - (Date.now() - fetchStartTime));
                if (Date.now() - fetchStartTime > currentTimeout) return null;
                return client.obterPacotePosicoesJSONAsync({
                    usuario: user,
                    senha: pass,
                    quantidade: 5000
                }, { timeout: Math.min(60000, remainingTime) }).then(([res]: any) => res);
            }, 2, isBackground) as any;
            
            if (!result) {
                hasMore = false;
                break;
            }
            
            const frotaEmTexto = result ? (result.return || result.retornar) : null;
            if (frotaEmTexto) {
                let frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                
                if (frotaArray.length === 0) {
                    hasMore = false;
                    break;
                }

                const parseItem = (item: any) => {
                    if (typeof item === 'string') {
                        try { return JSON.parse(item); } catch(e) { return {}; }
                    }
                    return item;
                };

                const firstItem = parseItem(frotaArray[0]);
                const lastItem = parseItem(frotaArray[frotaArray.length - 1]);

                const firstDate = parseSascarDate(firstItem.dataPosicao || firstItem.dataHora);
                const lastDate = parseSascarDate(lastItem.dataPosicao || lastItem.dataHora);
                
                // Log de progresso da fila
                logToFile(`[Sascar Drenagem] Iteração ${iterations}/${maxIterations}: ${frotaArray.length} itens. Lote: ${firstDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})} até ${lastDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);

                // Verifica se já alcançamos pacotes de hoje
                if (lastDate >= targetDate) {
                    if (!reachedRealTime) {
                        logToFile(`[Sascar Drenagem] Alcançamos o tempo real hoje: ${lastDate.toISOString()}!`);
                    }
                    reachedRealTime = true;
                    sascarCache.reachedRealTimeOnce = true;
                }
                
                if (lastDate >= nowBrt) {
                    if (!reachedNow) {
                        logToFile(`[Sascar Drenagem] Alcançamos o tempo atual (últimos 15min): ${lastDate.toISOString()}!`);
                    }
                    reachedNow = true;
                }

                // Se já chegamos no "agora", podemos parar para economizar tempo e liberar a fila
                // No background, permitimos um pouco mais de iterações para garantir que limpamos bem, mas não 1500 se já estamos no real-time
                const stopThreshold = isBackground ? 50 : 20;
                if (reachedNow && iterations >= stopThreshold) {
                    logToFile(`[Sascar Drenagem] Alcançamos o tempo atual e já fizemos ${iterations} iterações. Parando para liberar a fila.`);
                    hasMore = false;
                }
                
                total += frotaArray.length;
                
                // Processa os itens do lote
                for (const item of frotaArray) {
                    let sv = item;
                    if (typeof item === 'string') {
                        try { sv = JSON.parse(item); if (typeof sv === 'string') sv = JSON.parse(sv); } catch (e) { continue; }
                    }
                    
                    const itemDate = parseSascarDate(sv.dataPosicao || sv.dataHora);
                    
                    // Sempre sobrescreve com a posição mais recente da fila (se for mais nova que a que já temos)
                    const idVeiculo = String(sv.idVeiculo || sv.id || "");
                    if (idVeiculo) {
                        if (!sv.placa && idToPlateMap.has(idVeiculo)) {
                            sv.placa = idToPlateMap.get(idVeiculo);
                        }
                        
                        const existing = latestPositions.get(idVeiculo);
                        const existingDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
                        
                        if (!existing || itemDate.getTime() > existingDate) {
                            latestPositions.set(idVeiculo, sv);
                        }
                    }
                }
                
                // Se retornou menos que 500, a fila esvaziou
                if (frotaArray.length < 500) {
                    logToFile(`[Sascar Drenagem] Fila esvaziada.`);
                    hasMore = false;
                }
            } else {
                logToFile(`[Sascar Drenagem] Fila vazia.`);
                hasMore = false;
            }
        } catch (error: any) {
            logToFile(`[Sascar Drenagem] Erro na iteração ${iterations}: ${error.message}`);
            hasMore = false; // Para em caso de erro para não ficar em loop infinito falhando
        }
    }
    
    logToFile(`[Sascar Drenagem] Finalizada. Total consumido: ${total} pacotes em ${iterations} iterações. Veículos únicos salvos: ${latestPositions.size}`);
    return { total_flushed: total, iterations, reachedRealTime };
}

let isAutomatedSyncing = false;

async function runSascarAutomation() {
    if (isAutomatedSyncing) return;
    isAutomatedSyncing = true;
    
    logToFile("[Automation] Iniciando tarefa agendada de sincronização Sascar (15 min)...");
    
    try {
        if (!db) {
            logToFile("[Automation] Erro: Firestore não inicializado.");
            isAutomatedSyncing = false;
            return;
        }

        // 1. Get tracker settings
        const settingsDoc = await db.collection("settings").doc("tracker").get();
        const settings = settingsDoc.data();
        
        if (!settings?.active || !settings?.user || !settings?.pass) {
            logToFile("[Automation] Sascar inativo ou não configurado no Firestore.");
            isAutomatedSyncing = false;
            return;
        }

        const user = settings.user;
        const pass = settings.pass;
        const wsdl = settings.apiUrl || SASCAR_WSDL;

        // 2. Get vehicles from Firestore
        const vehiclesSnap = await db.collection("vehicles").get();
        const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        const plateToDocId = new Map<string, string>();
        const sascarIdToDocId = new Map<string, string>();
        const docIdToVehicle = new Map<string, any>();
        
        vehicles.forEach(v => {
            docIdToVehicle.set(v.id, v);
            if (v.plate) plateToDocId.set(v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(), v.id);
            if (v.sascarCode) sascarIdToDocId.set(String(v.sascarCode), v.id);
        });

        if (plateToDocId.size === 0 && sascarIdToDocId.size === 0) {
            logToFile("[Automation] Nenhum veículo encontrado no Firestore para atualizar.");
            isAutomatedSyncing = false;
            return;
        }

        // 3. Fetch data from Sascar
        const client = await getSoapClient(wsdl);
        const latestPositions = new Map<string, any>();
        const idToPlateMap = new Map<string, string>();
        const fetchStartTime = Date.now();
        const currentTimeout = 600000; // 10 minutes for automation
        
        // First, get the vehicle list to map IDs to plates
        logToFile(`[Automation] Buscando lista de veículos Sascar...`);
        const vehicleListResult = await synchronizedSascarCall(async () => {
            return client.obterVeiculosJsonAsync({
                usuario: user,
                senha: pass,
                quantidade: 5000
            }, { timeout: 60000 }).then(([res]: any) => res);
        }, 2, true) as any;

        if (vehicleListResult) {
            const veiculosEmTexto = vehicleListResult.return || vehicleListResult.retornar;
            if (veiculosEmTexto) {
                let veiculosArray = [];
                try {
                    veiculosArray = typeof veiculosEmTexto === 'string' ? JSON.parse(veiculosEmTexto) : veiculosEmTexto;
                } catch(e) {}
                
                for (const item of veiculosArray) {
                    let v = item;
                    try { if (typeof item === 'string') v = JSON.parse(item); } catch(e) { continue; }
                    if (v.idVeiculo && v.placa) {
                        idToPlateMap.set(String(v.idVeiculo), String(v.placa).trim().toUpperCase());
                    }
                }
            }
        }

        // Now drain the queue to get latest positions
        await drainSascarQueue(user, pass, client, latestPositions, idToPlateMap, 1500, fetchStartTime, currentTimeout, true);

        // 4. Update Firestore
        logToFile(`[Automation] Atualizando ${latestPositions.size} posições no Firestore...`);
        let currentBatch = db.batch();
        let countInBatch = 0;
        let totalUpdated = 0;

        for (const [sascarId, pos] of latestPositions.entries()) {
            const plate = idToPlateMap.get(sascarId) || "";
            const normalizedPlate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            
            const docId = sascarIdToDocId.get(sascarId) || plateToDocId.get(normalizedPlate);
            
            if (plate === 'BSX3G15') {
                logToFile(`[Debug] Veículo BSX3G15 encontrado na Sascar. Dados: ${JSON.stringify(pos)}`);
            }
            
            if (docId) {
                const rawLat = parseSascarOptionalNumber(pos.latitude) ?? 0;
                const rawLng = parseSascarOptionalNumber(pos.longitude) ?? 0;
                
                const trackerOdometerKm = parseSascarOdometerKm(pos);
                const currentOdometerKm = Number(docIdToVehicle.get(docId)?.odometer || 0);
                const odometerKm = chooseAuthoritativeOdometer(currentOdometerKm, trackerOdometerKm);
                const rawInstantaneo = parseSascarNumber(pos.consumoInstantaneo || 0);
                const litrometer = parseSascarOptionalNumber(pos.litrometro, pos.litrometro2, pos.litrometroTotal, pos.totalLitros, pos.totalCombustivel);
                
                const speed = pos.velocidade ?? 0;
                const ignition = pos.ignicao === 'S' || pos.ignicao === true || pos.ignicao === '1';

                const updateData: any = {
                    odometer: odometerKm,
                    speed: Number(speed),
                    ignition: ignition,
                    consumoInstantaneo: rawInstantaneo,
                    lastLocation: {
                        lat: rawLat,
                        lng: rawLng,
                        address: pos.rua || '',
                        city: pos.cidade || '',
                        state: pos.uf || '',
                        updatedAt: parseSascarDate(pos.dataPosicao || pos.dataHora).toISOString()
                    }
                };
                if (litrometer !== undefined) updateData.litrometer = litrometer;

                currentBatch.update(db.collection("vehicles").doc(docId), updateData);
                countInBatch++;
                totalUpdated++;

                if (countInBatch >= 450) {
                    await currentBatch.commit();
                    currentBatch = db.batch();
                    countInBatch = 0;
                }
            }
        }

        if (countInBatch > 0) {
            await currentBatch.commit();
        }

        logToFile(`[Automation] Sincronização automática finalizada. ${totalUpdated} veículos atualizados.`);
        
        // Update last sync time in Firestore
        await db.collection("settings").doc("tracker").update({
            lastSyncAt: new Date().toISOString()
        });

        // Update global cache
        for (const [id, pos] of latestPositions.entries()) {
            sascarCache.latestPositions.set(id, pos);
        }
        sascarCache.idToPlateMap = idToPlateMap;
        sascarCache.lastFetchTime = Date.now();
        sascarCache.lastMapFetchTime = Date.now();

    } catch (error: any) {
        logToFile(`[Automation] Erro crítico na sincronização automática: ${error.message}`);
    } finally {
        isAutomatedSyncing = false;
    }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      logToFile(`[Server] ${req.method} ${req.url}`);
    }
    next();
  });

  // Sascar API credentials from environment variables
  const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
  const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";
  const SASCAR_WSDL_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';
  const SASCAR_WSDL_LOCAL = path.join(process.cwd(), 'api', 'sascar-wsdl.xml');
  const SASCAR_WSDL = SASCAR_WSDL_LOCAL; // Prefer local WSDL to avoid fetch errors

  const soapClients = new Map<string, any>();

  // Cache for Sascar API results to optimize chunked requests from frontend
  let sascarCache = {
      idToPlateMap: new Map<string, string>(),
      latestPositions: new Map<string, any>(),
      lastFetchTime: 0,
      lastMapFetchTime: 0,
      fetchPromise: null as Promise<void> | null,
      reachedRealTimeOnce: false // Flag para saber se já limpamos o backlog alguma vez
  };

  // --- SASCAR LOGIC CONSOLIDATED ---
  // The logic is now at the top level to avoid duplication and ensure single connection limit.

  app.get("/api/sascar/flush", async (req, res) => {
      const user = "JOMEDELOGTORREOPENTECH";
      const pass = "sascar";
      
      try {
          const client = await getSoapClient("https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl");
          const start = Date.now();
          // Para o flush manual, usamos mapas temporários
          const tempPositions = new Map();
          const tempMap = new Map();
          const stats = await drainSascarQueue(user, pass, client, tempPositions, tempMap, 20, start, 20 * 1000, false);
          res.json({ status: "success", ...stats, time_ms: Date.now() - start });
      } catch (error: any) {
          logToFile(`[Sascar] Erro no Flush endpoint: ${error.message}`);
          res.status(500).json({ status: "error", message: error.message });
      }
  });

  // Debug route to fetch raw XML from Sascar
  app.get("/api/sascar/debug", async (req, res) => {
    try {
      const wsdl = SASCAR_WSDL;
      const client = await getSoapClient(wsdl);
      
      const result = await synchronizedSascarCall(() => 
        client.obterPacotePosicoesJSONAsync({
          usuario: SASCAR_USER,
          senha: SASCAR_PASS,
          quantidade: 10
        }, { timeout: 60000 }).then(([res]: any) => res),
        2, false
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Sascar Debug Error:", error.message);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/sascar/vehicles", async (req, res) => {
    res.json({
      success: true,
      route: "/api/sascar/vehicles",
      message: "Endpoint Sascar ativo. Use POST para sincronizar veiculos."
    });
  });

  // Example route to fetch vehicles from Sascar
  app.post("/api/sascar/vehicles", async (req, res) => {
    logToFile("[Server] Received request for /api/sascar/vehicles");
    let user = SASCAR_USER;
    try {
      const platesQuery = req.body.plates;
      const trackerSettings = req.body.trackerSettings;
      
      logToFile(`[Server] Request body: ${JSON.stringify(req.body)}`);
      
      user = trackerSettings?.user || SASCAR_USER;
      const pass = trackerSettings?.pass || SASCAR_PASS;

      try {
        const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;
        const idToPlateMapDirect = new Map<string, string>();

        try {
          const vehicles = await synchronizedSascarCall(() =>
            postSascarSoap('obterVeiculosJson', `${auth}<quantidade>5000</quantidade>`, 60000),
            2,
            false
          );

          for (const item of vehicles) {
            const vehicle = parseSascarVehicle(item);
            if (vehicle?.idVeiculo && vehicle?.placa) {
              idToPlateMapDirect.set(String(vehicle.idVeiculo), String(vehicle.placa).trim().toUpperCase());
            }
          }
          logToFile(`[Sascar Direct] Mapa carregado com ${idToPlateMapDirect.size} veiculos.`);
        } catch (mapError: any) {
          logToFile(`[Sascar Direct] Falha ao carregar mapa de placas: ${mapError.message}`);
        }

        const rawPositions = await synchronizedSascarCall(() =>
          postSascarSoap('obterPacotePosicoesJSON', `${auth}<quantidade>5000</quantidade>`, 60000),
          2,
          false
        );

        const vehicleMapDirect = new Map<string, any>();
        for (const item of rawPositions) {
          const position = parseSascarVehicle(item);
          if (!position) continue;

          const sascarId = position.idVeiculo ? String(position.idVeiculo) : '';
          if (sascarId && !position.placa && idToPlateMapDirect.has(sascarId)) {
            position.placa = idToPlateMapDirect.get(sascarId);
          }

          const plateKey = normalizeVehicleKey(position.placa);
          const key = sascarId || plateKey;
          if (!key) continue;

          const existing = vehicleMapDirect.get(key);
          const currentDate = parseSascarDate(position.dataPosicao || position.dataHora).getTime();
          const existingDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
          if (!existing || currentDate >= existingDate) vehicleMapDirect.set(key, position);
        }

        const processedVehicles = Array.from(vehicleMapDirect.values()).map((v: any) => {
          const rawLat = parseSascarOptionalNumber(v.latitude) ?? 0;
          const rawLng = parseSascarOptionalNumber(v.longitude) ?? 0;
          const odometerKm = parseSascarOdometerKm(v);
          const rawInstantaneo = parseSascarNumber(v.consumoInstantaneo || 0);
          const litrometer = parseSascarOptionalNumber(v.litrometro, v.litrometro2, v.litrometroTotal, v.totalLitros, v.totalCombustivel);
          const speed = Number(v.velocidade ?? 0);
          const ignition = v.ignicao === 'S' || v.ignicao === true || v.ignicao === 'true' || v.ignicao === '1' || v.ignicao === 1;

          return {
            idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '',
            placa: v.placa || '',
            plate: v.placa || v.idVeiculo || '',
            latitude: rawLat,
            longitude: rawLng,
            odometer: odometerKm,
            speed,
            ignition,
            ...(litrometer !== undefined ? { litrometer } : {}),
            consumoInstantaneo: rawInstantaneo,
            lastLocation: {
              lat: rawLat,
              lng: rawLng,
              address: v.rua || '',
              city: v.cidade || '',
              state: v.uf || '',
              updatedAt: parseSascarDate(v.dataPosicao || v.dataHora).toISOString()
            }
          };
        });

        logToFile(`[Sascar Direct] Sincronizacao concluida com ${processedVehicles.length} veiculos.`);
        return res.json({
          success: true,
          message: `Sincronizacao concluida. ${processedVehicles.length} veiculos processados.`,
          data: processedVehicles,
          debug: {
            rawPositions: rawPositions.length,
            mappedPlates: idToPlateMapDirect.size
          }
        });
      } catch (directError: any) {
        logToFile(`[Sascar Direct] Falha no fluxo direto: ${directError.message}`);
        return res.status(502).json({
          success: false,
          error: "Falha ao comunicar com a Sascar",
          details: directError.message,
          debug: { userUsed: user, route: "direct-soap" }
        });
      }

      let client: any = null;
      
      let allVehiclesRaw: any[] = [];
      let latestPositions = new Map<string, any>();
      let idToPlateMap = new Map<string, string>();

      // Aumentar o timeout da requisição para evitar "Failed to fetch" no frontend
      const startTime = Date.now();
      const MAX_REQUEST_TIME = 45000; // Reduzido para 45s para garantir resposta antes do proxy (60s)
      const CACHE_TTL = 1 * 60 * 1000; // 1 minuto (reduzido de 5 para ser mais ágil)
      const MAP_CACHE_TTL = 60 * 60 * 1000; // 1 hora para o mapa de placas

      const formatDateBRT = (d: Date) => {
          const options = {
              timeZone: "America/Sao_Paulo",
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
          } as const;
          const formatter = new Intl.DateTimeFormat('en-GB', options);
          const parts = formatter.formatToParts(d);
          const getPart = (type: string) => parts.find(p => p.type === type)?.value;
          return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
      };

      const performFetch = async (isBackground: boolean = false) => {
          const fetchStartTime = Date.now();
          const currentTimeout = isBackground ? 600000 : MAX_REQUEST_TIME - 5000; // 10 minutos para background, margem de 5s para foreground

          // 0. Mapeamento de Placas (Cacheado por 1 hora)
          try {
              if (sascarCache.idToPlateMap.size === 0 || (Date.now() - sascarCache.lastMapFetchTime > MAP_CACHE_TTL)) {
                  logToFile(`[Sascar] Buscando lista de veículos para mapeamento de placas...`);
                  const result = await synchronizedSascarCall(async () => {
                      if (Date.now() - fetchStartTime > currentTimeout) return null;
                      const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;
                      return postSascarSoap('obterVeiculosJson', `${auth}<quantidade>5000</quantidade>`, 60000);
                  }, 2, isBackground) as any;
                  
                  if (!result) return;
                  
                  const veiculosArray = Array.isArray(result) ? result : [];
                  if (veiculosArray.length > 0) {
                      
                      for (const item of veiculosArray) {
                          let v = item;
                          if (typeof item === 'string') {
                              try { v = JSON.parse(item); } catch(e) { continue; }
                          }
                          if (v.idVeiculo && v.placa) {
                              idToPlateMap.set(String(v.idVeiculo), String(v.placa).trim().toUpperCase());
                          }
                      }
                      sascarCache.idToPlateMap = idToPlateMap;
                      sascarCache.lastMapFetchTime = Date.now();
                      logToFile(`[Sascar] Mapeamento concluído. ${idToPlateMap.size} veículos com placa mapeados.`);
                  }
              } else {
                  idToPlateMap = sascarCache.idToPlateMap;
              }
          } catch (error: any) {
              logToFile(`[Sascar] Erro ao buscar lista de veículos: ${error.message}`);
              // Fallback para o que já temos no cache
              idToPlateMap = sascarCache.idToPlateMap;
          }

      const queueIterationsSetting = Number(process.env.SASCAR_QUEUE_ITERATIONS ?? (isBackground ? 25 : 3));
      const MAX_QUEUE_ITERATIONS = Number.isFinite(queueIterationsSetting) && queueIterationsSetting >= 0
          ? queueIterationsSetting
          : (isBackground ? 25 : 3);
          
          if (!isBackground) {
              logToFile(`[Sascar] Foreground request: modo ultima posicao ativo, sem drenagem FIFO.`);
          } else {
              logToFile(`[Sascar] Background request: modo ultima posicao ativo, sem drenagem FIFO.`);
          }
          
          if (MAX_QUEUE_ITERATIONS > 0) {
              const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;
              const pacoteArray = await synchronizedSascarCall(async () => {
                  if (Date.now() - fetchStartTime > currentTimeout) return [];
                  return postSascarSoap('obterPacotePosicoesJSON', `${auth}<quantidade>5000</quantidade>`, Math.min(60000, currentTimeout));
              }, 2, isBackground) as any[];
              addSascarPositionsToMap(Array.isArray(pacoteArray) ? pacoteArray : [], latestPositions, idToPlateMap);
              if (latestPositions.size > 0) sascarCache.reachedRealTimeOnce = true;
              logToFile(`[Sascar] Pacote de posicoes retornou ${latestPositions.size} veiculos unicos.`);
          } else {
              logToFile(`[Sascar] Modo ultima posicao ativo: fila FIFO ignorada para evitar backlog e excesso de gravacoes.`);
              try {
                  const latestArray = await synchronizedSascarCall(async () => {
                      if (Date.now() - fetchStartTime > currentTimeout) return null;
                      return fetchLatestSascarPositionsManually(user, pass, 60000);
                  }, 2, isBackground) as any;

                  (Array.isArray(latestArray) ? latestArray : []).forEach((item: any) => {
                      let pos = item;
                      if (typeof item === 'string') {
                          try { pos = JSON.parse(item); } catch {}
                      }
                      if (!pos || typeof pos !== 'object') return;

                      const sascarId = pos.idVeiculo ? String(pos.idVeiculo) : '';
                      const plate = pos.placa ? String(pos.placa).trim().toUpperCase() : '';
                      const mappedPlate = sascarId ? idToPlateMap.get(sascarId) : '';
                      if (!pos.placa && mappedPlate) pos.placa = mappedPlate;

                      const key = sascarId || plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                      if (!key) return;

                      const existing = latestPositions.get(key);
                      const newDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
                      const oldDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
                      if (!existing || newDate >= oldDate) latestPositions.set(key, pos);
                  });
                  logToFile(`[Sascar] Ultima posicao todos retornou ${latestPositions.size} posicoes.`);
                  if (latestPositions.size > 0) {
                      sascarCache.reachedRealTimeOnce = true;
                  } else {
                      logToFile(`[Sascar] Ultima posicao retornou vazio. Usando pacote de posicoes como fallback curto.`);
                      await drainSascarQueue(
                          user,
                          pass,
                          client,
                          latestPositions,
                          idToPlateMap,
                          isBackground ? 25 : 3,
                          fetchStartTime,
                          currentTimeout,
                          isBackground
                      );
                  }
              } catch (error: any) {
                  logToFile(`[Sascar] Falha em obterUltimaPosicaoTodosVeiculos: ${error.message}`);
                  logToFile(`[Sascar] Usando pacote de posicoes como fallback apos falha da ultima posicao.`);
                  await drainSascarQueue(
                      user,
                      pass,
                      client,
                      latestPositions,
                      idToPlateMap,
                      isBackground ? 25 : 3,
                      fetchStartTime,
                      currentTimeout,
                      isBackground
                  );
              }
          }
          
          // Update cache
          sascarCache.idToPlateMap = idToPlateMap;
          
          // Merge new positions with existing cache instead of overwriting
          for (const [id, pos] of latestPositions.entries()) {
              const existing = sascarCache.latestPositions.get(id);
              const newDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
              const oldDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
              if (!existing || newDate > oldDate) {
                  sascarCache.latestPositions.set(id, pos);
              }
          }
          
          sascarCache.lastFetchTime = Date.now();
      };

      if (sascarCache.lastFetchTime > 0) {
          // Temos cache!
          if (Date.now() - sascarCache.lastFetchTime > CACHE_TTL) {
              // Cache expirou, inicia fetch em background (Stale-while-revalidate)
              if (!sascarCache.fetchPromise) {
                  logToFile(`[Sascar] Cache expirado (idade: ${Math.round((Date.now() - sascarCache.lastFetchTime)/1000)}s). Iniciando fetch em background...`);
                  sascarCache.fetchPromise = performFetch(true).finally(() => {
                      sascarCache.fetchPromise = null;
                  });
              }
          } else {
              logToFile(`[Sascar] Usando cache válido (idade: ${Math.round((Date.now() - sascarCache.lastFetchTime)/1000)}s)`);
          }
          idToPlateMap = sascarCache.idToPlateMap;
          latestPositions = new Map(sascarCache.latestPositions); // clone
      } else {
          // Sem cache, precisa esperar
          if (!sascarCache.fetchPromise) {
              sascarCache.fetchPromise = performFetch(false).finally(() => {
                  sascarCache.fetchPromise = null;
              });
          }
          logToFile(`[Sascar] Sem cache. Aguardando fetch global...`);
          try {
              // Espera pelo fetch global, mas com um timeout de segurança para não travar a requisição do usuário
              const fetchPromiseWithTimeout = Promise.race([
                  sascarCache.fetchPromise,
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout aguardando fetch global')), 30000))
              ]);
              await fetchPromiseWithTimeout;
          } catch (e: any) {
              logToFile(`[Sascar] Aviso no fetch global: ${e.message}. Retornando cache parcial se disponível.`);
          }
          idToPlateMap = sascarCache.idToPlateMap;
          latestPositions = new Map(sascarCache.latestPositions); // clone
      }

      // 2. Se placas específicas foram pedidas, busca histórico apenas para as que NÃO vieram na fila
      if (platesQuery && Array.isArray(platesQuery) && platesQuery.length > 0) {
          // Create reverse map for plate -> id
          const plateToIdMap = new Map<string, string>();
          for (const [id, plate] of idToPlateMap.entries()) {
              plateToIdMap.set(plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(), id);
          }

          const missingPlates = platesQuery.map(p => String(p).trim()).filter(p => {
              const cleanP = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
              const id = plateToIdMap.get(cleanP) || p;
              
              const pos = latestPositions.get(id);
              if (!pos) return true; // Não está na fila
              
              // Se ainda não limpamos o backlog (FIFO) pelo menos uma vez hoje, 
              // forçamos a busca por histórico para garantir dados de hoje.
              if (!sascarCache.reachedRealTimeOnce) {
                  return true;
              }
              
              // Se a posição for mais antiga que 30 minutos, tenta buscar o histórico para garantir tempo real
              const posDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
              const thirtyMinsAgo = Date.now() - (30 * 60 * 1000);
              if (posDate < thirtyMinsAgo) return true;
              
              return false;
          });
          
          if (missingPlates.length > 0) {
              const fetchHistoryForPlates = async (platesToFetch: string[], isBackground: boolean) => {
                  logToFile(`[Sascar] Buscando histórico para ${platesToFetch.length} veículos (Background: ${isBackground})...`);
                  
                  const now = new Date();
                  // Busca apenas as últimas 4 horas para ser mais ágil e evitar payloads gigantes
                  const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
                  const dataInicio = formatDateBRT(fourHoursAgo);
                  const dataFinal = formatDateBRT(now);

                  // Processa em lotes paralelos menores para velocidade
                  const BATCH_SIZE = 3; // Reduzido para diminuir pressão no lock e evitar timeouts
                  for (let i = 0; i < platesToFetch.length; i += BATCH_SIZE) {
                      // No foreground, paramos mais cedo para garantir que o histórico tenha tempo de rodar
                      const bufferTime = 12000; // Aumentado para 12s de margem
                      if (!isBackground && i > 0 && Date.now() - startTime >= MAX_REQUEST_TIME - bufferTime) {
                          logToFile(`[Sascar] Tempo esgotado para histórico no foreground. Interrompendo no lote ${i}/${platesToFetch.length}`);
                          break;
                      }
                      
                      const batch = platesToFetch.slice(i, i + BATCH_SIZE);
                      await Promise.all(batch.map(async (idStr) => {
                          const cleanP = idStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                          const resolvedId = plateToIdMap.get(cleanP) || idStr;
                          const idVeiculo = parseInt(resolvedId, 10);
                          if (isNaN(idVeiculo)) return;

                          try {
                              const result = await synchronizedSascarCall(async () => {
                                  if (!isBackground && Date.now() - startTime >= MAX_REQUEST_TIME) return null;
                                  return client.obterPacotePosicaoHistoricoAsync({
                                      usuario: user,
                                      senha: pass,
                                      idVeiculo: idVeiculo,
                                      dataInicio: dataInicio,
                                      dataFinal: dataFinal
                                  }, { timeout: 60000 }).then(([res]: any) => res);
                              }, 2, isBackground) as any;

                              if (!result) return;

                              const frotaEmTexto = result ? (result.return || result.retornar) : null;
                              if (frotaEmTexto) {
                                  const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                                  if (frotaArray.length > 0) {
                                      // Pega a posição mais recente do histórico
                                      let latest = null;
                                      let latestTime = 0;
                                      
                                      for (const p of frotaArray) {
                                          let parsedP = p;
                                          if (typeof p === 'string') {
                                              try { parsedP = JSON.parse(p); } catch(e) { continue; }
                                          }
                                          const pTime = parseSascarDate(parsedP.dataPosicao || parsedP.dataHora).getTime();
                                          if (pTime > latestTime) {
                                              latestTime = pTime;
                                              latest = parsedP;
                                          }
                                      }

                                      if (latest) {
                                          if (!latest.placa && idToPlateMap.has(String(idVeiculo))) {
                                              latest.placa = idToPlateMap.get(String(idVeiculo));
                                          }
                                          
                                          // Só atualiza se for mais novo que o que já temos
                                          const existing = latestPositions.get(String(idVeiculo));
                                          const existingTime = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
                                          
                                          if (latestTime > existingTime) {
                                              if (!isBackground) {
                                                  latestPositions.set(String(idVeiculo), latest);
                                              }
                                              sascarCache.latestPositions.set(String(idVeiculo), latest);
                                          }
                                      }
                                  }
                              }
                          } catch (error: any) {
                              logToFile(`[Sascar] Erro histórico ${idVeiculo}: ${error.message}`);
                          }
                      }));
                  }
              };

              // Tenta buscar o histórico para no máximo 5 ausentes por vez no foreground (reduzido de 20 para evitar timeouts)
              const foregroundPlates = missingPlates.slice(0, 5);
              const backgroundPlates = missingPlates.slice(5);

              // Race foreground fetch against the remaining time
              const timeRemaining = MAX_REQUEST_TIME - (Date.now() - startTime);
              if (timeRemaining > 0) {
                  await Promise.race([
                      fetchHistoryForPlates(foregroundPlates, false),
                      new Promise(resolve => setTimeout(() => {
                          logToFile(`[Sascar] Timeout iminente (${timeRemaining}ms). Interrompendo espera do histórico no foreground.`);
                          resolve(null);
                      }, timeRemaining))
                  ]);
              } else {
                  logToFile(`[Sascar] Tempo esgotado antes de iniciar busca de histórico no foreground.`);
              }

              // Inicia fetch em background para o restante das placas
              if (backgroundPlates.length > 0) {
                  fetchHistoryForPlates(backgroundPlates, true).catch(err => {
                      logToFile(`[Sascar] Erro no fetch de histórico em background: ${err.message}`);
                  });
              }
          }
      }

      // 3. Retornar os dados que temos no cache
      allVehiclesRaw = Array.from(latestPositions.values());
      logToFile(`[Sascar] Sincronização de dados concluída. Total de veículos para processar: ${allVehiclesRaw.length}`);
      
      const vehicleMap = new Map<string, any>();
      
      logToFile(`[Sascar] Processando ${allVehiclesRaw.length} itens brutos...`);

      allVehiclesRaw.forEach((rawItem: any) => {
          try {
              let parsed = rawItem;
              if (typeof rawItem === 'string' && (rawItem.trim().startsWith('{') || rawItem.trim().startsWith('['))) {
                  try {
                      parsed = JSON.parse(rawItem);
                  } catch (e) {}
              }
              
              const itemsToProcess = Array.isArray(parsed) ? parsed : [parsed];
              
              itemsToProcess.forEach(item => {
                  const vehicleData = parseSascarVehicle(item);
                  if (!vehicleData) return;

                  // Normalizar placa para chave (remover hífens e espaços)
                  const fullPlate = vehicleData.placa ? vehicleData.placa.replace(/[^A-Z0-9-]/gi, '').toUpperCase() : '';
                  const sascarId = vehicleData.idVeiculo ? vehicleData.idVeiculo.toString() : '';
                  
                  // Usar ID como chave primária se disponível, senão placa
                  const key = sascarId || fullPlate;
                  
                  if (!key) return;

                  const existing = vehicleMap.get(key);
                  
                  // Comparação de datas para manter apenas a mais recente
                  const currentDate = vehicleData.dataPosicaoIso ? new Date(vehicleData.dataPosicaoIso).getTime() : 0;
                  const existingDate = existing?.dataPosicaoIso ? new Date(existing.dataPosicaoIso).getTime() : 0;

                  if (!existing || currentDate > existingDate) {
                      vehicleMap.set(key, vehicleData);
                  }
              });
          } catch (e: any) {
              logToFile(`Erro ao processar item bruto da Sascar: ${e.message}`);
          }
      });

      const rawValues = Array.from(vehicleMap.values());
      
      // --- DEBUG: Inspeção do Payload Bruto ---
      logToFile(`[Sascar Debug] Inspecionando payload bruto antes do mapeamento (${rawValues.length} veículos):`);
      rawValues.slice(0, 5).forEach((v: any, index: number) => {
          const rawDate = v.dataPosicao || v.dataHora || 'NENHUMA_DATA';
          logToFile(`[Sascar Debug] Veículo ${index + 1} | Placa/ID: ${v.placa || v.idVeiculo} | dataPosicao bruta: ${rawDate}`);
      });
      // ----------------------------------------

      const processedVehicles = rawValues.map((v: any, index: number) => {
          // Extração com fallback para 0 caso o valor venha nulo/undefined
          const rawLat = parseSascarOptionalNumber(v.latitude) ?? 0;
          const rawLng = parseSascarOptionalNumber(v.longitude) ?? 0;
          
          // Log raw values for debugging issues
          if (v.placa === 'BSX3G15' || v.idVeiculo === 'BSX3G15') {
            console.log(`[Sascar Debug] Veículo BSX3G15 | Raw: odometroExato=${v.odometroExato}, odometro=${v.odometro}, consumoInstantaneo=${v.consumoInstantaneo}`);
          }
          if (index < 5) {
            logToFile(`[Sascar Debug] Veículo ${v.placa || v.idVeiculo} | Raw: odometroExato=${v.odometroExato}, odometro=${v.odometro}, consumoInstantaneo=${v.consumoInstantaneo}`);
          }

          const odometerKm = parseSascarOdometerKm(v);
          const rawInstantaneo = parseSascarNumber(v.consumoInstantaneo || 0);
          const litrometer = parseSascarOptionalNumber(v.litrometro, v.litrometro2, v.litrometroTotal, v.totalLitros, v.totalCombustivel);

          const speed = Number(v.velocidade ?? 0);
          const ignition = v.ignicao === 'S' || v.ignicao === true || v.ignicao === 'true' || v.ignicao === 1;

          return {
              idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
              placa: v.placa || '',
              plate: v.placa || v.idVeiculo || '',
              
              // Regra estrita: Envolver em Number()
              latitude: rawLat,
              longitude: rawLng,
              odometer: odometerKm,
              speed: speed,
              ignition: ignition,
              ...(litrometer !== undefined ? { litrometer } : {}),
              consumoInstantaneo: rawInstantaneo,
              
              lastLocation: {
                  lat: rawLat,
                  lng: rawLng,
                  address: v.rua || '',
                  city: v.cidade || '',
                  state: v.uf || '',
                  updatedAt: parseSascarDate(v.dataPosicao || v.dataHora).toISOString()
              }
          };
      });

      logToFile(`[Sascar] Sincronização finalizada: ${processedVehicles.length} veículos únicos encontrados.`);

      res.json({
        success: true,
        message: `Sincronização concluída. ${processedVehicles.length} veículos processados.`,
        data: processedVehicles
      });
    } catch (error: any) {
      logToFile(`Error in /api/sascar/vehicles: ${error.message}`);
      res.status(500).json({ 
          success: false, 
          error: "Falha ao comunicar com a Sascar",
          details: error.message,
          debug: { userUsed: user }
      });
    }
  });

  app.get("/api/public/vehicle-rg", async (req, res) => {
    try {
      const vehicleId = String(req.query.id || req.query.vehicleRg || '').trim();
      const plate = String(req.query.plate || '').trim();
      if (!vehicleId) {
        return res.status(400).json({ success: false, error: "Veículo inválido" });
      }

      const vehicleDoc = await findPublicVehicleDoc(vehicleId, plate);

      if (!vehicleDoc) {
        return res.status(404).json({ success: false, error: "Veículo não encontrado" });
      }

      const rawVehicle = { ...vehicleDoc.data(), id: vehicleDoc.id } as any;
      const vehicle = {
        id: rawVehicle.id,
        plate: rawVehicle.plate || '',
        model: rawVehicle.model || '',
        brand: rawVehicle.brand || '',
        type: rawVehicle.type || '',
        year: rawVehicle.year || '',
        color: rawVehicle.color || '',
        fuelType: rawVehicle.fuelType || '',
        fleetNumber: rawVehicle.fleetNumber || '',
        odometer: rawVehicle.odometer || 0,
        litrometer: rawVehicle.litrometer || 0,
        telemetryRollingAvgKml: rawVehicle.telemetryRollingAvgKml || 0,
        lastLocation: rawVehicle.lastLocation || undefined,
        ignition: rawVehicle.ignition || false,
        ownership: rawVehicle.ownership || 'OWNED',
        revisionIntervalKm: rawVehicle.revisionIntervalKm || 0,
        lastPreventiveKm: rawVehicle.lastPreventiveKm || 0,
        lastPreventiveDate: rawVehicle.lastPreventiveDate || '',
        branchId: rawVehicle.branchId || ''
      };

      const fuelSnap = await db.collection("fuel_entries").where("vehicleId", "==", rawVehicle.id).get();
      const fuelEntries = fuelSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
        .slice(0, 30);

      const ordersSnap = await db.collection("service_orders").where("vehicleId", "==", rawVehicle.id).get();
      const serviceOrders = ordersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
        .slice(0, 30);

      res.json({ success: true, vehicle, fuelEntries, serviceOrders });
    } catch (error: any) {
      logToFile(`Error in /api/public/vehicle-rg: ${error.message}`);
      res.status(500).json({ success: false, error: "Falha ao carregar RG do veículo" });
    }
  });

  app.post("/api/public/vehicle-rg/service-request", async (req, res) => {
    try {
      const vehicleId = String(req.query.id || req.query.vehicleRg || '').trim();
      const plate = String(req.query.plate || '').trim();
      const {
        driverName,
        title,
        details,
        preferredDate,
        urgency,
        problemType,
        driverPhone,
        informedOdometer,
        vehicleStopped,
        driverLocation,
        checklist,
        attachments
      } = req.body || {};

      if (!vehicleId || !String(driverName || '').trim() || !String(title || '').trim() || !String(details || '').trim()) {
        return res.status(400).json({ success: false, error: "Dados obrigatórios ausentes" });
      }

      const vehicleDoc = await findPublicVehicleDoc(vehicleId, plate);

      if (!vehicleDoc) {
        return res.status(404).json({ success: false, error: "Veículo não encontrado" });
      }

      const vehicle = { ...vehicleDoc.data(), id: vehicleDoc.id } as any;
      const ordersSnap = await db.collection("service_orders").orderBy("orderNumber", "desc").limit(1).get();
      const nextOrderNumber = ordersSnap.empty ? 1 : ((ordersSnap.docs[0].data() as any).orderNumber || 0) + 1;
      const now = new Date().toISOString();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const detailLines = [
        'Solicitação enviada pelo RG público do veículo.',
        `Motorista: ${String(driverName).trim()}`,
        driverPhone ? `Telefone: ${String(driverPhone).trim()}` : '',
        problemType ? `Tipo informado: ${String(problemType).trim()}` : '',
        informedOdometer ? `KM informado pelo motorista: ${Number(informedOdometer).toLocaleString('pt-BR')}` : '',
        driverLocation ? `Local informado: ${String(driverLocation).trim()}` : '',
        `Veículo parado: ${vehicleStopped ? 'SIM' : 'NÃO'}`,
        `Urgência: ${String(urgency || 'NORMAL')}`,
        checklist?.status ? `Checklist pre-viagem: ${String(checklist.status)}` : '',
        Array.isArray(checklist?.criticalItems) && checklist.criticalItems.length ? `Itens com alerta: ${checklist.criticalItems.join(', ')}` : '',
        checklist?.observations ? `Observacoes do checklist: ${String(checklist.observations).trim()}` : '',
        '',
        String(details).trim()
      ].filter(Boolean).join('\n');

      const order = {
        id,
        orderNumber: nextOrderNumber,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate || '',
        title: String(title).trim(),
        details: detailLines,
        status: 'PENDENTE',
        serviceType: 'INTERNAL',
        date: preferredDate || now.split('T')[0],
        odometer: Number(informedOdometer) || vehicle.odometer || 0,
        branchId: vehicle.branchId || '',
        driverName: String(driverName).trim(),
        contactName: String(driverName).trim(),
        ...(Array.isArray(attachments) ? { attachments } : {}),
        createdBy: `RG Público - ${String(driverName).trim()}`,
        createdAt: now
      };

      await db.collection("service_orders").doc(id).set(order);
      await db.collection("logs").doc(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).set({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action: "Agendamento pelo RG Público",
        details: `${vehicle.plate}: ${order.title} solicitado por ${order.driverName}`,
        module: "VEHICLES",
        date: now,
        user: order.driverName
      });

      res.json({ success: true, order });
    } catch (error: any) {
      logToFile(`Error in /api/public/vehicle-rg service-request: ${error.message}`);
      res.status(500).json({ success: false, error: "Falha ao criar solicitação de serviço" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      
      // Iniciar automação Sascar a cada 15 minutos para ser mais ágil sem sobrecarregar
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      void FIFTEEN_MINUTES;
      // Removal of automatic interval as requested by user
      // setInterval(runSascarAutomation, FIFTEEN_MINUTES);
      logToFile("[Server] Automação Sascar agendada para cada 15 minutos.");
      
      // Executar uma vez após 10 segundos do boot para garantir que os dados estejam frescos
      // setTimeout(runSascarAutomation, 10000);
    });
  }

  return app;
}

const appPromise = startServer();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
