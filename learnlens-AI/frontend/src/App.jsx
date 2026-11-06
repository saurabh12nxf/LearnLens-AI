import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DocumentSidebar from './components/DocumentSidebar';
import ChatWorkspace from './components/ChatWorkspace';
import QuizWorkspace from './components/QuizWorkspace';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import StudyPlanWorkspace from './components/StudyPlanWorkspace';
import ChunksModal from './components/ChunksModal';
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function AuthenticatedWorkspace() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(false);

  // Active Tab: 'assistant' | 'quizzes' | 'analytics' | 'plans'
  const [activeTab, setActiveTab] = useState('assistant');
  const [focusTopicForPlan, setFocusTopicForPlan] = useState('');

  // Search & Retrieval Settings
  const [retrievalMethod, setRetrievalMethod] = useState('semantic');
  const [topK, setTopK] = useState(4);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check health and load documents whenever authenticated user changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const initApp = async () => {
      try {
        const healthRes = await fetch('/health');
        if (healthRes.ok) setBackendHealthy(true);
      } catch (err) {
        console.warn('Backend not yet reachable:', err);
      }
      await fetchDocuments();
    };

    // Reset workspace state for new user
    setMessages([]);
    setSelectedDocId(null);
    initApp();
  }, [user?.id, isAuthenticated]);

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    showToast(`Added "${newDoc.title}" (${newDoc.page_count} pages)`, 'success');
    fetchDocuments();
  };

  const handleDeleteDoc = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Removed "${title}"`, 'info');
        if (selectedDocId === docId) setSelectedDocId(null);
        fetchDocuments();
      } else {
        showToast('Failed to delete document', 'error');
      }
    } catch (err) {
      showToast('Error deleting document', 'error');
    }
  };

  const handleSendMessage = async (question) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = {
      role: 'user',
      content: question,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const payload = {
        question,
        document_id: selectedDocId,
        top_k: topK,
        retrieval_method: retrievalMethod,
      };

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Query request failed');
      }

      const data = await res.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        model: data.model_used,
        retrieval_method: data.retrieval_method,
        chunks_used: data.chunks_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `⚠️ **Unable to find an answer:** ${err.message}. Please verify the backend is connected and documents are uploaded.`,
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    showToast('Conversation cleared', 'info');
  };

  // If verifying token, show sleek loading indicator
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0b0f19',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-muted)',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.88rem' }}>Loading LearnLens Workspace...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not authenticated, render production landing & auth page
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      {/* Top Navbar with User Profile & Private Space */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        backendHealthy={backendHealthy}
      />

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Left Document Management Sidebar */}
        <DocumentSidebar
          documents={documents}
          loadingDocuments={loadingDocuments}
          selectedDocId={selectedDocId}
          setSelectedDocId={setSelectedDocId}
          onUploadSuccess={handleUploadSuccess}
          onInspectChunks={(doc) => setInspectingDoc(doc)}
          onDeleteDoc={handleDeleteDoc}
          onPracticeQuiz={(doc) => {
            setSelectedDocId(doc.id);
            setActiveTab('quizzes');
          }}
        />

        {/* Dynamic Tab View */}
        {activeTab === 'assistant' && (
          <ChatWorkspace
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading}
            onClearChat={handleClearChat}
            selectedDoc={selectedDoc}
            retrievalMethod={retrievalMethod}
            setRetrievalMethod={setRetrievalMethod}
            topK={topK}
            setTopK={setTopK}
          />
        )}

        {activeTab === 'quizzes' && (
          <QuizWorkspace
            documents={documents}
            selectedDocId={selectedDocId}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
            onNavigateToChat={() => setActiveTab('assistant')}
            showToast={showToast}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            onNavigateToQuiz={() => setActiveTab('quizzes')}
            onNavigateToChatWithTopic={(topic) => {
              setActiveTab('assistant');
              handleSendMessage(`Can you explain ${topic} in detail with core principles and examples based on my study notes?`);
            }}
            onNavigateToStudyPlanWithTopic={(topic) => {
              setFocusTopicForPlan(topic);
              setActiveTab('plans');
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'plans' && (
          <StudyPlanWorkspace
            documents={documents}
            selectedDocId={selectedDocId}
            initialFocusTopic={focusTopicForPlan}
            onNavigateToChatWithTopic={(topic) => {
              setActiveTab('assistant');
              handleSendMessage(`Can you explain ${topic} in detail with core principles and examples based on my study notes?`);
            }}
            onNavigateToQuizWithTopic={() => {
              setActiveTab('quizzes');
            }}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
            showToast={showToast}
          />
        )}
      </div>

      {/* Document Content Preview Modal */}
      {inspectingDoc && (
        <ChunksModal
          doc={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'error' ? '#f43f5e' : toast.type === 'success' ? '#10b981' : '#6366f1',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }} className="animate-fade-in">
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedWorkspace />
    </AuthProvider>
  );
}
