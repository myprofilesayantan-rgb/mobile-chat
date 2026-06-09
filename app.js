import { ChatBrain } from './brain.js';

// Initialize core components
const brain = new ChatBrain();

// Hook DOM elements
const messagesLog = document.getElementById('messages-log');
const typingIndicator = document.getElementById('typing-indicator');
const chipsContainer = document.getElementById('chips-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const resetBtn = document.getElementById('reset-btn');

/**
 * Format raw message text into HTML.
 * Supports bold syntax (**text**) and basic lists (- or *).
 * @param {string} text 
 * @returns {string} HTML string
 */
function formatMarkdown(text) {
  if (!text) return "";
  
  // Escape HTML tags to prevent XSS
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold text (**word** or **phrase**)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet point lists
  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    // Check if line starts with bullet point
    const match = line.match(/^(\s*)([•\-\*\d+\.])\s+(.*)/);
    if (match) {
      const isOrdered = /^\d+/.test(match[2]);
      const content = match[3];
      
      let prefix = "";
      if (!inList) {
        inList = true;
        prefix = isOrdered ? '<ol>' : '<ul>';
      }
      return `${prefix}<li>${content}</li>`;
    } else {
      let suffix = "";
      if (inList) {
        inList = false;
        suffix = '</ul>'; // fallback close tag; browser parses balanced nested tags correctly
      }
      return `${suffix}${line}`;
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('<br>').replace(/<\/li><br>/g, '</li>').replace(/<\/ul><br>/g, '</ul>').replace(/<\/ol><br>/g, '</ol>');
}

/**
 * Renders a new message bubble in the conversation view.
 * @param {string} text 
 * @param {boolean} isUser 
 */
function appendMessage(text, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'message-user' : 'message-bot'}`;
  
  // Create message text container
  const contentSpan = document.createElement('span');
  contentSpan.innerHTML = formatMarkdown(text);
  messageDiv.appendChild(contentSpan);

  // Time label
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time-stamp';
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  timeSpan.textContent = timeStr;
  messageDiv.appendChild(timeSpan);

  // Append to chat stream
  messagesLog.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Scrolls the messages container to the bottom.
 */
function scrollToBottom() {
  messagesLog.scrollTop = messagesLog.scrollHeight;
}

/**
 * Updates suggestion chips in the footer.
 * @param {string[]} chips 
 */
function renderChips(chips) {
  chipsContainer.innerHTML = '';
  if (!chips || chips.length === 0) return;

  chips.forEach(chipText => {
    const chipBtn = document.createElement('button');
    chipBtn.className = 'quick-chip';
    chipBtn.textContent = chipText;
    chipBtn.type = 'button';
    
    // Clicking triggers sending the chip text
    chipBtn.addEventListener('click', () => {
      handleUserSubmit(chipText);
    });

    chipsContainer.appendChild(chipBtn);
  });
}

/**
 * Simulates bot typing logic and prints response.
 * @param {string} text 
 * @param {string[]} chips 
 */
function simulateResponse(text, chips) {
  // Show typing animation
  typingIndicator.style.display = 'block';
  scrollToBottom();

  // Hide chips during typing
  chipsContainer.style.opacity = '0.3';
  chipsContainer.style.pointerEvents = 'none';

  // Calculate dynamic delay based on reply length (feels more realistic)
  const baseDelay = 600;
  const wordDelay = Math.min(1200, text.split(' ').length * 30);
  const totalDelay = baseDelay + wordDelay;

  setTimeout(() => {
    typingIndicator.style.display = 'none';
    appendMessage(text, false);
    renderChips(chips);
    chipsContainer.style.opacity = '1';
    chipsContainer.style.pointerEvents = 'auto';
  }, totalDelay);
}

/**
 * Core submission handler.
 * @param {string} inputVal 
 */
function handleUserSubmit(inputVal) {
  if (!inputVal.trim()) return;

  // Render user bubble
  appendMessage(inputVal, true);

  // Fetch response from brain
  const reply = brain.processMessage(inputVal);

  // Trigger simulated answer sequence
  simulateResponse(reply.text, reply.chips);
}

// Event listener for chat form submission
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = messageInput.value;
  messageInput.value = '';
  handleUserSubmit(val);
});

// Event listener for reset/clear button
resetBtn.addEventListener('click', () => {
  messagesLog.innerHTML = '';
  brain.reset();
  initWelcome();
});

/**
 * Welcomes user to the app on initial start.
 */
function initWelcome() {
  const welcome = brain.data.welcome;
  simulateResponse(welcome.responses[0], welcome.chips);
}

// App lifecycle init
async function startApp() {
  try {
    await brain.init('./brain_data.json');
    initWelcome();
  } catch (err) {
    console.error("App startup failed:", err);
    appendMessage("Error initializing portfolio matrix. Please reload.", false);
  }
}

// Launch
startApp();
