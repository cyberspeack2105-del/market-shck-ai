(function () {
    // Inject Styles
    const styles = `
        #ai-assistant-container {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 1000;
            font-family: 'Inter', sans-serif;
        }
        #ai-assistant-bubble {
            width: 3.5rem;
            height: 3.5rem;
            background: #13ec92;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(19, 236, 146, 0.3);
            transition: all 0.3s ease;
        }
        #ai-assistant-bubble:hover {
            transform: scale(1.1);
        }
        #ai-chat-window {
            position: absolute;
            bottom: 4.5rem;
            right: 0;
            width: 22rem;
            height: 30rem;
            background: #1e293b;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.5rem;
            display: none;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
        }
        .chat-header {
            padding: 1rem;
            background: rgba(19, 236, 146, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .chat-messages {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .message {
            max-width: 85%;
            padding: 0.75rem 1rem;
            border-radius: 1rem;
            font-size: 0.875rem;
            line-height: 1.4;
        }
        .message-assistant {
            background: rgba(255, 255, 255, 0.05);
            color: #cbd5e1;
            align-self: flex-start;
            border-bottom-left-radius: 0.25rem;
        }
        .message-user {
            background: #13ec92;
            color: #0f172a;
            align-self: flex-end;
            border-bottom-right-radius: 0.25rem;
            font-weight: 500;
        }
        .chat-input-area {
            padding: 1rem;
            background: rgba(0, 0, 0, 0.2);
            display: flex;
            gap: 0.5rem;
        }
        .chat-input {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            color: white;
            font-size: 0.875rem;
            outline: none;
        }
        .chat-send-btn {
            background: #13ec92;
            color: #0f172a;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
        }
        .typing {
            font-size: 0.75rem;
            color: #64748b;
            font-style: italic;
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Create DOM elements
    const container = document.createElement('div');
    container.id = 'ai-assistant-container';
    container.innerHTML = `
        <div id="ai-chat-window">
            <div class="chat-header">
                <div class="w-8 h-8 bg-[#13ec92] rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-white">MarketShock Assistant</h4>
                    <p class="text-[0.65rem] text-[#13ec92]">Powered by GPT-OSS-120B</p>
                </div>
            </div>
            <div id="chat-messages" class="chat-messages">
                <div class="message message-assistant">
                    Hello! I'm your MarketShock AI assistant. Ask me anything about risk scores, job market trends, or how to use the dashboard!
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input-box" class="chat-input" placeholder="Type your question...">
                <button id="chat-send-btn" class="chat-send-btn">Send</button>
            </div>
        </div>
        <div id="ai-assistant-bubble">
            <svg class="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </div>
    `;
    document.body.appendChild(container);

    // Functionality
    const bubble = document.getElementById('ai-assistant-bubble');
    const windowEl = document.getElementById('ai-chat-window');
    const input = document.getElementById('chat-input-box');
    const sendBtn = document.getElementById('chat-send-btn');
    const messageArea = document.getElementById('chat-messages');

    bubble.addEventListener('click', () => {
        windowEl.style.display = windowEl.style.display === 'flex' ? 'none' : 'flex';
    });

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'message message-user';
        userMsg.innerText = text;
        messageArea.appendChild(userMsg);
        input.value = '';
        messageArea.scrollTop = messageArea.scrollHeight;

        // Typing indicator
        const typing = document.createElement('div');
        typing.className = 'typing';
        typing.id = 'typing-indicator';
        typing.innerText = 'Assistant is thinking...';
        messageArea.appendChild(typing);
        messageArea.scrollTop = messageArea.scrollHeight;

        try {
            const response = await fetch('http://localhost:8095/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();

            typing.remove();

            const assistantMsg = document.createElement('div');
            assistantMsg.className = 'message message-assistant';
            assistantMsg.innerText = data.reply || "Sorry, I had trouble processing that.";
            messageArea.appendChild(assistantMsg);
            messageArea.scrollTop = messageArea.scrollHeight;
        } catch (error) {
            typing.remove();
            const errorMsg = document.createElement('div');
            errorMsg.className = 'message message-assistant text-red-400';
            errorMsg.innerText = "Error: Could not connect to the AI engine. Please ensure the backend is running on port 8090.";
            messageArea.appendChild(errorMsg);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
})();
