import React, { useState } from 'react';
import { Sparkles, Layers, HelpCircle, TrendingUp, Calendar, LogOut, User as UserIcon, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, documentCount, backendHealthy }) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const tabs = [
    { id: 'assistant', label: 'Study Assistant', icon: Sparkles },
    { id: 'quizzes', label: 'Quizzes & Tests', icon: HelpCircle },
    { id: 'analytics', label: 'Learner Analytics', icon: TrendingUp },
    { id: 'plans', label: 'Study Plans', icon: Calendar },
  ];

  // Derive user initials
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
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

        {/* Center Tab Navigation */}
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

        {/* Right Controls: Docs counter & User Account Space */}
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
            <span><strong>{documentCount}</strong> {documentCount === 1 ? 'Doc' : 'Docs'}</span>
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

          {/* User Account / Space Pill */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 6px 3px 10px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '24px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#ffffff',
              }}>
                {initials}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
                  {user.full_name}
                </span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                  Private Space
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign Out"
                style={{
                  marginLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
              >
                <LogOut size={12} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.12)',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#f87171',
            }}>
              <LogOut size={22} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              Confirm Sign Out
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to sign out of <strong>{user?.full_name}</strong>'s private study space?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(239, 68, 68, 0.35)',
                  transition: 'opacity 0.2s',
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
