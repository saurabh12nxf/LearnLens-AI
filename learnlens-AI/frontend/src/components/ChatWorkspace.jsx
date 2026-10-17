import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Sparkles, BookOpen, Check, Copy, Volume2, 
  RotateCcw, Sliders, ChevronDown, ChevronUp, ExternalLink, 
  Bot, User, FileText, ArrowRight, ShieldCheck, CheckCircle2,
  Zap, Search, Compass, Info
} from 'lucide-react';

export default function ChatWorkspace({
  messages,
  onSendMessage,
  loading,
  onClearChat,
  selectedDoc,
  retrievalMethod,
  setRetrievalMethod,
  topK,
  setTopK,
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedCitations, setExpandedCitations] = useState({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const cleanText = text.replace(/\[Page \d+\]/g, '').replace(/[#*`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleCitations = (index) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const sampleQuestions = [
    { text: "What is dynamic programming?", category: "Exam Concept" },
    { text: "What is the average time complexity of searching a binary search tree?", category: "Quick Recall" },
    { text: "What are the two key components of recursion?", category: "Key Definitions" },
    { text: "Explain divide and conquer vs recursion with examples", category: "Comparison" },
  ];

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 63px)',
      background: 'var(--bg-dark)',
      position: 'relative',
    }}>
      {/* Top Controls Toolbar */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 20, 34, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 10,
      }}>
        {/* Left: Scope & Student-Friendly Search Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Active Scope Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            color: selectedDoc ? '#a5b4fc' : 'var(--text-muted)',
            background: selectedDoc ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: selectedDoc ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-subtle)',
          }}>
            <FileText size={13} />
            <span>Scope: <strong>{selectedDoc ? selectedDoc.title : 'All Materials'}</strong></span>
          </div>

          {/* Student-Friendly Search Mode (Smart Concept vs Exact Keyword) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: 'var(--radius-full)',
            padding: '2px',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => setRetrievalMethod('semantic')}
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                background: retrievalMethod === 'semantic' ? 'var(--accent-primary)' : 'transparent',
                color: retrievalMethod === 'semantic' ? '#ffffff' : 'var(--text-muted)',
                transition: 'var(--transition)',
              }}
              title="AI understands concepts and synonyms across your notes"
            >
              Smart Search
            </button>
            <button
              onClick={() => setRetrievalMethod('keyword_baseline')}
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                background: retrievalMethod === 'keyword_baseline' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: retrievalMethod === 'keyword_baseline' ? '#ffffff' : 'var(--text-dim)',
                transition: 'var(--transition)',
              }}
              title="Looks for exact matching words in documents"
            >
              Exact Match
            </button>
          </div>
        </div>

        {/* Right: Study Depth (Quick / Balanced / Thorough) & Clear Chat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <Sliders size={13} />
            <span>Depth:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.74rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={2}>Quick (2 Sources)</option>
              <option value={4}>Balanced (4 Sources)</option>
              <option value={6}>Thorough (6 Sources)</option>
            </select>
          </div>

          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="btn btn-ghost"
              style={{ fontSize: '0.74rem', padding: '4px 10px', height: '26px' }}
              title="Reset conversation"
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {messages.length === 0 ? (
          /* Empty State: Student-Centric Welcome Hero Banner */
          <div style={{
            maxWidth: '740px',
            margin: 'auto',
            textAlign: 'center',
            padding: '24px 16px',
          }} className="animate-fade-in">
            {/* Glow Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <Sparkles size={28} color="#818cf8" />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
              Study with <span className="text-gradient">verified citations</span>
            </h2>

            <p style={{
              fontSize: '0.92rem',
              color: 'var(--text-muted)',
              maxWidth: '560px',
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}>
              Ask questions directly from your lecture notes, textbook chapters, and exam materials. LearnLens gives you clear, structured answers backed by exact page citations—so you can study with 100% confidence.
            </p>

            {/* Student Trust Guarantees */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: '#6ee7b7',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}>
                <ShieldCheck size={14} />
                <span>Strictly Grounded (No Hallucinations)</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: '#67e8f9',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}>
                <BookOpen size={14} />
                <span>Exact Page Citations [Page X]</span>
              </div>
            </div>

            {/* Quick Starter Prompts */}
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                textAlign: 'center',
              }}>
                Try asking a question:
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '10px',
              }}>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(q.text);
                      inputRef.current?.focus();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#818cf8', display: 'block', marginBottom: '2px', fontWeight: 600 }}>
                        {q.category}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                        {q.text}
                      </span>
                    </div>
                    <ArrowRight size={14} color="var(--text-dim)" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Render Conversation Messages */
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '850px',
                margin: '0 auto',
                width: '100%',
              }}
              className="animate-fade-in"
            >
              {/* Message Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' 
                    : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {msg.role === 'user' ? 'You' : 'Study Assistant'}
                </span>
                {msg.role === 'assistant' && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    <CheckCircle2 size={11} />
                    <span>Verified Answer</span>
                  </span>
                )}
                {msg.timestamp && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {msg.timestamp}
                  </span>
                )}
              </div>

              {/* Message Content Bubble */}
              <div style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)' 
                  : 'var(--bg-card)',
                border: msg.role === 'user' 
                  ? '1px solid rgba(255, 255, 255, 0.12)' 
                  : '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--text-main)',
              }}>
                {msg.role === 'user' ? (
                  <p style={{ fontSize: '0.92rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </p>
                ) : (
                  <div>
                    {/* Render Assistant Markdown Content */}
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Citations & Sources Card */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      }}>
                        <div
                          onClick={() => toggleCitations(index)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={15} color="#38bdf8" />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>
                              Verified Citations ({msg.citations.length} document references)
                            </span>
                          </div>
                          {expandedCitations[index] ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
                        </div>

                        {/* Collapsible Citations Drawer */}
                        {expandedCitations[index] && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '10px',
                          }} className="animate-fade-in">
                            {msg.citations.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(0, 0, 0, 0.35)',
                                  border: '1px solid rgba(56, 189, 248, 0.2)',
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '6px',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: 'rgba(56, 189, 248, 0.2)',
                                      color: '#38bdf8',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                    }}>
                                      Source #{c.source_index}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                                      {c.document_filename}
                                    </span>
                                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                                      Page {c.page_number}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                                    {Math.round(c.similarity_score * 100)}% Match
                                  </span>
                                </div>
                                <p style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                  fontStyle: 'italic',
                                  margin: 0,
                                  lineHeight: 1.5,
                                }}>
                                  "{c.text_snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Actions: Copy, Text-To-Speech, Info */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '12px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Directly referenced from your uploaded study materials
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', height: '26px' }}
                          title="Copy answer to clipboard"
                        >
                          {copiedIndex === index ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleSpeak(msg.content)}
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', height: '26px' }}
                          title="Read answer aloud"
                        >
                          <Volume2 size={13} color={isSpeaking ? '#6366f1' : 'currentColor'} />
                          <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '850px',
            margin: '0 auto',
            width: '100%',
          }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bot size={14} color="#fff" />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                Study Assistant
              </span>
            </div>
            <div style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 500 }}>
                Reviewing your study notes & compiling verified answer...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <div style={{
        padding: '14px 28px 18px',
        background: 'rgba(11, 15, 25, 0.9)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: '850px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 8px 5px 16px',
            boxShadow: 'var(--shadow-md)',
            transition: 'var(--transition)',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything from your uploaded study materials... (e.g. 'What is dynamic programming?')"
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                padding: '6px 0',
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: '0.84rem',
                height: '36px',
              }}
            >
              <span>Ask</span>
              <Send size={14} />
            </button>
          </div>

          {/* Clean Student Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '8px',
            padding: '0 4px',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
          }}>
            <span>Press <strong>Enter</strong> to send • Answers are strictly sourced from your materials</span>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
