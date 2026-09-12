import React, { useState } from 'react';
import { ShieldCheck, Download, Lock, KeyRound, AlertCircle, X, CheckCircle2, FileArchive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Unable to authenticate');
      }
      setAdminToken(data.token);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!adminToken) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/download-source', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iextance-project.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      setAdminToken(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setAdminToken(null);
    setError(null);
    setIsBusy(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div id="admin-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" onClick={handleClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden">
          <button type="button" onClick={handleClose} aria-label="Close Admin Panel" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
          {!adminToken ? (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-4"><Lock className="w-6 h-6" /></div>
              <h2 className="text-xl font-bold not-italic text-slate-900 tracking-tight">Admin Panel Access</h2>
              <p className="text-xs font-bold italic text-slate-500 mt-1 mb-5">Protected administrative control for project downloads</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Enter Password</label>
                  <div className="relative"><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="Enter admin password..." autoFocus disabled={isBusy} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all" /><KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" /></div>
                  {error && <div className="flex items-center gap-1.5 mt-2 text-rose-600 text-xs font-bold not-italic"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span></div>}
                </div>
                <button type="submit" disabled={isBusy || !password} className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold not-italic transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"><ShieldCheck className="w-4 h-4 text-emerald-400" />{isBusy ? 'Checking...' : 'Unlock Admin Panel'}</button>
              </form>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center mb-4 shadow-sm"><FileArchive className="w-7 h-7" /></div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold italic mb-2 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Access Authorized</div>
              <h2 className="text-xl font-bold not-italic text-slate-900 tracking-tight">Project Source Code</h2>
              <p className="text-xs font-bold italic text-slate-500 mt-1 mb-6 max-w-xs mx-auto">Click below to download the complete full-stack website project as a clean ZIP package.</p>
              {error && <div className="flex items-center justify-center gap-1.5 mb-3 text-rose-600 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /><span>{error}</span></div>}
              <button type="button" id="admin-download-source-btn" onClick={handleDownload} disabled={isBusy} className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-blue-600 hover:from-sky-600 hover:via-indigo-600 hover:to-blue-700 text-white text-sm font-bold not-italic shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"><Download className={`w-5 h-5 ${isBusy ? 'animate-bounce' : ''}`} /><span>{isBusy ? 'Packaging & Downloading...' : 'Download Full Website Project (.ZIP)'}</span></button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
