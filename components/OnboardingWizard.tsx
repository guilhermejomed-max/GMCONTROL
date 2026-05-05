import React, { useState } from 'react';
import { Tire, Vehicle, TireStatus } from '../types';
import { Truck, Disc, ArrowRight, CheckCircle2, Star, Box, Rocket } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
  onAddVehicle: (vehicle: Vehicle) => Promise<void>;
  onAddTire: (tire: Tire) => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onAddVehicle, onAddTire }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Quick Forms State
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [tireBrand, setTireBrand] = useState('Michelin');
  const [tireModel, setTireModel] = useState('X Multi');
  const [tireSize, setTireSize] = useState('295/80 R22.5');

  const handleCreateVehicle = async () => {
    if (!vehiclePlate) return;
    setLoading(true);
    try {
      const v: Vehicle = {
        id: Date.now().toString(),
        plate: vehiclePlate.toUpperCase(),
        model: 'Modelo Padrao',
        type: 'CAVALO',
        axles: 2,
        odometer: 0,
        totalCost: 0
      };
      await onAddVehicle(v);
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTire = async () => {
    setLoading(true);
    try {
      const [width, rest] = tireSize.split('/');
      const [profile, rimStr] = rest.split(' R');
      
      const t: Tire = {
        id: Date.now().toString(),
        orgId: 'initial',
        fireNumber: '001',
        brand: tireBrand,
        model: tireModel,
        width: Number(width),
        profile: Number(profile),
        rim: Number(rimStr),
        status: TireStatus.NEW,
        location: 'Estoque',
        quantity: 1,
        price: 2500,
        originalTreadDepth: 18,
        currentTreadDepth: 18,
        pressure: 110,
        targetPressure: 110,
        totalKms: 0,
        firstLifeKms: 0,
        retreadKms: 0,
        totalInvestment: 2500,
        costPerKm: 0,
        retreadCount: 0,
        dot: '0124',
        history: [{ date: new Date().toISOString(), action: 'CADASTRADO', details: 'Primeiro pneu do sistema (Onboarding)' }]
      };
      await onAddTire(t);
      setStep(4);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="p-8 text-center animate-in slide-in-from-right duration-300">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Rocket className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Bem-vindo ao GM Control!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
              Seu sistema profissional de gestao de frotas esta pronto. Vamos configurar o basico em menos de 1 minuto?
            </p>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              Comecar Agora <ArrowRight className="h-5 w-5" />
            </button>
            <button 
              onClick={onComplete}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              Pular configuracao (Ir para Dashboard)
            </button>
          </div>
        )}

        {/* Step 2: First Vehicle */}
        {step === 2 && (
          <div className="p-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Seu Primeiro Veiculo</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Qual a placa do seu caminhao principal?</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <input 
                autoFocus
                type="text" 
                placeholder="Ex: ABC-1234"
                className="w-full text-2xl font-black text-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl uppercase focus:border-blue-500 outline-none bg-slate-50 dark:bg-slate-900 dark:text-white"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
              />
              <button 
                onClick={handleCreateVehicle}
                disabled={vehiclePlate.length < 3 || loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : 'Continuar'} <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: First Tire */}
        {step === 3 && (
          <div className="p-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                <Disc className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Pneu Padrao</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Qual marca voce mais usa?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {['Michelin', 'Pirelli', 'Bridgestone', 'Goodyear'].map(brand => (
                <button 
                  key={brand}
                  onClick={() => setTireBrand(brand)}
                  className={`p-4 rounded-xl border-2 font-bold transition-all ${tireBrand === brand ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300'}`}
                >
                  {brand}
                </button>
              ))}
            </div>

            <button 
              onClick={handleCreateTire}
              disabled={loading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Configurando...' : 'Finalizar Cadastro'} <CheckCircle2 className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="p-10 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Star className="h-12 w-12 text-green-600 dark:text-green-400 fill-current" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Tudo Pronto!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Voce ja tem 1 veiculo e 1 pneu cadastrados.<br/>Explore o sistema e assuma o controle.
            </p>
            <button 
              onClick={onComplete}
              className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform"
            >
              Ir para o Painel
            </button>
          </div>
        )}

        {/* Stepper Dots */}
        <div className="flex justify-center gap-2 pb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${step === i ? 'w-6 bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};