import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Clock,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function QuizWorkspace({
  documents,
  selectedDocId,
  onNavigateToAnalytics,
  onNavigateToChat,
  showToast,
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [filterDoc, setFilterDoc] = useState(selectedDocId || '');

  // Quiz Taking State
  const [activeQuiz, setActiveQuiz] = useState(null); // The full quiz object loaded for taking
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: selectedIndex }
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState(null); // Result after submission

  // Quiz Generator Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genDocId, setGenDocId] = useState(selectedDocId || (documents[0]?.id || ''));
  const [genTopic, setGenTopic] = useState('');
  const [genNumQuestions, setGenNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [filterDoc]);

  // If selectedDocId changes externally, update filter
  useEffect(() => {
    if (selectedDocId) {
      setFilterDoc(selectedDocId);
      setGenDocId(selectedDocId);
    }
  }, [selectedDocId]);

  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const url = filterDoc ? `/api/quizzes?document_id=${filterDoc}` : '/api/quizzes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (!res.ok) throw new Error('Failed to load quiz');
      const data = await res.json();
      setActiveQuiz(data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setAttemptResult(null);
    } catch (err) {
      showToast?.('Failed to load quiz', 'error');
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    if (attemptResult) return; // Read-only in review mode
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = activeQuiz.questions.length;

    if (answeredCount < totalCount) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${totalCount} questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: 'Student Learner',
          answers: userAnswers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Quiz submission failed');
      }

      const result = await res.json();
      setAttemptResult(result);
      showToast?.(`Quiz submitted! You scored ${result.percentage}%`, 'success');
      fetchQuizzes(); // Refresh attempt counts
    } catch (err) {
      showToast?.(err.message || 'Error submitting quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!genDocId) {
      showToast?.('Please select a study material document', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        document_id: parseInt(genDocId, 10),
        num_questions: parseInt(genNumQuestions, 10),
        topic: genTopic.trim() || null,
      };

      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Quiz generation failed');
      }

      const data = await res.json();
      showToast?.(`Generated "${data.title}" with ${data.question_count} questions!`, 'success');
      setShowGenerateModal(false);
      setGenTopic('');
      await fetchQuizzes();
      // Immediately open the newly generated quiz
      handleStartQuiz(data.quiz_id);
    } catch (err) {
      showToast?.(err.message || 'Error generating quiz', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuiz = async (quizId, title, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete quiz "${title}" and its attempt history?`)) return;

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast?.('Quiz deleted', 'info');
        if (activeQuiz?.id === quizId) {
          setActiveQuiz(null);
          setAttemptResult(null);
        }
        fetchQuizzes();
      }
    } catch (err) {
      showToast?.('Error deleting quiz', 'error');
    }
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setAttemptResult(null);
    setCurrentQuestionIndex(0);
  };

  const handleExitQuiz = () => {
    setActiveQuiz(null);
    setAttemptResult(null);
    setUserAnswers({});
  };

  // =========================================================================
  // VIEW: Quiz Taking & Review Interface
  // =========================================================================
  if (activeQuiz) {
    const questions = activeQuiz.questions || [];
    const currentQ = questions[currentQuestionIndex];
    const isAnswered = currentQ ? userAnswers[currentQ.id] !== undefined : false;
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    // Review Mode Info
    const reviewEvaluation = attemptResult?.questions?.find((q) => q.question_id === currentQ?.id);

    return (
      <main style={{ flex: 1, height: 'calc(100vh - 63px)', overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Bar Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleExitQuiz}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Quiz Catalog</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                {activeQuiz.document_title}
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                {activeQuiz.topic}
              </span>
            </div>
          </div>

          {/* Submission Result Banner */}
          {attemptResult && (
            <div
              className="animate-fade-in"
              style={{
                background:
                  attemptResult.percentage >= 80
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)'
                    : attemptResult.percentage >= 60
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
                border: `1px solid ${
                  attemptResult.percentage >= 80
                    ? 'rgba(16, 185, 129, 0.4)'
                    : attemptResult.percentage >= 60
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'rgba(244, 63, 94, 0.4)'
                }`,
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background:
                      attemptResult.percentage >= 80
                        ? 'rgba(16, 185, 129, 0.2)'
                        : attemptResult.percentage >= 60
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'rgba(244, 63, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    color:
                      attemptResult.percentage >= 80
                        ? '#10b981'
                        : attemptResult.percentage >= 60
                        ? '#818cf8'
                        : '#f43f5e',
                    boxShadow: '0 0 16px rgba(0,0,0,0.2)',
                  }}
                >
                  {attemptResult.percentage}%
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', color: '#f8fafc' }}>
                    {attemptResult.percentage >= 80
                      ? '🎉 Outstanding Concept Mastery!'
                      : attemptResult.percentage >= 60
                      ? '👍 Proficient Understanding!'
                      : '⚠️ Concept Revision Recommended'}
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    You scored <strong>{attemptResult.score}</strong> out of <strong>{attemptResult.total_questions}</strong> questions correctly. Review the grounded explanations below to strengthen your understanding.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleRetakeQuiz}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: '#f8fafc',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Retake Quiz</span>
                </button>
                <button
                  onClick={onNavigateToAnalytics}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <TrendingUp size={14} />
                  <span>View Analytics</span>
                </button>
              </div>
            </div>
          )}

          {/* Quiz Stepper & Progress */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 0', color: '#f8fafc' }}>
                  {activeQuiz.title}
                </h3>
              </div>

              {/* Status pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="badge badge-emerald"
                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>{answeredCount} / {questions.length} Answered</span>
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
                  transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>

            {/* Question Quick Jump Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {questions.map((q, idx) => {
                const answered = userAnswers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                let dotBg = 'rgba(255, 255, 255, 0.06)';
                let dotBorder = '1px solid var(--border-subtle)';
                let dotColor = 'var(--text-dim)';

                if (attemptResult) {
                  const evalQ = attemptResult.questions?.find((eq) => eq.question_id === q.id);
                  if (evalQ?.is_correct) {
                    dotBg = 'rgba(16, 185, 129, 0.2)';
                    dotBorder = '1px solid #10b981';
                    dotColor = '#10b981';
                  } else {
                    dotBg = 'rgba(244, 63, 94, 0.2)';
                    dotBorder = '1px solid #f43f5e';
                    dotColor = '#f43f5e';
                  }
                } else if (answered) {
                  dotBg = 'rgba(99, 102, 241, 0.25)';
                  dotBorder = '1px solid #6366f1';
                  dotColor = '#a5b4fc';
                }

                if (isCurrent) {
                  dotBorder = '2px solid #06b6d4';
                  dotBg = 'rgba(6, 182, 212, 0.25)';
                  dotColor = '#ffffff';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: dotBg,
                      border: dotBorder,
                      color: dotColor,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div
              className="animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Question Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                  {currentQ.topic || 'Core Concept'}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-dim)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Difficulty: {currentQ.difficulty || 'Medium'}
                </span>
              </div>

              {/* Question Statement */}
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.5, margin: 0 }}>
                {currentQ.question_text}
              </h2>

              {/* Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[currentQ.id] === optIdx;
                  const optLetter = String.fromCharCode(65 + optIdx);

                  // Styling logic in review mode vs taking mode
                  let optBg = 'rgba(255, 255, 255, 0.025)';
                  let optBorder = '1px solid var(--border-subtle)';
                  let optTextColor = '#f1f5f9';
                  let badgeContent = optLetter;

                  if (attemptResult && reviewEvaluation) {
                    const isCorrectAnswer = reviewEvaluation.correct_index === optIdx;
                    const isStudentPick = reviewEvaluation.selected_index === optIdx;

                    if (isCorrectAnswer) {
                      optBg = 'rgba(16, 185, 129, 0.15)';
                      optBorder = '1px solid #10b981';
                      optTextColor = '#34d399';
                      badgeContent = '✓';
                    } else if (isStudentPick && !isCorrectAnswer) {
                      optBg = 'rgba(244, 63, 94, 0.15)';
                      optBorder = '1px solid #f43f5e';
                      optTextColor = '#fda4af';
                      badgeContent = '✗';
                    }
                  } else if (isSelected) {
                    optBg = 'rgba(99, 102, 241, 0.16)';
                    optBorder = '1.5px solid #6366f1';
                    optTextColor = '#ffffff';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: optBg,
                        border: optBorder,
                        cursor: attemptResult ? 'default' : 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isSelected && !attemptResult ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected && !attemptResult ? '#ffffff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {badgeContent}
                      </div>
                      <span style={{ fontSize: '0.92rem', color: optTextColor, flex: 1, lineHeight: 1.45 }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Review Explanation Box */}
              {attemptResult && reviewEvaluation && (
                <div
                  className="animate-fade-in"
                  style={{
                    background: 'rgba(99, 102, 241, 0.06)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginTop: '6px',
                  }}
                >
                  <Lightbulb size={20} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Concept Explanation
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      {reviewEvaluation.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Footer Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  marginTop: '8px',
                }}
              >
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: currentQuestionIndex === 0 ? 'var(--text-dim)' : 'var(--text-main)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Previous</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-subtle)',
                        color: '#f8fafc',
                        padding: '8px 18px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Next Question</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : !attemptResult ? (
                    <button
                      disabled={submitting}
                      onClick={handleSubmitQuiz}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '9px 22px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: submitting ? 'wait' : 'pointer',
                        boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{submitting ? 'Evaluating...' : 'Submit & Grade Quiz'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: Quiz Catalog / Dashboard
  // =========================================================================
  return (
    <main style={{ flex: 1, height: 'calc(100vh - 63px)', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Action Banner */}
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
              <Award size={20} color="#6366f1" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Practice Quizzes & Assessments
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
              Reinforce your knowledge with AI-crafted multiple-choice assessments generated directly from your uploaded lecture notes, slides, and textbooks.
            </p>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
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
            <span>Generate New Quiz</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-dim)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Material:</span>
            <select
              value={filterDoc}
              onChange={(e) => setFilterDoc(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
              }}
            >
              <option value="">All Documents ({quizzes.length})</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Showing {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
          </span>
        </div>

        {/* Quiz Cards Grid */}
        {loadingQuizzes ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '0.9rem' }}>Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <HelpCircle size={44} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              No Quizzes Created Yet
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', maxWidth: '420px', margin: '0 auto 18px' }}>
              Click the button below to generate a focused 5-question multiple choice test from your study materials.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid #6366f1',
                color: '#a5b4fc',
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={15} />
              <span>Generate Quiz Now</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {quizzes.map((q) => (
              <div
                key={q.id}
                onClick={() => handleStartQuiz(q.id)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {q.document_title}
                    </span>
                    <h3
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                        margin: '2px 0 0',
                        lineHeight: 1.3,
                      }}
                    >
                      {q.title}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => handleDeleteQuiz(q.id, q.title, e)}
                    title="Delete Quiz"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Metadata badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                    {q.topic}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                    {q.question_count} Questions
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: q.attempt_count > 0 ? '#10b981' : 'var(--text-dim)',
                      marginLeft: 'auto',
                    }}
                  >
                    {q.attempt_count > 0 ? `${q.attempt_count} Attempted` : 'Not yet taken'}
                  </span>
                </div>

                {/* Footer action button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{q.attempt_count > 0 ? 'Retake Test' : 'Start Test'}</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Quiz Modal */}
        {showGenerateModal && (
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
                maxWidth: '500px',
                padding: '28px',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="#6366f1" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Generate Multiple-Choice Quiz
                  </h3>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGenerateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Select Material */}
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

                {/* Target Topic (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Specific Topic Focus (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dynamic Programming, Recursion, Time Complexity"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
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
                    Leave blank to test concepts across all sections of this document.
                  </span>
                </div>

                {/* Number of Questions */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Number of Questions: <strong>{genNumQuestions}</strong>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[3, 5, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGenNumQuestions(num)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          background: genNumQuestions === num ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: genNumQuestions === num ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                          color: genNumQuestions === num ? '#ffffff' : 'var(--text-dim)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
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
                    <span>{isGenerating ? 'Synthesizing Test...' : 'Generate Quiz'}</span>
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
