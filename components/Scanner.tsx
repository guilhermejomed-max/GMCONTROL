import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle, Type, Loader2, ScanLine, Zap, ZapOff } from 'lucide-react';

// Declaration for Tesseract.js loaded via CDN
declare global {
  interface Window {
    Tesseract: any;
    webkitAudioContext: typeof AudioContext;
  }
}

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  mode?: 'QR' | 'OCR';
}

export const Scanner: React.FC<ScannerProps> = ({ 
  onScan, 
  onClose, 
  title = "Scanner", 
  placeholder = "Digite o código...",
  mode = 'QR'
}) => {
  const [scanMode, setScanMode] = useState<'QR' | 'OCR'>(mode);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  
  // Refs
  const scannerRef = useRef<any>(null);
  const isScanningRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerDivId = useRef(`reader-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (scanMode === 'OCR' && !window.Tesseract) {
      setError("Módulo de OCR (Tesseract) não carregado. Verifique sua conexão.");
    }
  }, [scanMode]);

  // --- AUDIO & HAPTIC FEEDBACK ---
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => beep(ctx));
      } else {
        beep(ctx);
      }

      function beep(context: AudioContext) {
          const osc = context.createOscillator();
          const gain = context.createGain();
    
          osc.connect(gain);
          gain.connect(context.destination);
    
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, context.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
    
          gain.gain.setValueAtTime(0.1, context.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.1);
    
          osc.start(context.currentTime);
          osc.stop(context.currentTime + 0.15);
      }
    } catch (e) {
      console.error("Beep failed:", e);
    }
  };

  const triggerFeedback = () => {
    if (navigator.vibrate) navigator.vibrate(200);
    playBeep();
  };

  const handleSuccess = (text: string) => {
    if (scannerRef.current) {
        scannerRef.current.pause();
    }
    triggerFeedback();
    onScan(text);
  };

  // --- IMAGE PRE-PROCESSING FOR OCR ---
  const preprocessImage = (canvas: HTMLCanvasElement) => {
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     const width = canvas.width;
     const height = canvas.height;
     const imageData = ctx.getImageData(0, 0, width, height);
     const data = imageData.data;

     // Contrast Factor
     const contrast = 50; 
     const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

     for (let i = 0; i < data.length; i += 4) {
        let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        gray = factor * (gray - 128) + 128;
        gray = gray > 140 ? 255 : 0; // Binarization

        data[i] = gray;     // R
        data[i + 1] = gray; // G
        data[i + 2] = gray; // B
     }

     ctx.putImageData(imageData, 0, 0);
  };

  // --- TOGGLE TORCH ---
  const toggleTorch = async () => {
    if (scanMode === 'OCR' && videoRef.current && videoRef.current.srcObject) {
       const track = (videoRef.current.srcObject as MediaStream).getVideoTracks()[0];
       if (track) {
          try {
             await track.applyConstraints({
                advanced: [{ torch: !torchOn }] as any
             });
             setTorchOn(!torchOn);
          } catch (err) {
             console.error("Torch error", err);
          }
       }
    }
  };

  // --- QR CODE LOGIC ---
  useEffect(() => {
    if (scanMode !== 'QR') return;

    let isMounted = true;
    const elementId = readerDivId.current;
    
    const stopScannerInstance = async (instance: any) => {
        if (!instance) return;
        
        try {
            if (isScanningRef.current) {
                await instance.stop();
                isScanningRef.current = false;
            }
        } catch(err) {
            console.warn("Scanner stop warning:", err);
        } finally {
            try { instance.clear(); } catch(e) {}
        }
    };

    const startScanner = async () => {
        // Delay to allow DOM render and previous camera cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;
        
        const element = document.getElementById(elementId);
        if (!element) return;

        // Cleanup any residual instance
        if (scannerRef.current) {
            stopScannerInstance(scannerRef.current);
            scannerRef.current = null;
        }

        try {
            const { Html5Qrcode: Html5QrcodeClass } = await import('html5-qrcode');
            const html5QrCode = new Html5QrcodeClass(elementId);
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => { 
                    if (isMounted) handleSuccess(decodedText); 
                },
                () => {} 
            );
            
            if (isMounted) {
                isScanningRef.current = true;
            } else {
                // If unmounted during start, stop immediately
                stopScannerInstance(html5QrCode);
            }
        } catch (err: any) {
            console.warn("QR Start Error:", err);
            if (isMounted) {
                // Fallback attempt for OverconstrainedError (often camera resolution/type issue)
                if (err?.name === 'OverconstrainedError' && scannerRef.current) {
                     try {
                        await scannerRef.current.start(
                            { facingMode: "user" },
                            { fps: 10, qrbox: 250 },
                            (text) => { if(isMounted) handleSuccess(text) },
                            () => {}
                        );
                        if(isMounted) isScanningRef.current = true;
                     } catch(e) {
                         setError("Erro ao iniciar câmera.");
                     }
                } else {
                    setError("Erro de acesso à câmera. Verifique permissões.");
                }
            }
        }
    };

    startScanner();

    return () => {
        isMounted = false;
        // Clean up immediately on unmount
        if (scannerRef.current) {
            const instance = scannerRef.current;
            stopScannerInstance(instance);
            scannerRef.current = null;
        }
    };
  }, [scanMode]);

  // --- OCR LOGIC ---
  useEffect(() => {
    if (scanMode !== 'OCR') return;
    
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
               facingMode: 'environment',
               width: { ideal: 1920 },
               height: { ideal: 1080 }
            } 
          });
        } catch (e) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          // @ts-ignore
          setHasTorch(!!capabilities.torch);
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao iniciar câmera para OCR.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanMode]);


  // --- MANUAL INPUT ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               {scanMode === 'QR' ? <ScanLine className="h-5 w-5 text-blue-600" /> : <Camera className="h-5 w-5 text-purple-600" />}
               {title}
             </h3>
             <p className="text-xs text-slate-500">Aponte a câmera para ler o código</p>
          </div>
          <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Area */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          
          {scanMode === 'QR' && (
             <div id={readerDivId.current} className="w-full h-full"></div>
          )}

          {scanMode === 'OCR' && (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 border-[40px] border-black/50 z-10 pointer-events-none">
                 <div className="w-full h-full border-2 border-white/50 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500"></div>
                 </div>
              </div>

              {hasTorch && (
                 <button 
                   onClick={toggleTorch}
                   className={`absolute top-4 right-4 z-20 p-3 rounded-full shadow-lg transition-all ${torchOn ? 'bg-yellow-400 text-white' : 'bg-black/50 text-white border border-white/30'}`}
                 >
                    {torchOn ? <ZapOff className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                 </button>
              )}

              <button 
                onClick={async () => {
                    if (!videoRef.current || !canvasRef.current || !window.Tesseract) return;
                    setLoading(true);
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        preprocessImage(canvas);

                        const dataUrl = canvas.toDataURL('image/png');
                        try {
                            const { data: { text } } = await window.Tesseract.recognize(dataUrl, 'eng', { 
                               logger: () => {},
                               tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ', 
                               tessedit_pageseg_mode: '7' 
                            });
                            
                            const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                            if (cleaned.length >= 3) {
                                if(confirm(`Texto detectado: ${cleaned}. Confirmar?`)) handleSuccess(cleaned);
                            } else {
                                setError("Texto ilegível. Melhore a luz ou aproxime.");
                            }
                        } catch (err) {
                            setError("Erro no reconhecimento OCR.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }}
                disabled={loading}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white h-16 w-16 rounded-full border-4 border-slate-200 flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                 {loading ? <Loader2 className="h-8 w-8 text-purple-600 animate-spin" /> : <div className="h-12 w-12 bg-purple-600 rounded-full border-2 border-white"></div>}
              </button>
            </>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 p-6 text-center">
               <div className="bg-white p-4 rounded-xl max-w-xs">
                 <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                 <p className="text-slate-800 font-medium mb-2">{error}</p>
                 <button onClick={() => { setError(null); setScanMode(scanMode); }} className="text-sm text-blue-600 font-bold underline">Tentar Novamente</button>
               </div>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="p-4 bg-white border-t border-slate-100">
           <form onSubmit={handleManualSubmit} className="flex gap-2">
             <div className="relative flex-1">
               <Type className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
               <input 
                 type="text" 
                 value={manualCode}
                 onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                 placeholder={placeholder}
                 className="w-full pl-10 pr-4 py-2.5 bg-white text-black border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
               />
             </div>
             <button 
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-slate-900/10"
             >
               OK
             </button>
           </form>

           <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 justify-center">
              <button 
                onClick={() => setScanMode('QR')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${scanMode === 'QR' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <ScanLine className="h-3 w-3" /> Ler QR Code
              </button>
              <button 
                onClick={() => setScanMode('OCR')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${scanMode === 'OCR' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Camera className="h-3 w-3" /> Ler Placa (OCR)
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
