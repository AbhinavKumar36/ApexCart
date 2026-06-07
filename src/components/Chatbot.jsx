import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, ShoppingBag, TrendingUp } from 'lucide-react';

export default function Chatbot({ products, sales, role, username, vendor, storeSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Hello ${username.split('@')[0]}! I'm **ApexCart AI**, your real-time store assistant. I have access to your active inventory catalog and transaction registers. Ask me anything about stock, sales reports, or product margins!`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setInputValue('');
    setIsTyping(true);

    const CATEGORIES_LIST = ['Grocery', 'Dairy & Eggs', 'Beverages', 'Electronics', 'Apparel', 'Home & Kitchen'];

    // Prepare live store context for Gemini
    const catalogContext = products.map(p => ({
      SKU: p.id,
      Name: p.name,
      Category: p.category,
      Stock: p.quantity,
      Price: p.price,
      Cost: p.costPrice,
      GST: p.gst,
      Discount: p.discount,
      MinStockLimit: p.minStock,
      Vendor: p.vendor || 'General'
    }));

    const salesContext = sales.map(s => ({
      InvoiceID: s.id,
      Date: s.date,
      Customer: s.customerName,
      ItemsCount: s.items.length,
      Total: s.totalPrice,
      Items: s.items.map(i => `${i.name} (Qty:${i.quantity})`)
    }));

    // Create prompt with embedded context
    const prompt = `
=== SYSTEM STORE CONTEXT ===
Active User Role: ${role}
Active User Email: ${username}
Active User Vendor Stall: ${vendor}
Supermarket Categories: ${JSON.stringify(CATEGORIES_LIST)}

Current Inventory Catalog (Products JSON):
${JSON.stringify(catalogContext, null, 2)}

Recent Sales Transaction History (Sales JSON):
${JSON.stringify(salesContext, null, 2)}
=============================

User Query: "${query}"

Instructions:
You are ApexCart AI, the built-in mall and superstore database assistant.
Analyze the SYSTEM STORE CONTEXT above to answer the User Query.
- Calculate profit margins, identify low stock, or list items using the exact data.
- Keep answers professional, friendly, and structured.
- SECURITY RULE: If Active User Vendor Stall is not "all", the user is restricted to a single stall (e.g. "Apex Grocery"). Answer queries ONLY with respect to items or sales belonging to that vendor stall. Refuse to display or summarize stocks, items, or revenues from other vendors.
- If the user asks for actions they don't have access to (e.g. staff asking to change passwords or do restocks), guide them politely.
- Format responses beautifully in markdown (using bold tags, bullet points, numbered lists, or markdown tables for tabular data).
`;

    try {
      const apiKey = storeSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.includes('placeholder')) {
        throw new Error('Gemini API Key missing. Please set it in Control Settings -> Store Profile.');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that query. Please try again.";
      
      setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    } catch (err) {
      console.error("Gemini Error:", err);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: `⚠️ **AI Connection Error**: ${err.message}. Please verify your VITE_GEMINI_API_KEY is correct in your [.env](file:///c:/Users/shubh/OneDrive/Desktop/sms/.env) file and that you are online.` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const CATEGORIES_LIST = ['Grocery', 'Dairy & Eggs', 'Beverages', 'Electronics', 'Apparel', 'Home & Kitchen'];

  const quickPrompts = [
    { label: 'Which products should I restock?', icon: AlertCircle, text: 'Which products should I restock based on current levels and minimum limits?' },
    { label: 'Show products expiring this week', icon: AlertCircle, text: 'Show products likely to expire this week (current date is 2026-06-07) or already expired.' },
    { label: 'Why did revenue drop this month?', icon: TrendingUp, text: 'Why did revenue drop this month? Please analyze recent transactions for any sales drops or peak hours to explain monthly performance.' }
  ];

  // Helper to parse markdown-like bold, lists, and tables into HTML
  const formatMessageText = (text) => {
    if (!text) return '';

    // Split text by lines to parse tables and lists
    const lines = text.split('\n');
    let formattedContent = [];
    let inList = false;
    let inTable = false;
    let tableRows = [];

    const parseInlineStyles = (str) => {
      // Bold **text**
      return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code style="background-color: var(--color-bg-base); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Table detection: starts with | and contains |
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        // Skip separator rows e.g. |---|---|
        if (line.includes('---') || line.includes('- -')) {
          continue;
        }
        
        const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
        tableRows.push(cols);
        continue;
      } else if (inTable) {
        // End of table detected
        inTable = false;
        if (tableRows.length > 0) {
          formattedContent.push(renderTableHTML(tableRows, i));
          tableRows = [];
        }
      }

      // Unordered list items: starts with * or - followed by space
      if (line.startsWith('* ') || line.startsWith('- ')) {
        if (!inList) {
          inList = true;
          formattedContent.push('<ul style="margin-left: 1.5rem; margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">');
        }
        const itemText = line.substring(2);
        formattedContent.push(`<li style="list-style-type: disc;">${parseInlineStyles(itemText)}</li>`);
      } else {
        if (inList) {
          inList = false;
          formattedContent.push('</ul>');
        }

        if (line === '') {
          formattedContent.push('<br/>');
        } else {
          // Standard paragraphs
          formattedContent.push(`<p style="margin-bottom: 0.5rem; line-height: 1.5;">${parseInlineStyles(line)}</p>`);
        }
      }
    }

    if (inList) {
      formattedContent.push('</ul>');
    }
    if (inTable && tableRows.length > 0) {
      formattedContent.push(renderTableHTML(tableRows, 'final'));
    }

    return <div dangerouslySetInnerHTML={{ __html: formattedContent.join('') }} />;
  };

  const renderTableHTML = (rows, key) => {
    const headerCols = rows[0];
    const bodyRows = rows.slice(1);

    const headersHTML = headerCols.map(col => 
      `<th style="padding: 0.5rem; border: 1px solid var(--color-border); background-color: var(--color-bg-base); font-size: 0.75rem; text-transform: uppercase; font-weight: 800;">${col}</th>`
    ).join('');

    const bodyHTML = bodyRows.map(row => {
      const cellsHTML = row.map(cell => 
        `<td style="padding: 0.5rem; border: 1px solid var(--color-border); font-size: 0.8125rem;">${cell}</td>`
      ).join('');
      return `<tr style="border-bottom: 1px solid var(--color-border);">${cellsHTML}</tr>`;
    }).join('');

    return `
      <div style="overflow-x: auto; width: 100%; margin: 1rem 0; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--color-border);">${headersHTML}</tr>
          </thead>
          <tbody>
            ${bodyHTML}
          </tbody>
        </table>
      </div>
    `;
  };

  return (
    <>
      {/* Floating Chat Bubble Launcher */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.launcher} 
        className="btn btn-primary glow no-print"
        title="Open ApexCart AI Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Floating Chat Panel */}
      {isOpen && (
        <div style={styles.chatCard} className="glass glow animate-slide no-print">
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitleRow}>
              <div style={styles.botIconBox}>
                <Bot size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={styles.titleText}>ApexCart Assistant</h3>
                <span style={styles.statusLabel}>
                  <Sparkles size={10} color="var(--color-success)" style={{ display: 'inline-block' }} />
                  <span>Gemini AI Engine Active</span>
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts Panel */}
          <div style={styles.quickPromptsRow}>
            {quickPrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(p.text)}
                  style={styles.promptBtn}
                  className="dashboard-action-btn"
                >
                  <Icon size={12} style={{ flexShrink: 0 }} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div style={styles.feed}>
            {messages.map((msg, idx) => {
              const isBot = msg.sender === 'bot';
              return (
                <div 
                  key={idx} 
                  style={{
                    ...styles.messageWrapper,
                    justifyContent: isBot ? 'flex-start' : 'flex-end'
                  }}
                  className="animate-fade"
                >
                  {isBot && (
                    <div style={styles.botAvatar}>
                      <Bot size={14} color="#ffffff" />
                    </div>
                  )}
                  <div style={{
                    ...styles.messageBubble,
                    backgroundColor: isBot ? 'var(--color-bg-base)' : 'var(--color-primary-light)',
                    color: 'var(--color-text-primary)',
                    border: isBot ? '1px solid var(--color-border)' : '1px solid var(--color-primary-glow)',
                    borderBottomLeftRadius: isBot ? '4px' : '16px',
                    borderBottomRightRadius: isBot ? '16px' : '4px',
                  }}>
                    {formatMessageText(msg.text)}
                  </div>
                </div>
              );
            })}
            
            {/* Typing Loader */}
            {isTyping && (
              <div style={styles.messageWrapper} className="animate-fade">
                <div style={styles.botAvatar}>
                  <Bot size={14} color="#ffffff" />
                </div>
                <div style={styles.typingBubble}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Controls Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            style={styles.inputForm}
          >
            <input
              type="text"
              placeholder="Ask AI about stock levels, trends, P&L..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              style={styles.chatInput}
              className="input-field"
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              style={styles.sendBtn} 
              className="btn btn-primary"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const styles = {
  launcher: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 99,
    boxShadow: 'var(--shadow-lg)',
  },
  chatCard: {
    position: 'fixed',
    bottom: '6.5rem',
    right: '2rem',
    width: '460px',
    height: '620px',
    borderRadius: '24px',
    overflow: 'hidden',
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  botIconBox: {
    display: 'flex',
    padding: '0.45rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary-light)',
  },
  titleText: {
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    lineHeight: '1.2',
  },
  statusLabel: {
    fontSize: '0.6875rem',
    color: 'var(--color-success)',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginTop: '0.1rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  quickPromptsRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    overflowX: 'auto',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
  },
  promptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.75rem',
    fontSize: '0.71875rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '9999px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  feed: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'var(--color-bg-base)',
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    maxWidth: '85%',
  },
  botAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '0.25rem',
  },
  messageBubble: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
  },
  typingBubble: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderBottomLeftRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    height: '35px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-text-muted)',
    animation: 'pulseGlow 1.2s infinite',
  },
  inputForm: {
    display: 'flex',
    padding: '1rem 1.5rem',
    gap: '0.75rem',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: '42px',
    padding: '0.5rem 1rem',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  }
};
