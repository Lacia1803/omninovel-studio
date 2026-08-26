import React, { useState } from 'react';
import { authApi, setToken, type UserPublic, type TokenResponse } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: UserPublic) => void;
}

export function AuthModal({ isOpen, onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let resp: TokenResponse;
      if (mode === 'register') {
        resp = await authApi.register({ email, username, password });
      } else {
        resp = await authApi.login({ email, password });
      }
      setToken(resp.access_token);
      onAuth(resp.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h2 style={{ marginBottom: 16, fontFamily: 'var(--font-display)' }}>
          {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--col-paper-edge)', background: 'var(--col-paper-2)', color: 'var(--col-ink)' }}
          />
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Tên người dùng"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--col-paper-edge)', background: 'var(--col-paper-2)', color: 'var(--col-ink)' }}
            />
          )}
          <input
            type="password"
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--col-paper-edge)', background: 'var(--col-paper-2)', color: 'var(--col-ink)' }}
          />
          {error && <div style={{ color: 'var(--accent-vermilion)', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
          >
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13 }}>
          {mode === 'login' ? (
            <>Chưa có tài khoản? <button className="btn btn-ghost" onClick={() => { setMode('register'); setError(''); }}>Đăng ký</button></>
          ) : (
            <>Đã có tài khoản? <button className="btn btn-ghost" onClick={() => { setMode('login'); setError(''); }}>Đăng nhập</button></>
          )}
        </div>
      </div>
    </div>
  );
}