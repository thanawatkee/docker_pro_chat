const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const status = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');
const errorMessage = document.getElementById('errorMessage');
const clearBtn = document.getElementById('clearBtn');

const OLLAMA_API_URL = 'http://localhost:11434/api/chat';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';

let conversationHistory = [];
let isProcessing = false;

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearChat);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Check Ollama status on page load
window.addEventListener('load', async () => {
    await checkOllamaStatus();
    await loadAvailableModels();
});

// Check if Ollama is running
async function checkOllamaStatus() {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (response.ok) {
            statusText.textContent = '?? Connected';
            status.className = 'status online';
            return true;
        }
    } catch (error) {
        statusText.textContent = '?? Disconnected';
        status.className = 'status offline';
        showError('Cannot connect to Ollama. Please make sure Ollama is running.');
        return false;
    }
}

// Load available models
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

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isProcessing) return;
    
    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';
    
    // Store conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Show typing indicator
    isProcessing = true;
    sendBtn.disabled = true;
    typingIndicator.style.display = 'block';
    scrollToBottom();
    
    try {
        const selectedModel = modelSelect.value;
        
        // Call Ollama API with streaming
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
        
        // Hide typing indicator
        typingIndicator.style.display = 'none';
        
        // Create bot message
        const botMessageElement = addMessage('', 'bot');
        const messageContent = botMessageElement.querySelector('.message-content');
        
        // Read streaming response
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
                        // Skip lines that can't be parsed
                    }
                }
            }
        }
        
        // Store bot response in history
        conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });
        
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.style.display = 'none';
        
        showError('Error: ' + error.message);
        
        // Add error message
        addMessage('Sorry, an error occurred while processing your request. Please try again.', 'bot');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Add message to chat
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

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Clear chat history
function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        conversationHistory = [];
        chatMessages.innerHTML = '';
        addMessage('Hello! I\'m ready to help you. How can I assist you today?', 'bot');
    }
}

// Auto-resize textarea (if you want to change input to textarea)
function autoResize(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}
