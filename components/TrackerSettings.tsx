
import React, { useState, useEffect } from 'react';
import { Save, Shield, Globe, User, Lock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { TrackerSettings } from '../types';
import { storageService } from '../services/storageService';

interface TrackerSettingsProps {
  orgId: string;
  onSave?: () => void;
}

const TrackerSettingsComponent: React.FC<TrackerSettingsProps> = ({ orgId, onSave }) => {
  const [settings, setSettings] = useState<TrackerSettings>({
    apiUrl: '/api/sascar-vehicles',
    user: 'JOMEDELOGTORREOPENTECH',
    pass: 'sascar',
    active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToTrackerSettings(orgId, (data) => {
      setSettings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await storageService.saveTrackerSettings(orgId, settings);
      setMessage({ type: 'success', text: 'Configurações do rastreador salvas com sucesso!' });
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving tracker settings:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Configurações do Rastreador</h2>
            <p className="text-sm text-slate-500 italic">Acesso restrito ao administrador</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-8 space-y-6">
        {settings.lastSyncAt && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <Calendar size={18} />
              <span className="text-sm font-bold uppercase tracking-tight">Última Sincronização Automática</span>
            </div>
            <span className="text-sm font-black text-blue-900">
              {new Date(settings.lastSyncAt).toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Globe size={16} className="text-slate-400" />
              URL da API do Rastreador
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              placeholder="/api/sascar-vehicles"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              required
            />
            <p className="mt-1.5 text-xs text-slate-400">Ex: /api/sascar-vehicles</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <User size={16} className="text-slate-400" />
                Usuário / Login
              </label>
              <input
                type="text"
                value={settings.user}
                onChange={(e) => setSettings({ ...settings, user: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Lock size={16} className="text-slate-400" />
                Senha
              </label>
              <input
                type="password"
                value={settings.pass}
                onChange={(e) => setSettings({ ...settings, pass: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, active: !settings.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                settings.active ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-slate-700">Ativar integração automática</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={20} />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrackerSettingsComponent;
