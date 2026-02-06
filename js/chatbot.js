/**
 * chatbot.js
 * AI Chatbot for Counseling Support
 */

async function renderChatbot(container) {
    container.innerHTML = `
        <div class="chatbot-container" style="height: 100%; display: flex; flex-direction: column;">
            <div class="chat-header" style="padding: 1rem 2rem; border-bottom: 1px solid #E2E8F0; background: white;">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: #1E293B; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-robot" style="color: var(--primary-color);"></i> AI 입시 상담 챗봇
                </h2>
                <p style="margin: 0.25rem 0 0 0; color: #64748B; font-size: 0.9rem;">궁금한 대학이나 학과, 입시 전략을 질문해보세요.</p>
            </div>
            
            <div id="chatHistory" class="chat-history" style="flex: 1; overflow-y: auto; padding: 2rem; background: #F8FAFC;">
                <!-- Chat Bubbles -->
                <div class="chat-bubble bot">
                    <div class="bubble-content">
                        안녕하세요! 무엇을 도와드릴까요?<br>
                        희망하는 대학이나 학과에 대해 질문해 주시면 데이터를 기반으로 답변해 드립니다.
                    </div>
                    <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            <div class="chat-input-area" style="padding: 1.5rem 2rem; background: white; border-top: 1px solid #E2E8F0;">
                <div class="input-wrapper" style="position: relative; display: flex; gap: 1rem;">
                    <textarea id="chatInput" placeholder="질문을 입력하세요..." rows="1" style="flex: 1; resize: none; border-radius: 12px; padding: 1rem; border: 1px solid #E2E8F0; max-height: 120px; outline: none; transition: border 0.2s;"></textarea>
                    <button id="btnSend" onclick="sendChatMessage()" style="width: 50px; height: 50px; border-radius: 12px; border: none; background: var(--primary-color); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: background 0.2s;">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Auto-resize textarea
    const textarea = document.getElementById('chatInput');
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add User Bubble
    addChatBubble(message, 'user');
    input.value = '';

    // Simulate Bot Typing/Response
    // In real implementation, this would call aiService.chat()
    showTypingIndicator();

    setTimeout(async () => {
        removeTypingIndicator();
        try {
            // Placeholder: Simple Echo or Static response for now
            // Future: await aiService.getChatResponse(message);
            const response = "죄송합니다. 현재 챗봇 기능은 UI 프로토타입 단계입니다. 실제 연동은 곧 구현될 예정입니다.";
            addChatBubble(response, 'bot');
        } catch (error) {
            addChatBubble("오류가 발생했습니다.", 'bot');
        }
    }, 1000);
}

function addChatBubble(text, sender) {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `chat-bubble ${sender}`;
    div.innerHTML = `
        <div class="bubble-content">${text.replace(/\n/g, '<br>')}</div>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function showTypingIndicator() {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'chat-bubble bot';
    div.innerHTML = `
        <div class="bubble-content" style="padding: 0.8rem 1rem;">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}
