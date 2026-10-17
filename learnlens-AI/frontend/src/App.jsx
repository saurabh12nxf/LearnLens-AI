import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DocumentSidebar from './components/DocumentSidebar';
import ChatWorkspace from './components/ChatWorkspace';
import ChunksModal from './components/ChunksModal';
import PhaseRoadmapModal from './components/PhaseRoadmapModal';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeTab, setActiveTab] = useState('rag');
  const [backendHealthy, setBackendHealthy] = useState(false);

  // RAG Query Settings
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

  // Check health and load documents on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        const healthRes = await fetch('/health');
        if (healthRes.ok) setBackendHealthy(true);
      } catch (err) {
        console.warn('Backend not yet reachable:', err);
      }
      await fetchDocuments();
    };

    initApp();
  }, []);

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
    showToast(`Indexed "${newDoc.title}" (${newDoc.page_count} pages, ${newDoc.chunk_count} chunks)`, 'success');
    fetchDocuments();
  };

  const handleDeleteDoc = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted "${title}"`, 'info');
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
        content: `⚠️ **Unable to complete query:** ${err.message}. Please verify the backend is running and documents are indexed.`,
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

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      {/* Top Navbar */}
      <Navbar
        documentCount={documents.length}
        backendHealthy={backendHealthy}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRoadmap={() => setShowRoadmap(true)}
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
        />

        {/* Center/Right Grounded Q&A Workspace */}
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
      </div>

      {/* Chunks Inspector Modal */}
      {inspectingDoc && (
        <ChunksModal
          doc={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      {/* 3 Pillars Architecture & Roadmap Modal */}
      {showRoadmap && (
        <PhaseRoadmapModal
          onClose={() => setShowRoadmap(false)}
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
