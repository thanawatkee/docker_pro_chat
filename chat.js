const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const status = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');
const errorMessage = document.getElementById('errorMessage');

const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_TAGS_URL = 'http://127.0.0.1:11434/api/tags';

let conversationHistory = [];
let isProcessing = false;

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// µÃÇ¨ÊÍºÊ¶Ò¹Ð Ollama àÁ×èÍâËÅ´Ë¹éÒ
window.addEventListener('load', async () => {
    await checkOllamaStatus();
    await loadAvailableModels();
});

// µÃÇ¨ÊÍºÇèÒ Ollama ·Ó§Ò¹ËÃ×ÍäÁè
async function checkOllamaStatus() {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (response.ok) {
            statusText.textContent = '?? àª×èÍÁµèÍáÅéÇ';
            status.className = 'status online';
            return true;
        }
    } catch (error) {
        statusText.textContent = '?? äÁèÊÒÁÒÃ¶àª×èÍÁµèÍ Ollama';
        status.className = 'status offline';
        showError('äÁèÊÒÁÒÃ¶àª×èÍÁµèÍ¡Ñº Ollama ¡ÃØ³ÒµÃÇ¨ÊÍºÇèÒ Ollama ·Ó§Ò¹ÍÂÙè');
        return false;
    }
}

// âËÅ´ models ·ÕèÁÕ
async function loadAvailableModels() {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                modelSelect.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Êè§¢éÍ¤ÇÒÁ
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isProcessing) return;
    
    // à¾ÔèÁ¢éÍ¤ÇÒÁ¢Í§ user
    addMessage(message, 'user');
    messageInput.value = '';
    
    // à¡çº»ÃÐÇÑµÔ¡ÒÃÊ¹·¹Ò
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // áÊ´§ typing indicator
    isProcessing = true;
    sendBtn.disabled = true;
    typingIndicator.style.display = 'block';
    scrollToBottom();
    
    try {
        const selectedModel = modelSelect.value;
        
        // àÃÕÂ¡ Ollama API áºº streaming
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: conversationHistory,
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // «èÍ¹ typing indicator
        typingIndicator.style.display = 'none';
        
        // ÊÃéÒ§¢éÍ¤ÇÒÁ¢Í§ bot
        const botMessageElement = addMessage('', 'bot');
        const messageContent = botMessageElement.querySelector('.message-content');
        
        // ÍèÒ¹ response áºº stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message && json.message.content) {
                            botResponse += json.message.content;
                            messageContent.textContent = botResponse;
                            scrollToBottom();
                        }
                    } catch (e) {
                        // ¢éÒÁ line ·Õè parse äÁèä´é
                    }
                }
            }
        }
        
        // à¡çº¤ÓµÍº¢Í§ bot ã¹»ÃÐÇÑµÔ
        conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });
        
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.style.display = 'none';
        
        showError('à¡Ô´¢éÍ¼Ô´¾ÅÒ´: ' + error.message);
        
        // à¾ÔèÁ¢éÍ¤ÇÒÁ error
        addMessage('¢Íâ·É¤ÃÑº à¡Ô´¢éÍ¼Ô´¾ÅÒ´ã¹¡ÒÃ»ÃÐÁÇÅ¼Å ¡ÃØ³ÒÅÍ§ãËÁèÍÕ¡¤ÃÑé§', 'bot');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// à¾ÔèÁ¢éÍ¤ÇÒÁã¹áª·
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '??' : '??';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// àÅ×èÍ¹ä»ÅèÒ§ÊØ´
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// áÊ´§ error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// à¤ÅÕÂÃì»ÃÐÇÑµÔ¡ÒÃÊ¹·¹Ò (à¾ÔèÁ»ØèÁ¶éÒµéÍ§¡ÒÃ)
function clearChat() {
    conversationHistory = [];
    chatMessages.innerHTML = '';
    addMessage('ÊÇÑÊ´Õ¤ÃÑº! ¼Á¾ÃéÍÁªèÇÂàËÅ×Í¤Ø³áÅéÇ ÁÕÍÐäÃãËéªèÇÂäËÁ¤ÃÑº?', 'bot');
}

