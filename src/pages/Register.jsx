import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { colors } from '../data/seed.js';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    register(name, email, password);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: colors.panel }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center rounded-2xl mb-4"
            style={{ width: 56, height: 56, backgroundColor: colors.primary }}
          >
            <Leaf size={28} color="#FFFFFF" strokeWidth={2} />
          </div>
          <h1 className="brand-font text-2xl font-bold" style={{ color: colors.textDark }}>
            Create account
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Get started with Sprout today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: colors.textDark }}>Full name</label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}` }}
            >
              <User size={16} color={colors.textMuted} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: colors.textDark }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: colors.textDark }}>Email</label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}` }}
            >
              <Mail size={16} color={colors.textMuted} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: colors.textDark }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: colors.textDark }}>Password</label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}` }}
            >
              <Lock size={16} color={colors.textMuted} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: colors.textDark }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} color={colors.textMuted} /> : <Eye size={16} color={colors.textMuted} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: colors.textMuted }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-semibold" style={{ color: colors.primary }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
