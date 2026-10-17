import React from 'react';
import { X, CheckCircle2, Award, Compass, BookOpen, ArrowRight, Zap, Target, Brain } from 'lucide-react';

export default function PhaseRoadmapModal({ onClose }) {
  const phases = [
    {
      number: '1',
      title: 'Phase 1: Grounded RAG Assistance',
      status: 'COMPLETED & LIVE',
      statusColor: '#10b981',
      icon: BookOpen,
      iconColor: '#6366f1',
      description: 'PDF upload pipeline with PyMuPDF text extraction, chunking with overlap, all-MiniLM-L6-v2 vector embeddings, PostgreSQL pgvector cosine similarity search, and Groq Qwen 27B synthesis with page citations.',
      features: [
        'PDF Ingestion & 512-token chunking',
        '384-dimensional vector database storage',
        'Sub-second semantic similarity retrieval',
        'Strict zero-hallucination grounded prompts',
        'Exact [Page X] academic citations',
      ],
    },
    {
      number: '2',
      title: 'Phase 2: Quiz System & Learner Analytics',
      status: 'UP NEXT (READY TO BUILD)',
      statusColor: '#c084fc',
      icon: Award,
      iconColor: '#c084fc',
      description: 'Auto-generate multiple choice quizzes from uploaded documents. Track user attempts, measure topic-level accuracy, and automatically identify knowledge gaps when mastery falls below 60%.',
      features: [
        'LLM-powered MCQ quiz generation from PDFs',
        'Topic tagging & question difficulty levels',
        'Interactive quiz-taking UI with instant grading',
        'Learner analytics dashboard (accuracy by topic)',
        'Automatic weak-topic gap detection algorithm',
      ],
    },
    {
      number: '3',
      title: 'Phase 3: Personalized Recommendations',
      status: 'ROADMAP MILESTONE',
      statusColor: '#38bdf8',
      icon: Compass,
      iconColor: '#38bdf8',
      description: 'Adaptive study planning that recommends specific chapters, review materials, and targeted practice problems tailored to each student’s diagnosed learning gaps.',
      features: [
        'Personalized study plan generator',
        'Adaptive difficulty problem selector',
        'Direct links back to document review pages',
        'Spaced repetition reminder schedule',
        'Progress tracking toward 100% topic mastery',
      ],
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '840px',
          maxWidth: '100%',
          maxHeight: '90vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-glow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="animate-fade-in"
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>
              LearnLens AI — 3 Pillars Architecture & Roadmap
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
              Your end-to-end journey from RAG Assistance to Adaptive Mastery
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Phases list */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {phases.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: idx === 0 
                    ? '1px solid rgba(16, 185, 129, 0.4)' 
                    : idx === 1 
                      ? '1px solid rgba(192, 132, 252, 0.35)' 
                      : '1px solid var(--border-subtle)',
                  position: 'relative',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${p.iconColor}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={18} color={p.iconColor} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                      {p.title}
                    </h4>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: `${p.statusColor}20`,
                    color: p.statusColor,
                    border: `1px solid ${p.statusColor}40`,
                    letterSpacing: '0.05em',
                  }}>
                    {p.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {p.description}
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '6px 12px',
                }}>
                  {p.features.map((feat, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      <CheckCircle2 size={13} color={p.statusColor} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Phase 1 is 100% operational. Ready to advance to Phase 2 anytime!
          </span>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 16px' }}>
            <span>Back to Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
}
