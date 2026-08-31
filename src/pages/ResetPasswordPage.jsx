import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { COLORS } from '../utils/constants.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(password);
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired — request a new one from the login page.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: COLORS.bgSecondary }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center rounded-2xl mb-4" style={{ width: 64, height: 64, backgroundColor: COLORS.primary }}>
            <Leaf size={32} color="white" strokeWidth={2} />
          </div>
          <h1 className="brand-font text-2xl font-bold" style={{ color: COLORS.text }}>Set a New Password</h1>
        </div>

        {done ? (
          <div className="text-sm text-center py-4 px-3 rounded-lg" style={{ backgroundColor: COLORS.accentSoft, color: COLORS.primaryDark }}>
            Password updated! Taking you to Sprout...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>New Password</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
                <Lock size={16} color={COLORS.textMuted} />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
                <button type="button" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} color={COLORS.textMuted} /> : <Eye size={16} color={COLORS.textMuted} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>Confirm Password</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
                <Lock size={16} color={COLORS.textMuted} />
                <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
              </div>
            </div>
            {error && <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: COLORS.primary }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}