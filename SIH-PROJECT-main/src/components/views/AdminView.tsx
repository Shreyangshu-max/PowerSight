import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Smartphone,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  Copy,
  Database
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const AdminView: React.FC = () => {
  const { adminPhone, saveAdminPhone } = useEnergy();
  
  const [adminNameInput, setAdminNameInput] = useState<string>('Plant Administrator');
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>('');
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  
  // Access control state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState<string>('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [hasExistingCode, setHasExistingCode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [restApiKeyInput, setRestApiKeyInput] = useState<string>('');
  const [hasRestApiKey, setHasRestApiKey] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState<boolean>(false);

  const SUPABASE_SQL_CODE = `-- ============================================================================
-- 1. SENSOR TELEMETRY TABLE (Live 2-second streaming readings from ESP32)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sensor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL DEFAULT 'ESP32-MCH-007',
    voltage NUMERIC(10, 3) NOT NULL DEFAULT 0.0,
    current NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    power NUMERIC(10, 6) NOT NULL DEFAULT 0.0,
    power_kw NUMERIC(10, 6) DEFAULT 0.0,
    current_amps NUMERIC(10, 4) DEFAULT 0.0,
    voltage_v NUMERIC(10, 3) DEFAULT 0.0,
    is_spike BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensor_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert policies for sensor telemetry
CREATE POLICY "Allow public read sensor_logs" ON public.sensor_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert sensor_logs" ON public.sensor_logs
    FOR INSERT WITH CHECK (true);

-- Indexes for ultra-fast time-series queries
CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at ON public.sensor_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_device_id ON public.sensor_logs (device_id);

-- ============================================================================
-- 2. ADMIN CREDENTIALS TABLE (Already configured)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    access_code TEXT NOT NULL,
    onesignal_app_id TEXT DEFAULT 'your_onesignal_app_id',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read admin_credentials" ON public.admin_credentials
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update admin_credentials" ON public.admin_credentials
    FOR ALL USING (true);`;

  // Fetch initial config from backend
  useEffect(() => {
    fetch('http://localhost:5000/api/admin-config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.data) {
          if (data.data.phoneNumber) setPhoneNumberInput(data.data.phoneNumber);
          if (data.data.adminName) setAdminNameInput(data.data.adminName);
          setHasExistingCode(Boolean(data.data.hasAccessCode));
          setHasRestApiKey(Boolean(data.data.hasRestApiKey));
          // If no access code set yet, automatically grant access to setup
          if (!data.data.hasAccessCode) {
            setIsUnlocked(true);
          }
        }
      })
      .catch(() => {
        setIsUnlocked(true);
      });
  }, [adminPhone]);

  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch('http://localhost:5000/api/admin-verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: verifyCodeInput })
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setIsUnlocked(true);
      } else {
        setVerifyError('❌ Invalid Access Code! Please try again.');
      }
    } catch {
      setVerifyError('❌ Could not connect to authentication backend.');
    }
    setIsVerifying(false);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('http://localhost:5000/api/admin-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: adminNameInput,
          phoneNumber: phoneNumberInput,
          accessCode: accessCodeInput,
          alertEnabled: true
        })
      });
      const data = await res.json();
      if (data.success) {
        await saveAdminPhone(phoneNumberInput);
        setHasExistingCode(true);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const handleTriggerSpike = async () => {
    setIsTestingPush(true);
    setTestPushStatus(null);
    try {
      const res = await fetch('http://localhost:5000/api/trigger-spike', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestPushStatus(`⚡ SPIKE TRIGGERED! OneSignal Push Notification broadcasted to tag phone_number='${adminPhone || phoneNumberInput || 'All'}'!`);
      } else {
        setTestPushStatus(`❌ Failed: ${data.error}`);
      }
    } catch {
      setTestPushStatus('❌ Could not connect to backend server on http://localhost:5000');
    }
    setIsTestingPush(false);
  };

  const handleSaveRestApiKey = async () => {
    if (!restApiKeyInput.trim()) return;
    setIsSavingKey(true);
    setKeySaveSuccess(false);
    try {
      const res = await fetch('http://localhost:5000/api/admin-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesignalRestApiKey: restApiKeyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setHasRestApiKey(true);
        setRestApiKeyInput('');
        setKeySaveSuccess(true);
        setTimeout(() => setKeySaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    }
    setIsSavingKey(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_CODE);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Locked Screen
  if (!isUnlocked && hasExistingCode) {
    return (
      <div className="max-w-md mx-auto my-12 glass-panel rounded-2xl p-8 space-y-6 border border-amber-500/30 shadow-2xl shadow-amber-950/40">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-100 uppercase tracking-wider">
            Admin Panel Locked
          </h2>
          <p className="text-xs text-slate-400">
            Enter your saved Admin Access Code to unlock controls and OneSignal triggers.
          </p>
        </div>

        <form onSubmit={handleVerifyAccessCode} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
              Admin Access Code *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                placeholder="Enter Access Code"
                required
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest"
              />
            </div>
          </div>

          {verifyError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-semibold flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3.5 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-950/50"
          >
            <Unlock className="h-4 w-4" />
            <span>{isVerifying ? 'Verifying...' : 'Unlock Admin Controls'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2.5">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <span>ADMIN CONTROLS &amp; SUPABASE INTEGRATION</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure Admin credentials, Access Code security, and live OneSignal Push Notification triggers.
          </p>
        </div>

        <button
          onClick={() => setIsUnlocked(false)}
          className="self-start sm:self-center bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2 transition"
        >
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          <span>Lock Admin Panel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Admin Credentials & Access Code Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="h-9 w-9 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Admin Credentials &amp; Access Security
                </h3>
                <p className="text-[11px] text-slate-400">Saved to Supabase / JSON Database with Access Code protection</p>
              </div>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Admin Name *
                </label>
                <input
                  type="text"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  placeholder="e.g. Chief Engineer John"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Target Mobile Phone Number *
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Admin Access Code (Security Password) *
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    placeholder={hasExistingCode ? "•••••• (Enter new code to update)" : "Set 4-6 Digit Access Code"}
                    required={!hasExistingCode}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Once saved, opening Admin Controls next time will require entering this exact Access Code.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-xl flex items-center space-x-2 transition shadow-lg shadow-amber-950/50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving to Database...' : 'Save Credentials & Lock Code'}</span>
                </button>

                {saveSuccess && (
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Credentials &amp; Access Code Saved!</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Supabase SQL Code Card */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Database className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Supabase SQL Database Schema
                </h3>
              </div>
              <button
                onClick={handleCopySql}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition border border-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Code'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Run this SQL snippet in your <strong>Supabase SQL Editor</strong> (https://supabase.com/dashboard) to create the <code className="text-amber-300">admin_credentials</code> table with Row Level Security:
            </p>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-56">
              {SUPABASE_SQL_CODE}
            </pre>
          </div>
        </div>

        {/* Right Column: OneSignal Alert Dispatch & Testing */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  OneSignal Alert Dispatcher
                </h3>
                <p className="text-[11px] text-slate-400">Web Push Notifications &amp; Tag Filters</p>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200/90 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Automatic Spike Notification Flow</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Whenever you click <strong>Spike</strong>, a web push notification is sent to your Chrome browser via OneSignal.
              </p>
            </div>

            {/* REST API Key Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                OneSignal REST API Key
                {hasRestApiKey && (
                  <span className="ml-2 text-emerald-400 font-normal normal-case">✅ Key saved</span>
                )}
              </label>
              <p className="text-[11px] text-slate-500 leading-snug">
                Go to <strong className="text-slate-400">OneSignal Dashboard → Settings → Keys &amp; IDs</strong> → copy the <strong className="text-amber-300">REST API Key</strong> and paste it below.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={restApiKeyInput}
                  onChange={(e) => setRestApiKeyInput(e.target.value)}
                  placeholder={hasRestApiKey ? '•••••• (key already saved — paste to update)' : 'Paste REST API Key here...'}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                />
                <button
                  onClick={handleSaveRestApiKey}
                  disabled={isSavingKey || !restApiKeyInput.trim()}
                  className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shrink-0"
                >
                  {isSavingKey ? 'Saving...' : 'Save Key'}
                </button>
              </div>
              {keySaveSuccess && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>REST API Key saved! Notifications will now work.</span>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={handleTriggerSpike}
                disabled={isTestingPush}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 transition shadow-xl shadow-rose-950/60 disabled:opacity-50 border border-rose-400/30"
              >
                <Send className="h-4 w-4 text-white animate-pulse" />
                <span>{isTestingPush ? 'Executing Spike & Dispatching...' : '⚡ SPIKE (Trigger Breach & Send OneSignal Alert)'}</span>
              </button>

              {testPushStatus && (
                <div className="mt-3 p-3 rounded-xl text-xs font-mono border bg-rose-950/80 border-rose-500/40 text-rose-300">
                  {testPushStatus}
                </div>
              )}
            </div>

            {/* Active Config Status Box */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>Access Security:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{hasExistingCode ? 'Protected by Access Code' : 'First-time Setup'}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Active Admin:</span>
                <strong className="text-slate-200">{adminNameInput || 'Plant Administrator'}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Configured Phone:</span>
                <strong className="text-amber-300">{phoneNumberInput || 'None'}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>OneSignal REST Key:</span>
                <span className={`font-bold ${hasRestApiKey ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hasRestApiKey ? '✅ Configured' : '❌ Not Set'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>OneSignal App ID:</span>
                <span className="text-slate-300 font-mono text-[11px]">ece5ddf3-01f1-4608-9c25-d6dc6855eb5f</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
