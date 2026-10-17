import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, CheckCircle, Trash2, Eye, Filter, 
  Search, BookOpen, Clock, AlertCircle, FilePlus, Sparkles 
} from 'lucide-react';

export default function DocumentSidebar({
  documents,
  loadingDocuments,
  selectedDocId,
  setSelectedDocId,
  onUploadSuccess,
  onInspectChunks,
  onDeleteDoc,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are currently supported.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customTitle.trim()) {
      formData.append('title', customTitle.trim());
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setCustomTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess(data.document);
    } catch (err) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  };

  return (
    <aside style={{
      width: '360px',
      minWidth: '340px',
      maxWidth: '380px',
      borderRight: '1px solid var(--border-subtle)',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 69px)',
      overflow: 'hidden',
    }}>
      {/* Upload Header Area */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#6366f1" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Study Library</h2>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
            {documents.length} Available
          </span>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragOver ? '2px dashed #6366f1' : '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 14px',
            textAlign: 'center',
            background: dragOver ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".pdf"
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
          }}>
            <UploadCloud size={20} color="#818cf8" />
          </div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 3px' }}>
            {uploading ? 'Processing PDF & Vectorizing...' : 'Upload Study Material (PDF)'}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
            Drag & drop or click to browse
          </p>
        </div>

        {/* Optional Custom Title input */}
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Custom title (optional)..."
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: '0.78rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
        </div>

        {/* Error notification if any */}
        {uploadError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '6px 10px',
            background: 'rgba(244, 63, 94, 0.15)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            fontSize: '0.75rem',
          }}>
            <AlertCircle size={14} />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Scope Selector: All Documents vs Single Document */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Query Scope:</span>
        <button
          onClick={() => setSelectedDocId(null)}
          className={`btn ${selectedDocId === null ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '12px',
            height: '24px',
          }}
        >
          <Filter size={11} />
          <span>All Documents</span>
        </button>
      </div>

      {/* Search Filter for Documents */}
      {documents.length > 3 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 10px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <Search size={13} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search uploaded files..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
      )}

      {/* Documents List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {loadingDocuments ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '0.82rem' }}>Loading study materials...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
          }}>
            <FilePlus size={32} color="#64748b" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              No documents yet
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Upload your lecture notes, DSA textbooks, or study materials to start grounded RAG Q&A.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(isSelected ? null : doc.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  position: 'relative',
                }}
              >
                {/* Document Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileText size={16} color={isSelected ? '#ffffff' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: isSelected ? '#a5b4fc' : '#f8fafc',
                      margin: '0 0 2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {doc.title}
                    </h3>
                    <p style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {doc.filename}
                    </p>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
                    {doc.page_count} {doc.page_count === 1 ? 'Page' : 'Pages'}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.66rem' }}>
                    {doc.chunk_count} Chunks
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                    {formatFileSize(doc.file_size)}
                  </span>
                </div>

                {/* Card Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      color: isSelected ? '#818cf8' : 'var(--text-dim)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {isSelected ? '✓ Filter active' : 'Click to filter'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectChunks(doc);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '3px 7px', fontSize: '0.72rem', height: '26px' }}
                      title="Inspect pgvector chunks"
                    >
                      <Eye size={13} />
                      <span>Chunks</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDoc(doc.id, doc.title);
                      }}
                      className="btn btn-danger-ghost"
                      style={{ padding: '3px 7px', fontSize: '0.72rem', height: '26px' }}
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} color="#6366f1" />
          <span>Embedding: <strong>all-MiniLM-L6-v2 (384d)</strong></span>
        </div>
      </div>
    </aside>
  );
}
