import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  BrainCircuit, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Key, 
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LandingPage() {
  const { login, signup, demoLogin } = useAuth();
  
  // mode: 'signin' | 'signup' | 'forgot_password'
  const [authMode, setAuthMode] = useState('signin');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Helper to trigger browser / password manager save prompt (Credential Management API)
  const promptPasswordManagerSave = async (email, password, name) => {
    if (typeof window !== 'undefined' && window.PasswordCredential && navigator.credentials?.store) {
      try {
        const cred = new window.PasswordCredential({
          id: email.trim(),
          password: password,
          name: name?.trim() || email.trim(),
        });
        await navigator.credentials.store(cred);
      } catch (credErr) {
        // Silently handled if user dismisses prompt or browser restricts
        console.debug('Password manager prompt note:', credErr);
      }
    }
  };

  const handleSignInOrSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const emailTrimmed = formData.email.trim();
    const isSignUp = authMode === 'signup';

    if (isSignUp) {
      if (!formData.fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signup(formData.fullName.trim(), emailTrimmed, formData.password);
        // Prompt password manager to save new credentials
        await promptPasswordManagerSave(emailTrimmed, formData.password, formData.fullName);
      } else {
        await login(emailTrimmed, formData.password);
        // Prompt password manager on login as well
        await promptPasswordManagerSave(emailTrimmed, formData.password, emailTrimmed);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      setError('Please enter your registered email address.');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: emailTrimmed,
        new_password: formData.newPassword,
      });

      setSuccessMessage(res.message || 'Password updated successfully! You can now sign in.');
      setAuthMode('signin');
      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSuccessMessage(null);
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(11, 15, 25, 1) 75%)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Top Navigation */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              LearnLens<span style={{ background: 'linear-gradient(135deg, #818cf8, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.AI</span>
            </span>
            <span style={{ 
              marginLeft: '10px', 
              fontSize: '0.68rem', 
              background: 'rgba(99, 102, 241, 0.18)', 
              color: '#a5b4fc', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 600
            }}>
              Multi-Tenant v3.0
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6ee7b7' }}>
            <ShieldCheck size={16} />
            <span>Isolated User Workspaces</span>
          </div>
        </div>
      </header>

      {/* Hero & Auth Grid */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '50px 24px',
        display: 'grid',
        gridTemplateColumns: '1.15fr 0.85fr',
        gap: '48px',
        alignItems: 'center',
      }}>
        {/* Left Column: Product Value Proposition */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '6px 14px',
            borderRadius: '24px',
            fontSize: '0.82rem',
            color: '#c7d2fe',
            marginBottom: '20px',
            fontWeight: 600,
          }}>
            <BrainCircuit size={15} color="#818cf8" />
            <span>AI-Driven Personalized Learning & Analytics</span>
          </div>

          <h1 style={{
            fontSize: '3rem',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
          }}>
            Transform Your Notes into an <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Adaptive AI Tutor</span>
          </h1>

          <p style={{
            fontSize: '1.08rem',
            lineHeight: 1.6,
            color: 'var(--text-muted)',
            margin: '0 0 32px 0',
            maxWidth: '580px',
          }}>
            Upload PDFs, get answers strictly grounded with page-level citations, test your recall with AI-generated quizzes, and execute personalized study roadmaps tailored to your weaknesses.
          </p>

          {/* Pillars List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={16} color="#818cf8" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0' }}>
                <strong>Grounded RAG Assistant:</strong> Direct source attribution & page citations without hallucinations.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={16} color="#06b6d4" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0' }}>
                <strong>Adaptive AI Quizzes:</strong> Topic-tagged multiple-choice tests with instant reasoning & explanations.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0' }}>
                <strong>Knowledge Gap Detection:</strong> Automatic diagnosis of weak concepts (&lt; 60% mastery threshold).
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0' }}>
                <strong>Dynamic Study Plans:</strong> Multi-day adaptive roadmaps with interactive task checklists.
              </span>
            </div>
          </div>

          {/* Privacy & Tenant Isolation Assurance */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            maxWidth: '540px',
          }}>
            <Lock size={18} color="#10b981" />
            <span style={{ fontSize: '0.8rem', color: '#a7f3d0', lineHeight: 1.4 }}>
              <strong>Multi-Tenant Workspace Isolation:</strong> Every account is completely private. Your documents, quizzes, and score history are never shared.
            </span>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div style={{
          background: 'rgba(18, 24, 38, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
          backdropFilter: 'blur(20px)',
        }}>
          {authMode !== 'forgot_password' ? (
            <>
              {/* Auth Tab Switcher */}
              <div style={{
                display: 'flex',
                background: 'rgba(11, 15, 25, 0.6)',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '28px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: authMode === 'signin' ? '#ffffff' : 'var(--text-muted)',
                    background: authMode === 'signin' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: authMode === 'signup' ? '#ffffff' : 'var(--text-muted)',
                    background: authMode === 'signup' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Create Account
                </button>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                {authMode === 'signup' ? 'Create your study space' : 'Welcome back, student'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 24px 0' }}>
                {authMode === 'signup' 
                  ? 'Join LearnLens AI to track your mastery with isolated analytics' 
                  : 'Sign in to access your notes, quizzes, and customized study plans'}
              </p>

              {/* Success Notification Banner */}
              {successMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  color: '#6ee7b7',
                  fontSize: '0.82rem',
                  marginBottom: '20px',
                }}>
                  <CheckCircle2 size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  marginBottom: '20px',
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Form with browser password manager compatibility */}
              <form
                method="post"
                autoComplete="on"
                onSubmit={handleSignInOrSignUp}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {authMode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <UserIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="text"
                        name="name"
                        id="signup-name"
                        autoComplete="name"
                        required
                        placeholder="e.g. Alex Morgan"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 14px 11px 40px',
                          background: 'rgba(11, 15, 25, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="email"
                      name="username"
                      id="auth-username"
                      autoComplete="username email"
                      required
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(11, 15, 25, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Password {authMode === 'signup' && <span style={{ color: 'var(--text-dim)' }}>(min. 6 characters)</span>}
                    </label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot_password');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#818cf8',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="password"
                      name="password"
                      id="auth-password"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(11, 15, 25, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="password"
                        name="confirm-password"
                        id="signup-confirm-password"
                        autoComplete="new-password"
                        required
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 14px 11px 40px',
                          background: 'rgba(11, 15, 25, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '10px',
                    padding: '13px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <span>Please wait...</span>
                  ) : (
                    <>
                      <span>{authMode === 'signup' ? 'Create Isolated Account' : 'Sign In to Workspace'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Login Divider & Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '22px 0 16px 0',
                gap: '12px',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Instant Tester Login
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#c7d2fe',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: demoLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={15} color="#818cf8" />
                <span>{demoLoading ? 'Signing in demo account...' : '1-Click Quick Demo Sign In'}</span>
              </button>
            </>
          ) : (
            /* Forgot Password / Reset Workflow */
            <div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: '20px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </button>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                Reset Your Password
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                Enter your registered account email and set a new password to regain access to your private workspace.
              </p>

              {/* Error Banner */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  marginBottom: '20px',
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form
                method="post"
                autoComplete="on"
                onSubmit={handleResetPassword}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Registered Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="email"
                      name="username"
                      id="reset-username"
                      autoComplete="username email"
                      required
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(11, 15, 25, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    New Password <span style={{ color: 'var(--text-dim)' }}>(min. 6 characters)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="password"
                      name="new-password"
                      id="reset-new-password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(11, 15, 25, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="password"
                      name="confirm-new-password"
                      id="reset-confirm-new-password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      value={formData.confirmNewPassword}
                      onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(11, 15, 25, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '10px',
                    padding: '13px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <RotateCcw size={16} />
                  <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
      }}>
        LearnLens AI — Grounded RAG, Learner Performance Analytics & Adaptive Recommendation Engine
      </footer>
    </div>
  );
}
