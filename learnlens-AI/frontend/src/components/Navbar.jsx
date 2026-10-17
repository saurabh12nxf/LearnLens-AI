import React from 'react';
import { Sparkles, Layers } from 'lucide-react';

export default function Navbar({ documentCount, backendHealthy }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.92)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
        }}>
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            LearnLens<span className="text-gradient">.AI</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
            Personalized AI Study Companion
          </p>
        </div>
      </div>

      {/* Right Controls: Docs counter & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Document count pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <Layers size={13} color="var(--accent-primary)" />
          <span><strong>{documentCount}</strong> {documentCount === 1 ? 'Document' : 'Documents'}</span>
        </div>

        {/* Minimal System Online Dot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.72rem',
          color: backendHealthy ? '#6ee7b7' : '#fca5a5',
          background: backendHealthy ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${backendHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          padding: '4px 9px',
          borderRadius: '20px',
        }} title={backendHealthy ? "All AI & search services operational" : "Connecting to backend..."}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: backendHealthy ? '#10b981' : '#ef4444',
            boxShadow: backendHealthy ? '0 0 6px #10b981' : 'none',
          }} />
          <span>{backendHealthy ? 'Online' : 'Connecting'}</span>
        </div>
      </div>
    </header>
  );
}
