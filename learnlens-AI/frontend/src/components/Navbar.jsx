import React from 'react';
import { Sparkles, Database, Cpu, CheckCircle2, BookOpen, Layers, Award, Compass } from 'lucide-react';

export default function Navbar({ documentCount, backendHealthy, activeTab, setActiveTab, onOpenRoadmap }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.45)',
        }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              LearnLens<span className="text-gradient">.AI</span>
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
              Phase 1 Live
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
            Personalized Learning & Grounded RAG Assistant
          </p>
        </div>
      </div>

      {/* Navigation Tabs (Roadmap Pillars) */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => setActiveTab('rag')}
          className={`btn ${activeTab === 'rag' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '20px' }}
        >
          <BookOpen size={15} />
          <span>RAG Assistant</span>
        </button>

        <button
          onClick={onOpenRoadmap}
          className="btn btn-ghost"
          style={{
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            color: 'var(--text-muted)',
            position: 'relative',
          }}
          title="Click to view Phase 2 details"
        >
          <Award size={15} color="#c084fc" />
          <span>Phase 2: Quiz & Analytics</span>
          <span style={{
            fontSize: '0.62rem',
            background: 'rgba(192, 132, 252, 0.2)',
            color: '#c084fc',
            padding: '1px 6px',
            borderRadius: '10px',
            marginLeft: '4px',
            border: '1px solid rgba(192, 132, 252, 0.4)',
          }}>Next</span>
        </button>

        <button
          onClick={onOpenRoadmap}
          className="btn btn-ghost"
          style={{
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            color: 'var(--text-dim)',
          }}
          title="Click to view Phase 3 details"
        >
          <Compass size={15} color="#38bdf8" />
          <span>Phase 3: Recommendations</span>
        </button>
      </nav>

      {/* System Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Backend & DB Health */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: '#6ee7b7',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: backendHealthy ? '#10b981' : '#f43f5e',
            boxShadow: backendHealthy ? '0 0 8px #10b981' : '0 0 8px #f43f5e',
          }} />
          <span>{backendHealthy ? 'FastAPI & pgvector' : 'Connecting...'}</span>
        </div>

        {/* Model info badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: '#a5b4fc',
        }}>
          <Cpu size={13} />
          <span>Groq Qwen 27B</span>
        </div>

        {/* Document count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <Layers size={13} />
          <span><strong>{documentCount}</strong> Docs</span>
        </div>
      </div>
    </header>
  );
}
