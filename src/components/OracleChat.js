/* ============================================
   ESPORTSDUNIYA — AI Match Oracle Component
   ============================================ */

import { apiUrl } from '../config/apiBase.js';

export function createOracleChat(matchContext, gsap) {
    const container = document.createElement('div');
    container.className = 'oracle-chat-container';

    container.innerHTML = `
        <div class="oracle-header">
            <div class="oracle-title">
                <span class="oracle-icon">🔮</span>
                <h3>The Oracle</h3>
            </div>
            <p class="oracle-subtitle">Real-time Match Intelligence</p>
        </div>
        <div class="oracle-messages" id="oracle-messages">
            <div class="oracle-message ai">
                Hello! I'm The Oracle. Ask me anything about this match, the players, or tactical nuances.
            </div>
        </div>
        <div class="oracle-suggestions" id="oracle-suggestions">
            <!-- Suggested questions will appear here -->
        </div>
        <div class="oracle-input-area">
            <input type="text" id="oracle-input" placeholder="Ask The Oracle..." />
            <button id="oracle-send">Send</button>
        </div>
    `;

    const input = container.querySelector('#oracle-input');
    const sendBtn = container.querySelector('#oracle-send');
    const messages = container.querySelector('#oracle-messages');
    const suggestions = container.querySelector('#oracle-suggestions');

    let history = [];

    async function sendMessage(text) {
        if (!text.trim()) return;

        // Add user message
        addMessage(text, 'user');
        input.value = '';

        // Loader
        const loader = addMessage('Consulting the stars...', 'ai loading');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(apiUrl('/api/ai/oracle'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ matchContext, question: text, history })
            });
            const data = await response.json();
            if (response.status === 401) {
                loader.remove();
                addMessage('Sign in to ask The Oracle.', 'ai error');
                return;
            }
            if (response.status === 403) {
                loader.remove();
                addMessage('Pro subscription required for The Oracle. Upgrade at /pricing.', 'ai error');
                return;
            }

            loader.remove();
            addMessage(data.answer, 'ai');

            // Update history
            history.push({ role: 'user', content: text });
            history.push({ role: 'assistant', content: data.answer });
            if (history.length > 6) history = history.slice(-6);

            // Update suggestions
            updateSuggestions(data.suggestedQuestions);

        } catch (e) {
            loader.remove();
            addMessage("Even the Oracle hits blocks sometimes. Try again in a moment!", 'ai error');
        }
    }

    function addMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `oracle-message ${type}`;
        msg.innerHTML = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;

        gsap.from(msg, { opacity: 0, y: 10, duration: 0.3 });
        return msg;
    }

    function updateSuggestions(list) {
        suggestions.innerHTML = '';
        if (!list) return;

        list.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = q;
            btn.onclick = () => sendMessage(q);
            suggestions.appendChild(btn);
        });
    }

    sendBtn.onclick = () => sendMessage(input.value);
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(input.value); };

    // Initial suggestions
    updateSuggestions([
        "Explain the current momentum",
        "Who is the standout player so far?",
        "Any tactical changes noticed?"
    ]);

    return container;
}
