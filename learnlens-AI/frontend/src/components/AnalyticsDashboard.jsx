import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  MessageSquare,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Flame
} from 'lucide-react';

export default function AnalyticsDashboard({
  onNavigateToQuiz,
  onNavigateToChatWithTopic,
  onNavigateToStudyPlanWithTopic,
  showToast,
}) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/overview');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main style={{ flex: 1, height: 'calc(100vh - 63px)', overflowY: 'auto', padding: '36px 40px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', textAlign: 'center', color: 'var(--text-dim)', paddingTop: '60px' }}>
          <p style={{ fontSize: '0.9rem' }}>Analyzing performance records & concept mastery...</p>
        </div>
      </main>
    );
  }

  const hasData = analytics && analytics.total_quizzes_taken > 0;
  const knowledgeGaps = analytics?.knowledge_gaps || [];
  const topicMastery = analytics?.topic_mastery || [];
  const recentAttempts = analytics?.recent_attempts || [];

  return (
    <main style={{ flex: 1, height: 'calc(100vh - 63px)', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={22} color="#6366f1" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Learner Mastery & Analytics
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '620px' }}>
              Real-time evaluation of your conceptual strengths, topic retention, and AI-diagnosed knowledge gaps.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Refresh Analytics</span>
          </button>
        </div>

        {!hasData ? (
          /* Empty State */
          <div
            style={{
              textAlign: 'center',
              padding: '72px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <BarChart3 size={48} color="#64748b" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              No Quiz Records Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '440px', margin: '0 auto 20px' }}>
              Take your first multiple-choice quiz to unlock personalized topic mastery tracking, accuracy trends, and knowledge gap diagnosis.
            </p>
            <button
              onClick={onNavigateToQuiz}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '10px 22px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Sparkles size={15} />
              <span>Take a Practice Quiz</span>
            </button>
          </div>
        ) : (
          <>
            {/* Top Stat Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Quizzes Completed */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Award size={22} color="#6366f1" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Quizzes Completed
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0', color: '#f8fafc' }}>
                    {analytics.total_quizzes_taken}
                  </h3>
                </div>
              </div>

              {/* Questions Answered */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HelpCircle size={22} color="#06b6d4" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Questions Answered
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0', color: '#f8fafc' }}>
                    {analytics.total_questions_attempted}
                  </h3>
                </div>
              </div>

              {/* Average Accuracy */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background:
                      analytics.average_score_percentage >= 80
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp
                    size={22}
                    color={analytics.average_score_percentage >= 80 ? '#10b981' : '#6366f1'}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Overall Accuracy
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0', color: '#f8fafc' }}>
                    {analytics.average_score_percentage}%
                  </h3>
                </div>
              </div>

              {/* Diagnosed Knowledge Gaps */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${knowledgeGaps.length > 0 ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: knowledgeGaps.length > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {knowledgeGaps.length > 0 ? (
                    <AlertTriangle size={22} color="#f43f5e" />
                  ) : (
                    <CheckCircle2 size={22} color="#10b981" />
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Knowledge Gaps
                  </span>
                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      margin: '2px 0 0',
                      color: knowledgeGaps.length > 0 ? '#f43f5e' : '#10b981',
                    }}
                  >
                    {knowledgeGaps.length} {knowledgeGaps.length === 1 ? 'Topic' : 'Topics'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Knowledge Gap Diagnosis Alert Section (PRD FR-07) */}
            <div
              style={{
                background:
                  knowledgeGaps.length > 0
                    ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
                border: `1px solid ${
                  knowledgeGaps.length > 0 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.3)'
                }`,
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                {knowledgeGaps.length > 0 ? (
                  <ShieldAlert size={20} color="#f43f5e" />
                ) : (
                  <CheckCircle2 size={20} color="#10b981" />
                )}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    {knowledgeGaps.length > 0
                      ? 'Diagnosed Knowledge Gaps (< 60% Accuracy)'
                      : 'All Core Topics Meet Mastery Standards'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                    {knowledgeGaps.length > 0
                      ? 'The AI diagnostic engine flags topics where your accuracy falls below 60%, recommending targeted study action.'
                      : 'Great work! You have achieved 60% or higher accuracy across all evaluated topics.'}
                  </p>
                </div>
              </div>

              {knowledgeGaps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {knowledgeGaps.map((gap, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(15, 20, 34, 0.7)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fda4af' }}>
                            {gap.topic}
                          </h4>
                          <span
                            className="badge badge-rose"
                            style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                          >
                            {gap.gap_severity} Gap ({gap.accuracy}%)
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                          {gap.recommendation}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onNavigateToChatWithTopic?.(gap.topic)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            color: '#a5b4fc',
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>Ask Study Assistant</span>
                        </button>
                        <button
                          onClick={onNavigateToQuiz}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(244, 63, 94, 0.2)',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            color: '#fecdd3',
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Sparkles size={13} />
                          <span>Take Topic Quiz</span>
                        </button>
                        <button
                          onClick={() => onNavigateToStudyPlanWithTopic?.(gap.topic)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(6, 182, 212, 0.15)',
                            border: '1px solid rgba(6, 182, 212, 0.35)',
                            color: '#67e8f9',
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Calendar size={13} />
                          <span>Plan Daily Study</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Topic Mastery Progress Breakdown (PRD FR-06) */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Topic-Wise Mastery Levels
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                    Mastery tiers: <strong>Mastered</strong> (≥ 80%), <strong>Proficient</strong> (60–79%), <strong>Needs Revision</strong> (&lt; 60%)
                  </p>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  {topicMastery.length} {topicMastery.length === 1 ? 'Topic' : 'Topics'} Tracked
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topicMastery.map((tm, idx) => {
                  const barColor =
                    tm.accuracy_percentage >= 80
                      ? '#10b981'
                      : tm.accuracy_percentage >= 60
                      ? '#6366f1'
                      : '#f43f5e';

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                            {tm.topic}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: `${barColor}22`,
                              border: `1px solid ${barColor}55`,
                              color: barColor,
                              fontWeight: 700,
                            }}
                          >
                            {tm.mastery_tier}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {tm.questions_correct} / {tm.questions_attempted} correct
                          </span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: barColor }}>
                            {tm.accuracy_percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, tm.accuracy_percentage)}%`,
                            background: barColor,
                            transition: 'width 0.4s ease-out',
                            boxShadow: `0 0 10px ${barColor}66`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Quiz Attempts Table */}
            {recentAttempts.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Recent Quiz History
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Last {recentAttempts.length} attempts
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentAttempts.map((att) => {
                    const pass = att.percentage >= 60;
                    return (
                      <div
                        key={att.attempt_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: pass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {pass ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#f43f5e" />}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 2px' }}>
                              {att.quiz_title}
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {att.created_at}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {att.score} / {att.total_questions}
                          </span>
                          <span
                            className={pass ? 'badge badge-emerald' : 'badge badge-rose'}
                            style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '55px', textAlign: 'center' }}
                          >
                            {att.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
