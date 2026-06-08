import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  // Track whether the last response came from the live AI or offline engine
  const [aiMode, setAiMode] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [activeModel, setActiveModel] = useState(null); // e.g. 'gemini-2.5-flash'

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

    // ── Offline Fallback Engine ─────────────────────────────────────────────
    // Smart local rule-based analysis that runs when the API is unavailable.
    const runOfflineFallback = () => {
      const sym = storeSettings?.currencySymbol || '₹';
      const threshold = storeSettings?.lowStockThreshold || 10;
      const q = query.toLowerCase();
      const visibleProducts = vendor === 'all' ? products : products.filter(p => p.vendor === vendor);
      const visibleSales = vendor === 'all' ? sales : sales.filter(s =>
        s.items?.some(item => products.find(p => p.id === item.id)?.vendor === vendor)
      );
      const today = new Date().toISOString().split('T')[0];

      // ── Restock / Low stock queries ──
      if (q.includes('restock') || q.includes('low stock') || q.includes('running out') || q.includes('out of stock')) {
        const lowStock = visibleProducts.filter(p => p.quantity <= threshold && p.quantity > 0)
          .sort((a, b) => a.quantity - b.quantity).slice(0, 15);
        const outOfStock = visibleProducts.filter(p => p.quantity === 0).slice(0, 10);
        let reply = `**📦 Inventory Alert (Offline Analysis)**\n\n`;
        if (outOfStock.length > 0) {
          reply += `**🔴 Out of Stock (${outOfStock.length} items):**\n`;
          outOfStock.forEach(p => { reply += `* **${p.name}** — SKU: ${p.id.replace(/_[AB]$/, '')}, Min Limit: ${p.minStock}\n`; });
          reply += '\n';
        }
        if (lowStock.length > 0) {
          reply += `**🟡 Low Stock (${lowStock.length} items, threshold ≤ ${threshold}):**\n`;
          lowStock.forEach(p => { reply += `* **${p.name}** — Current: ${p.quantity} units, Min: ${p.minStock}, Category: ${p.category}\n`; });
        }
        if (lowStock.length === 0 && outOfStock.length === 0) reply += '✅ All products are well-stocked!';
        return reply + `\n\n> ⚠️ *Offline mode — using real-time local data analysis.*`;
      }

      // ── Expiry queries ──
      if (q.includes('expir') || q.includes('expire') || q.includes('expired') || q.includes('perishable')) {
        const warningDays = storeSettings?.expiryWarningDays || 30;
        const expired = visibleProducts.filter(p => p.expiryDate && p.expiryDate < today);
        const expiringSoon = visibleProducts.filter(p => {
          if (!p.expiryDate || p.expiryDate < today) return false;
          const diff = Math.ceil((new Date(p.expiryDate) - new Date(today)) / 86400000);
          return diff <= warningDays;
        });
        let reply = `**🗓️ Expiry Status Report (Offline Analysis)**\n\n`;
        if (expired.length > 0) {
          reply += `**🔴 Already Expired (${expired.length} items):**\n`;
          expired.forEach(p => { reply += `* **${p.name}** — Expired: ${p.expiryDate}\n`; });
          reply += '\n';
        }
        if (expiringSoon.length > 0) {
          reply += `**🟡 Expiring Soon within ${warningDays} days (${expiringSoon.length} items):**\n`;
          expiringSoon.forEach(p => {
            const diff = Math.ceil((new Date(p.expiryDate) - new Date(today)) / 86400000);
            reply += `* **${p.name}** — Expires: ${p.expiryDate} (${diff} days)\n`;
          });
        }
        if (expired.length === 0 && expiringSoon.length === 0) reply += '✅ No expiry issues detected!';
        return reply + `\n\n> ⚠️ *Offline mode — using real-time local data analysis.*`;
      }

      // ── Revenue / sales queries ──
      if (q.includes('revenue') || q.includes('sales') || q.includes('income') || q.includes('earning')) {
        const totalRev = visibleSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
        const todaySales = visibleSales.filter(s => s.date?.startsWith(today));
        const todayRev = todaySales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
        const avgOrder = visibleSales.length > 0 ? totalRev / visibleSales.length : 0;
        return `**📊 Sales & Revenue Summary (Offline Analysis)**\n\n` +
          `* **Total Revenue:** ${sym}${totalRev.toFixed(2)}\n` +
          `* **Today's Revenue:** ${sym}${todayRev.toFixed(2)} (${todaySales.length} bills)\n` +
          `* **Total Bills:** ${visibleSales.length}\n` +
          `* **Avg Order Value:** ${sym}${avgOrder.toFixed(2)}\n\n` +
          `> ⚠️ *Offline mode — using real-time local data analysis.*`;
      }

      // ── Margin / profit queries ──
      if (q.includes('margin') || q.includes('profit') || q.includes('markup')) {
        const withMargin = visibleProducts.map(p => ({
          ...p,
          margin: p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.costPrice) * 100) : 0
        })).sort((a, b) => b.margin - a.margin);
        const top5 = withMargin.slice(0, 5);
        const bottom5 = withMargin.slice(-5).reverse();
        return `**💰 Profit Margin Analysis (Offline Analysis)**\n\n` +
          `**🏆 Top 5 Highest Margin Products:**\n` +
          top5.map(p => `* **${p.name}** — Margin: ${p.margin}%, Price: ${sym}${p.price}, Cost: ${sym}${p.costPrice}`).join('\n') +
          `\n\n**📉 Bottom 5 Lowest Margin Products:**\n` +
          bottom5.map(p => `* **${p.name}** — Margin: ${p.margin}%, Price: ${sym}${p.price}, Cost: ${sym}${p.costPrice}`).join('\n') +
          `\n\n> ⚠️ *Offline mode — using real-time local data analysis.*`;
      }

      // ── Stock / inventory count queries ──
      if (q.includes('stock') || q.includes('inventory') || q.includes('product') || q.includes('item')) {
        const total = visibleProducts.length;
        const inStock = visibleProducts.filter(p => p.quantity > threshold).length;
        const low = visibleProducts.filter(p => p.quantity > 0 && p.quantity <= threshold).length;
        const out = visibleProducts.filter(p => p.quantity === 0).length;
        const totalVal = visibleProducts.reduce((acc, p) => acc + (p.costPrice || 0) * p.quantity, 0);
        return `**📋 Inventory Overview (Offline Analysis)**\n\n` +
          `* **Total Products:** ${total}\n` +
          `* **✅ In Stock:** ${inStock}\n` +
          `* **🟡 Low Stock:** ${low} (≤ ${threshold} units)\n` +
          `* **🔴 Out of Stock:** ${out}\n` +
          `* **Total Inventory Value:** ${sym}${totalVal.toFixed(2)}\n\n` +
          `> ⚠️ *Offline mode — using real-time local data analysis.*`;
      }

      // ── Generic fallback ──
      return `**🤖 ApexCart AI — Offline Mode**\n\n` +
        `I'm currently running in **offline mode** because the AI API is unreachable.\n\n` +
        `I can still answer these queries using your live local data:\n` +
        `* *"Which products should I restock?"*\n` +
        `* *"Show me products expiring soon"*\n` +
        `* *"What is today's revenue?"*\n` +
        `* *"Show profit margins"*\n` +
        `* *"Give me an inventory overview"*\n\n` +
        `For complex AI analysis, please reconnect to the internet or check your Gemini API key in Settings.\n\n` +
        `> ⚠️ *Offline fallback mode active.*`;
    };
    // ── End Offline Fallback Engine ─────────────────────────────────────────

    // Model chain to try in order — gemini-2.5-flash confirmed working with this API key
    const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    try {
      const apiKey = storeSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey || apiKey.includes('placeholder')) {
        throw new Error('NO_API_KEY');
      }

      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('OFFLINE');
      }

      let lastError = null;
      let botReply = null;
      let activeModelUsed = null;

      // Try each model in order — gemini-1.5-flash is deprecated
      for (const modelName of MODELS_TO_TRY) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
              }),
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            const msg = errorJson?.error?.message || `HTTP ${response.status}`;
            console.warn(`[Chatbot] Model ${modelName} failed: ${msg}`);
            lastError = new Error(`${modelName}: ${msg}`);
            continue; // try next model
          }

          const data = await response.json();
          botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (botReply) {
            console.log(`[Chatbot] ✅ Success with model: ${modelName}`);
            activeModelUsed = modelName;
            break;
          }
        } catch (fetchErr) {
          console.warn(`[Chatbot] Model ${modelName} fetch error:`, fetchErr.message);
          lastError = fetchErr;
          if (fetchErr.name === 'TypeError' || fetchErr.name === 'AbortError') break;
        }
      }

      if (botReply) {
        setAiMode('online');
        setActiveModel(activeModelUsed);
        setMessages(prev => [...prev, { sender: 'bot', text: botReply, source: 'ai', model: activeModelUsed }]);
      } else {
        console.warn('[Chatbot] All models failed, using offline fallback. Last error:', lastError?.message);
        setAiMode('offline');
        setActiveModel(null);
        setMessages(prev => [...prev, { sender: 'bot', text: runOfflineFallback(), source: 'offline' }]);
      }

    } catch (err) {
      if (err.message === 'OFFLINE' || err.message === 'NO_API_KEY' || !navigator.onLine) {
        console.warn('[Chatbot] Offline or no key — using local fallback engine.');
        setAiMode('offline');
        setActiveModel(null);
        setMessages(prev => [...prev, { sender: 'bot', text: runOfflineFallback(), source: 'offline' }]);
      } else {
        console.error('Gemini Error:', err);
        setAiMode('offline');
        setActiveModel(null);
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `⚠️ **AI Error**: ${err.message}\n\n${runOfflineFallback()}`,
          source: 'offline'
        }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

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
                .replace(/`(.*?)`/g, '<code class="font-mono" style="background-color: var(--color-bg-base); padding: 2px 4px; border-radius: 4px;">$1</code>');
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
          formattedContent.push(renderTableHTML(tableRows));
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
      formattedContent.push(renderTableHTML(tableRows));
    }

    return <div dangerouslySetInnerHTML={{ __html: formattedContent.join('') }} />;
  };

  const renderTableHTML = (rows) => {
    const headerCols = rows[0];
    const bodyRows = rows.slice(1);

    const headersHTML = headerCols.map(col => 
      `<th style="padding: 0.5rem; border: 1px solid var(--color-border); background-color: var(--color-bg-base); font-size: 0.75rem; text-transform: uppercase; font-weight: 800;">${col}</th>`
    ).join('');

    const bodyHTML = bodyRows.map(row => {
      const cellsHTML = row.map(cell => 
        `<td class="font-mono" style="padding: 0.5rem; border: 1px solid var(--color-border); font-size: 0.8125rem;">${cell}</td>`
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
      <motion.button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.launcher} 
        className="btn btn-primary glow no-print"
        title="Open ApexCart AI Assistant"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>

      {/* Floating Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            style={styles.chatCard} 
            className="glass glow no-print"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerTitleRow}>
                <div style={styles.botIconBox}>
                  <Bot size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={styles.titleText}>ApexCart Assistant</h3>
                  <span style={{
                    ...styles.statusLabel,
                    color: aiMode === 'online' ? 'var(--color-success)' : aiMode === 'offline' ? '#f59e0b' : 'var(--color-text-muted)',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: aiMode === 'online' ? 'var(--color-success)' : aiMode === 'offline' ? '#f59e0b' : 'var(--color-text-muted)',
                      boxShadow: aiMode === 'online' ? '0 0 6px var(--color-success)' : aiMode === 'offline' ? '0 0 6px #f59e0b' : 'none',
                      marginRight: 5,
                      flexShrink: 0,
                    }} />
                    {aiMode === 'online'
                      ? `AI Online · ${activeModel || 'Gemini'}`
                      : aiMode === 'offline'
                        ? 'Offline Mode · Local Analysis'
                        : 'Gemini AI Engine'}
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
                  <motion.div 
                    key={idx} 
                    style={{
                      ...styles.messageWrapper,
                      justifyContent: isBot ? 'flex-start' : 'flex-end'
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isBot && (
                      <div style={{
                        ...styles.botAvatar,
                        backgroundColor: msg.source === 'offline' ? '#92400e' : 'var(--color-primary)'
                      }}>
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
                      {isBot && msg.source && (
                        <div style={{
                          marginTop: '0.4rem',
                          paddingTop: '0.4rem',
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.65rem',
                          color: msg.source === 'offline' ? '#f59e0b' : 'var(--color-success)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            backgroundColor: msg.source === 'offline' ? '#f59e0b' : 'var(--color-success)',
                            display: 'inline-block', flexShrink: 0
                          }} />
                          {msg.source === 'offline'
                            ? '⚙ Local engine · offline analysis'
                            : `✦ Gemini AI · ${msg.model || 'gemini-2.5-flash'}`}
                        </div>
                      )}
                    </div>
                  </motion.div>
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
                className="input-field font-mono"
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
          </motion.div>
        )}
      </AnimatePresence>
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
