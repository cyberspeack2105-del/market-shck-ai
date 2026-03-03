(function () {
    // Select elements from the new static layout
    const messageArea = document.getElementById('ai-chat-messages');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');

    if (!messageArea || !input || !sendBtn) {
        console.error('AI Assistant elements not found in index.html');
        return;
    }

    // Function to add a message to the UI
    function addMessage(text, isAssistant = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'flex gap-4 ' + (isAssistant ? '' : 'justify-end');

        const contentClass = isAssistant
            ? 'bg-white/5 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300 leading-relaxed max-w-[90%]'
            : 'bg-primary rounded-2xl rounded-tr-none p-4 text-sm text-slate-900 font-medium leading-relaxed max-w-[90%]';

        msgDiv.innerHTML = isAssistant ? `
            <div class="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-primary text-sm">robot_2</span>
            </div>
            <div class="${contentClass}">${text}</div>
        ` : `
            <div class="${contentClass}">${text}</div>
            <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-primary text-sm">person</span>
            </div>
        `;

        messageArea.appendChild(msgDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
        return msgDiv;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        addMessage(text, false);
        input.value = '';

        // Add typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'flex gap-4 animate-pulse';
        typingDiv.innerHTML = `
            <div class="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-primary text-sm">robot_2</span>
            </div>
            <div class="bg-white/5 rounded-2xl rounded-tl-none p-4 text-xs text-slate-500 italic">
                Assistant is thinking...
            </div>
        `;
        messageArea.appendChild(typingDiv);
        messageArea.scrollTop = messageArea.scrollHeight;

        try {
            // Updated to use relative path since we are on the same origin (or proxying)
            // Or use the configured backend URL if available
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            typingDiv.remove();

            if (response.ok) {
                addMessage(data.reply || "I couldn't generate a response.");
            } else {
                addMessage("Error: " + (data.detail || "Something went wrong."), true);
            }
        } catch (error) {
            typingDiv.remove();
            addMessage("Service Unavailable: Could not connect to the AI engine. Please ensure the backend server is running.", true);
            console.error('Chat error:', error);
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Handle incoming context updates (if any other part of the app wants to trigger a message)
    window.assistant = {
        say: (msg) => addMessage(msg, true),
        ask: (msg) => {
            input.value = msg;
            input.focus();
        }
    };
})();
