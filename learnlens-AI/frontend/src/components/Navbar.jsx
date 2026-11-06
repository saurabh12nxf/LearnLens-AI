import React from 'react';
import { Sparkles, Layers, HelpCircle, TrendingUp, Calendar } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, documentCount, backendHealthy }) {
  const tabs = [
    { id: 'assistant', label: 'Study Assistant', icon: Sparkles },
    { id: 'quizzes', label: 'Quizzes & Tests', icon: HelpCircle },
    { id: 'analytics', label: 'Learner Analytics', icon: TrendingUp },
    { id: 'plans', label: 'Study Plans', icon: Calendar },
  ];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 24px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.94)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
        }}>
          <Sparkles size={18} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            LearnLens<span className="text-gradient">.AI</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: 0 }}>
            Personalized AI Study Companion
          </p>
        </div>
      </div>

      {/* Center Tab Navigation (Phase 1 RAG + Phase 2 Quizzes & Analytics) */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(18, 24, 38, 0.8)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-full)',
        padding: '4px',
        gap: '4px',
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <Icon size={14} color={isActive ? '#818cf8' : 'var(--text-dim)'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

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
