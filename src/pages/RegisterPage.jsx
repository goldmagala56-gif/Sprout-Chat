import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { COLORS } from '../utils/constants.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Phone number is required so others can find you'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUp(name, phone.trim(), email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
          <h1 className="brand-font text-2xl font-bold" style={{ color: COLORS.text }}>Create Account</h1>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>Get started with Sprout today</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>Full Name</label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
              <User size={16} color={COLORS.textMuted} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>Phone Number</label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
              <Phone size={16} color={COLORS.textMuted} />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256 7XX XXX XXX" autoComplete="tel" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
            </div>
            <p className="text-[11px] mt-1" style={{ color: COLORS.textMuted }}>Include your country code — this is how contacts find you.</p>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>Email</label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
              <Mail size={16} color={COLORS.textMuted} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: COLORS.text }}>Password</label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
              <Lock size={16} color={COLORS.textMuted} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} required />
              <button type="button" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} color={COLORS.textMuted} /> : <Eye size={16} color={COLORS.textMuted} />}
              </button>
            </div>
          </div>
          {error && <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: COLORS.primary }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm mt-6" style={{ color: COLORS.textMuted }}>
          Already have an account? <Link to="/login" className="font-semibold" style={{ color: COLORS.primary }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}