import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, Trash2, Eye, Filter, 
  Search, BookOpen, AlertCircle, FilePlus, Sparkles, Shield
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
      setUploadError('Please select a PDF document.');
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
      setUploadError(err.message || 'Error processing document');
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
      width: '350px',
      minWidth: '330px',
      maxWidth: '370px',
      borderRight: '1px solid var(--border-subtle)',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 63px)',
      overflow: 'hidden',
    }}>
      {/* Upload Header Area */}
      <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={17} color="#6366f1" />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Study Materials</h2>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            {documents.length} Loaded
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
            padding: '16px 12px',
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
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
          }}>
            <UploadCloud size={18} color="#818cf8" />
          </div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 2px' }}>
            {uploading ? 'Analyzing & indexing document...' : 'Upload Notes or Textbook (PDF)'}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
            Click to browse or drop file here
          </p>
        </div>

        {/* Optional Custom Title input */}
        <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Custom title (optional)..."
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '6px 11px',
              fontSize: '0.78rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
        </div>

        {/* Error notification */}
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
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search in:</span>
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
              placeholder="Filter materials..."
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
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {loadingDocuments ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '0.82rem' }}>Loading study materials...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
          }}>
            <FilePlus size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              No study materials yet
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Upload your lecture notes, textbook chapters, or syllabus PDF to start asking questions.
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
                  padding: '11px 13px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.025)',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                {/* Document Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: '6px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileText size={15} color={isSelected ? '#ffffff' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '0.84rem',
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
                      fontSize: '0.7rem',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
                    {doc.page_count} {doc.page_count === 1 ? 'Page' : 'Pages'}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.66rem' }}>
                    {doc.chunk_count} Sections Indexed
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
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    color: isSelected ? '#818cf8' : 'var(--text-dim)',
                    fontWeight: isSelected ? 600 : 400,
                  }}>
                    {isSelected ? '✓ Filter active' : 'Click to focus search'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectChunks(doc);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.7rem', height: '24px' }}
                      title="Inspect extracted text sections"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDoc(doc.id, doc.title);
                      }}
                      className="btn btn-danger-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.7rem', height: '24px' }}
                      title="Remove document"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clean Privacy / Student Footer (replaces the raw embedding model line) */}
      <div style={{
        padding: '11px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.25)',
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <Shield size={13} color="#10b981" />
        <span>Study materials are kept secure & private</span>
      </div>
    </aside>
  );
}
