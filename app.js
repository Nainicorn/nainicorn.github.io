// Sidebar Toggle
document.getElementById('mobileMenuButton').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
});
document.getElementById('closeSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('-translate-x-full');
});

// Help Modal Toggle
const helpModal = document.getElementById('helpModal');
document.getElementById('helpButton').addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});
document.getElementById('closeHelpModal').addEventListener('click', () => {
    helpModal.classList.add('hidden');
});
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

// Chat app code
const chatListEl = document.getElementById('chatList');
const chatMessagesEl = document.getElementById('chatMessages');
const chatInputEl = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const newChatButton = document.getElementById('newChatButton');

let chats = [];
let activeChatId = null;

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function renderChatList() {
    chatListEl.innerHTML = '';
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `bg-gray-600 px-4 py-2 rounded-full hover:bg-gray-500 cursor-pointer text-center ${
            chat.id === activeChatId ? 'bg-pink-600' : ''
        }`;
        chatItem.textContent = chat.title;
        chatItem.onclick = () => {
            activeChatId = chat.id;
            renderChatMessages();
            renderChatList();
        };
        chatListEl.appendChild(chatItem);
    });
}

function renderChatMessages() {
    chatMessagesEl.innerHTML = '';
    if (!activeChatId) {
        chatMessagesEl.innerHTML = '<p class="text-gray-400 text-center mt-20">What can I help with?</p>';
        return;
    }
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;
    chat.messages.forEach(message => {
        const msgDiv = document.createElement('div');
        msgDiv.className = message.role === 'user' 
            ? 'text-right text-pink-400 mb-2 whitespace-pre-wrap' 
            : 'text-left text-gray-300 mb-2 whitespace-pre-wrap';
        msgDiv.textContent = message.text;
        chatMessagesEl.appendChild(msgDiv);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function addMessageToChat(role, text) {
    if (!activeChatId) {
        const newChat = {
            id: generateId(),
            title: text.length > 20 ? text.slice(0, 17) + '...' : text,
            messages: []
        };
        chats.push(newChat);
        activeChatId = newChat.id;
    }
    const chat = chats.find(c => c.id === activeChatId);
    chat.messages.push({ role, text });
}

function typeText(element, text, speed = 20, callback = null) {
    let i = 0;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    type();
}

async function sendMessage() {
    const query = chatInputEl.value.trim();
    if (!query) return;

    addMessageToChat('user', query);
    renderChatMessages();
    renderChatList();
    chatInputEl.value = '';

    // Show temporary "thinking..." message
    const chat = chats.find(c => c.id === activeChatId);
    const thinkingMsg = { role: 'bot', text: 'WOVEN is thinking...' };
    chat.messages.push(thinkingMsg);
    renderChatMessages();

    chatInputEl.disabled = true;
    sendButton.disabled = true;

    const msgDivs = chatMessagesEl.querySelectorAll('div');
    const botMsgDiv = msgDivs[msgDivs.length - 1];

    try {
        const res = await fetch('http://localhost:5001/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await res.json();

        // Replace thinking message with empty string for typing
        thinkingMsg.text = '';
        botMsgDiv.textContent = '';

        typeText(botMsgDiv, data.response, 20, () => {
            thinkingMsg.text = data.response;
            chatInputEl.disabled = false;
            sendButton.disabled = false;
            chatInputEl.focus();
        });

    } catch (error) {
        thinkingMsg.text = '❌ Error communicating with server';
        renderChatMessages();
        chatInputEl.disabled = false;
        sendButton.disabled = false;
    }
}

newChatButton.addEventListener('click', () => {
    activeChatId = null;
    renderChatMessages();
    renderChatList();
    chatInputEl.value = '';
    chatInputEl.focus();
});

sendButton.addEventListener('click', sendMessage);
chatInputEl.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

renderChatList();
renderChatMessages();
