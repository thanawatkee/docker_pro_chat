const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const status = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');
const errorMessage = document.getElementById('errorMessage');

const OLLAMA_API_URL = 'http://localhost:11434/api/chat';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';

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

// ตรวจสอบสถานะ Ollama เมื่อโหลดหน้า
window.addEventListener('load', async () => {
    await checkOllamaStatus();
    await loadAvailableModels();
});

// ตรวจสอบว่า Ollama ทำงานหรือไม่
async function checkOllamaStatus() {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (response.ok) {
            statusText.textContent = '?? เชื่อมต่อแล้ว';
            status.className = 'status online';
            return true;
        }
    } catch (error) {
        statusText.textContent = '?? ไม่สามารถเชื่อมต่อ Ollama';
        status.className = 'status offline';
        showError('ไม่สามารถเชื่อมต่อกับ Ollama กรุณาตรวจสอบว่า Ollama ทำงานอยู่');
        return false;
    }
}

// โหลด models ที่มี
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

// ส่งข้อความ
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isProcessing) return;
    
    // เพิ่มข้อความของ user
    addMessage(message, 'user');
    messageInput.value = '';
    
    // เก็บประวัติการสนทนา
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // แสดง typing indicator
    isProcessing = true;
    sendBtn.disabled = true;
    typingIndicator.style.display = 'block';
    scrollToBottom();
    
    try {
        const selectedModel = modelSelect.value;
        
        // เรียก Ollama API แบบ streaming
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
        
        // ซ่อน typing indicator
        typingIndicator.style.display = 'none';
        
        // สร้างข้อความของ bot
        const botMessageElement = addMessage('', 'bot');
        const messageContent = botMessageElement.querySelector('.message-content');
        
        // อ่าน response แบบ stream
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
                        // ข้าม line ที่ parse ไม่ได้
                    }
                }
            }
        }
        
        // เก็บคำตอบของ bot ในประวัติ
        conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });
        
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.style.display = 'none';
        
        showError('เกิดข้อผิดพลาด: ' + error.message);
        
        // เพิ่มข้อความ error
        addMessage('ขอโทษครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง', 'bot');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// เพิ่มข้อความในแชท
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

// เลื่อนไปล่างสุด
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// แสดง error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// เคลียร์ประวัติการสนทนา (เพิ่มปุ่มถ้าต้องการ)
function clearChat() {
    conversationHistory = [];
    chatMessages.innerHTML = '';
    addMessage('สวัสดีครับ! ผมพร้อมช่วยเหลือคุณแล้ว มีอะไรให้ช่วยไหมครับ?', 'bot');
}
