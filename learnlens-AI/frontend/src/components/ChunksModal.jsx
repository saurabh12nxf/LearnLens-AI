import React, { useState, useEffect } from 'react';
import { X, Database, Layers, CheckCircle, Search, FileText } from 'lucide-react';

export default function ChunksModal({ doc, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!doc) return;
    const fetchChunks = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${doc.id}/chunks?limit=50`);
        if (!res.ok) throw new Error('Failed to load chunks');
        const data = await res.json();
        setChunks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChunks();
  }, [doc]);

  if (!doc) return null;

  const filteredChunks = chunks.filter((c) =>
    c.chunk_text.toLowerCase().includes(filterQuery.toLowerCase()) ||
    `page ${c.page_number}`.includes(filterQuery.toLowerCase())
  );

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
          width: '800px',
          maxWidth: '100%',
          maxHeight: '85vh',
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
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={18} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                pgvector Chunks Inspector
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                {doc.title} ({doc.chunk_count} total chunks, {doc.page_count} pages)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter and stats toolbar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.2)',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            padding: '6px 12px',
            flex: 1,
            maxWidth: '360px',
          }}>
            <Search size={14} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search in chunks..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              <CheckCircle size={12} />
              <span>384-Dim Vectorized</span>
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
              Sliding Window: 512 tokens
            </span>
          </div>
        </div>

        {/* Chunks List */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0' }}>
              Loading chunks from PostgreSQL pgvector...
            </p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: 'var(--accent-rose)', padding: '30px 0' }}>
              {error}
            </p>
          ) : filteredChunks.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0' }}>
              No matching chunks found.
            </p>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#a5b4fc',
                      background: 'rgba(99, 102, 241, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      Chunk #{chunk.chunk_index}
                    </span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                      Page {chunk.page_number}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                    ✓ Embedded in pgvector
                  </span>
                </div>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {chunk.chunk_text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
