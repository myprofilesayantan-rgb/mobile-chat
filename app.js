import { ChatBrain } from './brain.js';

// Initialize core components
const brain = new ChatBrain();

// Hook DOM elements
const app = document.getElementById('app');
const messagesLog = document.getElementById('messages-log');
const typingIndicator = document.getElementById('typing-indicator');
const chipsContainer = document.getElementById('chips-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const resetBtn = document.getElementById('reset-btn');
const speakerToggle = document.getElementById('speaker-toggle');
const micBtn = document.getElementById('mic-btn');

// Hook landing page components
const welcomeIntro = document.getElementById('welcome-intro');

// Hook drawer components
const menuBtn = document.getElementById('menu-btn');
const sideDrawer = document.getElementById('side-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const menuNewChat = document.getElementById('menu-new-chat');

// Hook drawer shortcut buttons
const promptAbout = document.getElementById('prompt-about');
const promptProjects = document.getElementById('prompt-projects');
const promptSkills = document.getElementById('prompt-skills');
const promptContact = document.getElementById('prompt-contact');

// Audio states (unmuted by default)
let isMuted = false;
let hasSpokenIntro = false;

// Handle Speaker Toggle
speakerToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  speakerToggle.classList.toggle('speaker-muted', isMuted);
  if (isMuted && ('speechSynthesis' in window)) {
    window.speechSynthesis.cancel();
  }
});

// Cache browser voices if supported
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    // warming up speech cache
  };
}

/**
 * Clean markdown symbols and emojis for clean Speech Synthesis output.
 */
function cleanSpeechText(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/⚡/g, '')
    .replace(/[•\-\*]\s+/g, '')
    .replace(/🛸/g, '')
    .replace(/💎/g, '')
    .replace(/📦/g, '')
    .replace(/🚀/g, '')
    .replace(/💻/g, '')
    .replace(/🎓/g, '')
    .replace(/📧/g, '')
    .replace(/🐙/g, '')
    .replace(/💼/g, '')
    .replace(/✉️/g, '')
    .replace(/\n/g, ' ');
}

/**
 * Read text out loud using Web Speech Synthesis.
 */
function speakText(text) {
  if (isMuted || !('speechSynthesis' in window)) return;

  // Interrupt any current speaking
  window.speechSynthesis.cancel();

  const cleaned = cleanSpeechText(text);
  const utterance = new SpeechSynthesisUtterance(cleaned);
  
  // Prioritize a male English voice based on standard OS/browser voice lists
  const voices = window.speechSynthesis.getVoices();
  const maleKeywords = [
    'david', 'mark', 'george', 'alex', 'daniel', 'male', 'google us english male',
    'arthur', 'gordon', 'aaron', 'rishi', 'en-us-x-sfg#male', 'en-gb-x-fis', 
    'en-us-x-iom', 'en-us-x-iog', 'en-us-x-tfn'
  ];
  
  let chosenVoice = voices.find(v => {
    const nameLower = v.name.toLowerCase();
    return v.lang.startsWith('en') && maleKeywords.some(keyword => nameLower.includes(keyword));
  });

  // Fallback to any English voice if a male one is not explicitly found
  if (!chosenVoice) {
    chosenVoice = voices.find(v => v.lang.startsWith('en'));
  }

  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }
  
  utterance.rate = 1.05; // Conversational pacing
  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks the landing welcome introduction.
 */
function triggerLandingVoiceover() {
  if (hasSpokenIntro || !welcomeIntro || app.classList.contains('chat-mode')) return;
  hasSpokenIntro = true;
  
  const textToRead = "Hi, I'm Sayantan. I bridge the gap between complex systems and intuitive user experiences. Welcome to my portfolio. Ask me anything about my U X strategy, case studies, or product thinking.";
  setTimeout(() => {
    speakText(textToRead);
  }, 600);

  // Remove interaction triggers
  document.removeEventListener('click', triggerLandingVoiceover);
  document.removeEventListener('touchstart', triggerLandingVoiceover);
}

document.addEventListener('click', triggerLandingVoiceover);
document.addEventListener('touchstart', triggerLandingVoiceover);
window.addEventListener('DOMContentLoaded', triggerLandingVoiceover);

/**
 * Drawer Toggle Event Listeners
 */
if (menuBtn && sideDrawer && closeDrawerBtn) {
  menuBtn.addEventListener('click', () => {
    sideDrawer.classList.add('open');
  });

  closeDrawerBtn.addEventListener('click', () => {
    sideDrawer.classList.remove('open');
  });

  // Close drawer if user clicks on the dimmed background
  sideDrawer.addEventListener('click', (e) => {
    if (e.target === sideDrawer) {
      sideDrawer.classList.remove('open');
    }
  });
}

// Drawer reset to new chat/landing page
if (menuNewChat) {
  menuNewChat.addEventListener('click', () => {
    sideDrawer.classList.remove('open');
    resetToLanding();
  });
}

// Drawer Shortcut Prompts trigger submissions
const setupShortcut = (btnEl, promptText) => {
  if (btnEl) {
    btnEl.addEventListener('click', () => {
      sideDrawer.classList.remove('open');
      handleUserSubmit(promptText);
    });
  }
};

setupShortcut(promptAbout, "Tell me about yourself");
setupShortcut(promptProjects, "Show me your projects");
setupShortcut(promptSkills, "What are your skills?");
setupShortcut(promptContact, "How can I contact you?");

/**
 * Web Speech Recognition Configuration
 */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    messageInput.placeholder = "Listening... Speak now";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript.trim()) {
      handleUserSubmit(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    stopListeningState();
  };

  recognition.onend = () => {
    stopListeningState();
  };

  micBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isListening) {
      recognition.stop();
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      try {
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  });
} else {
  micBtn.style.display = 'none';
}

function stopListeningState() {
  isListening = false;
  micBtn.classList.remove('listening');
  messageInput.placeholder = "Ask me anything about me";
}

/**
 * Format raw message text into HTML.
 */
function formatMarkdown(text) {
  if (!text) return "";
  
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
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
        suffix = '</ul>';
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
 * Appends copy button panel to bot bubbles.
 */
function createMessageActions(textToCopy) {
  const container = document.createElement('div');
  container.className = 'message-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.title = 'Copy response';
  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy).then(() => {
      copyBtn.style.color = 'var(--accent-blue)';
      setTimeout(() => {
        copyBtn.style.color = 'var(--text-secondary)';
      }, 1000);
    });
  });

  container.appendChild(copyBtn);
  return container;
}

/**
 * Evaluates responses and appends interactive cards.
 */
function checkAndAppendRichContent(text, container) {
  const lowercaseText = text.toLowerCase();

  // Skills Visual Graph
  if (lowercaseText.includes("technology matrix") || lowercaseText.includes("core technology matrix")) {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="skill-row">
        <div class="skill-header"><span>Frontend Development</span><span>92%</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="92%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>Design & CSS Mechanics</span><span>88%</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="88%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>Modular Frameworks</span><span>85%</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="85%"></div></div>
      </div>
    `;
    container.appendChild(card);
    
    setTimeout(() => {
      card.querySelectorAll('.skill-bar-inner').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width');
      });
    }, 100);
  }

  // Project cards
  if (lowercaseText.includes("spotlight projects") || lowercaseText.includes("selected work highlights")) {
    const p1 = document.createElement('div');
    p1.className = 'project-card';
    p1.innerHTML = `
      <div class="project-card-title">🛸 AeroChat (Mobile Core)</div>
      <div class="project-card-desc">Interactive mobile-optimized AI chat container highlighting glassmorphism.</div>
      <div class="project-tags">
        <span class="project-tag">HTML5</span><span class="project-tag">CSS Variables</span><span class="project-tag">Vanilla JS</span>
      </div>
    `;
    p1.addEventListener('click', () => handleUserSubmit("AeroChat"));

    const p2 = document.createElement('div');
    p2.className = 'project-card';
    p2.innerHTML = `
      <div class="project-card-title">💎 Lumina Dashboard</div>
      <div class="project-card-desc">Real-time telemetry HUD displaying SVG datasets and canvas lines.</div>
      <div class="project-tags">
        <span class="project-tag">Canvas API</span><span class="project-tag">Grid</span><span class="project-tag">HSL System</span>
      </div>
    `;
    p2.addEventListener('click', () => handleUserSubmit("Lumina Dashboard"));

    container.appendChild(p1);
    container.appendChild(p2);
  }
}

/**
 * Appends user messages.
 */
function appendUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message message-user';

  const contentSpan = document.createElement('span');
  contentSpan.innerHTML = formatMarkdown(text);
  messageDiv.appendChild(contentSpan);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'time-stamp';
  const now = new Date();
  timeSpan.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  messageDiv.appendChild(timeSpan);

  messagesLog.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Word Streaming Text Engine.
 */
function streamBotMessage(fullText, chips) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message message-bot';

  const contentSpan = document.createElement('span');
  messageDiv.appendChild(contentSpan);

  // Blinking terminal cursor
  const cursorSpan = document.createElement('span');
  cursorSpan.className = 'typing-cursor';
  messageDiv.appendChild(cursorSpan);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'time-stamp';
  const now = new Date();
  timeSpan.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  messageDiv.appendChild(timeSpan);

  messagesLog.appendChild(messageDiv);
  scrollToBottom();

  const words = fullText.split(' ');
  let currentWordIndex = 0;
  let accumulatedHTML = "";
  
  let shouldAutoScroll = true;
  const scrollHandler = () => {
    const threshold = 40;
    shouldAutoScroll = (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < threshold;
  };
  messagesLog.addEventListener('scroll', scrollHandler);

  const streamInterval = setInterval(() => {
    if (currentWordIndex < words.length) {
      accumulatedHTML = formatMarkdown(words.slice(0, currentWordIndex + 1).join(' '));
      contentSpan.innerHTML = accumulatedHTML;
      currentWordIndex++;
      
      if (shouldAutoScroll) {
        scrollToBottom();
      }
    } else {
      clearInterval(streamInterval);
      messagesLog.removeEventListener('scroll', scrollHandler);
      cursorSpan.remove();
      
      // Actions
      messageDiv.appendChild(createMessageActions(fullText));
      
      // Rich Components
      checkAndAppendRichContent(fullText, messageDiv);
      
      // Chips
      renderChips(chips);
      chipsContainer.style.opacity = '1';
      chipsContainer.style.pointerEvents = 'auto';
      
      if (shouldAutoScroll) {
        scrollToBottom();
      }
      
      speakText(fullText);
    }
  }, 45);
}

/**
 * Scroll to bottom.
 */
function scrollToBottom() {
  messagesLog.scrollTop = messagesLog.scrollHeight;
}

/**
 * Render quick action chips.
 */
function renderChips(chips) {
  chipsContainer.innerHTML = '';
  if (!chips || chips.length === 0) return;

  chips.forEach(chipText => {
    const chipBtn = document.createElement('button');
    chipBtn.className = 'quick-chip';
    chipBtn.textContent = chipText;
    chipBtn.type = 'button';
    
    chipBtn.addEventListener('click', () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      handleUserSubmit(chipText);
    });

    chipsContainer.appendChild(chipBtn);
  });
}

/**
 * Simulate response timers.
 */
function simulateResponse(text, chips) {
  typingIndicator.style.display = 'block';
  scrollToBottom();

  chipsContainer.style.opacity = '0.3';
  chipsContainer.style.pointerEvents = 'none';

  setTimeout(() => {
    typingIndicator.style.display = 'none';
    streamBotMessage(text, chips);
  }, 650);
}

/**
 * Transition the app from landing-mode to chat-mode.
 */
function transitionToChatMode() {
  if (app.classList.contains('landing-mode')) {
    app.classList.remove('landing-mode');
    app.classList.add('chat-mode');
    
    // Stop initial voiceover when entering chat
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

/**
 * Core submission handler.
 */
function handleUserSubmit(inputVal) {
  if (!inputVal.trim()) return;

  // Trigger UI transition if we are in landing page
  if (app.classList.contains('landing-mode')) {
    transitionToChatMode();
    // Delay message load slightly to match smooth center-to-bottom animation
    setTimeout(() => {
      appendUserMessage(inputVal);
      const reply = brain.processMessage(inputVal);
      simulateResponse(reply.text, reply.chips);
    }, 550);
  } else {
    appendUserMessage(inputVal);
    const reply = brain.processMessage(inputVal);
    simulateResponse(reply.text, reply.chips);
  }
}

// Event listener for chat form submission
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = messageInput.value;
  messageInput.value = '';
  // reset input height on submit
  messageInput.style.height = 'auto';
  handleUserSubmit(val);
});

// Autogrowing input box height handler
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Also trigger transition if they type enter key inside textarea
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

/**
 * Resets conversational parameters and goes back to Screen 1.
 */
function resetToLanding() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  messagesLog.innerHTML = '';
  brain.reset();
  
  // Return to landing page state
  app.classList.remove('chat-mode');
  app.classList.add('landing-mode');
  messageInput.value = '';
  messageInput.style.height = 'auto';
  hasSpokenIntro = false;
  triggerLandingVoiceover();
}

// Reset button event trigger
resetBtn.addEventListener('click', resetToLanding);

// Keep app-container viewport-bound on mobile devices when virtual keyboard pops up
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (window.innerWidth <= 480) {
      const height = window.visualViewport.height;
      app.style.height = `${height}px`;
      
      if (app.classList.contains('chat-mode')) {
        setTimeout(() => {
          messagesLog.scrollTop = messagesLog.scrollHeight;
        }, 80);
      }
    } else {
      app.style.height = '';
    }
  });
}

// App lifecycle init
async function startApp() {
  try {
    await brain.init('./brain_data.json');
  } catch (err) {
    console.error("App startup failed:", err);
  }
}

// Launch
startApp();
