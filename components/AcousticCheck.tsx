
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, Activity, AlertTriangle, CheckCircle2, RefreshCw, Volume2, X, Zap, Radio, Terminal, Gauge } from 'lucide-react';

interface AcousticCheckProps {
  // Props can be expanded if we need to link to specific tires later
}

type ScanStatus = 'IDLE' | 'LISTENING' | 'ANALYZING' | 'RESULT';
type SoundResult = 'GOOD_PRESSURE' | 'LOW_PRESSURE' | 'STRUCTURAL_ISSUE' | 'INCONCLUSIVE';

export const AcousticCheck: React.FC<AcousticCheckProps> = () => {
  const [status, setStatus] = useState<ScanStatus>('IDLE');
  const [result, setResult] = useState<SoundResult>('INCONCLUSIVE');
  const [peakFrequency, setPeakFrequency] = useState(0);
  const [estimatedPsi, setEstimatedPsi] = useState(0);
  const [isSimulation, setIsSimulation] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioNode | null>(null); 
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simulationTimeoutRef = useRef<any>(null);
  
  // Ref para controle de estado dentro do loop de animacao (evita closures antigas)
  const statusRef = useRef<ScanStatus>('IDLE');

  // --- CONFIGURACAO FISICA ---
  // Heuristica: Pneus de caminhao (110 PSI) ressoam tipicamente entre 400Hz e 500Hz quando batidos com barra.
  // Fator de conversao linear simplificado para demonstracao: 1 Hz ~= 0.24 PSI
  // Ex: 460Hz * 0.24 = 110.4 PSI
  const PSI_CONVERSION_FACTOR = 0.24; 
  
  // Threshold para Time Domain (Amplitude). 128 e o zero.
  // Diferenca > 30 significa um som audivel razoavel.
  const HIT_AMPLITUDE_THRESHOLD = 30; 

  const updateStatus = (newStatus: ScanStatus) => {
      setStatus(newStatus);
      statusRef.current = newStatus;
  };

  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
    
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        if ((sourceRef.current as any).stop) {
            try { (sourceRef.current as any).stop(); } catch(e) {}
        }
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Reset refs
    sourceRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
  }, []);

  const startSimulation = () => {
      console.log("Iniciando Modo Simulacao (Fallback)");
      setIsSimulation(true);
      updateStatus('LISTENING');

      try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          analyserRef.current = analyser;

          // 1. Ruido de Fundo
          const bgOsc = audioCtx.createOscillator();
          bgOsc.type = 'sawtooth';
          bgOsc.frequency.value = 50; 
          const bgGain = audioCtx.createGain();
          bgGain.gain.value = 0.05; 
          
          bgOsc.connect(bgGain);
          bgGain.connect(analyser);
          bgOsc.start();
          
          sourceRef.current = bgOsc; 

          // 2. Agendar "Batida" Aleatoria para simular variedade
          const randomDelay = 1500 + Math.random() * 2000;
          simulationTimeoutRef.current = setTimeout(() => {
              if (audioContextRef.current?.state === 'closed') return;

              const hitOsc = audioCtx.createOscillator();
              const hitGain = audioCtx.createGain();
              
              // Simula frequencias reais de pneus: 
              // 450Hz+ (Bom), 300-400Hz (Baixo), <200Hz (Muito Baixo/Estrutural)
              const rand = Math.random();
              let freq = 460; // 110 PSI
              
              if (rand < 0.3) freq = 320 + (Math.random() * 50); // ~80 PSI
              else if (rand > 0.8) freq = 180 + (Math.random() * 50); // ~45 PSI
              else freq = 440 + (Math.random() * 60); // ~105-120 PSI

              hitOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
              hitOsc.type = 'triangle';
              
              // Envelope de amplitude forte para ser detectado pelo analisador
              hitGain.gain.setValueAtTime(0, audioCtx.currentTime);
              hitGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.05);
              hitGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

              hitOsc.connect(hitGain);
              hitGain.connect(analyser); 

              hitOsc.start(audioCtx.currentTime);
              hitOsc.stop(audioCtx.currentTime + 0.5);
          }, randomDelay);

          drawVisualizer();

      } catch (e) {
          console.error("Simulation failed", e);
          updateStatus('IDLE');
      }
  };

  const startListening = async () => {
    setIsSimulation(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         throw new Error("API getUserMedia nao suportada");
      }

      updateStatus('LISTENING');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096; // Maior resolucao de frequencia
      analyser.smoothingTimeConstant = 0.5; // Resposta mais rapida
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      drawVisualizer();
    } catch (err: any) {
      console.warn("Microphone access failed, falling back to simulation:", err);
      startSimulation();
    }
  };

  const analyzeSoundData = (timeBuffer: Uint8Array) => {
      // 1. Detectar Pico de Amplitude (Impacto) usando Time Domain
      let maxAmp = 0;
      for (let i = 0; i < timeBuffer.length; i++) {
          const val = Math.abs(timeBuffer[i] - 128); // 128 e o silencio (zero crossing)
          if (val > maxAmp) maxAmp = val;
      }

      if (maxAmp > HIT_AMPLITUDE_THRESHOLD) {
          // HIT DETECTED!
          // Mudamos status imediatamente para parar novas deteccoes
          updateStatus('ANALYZING');
          
          // Aguarda um curto periodo para capturar a ressonancia (decay) do som
          setTimeout(() => {
             processFrequency();
          }, 100); 
      }
  };

  const processFrequency = () => {
      if (!analyserRef.current || !audioContextRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const freqBuffer = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(freqBuffer);

      finalizeAnalysis(freqBuffer);
  };

  const finalizeAnalysis = (buffer: Uint8Array) => {
      stopListening();
      updateStatus('ANALYZING'); // Garante estado UI
      
      // 2. Determinar Frequencia Dominante
      // Ignoramos frequencias muito baixas (<100Hz) que costumam ser ruido de manuseio ou ambiente
      let maxFreqIndex = 0;
      let maxFreqVal = 0;
      
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const fftSize = analyserRef.current?.fftSize || 4096;
      const binSize = sampleRate / fftSize;
      
      const startBin = Math.floor(100 / binSize); // Comeca em ~100Hz
      const endBin = Math.floor(1200 / binSize);  // Vai ate ~1200Hz

      for (let i = startBin; i < endBin; i++) {
          if (buffer[i] > maxFreqVal) {
              maxFreqVal = buffer[i];
              maxFreqIndex = i;
          }
      }

      const dominantHz = maxFreqIndex * binSize;
      
      // Validacao: Se o pico for muito fraco, pode ser ruido
      if (maxFreqVal < 30) { // Volume muito baixo no espectro
          setResult('INCONCLUSIVE');
          updateStatus('RESULT');
          return;
      }

      // 3. Converter Hz para PSI (Modelo Matematico Simplificado)
      const calculatedPsi = Math.round(dominantHz * PSI_CONVERSION_FACTOR);
      
      setPeakFrequency(Math.round(dominantHz));
      setEstimatedPsi(calculatedPsi);

      // 4. Classificar Resultado
      setTimeout(() => {
          if (calculatedPsi >= 95) {
              setResult('GOOD_PRESSURE');
          } else if (calculatedPsi >= 70) {
              setResult('LOW_PRESSURE');
          } else {
              setResult('STRUCTURAL_ISSUE'); // Som muito grave/abafado
          }
          updateStatus('RESULT');
      }, 800); 
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') return;
      
      rafRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteFrequencyData(dataArray);
      analyserRef.current.getByteTimeDomainData(timeArray);

      // Check detection using Ref to avoid stale closure state
      if (statusRef.current === 'LISTENING') {
          analyzeSoundData(timeArray);
      }

      // Desenhar Espectro
      canvasCtx.fillStyle = '#020617'; 
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.0;
      let barHeight;
      let x = 0;

      // Desenhar apenas frequencias relevantes (ate 2000Hz) para visualizacao mais limpa
      const relevantBins = Math.floor(2000 / (audioContextRef.current.sampleRate / analyserRef.current.fftSize));

      for (let i = 0; i < relevantBins; i++) {
        barHeight = dataArray[i] * 1.5; 

        // Cores dinamicas baseadas na intensidade e frequencia
        const r = barHeight + (25 * (i / relevantBins));
        const g = 250 * (i / relevantBins);
        const b = 150;

        canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  useEffect(() => {
      return () => stopListening();
  }, [stopListening]);

  const resetScanner = () => {
      updateStatus('IDLE');
      setResult('INCONCLUSIVE');
      setPeakFrequency(0);
      setEstimatedPsi(0);
      setIsSimulation(false);
  };

  const getResultUI = () => {
      switch (result) {
          case 'GOOD_PRESSURE':
              return { 
                  color: 'bg-green-600', 
                  icon: <CheckCircle2 className="h-16 w-16 text-white"/>,
                  text: 'Pressao Normal',
                  sub: 'Padrao rodoviario detectado.'
              };
          case 'LOW_PRESSURE':
              return { 
                  color: 'bg-yellow-500', 
                  icon: <AlertTriangle className="h-16 w-16 text-white"/>,
                  text: 'Pressao Baixa',
                  sub: 'Som grave. Calibragem necessaria.'
              };
          case 'STRUCTURAL_ISSUE':
              return { 
                  color: 'bg-red-600', 
                  icon: <Activity className="h-16 w-16 text-white"/>,
                  text: 'Critico / Oco',
                  sub: 'Som abafado. Possivel separacao ou furo.'
              };
          default:
              return { color: 'bg-slate-500', icon: null, text: 'Inconclusivo', sub: 'Tente novamente.' };
      }
  };

  const resultUI = getResultUI();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6 animate-in fade-in zoom-in-95 duration-500">
        
        {/* HEADER */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-full shadow-2xl shadow-blue-900/20 mb-4 border border-slate-800">
                <Radio className="h-8 w-8 text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Smart Sonic™</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Analise Espectral de Frequencia</p>
        </div>

        {/* MAIN VISUALIZER AREA */}
        <div className="relative w-full max-w-lg aspect-square bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden border-4 border-slate-900 flex flex-col items-center justify-center group">
            
            {/* IDLE STATE */}
            {status === 'IDLE' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/80 backdrop-blur-sm p-8 text-center">
                    <Zap className="h-12 w-12 text-yellow-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Pronto para Escanear</h3>
                    <p className="text-sm text-slate-400 mb-8">Aproxime o celular (30cm) e bata firmemente no centro da banda de rodagem com uma barra ou martelo.</p>
                    <button 
                        onClick={startListening}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-3 active:scale-95"
                    >
                        <Mic className="h-6 w-6"/> Captar Som
                    </button>
                </div>
            )}

            {/* ANALYZING STATE */}
            {status === 'ANALYZING' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/90 backdrop-blur-md">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-blue-400 font-bold animate-pulse text-lg">Calculando Ressonancia...</p>
                </div>
            )}

            {/* RESULT STATE */}
            {status === 'RESULT' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 p-8 text-center animate-in zoom-in duration-300 ${resultUI.color}`}>
                    <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-sm shadow-xl">
                        {resultUI.icon}
                    </div>
                    <h2 className="text-3xl font-black text-white mb-1">{resultUI.text}</h2>
                    <p className="text-white/90 font-medium text-sm mb-6">{resultUI.sub}</p>
                    
                    {/* PSI DISPLAY */}
                    <div className="bg-black/30 px-8 py-4 rounded-2xl mb-6 border border-white/20 backdrop-blur-md">
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                            <Gauge className="h-3 w-3"/> Estimativa
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                            <p className="text-6xl font-mono font-black text-white tracking-tighter">{estimatedPsi}</p>
                            <span className="text-xl font-bold text-white/80">PSI</span>
                        </div>
                        <p className="text-[9px] text-white/50 mt-1 font-mono">{peakFrequency} Hz Detected</p>
                    </div>

                    <button 
                        onClick={resetScanner}
                        className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black shadow-xl hover:bg-slate-100 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="h-5 w-5"/> Nova Leitura
                    </button>
                </div>
            )}

            {/* CANVAS VISUALIZER */}
            <canvas ref={canvasRef} width="500" height="500" className="w-full h-full opacity-80" />
            
            {/* OVERLAY HINT (LISTENING) */}
            {status === 'LISTENING' && (
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none flex flex-col items-center gap-2">
                    <p className="text-white font-black text-xl animate-pulse uppercase tracking-widest drop-shadow-lg">Aguardando Batida...</p>
                    {isSimulation && (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30 flex items-center gap-1">
                            <Terminal className="h-3 w-3"/> MODO SIMULACAO
                        </span>
                    )}
                </div>
            )}
        </div>

        <p className="mt-8 text-xs text-slate-400 text-center max-w-md">
            <strong>Aviso Legal:</strong> A estimativa de PSI via analise acustica e baseada em heuristicas de frequencia. Fatores como tipo de solo, ferramenta de batida e modelo do pneu podem alterar o som. Utilize sempre um manometro calibrado para decisoes finais.
        </p>
    </div>
  );
};
