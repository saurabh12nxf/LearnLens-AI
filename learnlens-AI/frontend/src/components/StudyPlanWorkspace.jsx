import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  HelpCircle,
  Trash2,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Target,
  Layers,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  ShieldAlert,
  Flame,
  Award
} from 'lucide-react';

export default function StudyPlanWorkspace({
  documents,
  selectedDocId,
  initialFocusTopic,
  onNavigateToChatWithTopic,
  onNavigateToQuizWithTopic,
  onNavigateToAnalytics,
  showToast,
}) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activePlanId, setActivePlanId] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [loadingActivePlan, setLoadingActivePlan] = useState(false);

  // Modal State for Generating New Plan
  const [showModal, setShowModal] = useState(false);
  const [genDocId, setGenDocId] = useState(selectedDocId || (documents[0]?.id || ''));
  const [genDuration, setGenDuration] = useState(5);
  const [genExamTarget, setGenExamTarget] = useState('Midterm Examination');
  const [genFocusTopic, setGenFocusTopic] = useState(initialFocusTopic || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // Knowledge gaps detected from analytics to guide student
  const [availableGaps, setAvailableGaps] = useState([]);

  useEffect(() => {
    fetchPlans();
    fetchKnowledgeGaps();
  }, []);

  useEffect(() => {
    if (initialFocusTopic) {
      setGenFocusTopic(initialFocusTopic);
      setShowModal(true);
    }
  }, [initialFocusTopic]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/study-plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0 && !activePlanId) {
          loadPlanDetail(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch study plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchKnowledgeGaps = async () => {
    try {
      const res = await fetch('/api/analytics/overview');
      if (res.ok) {
        const data = await res.json();
        setAvailableGaps(data.knowledge_gaps || []);
      }
    } catch (err) {
      console.warn('Analytics gaps fetch issue:', err);
    }
  };

  const loadPlanDetail = async (planId) => {
    setActivePlanId(planId);
    setLoadingActivePlan(true);
    try {
      const res = await fetch(`/api/study-plans/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setActivePlan(data);
      }
    } catch (err) {
      showToast?.('Error loading study plan details', 'error');
    } finally {
      setLoadingActivePlan(false);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (!genDocId) {
      showToast?.('Please select a study material document', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        document_id: parseInt(genDocId, 10),
        duration_days: parseInt(genDuration, 10),
        student_name: 'Student Learner',
        target_exam: genExamTarget.trim() || 'Comprehensive Mastery',
        focus_topic: genFocusTopic.trim() || null,
      };

      const res = await fetch('/api/study-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Plan generation failed');
      }

      const newPlan = await res.json();
      showToast?.(`Generated "${newPlan.title}"!`, 'success');
      setShowModal(false);
      setGenFocusTopic('');
      await fetchPlans();
      setActivePlanId(newPlan.id);
      setActivePlan(newPlan);
    } catch (err) {
      showToast?.(err.message || 'Error generating study plan', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    if (!activePlan) return;
    const newCompleted = !currentCompleted;

    // Optimistic UI update
    setActivePlan((prev) => {
      if (!prev) return prev;
      const updatedDays = prev.days.map((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)),
      }));
      const totalTasks = updatedDays.reduce((acc, d) => acc + d.tasks.length, 0);
      const completedTasks = updatedDays.reduce((acc, d) => acc + d.tasks.filter((t) => t.completed).length, 0);
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        ...prev,
        days: updatedDays,
        completed_tasks: completedTasks,
        progress_percentage: progress,
        status: progress === 100 ? 'completed' : 'active',
      };
    });

    try {
      const res = await fetch(`/api/study-plans/${activePlan.id}/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActivePlan(updated);
        // Refresh plan list summary
        setPlans((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, progress_percentage: updated.progress_percentage, completed_tasks: updated.completed_tasks } : p))
        );
      } else {
        showToast?.('Failed to update task', 'error');
        loadPlanDetail(activePlan.id);
      }
    } catch (err) {
      showToast?.('Failed to update task', 'error');
      loadPlanDetail(activePlan.id); // Rollback
    }
  };

  const handleDeletePlan = async (planId, title, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete study plan "${title}"?`)) return;

    try {
      const res = await fetch(`/api/study-plans/${planId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast?.('Study plan deleted', 'info');
        const remaining = plans.filter((p) => p.id !== planId);
        setPlans(remaining);
        if (activePlanId === planId) {
          if (remaining.length > 0) {
            loadPlanDetail(remaining[0].id);
          } else {
            setActivePlanId(null);
            setActivePlan(null);
          }
        }
      }
    } catch (err) {
      showToast?.('Error deleting study plan', 'error');
    }
  };

  return (
    <main style={{ flex: 1, height: 'calc(100vh - 63px)', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Top Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
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
              <Calendar size={22} color="#6366f1" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Personalized Study Roadmaps
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '640px' }}>
              Adaptive day-by-day study calendars dynamically prioritized around your diagnosed Knowledge Gaps, target exam timeline, and verified textbook pages.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '11px 22px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
              transition: 'var(--transition)',
            }}
          >
            <Sparkles size={16} />
            <span>Generate Study Plan</span>
          </button>
        </div>

        {/* Diagnosed Gaps Quick Re-alignment Alert (if gaps exist) */}
        {availableGaps.length > 0 && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.06)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={18} color="#f43f5e" />
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fecdd3' }}>
                  {availableGaps.length} Knowledge Gap{availableGaps.length > 1 ? 's' : ''} Diagnosed (&lt; 60% accuracy):
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {availableGaps.map((g) => `${g.topic} (${g.accuracy}%)`).join(', ')}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setGenFocusTopic(availableGaps[0]?.topic || '');
                setShowModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fecdd3',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={13} />
              <span>Generate Gap-Targeted Plan</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {loadingPlans ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '0.9rem' }}>Loading study roadmaps...</p>
          </div>
        ) : plans.length === 0 ? (
          /* Empty State */
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <Calendar size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              No Study Plans Generated Yet
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', maxWidth: '440px', margin: '0 auto 18px' }}>
              Create an AI-tailored study plan to get daily reading goals, practice drills, and exact note references designed for your exam timeline.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Sparkles size={15} />
              <span>Create Your First Study Plan</span>
            </button>
          </div>
        ) : (
          /* Active Plans Layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Plan Switcher Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, flexShrink: 0 }}>
                Your Roadmaps:
              </span>
              {plans.map((p) => {
                const isActive = p.id === activePlanId;
                return (
                  <button
                    key={p.id}
                    onClick={() => loadPlanDetail(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-subtle)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'var(--transition)',
                    }}
                  >
                    <span>{p.title}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: p.progress_percentage === 100 ? '#10b98133' : '#6366f133',
                        color: p.progress_percentage === 100 ? '#10b981' : '#a5b4fc',
                        fontWeight: 700,
                      }}
                    >
                      {p.progress_percentage}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Study Plan Detail */}
            {loadingActivePlan ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                <p style={{ fontSize: '0.85rem' }}>Loading daily roadmap...</p>
              </div>
            ) : activePlan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Plan Metadata & Progress Header Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                        {activePlan.document_title}
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                        {activePlan.target_exam}
                      </span>
                      <span
                        className={activePlan.status === 'completed' ? 'badge badge-emerald' : 'badge badge-amber'}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {activePlan.status === 'completed' ? '✓ Completed' : 'In Progress'}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
                      {activePlan.title}
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                      Duration: <strong>{activePlan.duration_days} Days</strong> • Completed <strong>{activePlan.completed_tasks}</strong> of <strong>{activePlan.total_tasks}</strong> tasks
                    </p>
                  </div>

                  {/* Progress Meter & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Roadmap Progress
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: activePlan.progress_percentage === 100 ? '#10b981' : '#6366f1' }}>
                        {activePlan.progress_percentage}%
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeletePlan(activePlan.id, activePlan.title, e)}
                      title="Delete Study Plan"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-dim)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '7px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${activePlan.progress_percentage}%`,
                      background: activePlan.progress_percentage === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 12px rgba(99, 102, 241, 0.3)',
                    }}
                  />
                </div>

                {/* Days Timeline List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                  {activePlan.days?.map((day) => {
                    const allDayDone = day.tasks.every((t) => t.completed);
                    return (
                      <div
                        key={day.day_number}
                        style={{
                          background: 'var(--bg-card)',
                          border: day.is_gap_focus ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '20px 22px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        {/* Day Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: allDayDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                  color: allDayDone ? '#10b981' : '#a5b4fc',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                Day {day.day_number}
                              </span>

                              {day.is_gap_focus && (
                                <span className="badge badge-rose" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Flame size={11} />
                                  <span>Weak Area Remediation ({day.gap_accuracy}%)</span>
                                </span>
                              )}

                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} />
                                <span>~{day.estimated_minutes} mins</span>
                              </span>
                            </div>

                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                              {day.theme}
                            </h3>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Topic: <strong style={{ color: '#e2e8f0' }}>{day.primary_topic}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Tasks Checklist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {day.tasks.map((task) => {
                            const isDone = task.completed;
                            return (
                              <div
                                key={task.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  background: isDone ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                                  border: isDone ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '12px 14px',
                                  transition: 'var(--transition)',
                                }}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() => handleToggleTask(task.id, isDone)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: isDone ? '#10b981' : 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    marginTop: '2px',
                                  }}
                                  title={isDone ? 'Mark as Incomplete' : 'Mark as Completed'}
                                >
                                  {isDone ? <CheckCircle2 size={19} color="#10b981" /> : <Circle size={19} />}
                                </button>

                                {/* Task Details */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                                    <h4
                                      style={{
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        color: isDone ? '#94a3b8' : '#f8fafc',
                                        textDecoration: isDone ? 'line-through' : 'none',
                                        margin: 0,
                                      }}
                                    >
                                      {task.title}
                                    </h4>

                                    <span
                                      style={{
                                        fontSize: '0.66rem',
                                        padding: '1px 6px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-dim)',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {task.type}
                                    </span>

                                    {task.reference_page && (
                                      <span
                                        className="badge badge-cyan"
                                        style={{ fontSize: '0.66rem', padding: '1px 6px' }}
                                      >
                                        📖 Page {task.reference_page}
                                      </span>
                                    )}
                                  </div>

                                  <p
                                    style={{
                                      fontSize: '0.8rem',
                                      color: isDone ? '#64748b' : 'var(--text-muted)',
                                      margin: 0,
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    {task.description}
                                  </p>
                                </div>

                                {/* Direct Action CTAs */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  {task.type === 'reading' && (
                                    <button
                                      onClick={() => onNavigateToChatWithTopic?.(day.primary_topic)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#a5b4fc',
                                        padding: '5px 9px',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                      }}
                                      title="Ask Study Assistant to explain this topic"
                                    >
                                      <MessageSquare size={11} />
                                      <span>Ask AI</span>
                                    </button>
                                  )}

                                  {task.type === 'drill' && (
                                    <button
                                      onClick={() => onNavigateToQuizWithTopic?.(day.primary_topic)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#6ee7b7',
                                        padding: '5px 9px',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                      }}
                                      title="Open practice tests for this topic"
                                    >
                                      <HelpCircle size={11} />
                                      <span>Take Quiz</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Generate Study Plan Modal */}
        {showModal && (
          <div
            style={{
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
            }}
          >
            <div
              className="animate-fade-in"
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '520px',
                padding: '28px',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} color="#6366f1" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Generate Personalized Study Plan
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGeneratePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Source Material */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Source Study Material
                  </label>
                  <select
                    value={genDocId}
                    onChange={(e) => setGenDocId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.page_count} pages)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Exam / Objective */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Study Goal / Target Exam
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm DSA Exam, Comprehensive Finals, Topic Mastery"
                    value={genExamTarget}
                    onChange={(e) => setGenExamTarget(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Duration Days */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Study Duration: <strong>{genDuration} Days</strong>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { days: 3, label: '3 Days (Sprint)' },
                      { days: 5, label: '5 Days (Balanced)' },
                      { days: 7, label: '7 Days (Deep Prep)' },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setGenDuration(opt.days)}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: genDuration === opt.days ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: genDuration === opt.days ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                          color: genDuration === opt.days ? '#ffffff' : 'var(--text-dim)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Focus Topic (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Focus on Specific Weak Topic (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dynamic Programming (leave blank to auto-address all gaps)"
                    value={genFocusTopic}
                    onChange={(e) => setGenFocusTopic(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                    The engine automatically prioritizes topics where your accuracy is under 60%.
                  </span>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      padding: '9px 18px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '9px 20px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isGenerating ? 'wait' : 'pointer',
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    <Sparkles size={15} />
                    <span>{isGenerating ? 'Synthesizing Schedule...' : 'Generate Roadmap'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
