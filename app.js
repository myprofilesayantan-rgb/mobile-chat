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

// Hook tab elements
const tabInteractive = document.getElementById('tab-interactive');
const tabClassic = document.getElementById('tab-classic');
const contentInteractive = document.getElementById('content-interactive');
const contentClassic = document.getElementById('content-classic');

// Hook classic resume shortcut buttons
const classicActionDownload = document.getElementById('classic-action-download');
// Google Apps Script Web App URL to sync unanswered questions and user-provided leads to Google Sheets
const GOOGLE_SHEET_URL = ''; 

// Audio states (muted by default until voice support is confirmed)
let isMuted = true;
let hasSpokenIntro = false;

// Voice keywords for persona matching
const maleNames = ['rishi', 'ravi', 'david', 'mark', 'george', 'alex', 'daniel', 'male', 'google us english male', 'arthur', 'gordon', 'aaron', 'en-us-x-sfg#male', 'en-gb-x-fis', 'en-us-x-iom', 'en-us-x-iog', 'en-us-x-tfn'];
const femaleKeywords = ['female', 'zira', 'heera', 'susan', 'hazel', 'samantha', 'karen', 'veena', 'sara', 'tessa', 'sfg#female', 'en-in-x-ahp#female'];

/**
 * Check if the browser has an English male voice available, prioritizing Indian English and blacklisting female voices.
 */
function getSystemMaleVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  
  // Filter out any voice that contains female indicators
  const cleanVoices = voices.filter(v => {
    const nameLower = v.name.toLowerCase();
    return !femaleKeywords.some(kw => nameLower.includes(kw));
  });

  // 1. Prioritize Indian English male voices
  let voice = cleanVoices.find(v => {
    const nameLower = v.name.toLowerCase();
    const langLower = v.lang.toLowerCase();
    const isIndianEng = langLower.includes('en-in') || langLower.includes('en_in');
    return isIndianEng && (['rishi', 'ravi', 'male'].some(kw => nameLower.includes(kw)));
  });

  // 2. Fallback to generic Indian English voice (only if it passed the clean blacklist filter)
  if (!voice) {
    voice = cleanVoices.find(v => {
      const langLower = v.lang.toLowerCase();
      return langLower.includes('en-in') || langLower.includes('en_in');
    });
  }

  // 3. Fallback to global English male voice
  if (!voice) {
    voice = cleanVoices.find(v => {
      const nameLower = v.name.toLowerCase();
      const langLower = v.lang.toLowerCase();
      return langLower.startsWith('en') && maleNames.some(kw => nameLower.includes(kw));
    });
  }

  return voice;
}

/**
 * Updates voice/speaker/mic visibility based on whether a male English voice is present.
 */
function updateVoiceSupport() {
  const hasSpeechRec = (window.SpeechRecognition || window.webkitSpeechRecognition);
  
  if (!('speechSynthesis' in window)) {
    if (speakerToggle) speakerToggle.style.display = 'none';
    if (micBtn) micBtn.style.display = 'none';
    return;
  }
  
  const maleVoice = getSystemMaleVoice();
  if (!maleVoice) {
    // If no male voice is available, hide both speaker toggle and mic input to protect the persona
    isMuted = true;
    if (speakerToggle) {
      speakerToggle.classList.add('speaker-muted');
      speakerToggle.style.display = 'none';
    }
    if (micBtn) {
      micBtn.style.display = 'none';
    }
  } else {
    // Male voice found -> enable controls and defaults
    isMuted = false;
    if (speakerToggle) {
      speakerToggle.classList.remove('speaker-muted');
      speakerToggle.style.display = '';
    }
    if (micBtn && hasSpeechRec) {
      micBtn.style.display = '';
    }
  }
}

// Handle Speaker Toggle click
speakerToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  speakerToggle.classList.toggle('speaker-muted', isMuted);
  if (isMuted && ('speechSynthesis' in window)) {
    window.speechSynthesis.cancel();
  }
});

// Cache and verify browser voices when loaded/changed
if ('speechSynthesis' in window) {
  updateVoiceSupport();
  window.speechSynthesis.onvoiceschanged = () => {
    updateVoiceSupport();
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

  const maleVoice = getSystemMaleVoice();
  if (!maleVoice) return; // Do not use generic fallback if it is a female/mismatched voice

  const cleaned = cleanSpeechText(text);
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.voice = maleVoice;
  
  // Confident calibration parameters
  utterance.rate = 1.08;   // Fluent, natural speed
  utterance.pitch = 0.96;  // Deeper, authoritative resonance
  utterance.volume = 1.0;  // Full scale volume
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks the landing welcome introduction.
 */
function triggerLandingVoiceover() {
  if (hasSpokenIntro || !welcomeIntro || app.classList.contains('chat-mode')) return;
  hasSpokenIntro = true;
  
  const textToRead = "Hi, I'm Sayantan. I bridge the gap between complex systems and intuitive user experiences. Welcome to my custom-coded interactive text directory, built to showcase front-end logic, clean layout structures, and deterministic interaction design without relying on generic A I wrappers.";
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
  messageInput.placeholder = "Explore my professional journey...";
}

/**
 * Format raw message text into HTML.
 */
function formatMarkdown(text) {
  if (!text) return "";
  
  // 1. Escape HTML
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Bold tags
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Split into lines
  const lines = formatted.split('\n');
  let inList = false;
  let listType = ""; // "ul" or "ol"
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if line is a list item
    const bulletMatch = line.match(/^(\s*)([•\-\*])\s+(.*)/);
    const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    
    if (bulletMatch) {
      const content = bulletMatch[3];
      if (!inList || listType !== "ul") {
        if (inList) {
          processedLines.push(`</${listType}>`);
        }
        processedLines.push("<ul>");
        inList = true;
        listType = "ul";
      }
      processedLines.push(`<li>${content}</li>`);
    } else if (numberMatch) {
      const content = numberMatch[3];
      if (!inList || listType !== "ol") {
        if (inList) {
          processedLines.push(`</${listType}>`);
        }
        processedLines.push("<ol>");
        inList = true;
        listType = "ol";
      }
      processedLines.push(`<li>${content}</li>`);
    } else {
      // Not a list item
      if (inList) {
        processedLines.push(`</${listType}>`);
        inList = false;
        listType = "";
      }
      
      if (trimmed === "") {
        // Empty line represents a paragraph break
        processedLines.push('<div class="paragraph-spacing"></div>');
      } else {
        processedLines.push(line);
      }
    }
  }
  
  if (inList) {
    processedLines.push(`</${listType}>`);
  }

  // Join lines. For non-list lines that are just text, join them with <br> to preserve line breaks
  let finalHTML = "";
  for (let i = 0; i < processedLines.length; i++) {
    const item = processedLines[i];
    if (item === "<ul>" || item === "</ul>" || item === "<ol>" || item === "</ol>" || item.startsWith("<li>") || item.startsWith("<div")) {
      finalHTML += item;
    } else {
      finalHTML += item;
      if (i < processedLines.length - 1) {
        const next = processedLines[i+1];
        if (next !== "<ul>" && next !== "<ol>" && !next.startsWith("<div") && next !== "") {
          finalHTML += "<br>";
        }
      }
    }
  }

  return finalHTML;
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
  if (lowercaseText.includes("technology matrix") || lowercaseText.includes("core technology matrix") || lowercaseText.includes("skill ratings") || lowercaseText.includes("rating out of 5")) {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="skill-row">
        <div class="skill-header"><span>UX Strategy & Interaction Architecture</span><span>4.9 / 5</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="98%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>Design Systems & Token Engineering</span><span>4.9 / 5</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="98%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>Enterprise System Simplification</span><span>4.8 / 5</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="96%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>AI-Assisted Frontend Prototyping</span><span>4.7 / 5</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="94%"></div></div>
      </div>
      <div class="skill-row">
        <div class="skill-header"><span>AI-Assisted Design Workflows</span><span>4.6 / 5</span></div>
        <div class="skill-bar-outer"><div class="skill-bar-inner" data-width="92%"></div></div>
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
      <div class="project-card-title">📊 SmartBI</div>
      <div class="project-card-desc">Converts complex SQL queries into intuitive conversational natural language dashboards.</div>
      <div class="project-tags">
        <span class="project-tag">Figma</span><span class="project-tag">AI UX</span><span class="project-tag">Data Viz</span>
      </div>
    `;
    p1.addEventListener('click', () => handleUserSubmit("SmartBI"));

    const p2 = document.createElement('div');
    p2.className = 'project-card';
    p2.innerHTML = `
      <div class="project-card-title">🛡️ SENTINEL</div>
      <div class="project-card-desc">Interactive system mapping tool built to coordinate tracking states and clear project friction.</div>
      <div class="project-tags">
        <span class="project-tag">UX Strategy</span><span class="project-tag">App Mapping</span><span class="project-tag">System Audits</span>
      </div>
    `;
    p2.addEventListener('click', () => handleUserSubmit("SENTINEL"));

    const p3 = document.createElement('div');
    p3.className = 'project-card';
    p3.innerHTML = `
      <div class="project-card-title">🩺 TRACTO</div>
      <div class="project-card-desc">High-contrast visual dashboard screens for an integrated elderly care health suite.</div>
      <div class="project-tags">
        <span class="project-tag">UI Kit</span><span class="project-tag">Usability</span><span class="project-tag">Healthcare</span>
      </div>
    `;
    p3.addEventListener('click', () => handleUserSubmit("TRACTO"));

    container.appendChild(p1);
    container.appendChild(p2);
    container.appendChild(p3);
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
 * Unified logger to local storage and Google Sheets.
 */
async function logToGoogleSheet(type, data) {
  // 1. Local Fallback Logging
  if (type === 'unhandled') {
    try {
      const list = JSON.parse(localStorage.getItem('unhandled_questions') || '[]');
      if (!list.includes(data.trim())) {
        list.push(data.trim());
        localStorage.setItem('unhandled_questions', JSON.stringify(list));
      }
    } catch (e) {
      console.error("Failed to log locally:", e);
    }
  } else if (type === 'user_data') {
    try {
      const list = JSON.parse(localStorage.getItem('user_provided_data') || '[]');
      if (!list.includes(data.trim())) {
        list.push(data.trim());
        localStorage.setItem('user_provided_data', JSON.stringify(list));
      }
    } catch (e) {
      console.error("Failed to log locally:", e);
    }
  }

  // 2. Google Sheets Web App Sync
  if (GOOGLE_SHEET_URL) {
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, data, timestamp: new Date().toISOString() })
      });
    } catch (err) {
      console.error("Failed to post to Google Sheet:", err);
    }
  }
}

/**
 * Detects and logs user provided leads (emails, phone numbers, callback requests, or company names).
 */
function detectAndLogUserLeads(inputVal) {
  const cleanInput = inputVal.trim().toLowerCase();
  
  // 1. Email validation (RFC 5322 regex)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = inputVal.match(emailRegex) || [];
  
  // 2. Phone/Mobile/Landline validation (7 to 15 digits)
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{4,5}/g;
  const rawPhones = inputVal.match(phoneRegex) || [];
  const phones = rawPhones.filter(num => {
    const digits = num.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  });

  // 3. Callback requests detection
  const callbackKeywords = ['call back', 'callback', 'call me', 'contact me', 'talk to me', 'schedule a call', 'phone me', 'ring me', 'interview', 'discuss'];
  const isCallbackRequest = callbackKeywords.some(keyword => cleanInput.includes(keyword));

  // 4. Company Name Indicators
  const companyIndicators = ['company', 'organization', 'agency', 'inc', 'corp', 'corporation', 'gmbh', 'pvt ltd', 'ltd', 'pvt. ltd.', 'hiring for', 'on behalf of', 'representing', 'represent'];
  const hasCompanyInfo = companyIndicators.some(indicator => cleanInput.includes(indicator)) || /\b(?:at|from|representing)\s+([a-zA-Z0-9\s.]{2,30})\b/i.test(inputVal);

  if (emails.length > 0 || phones.length > 0 || isCallbackRequest || hasCompanyInfo) {
    const findings = [];
    if (emails.length > 0) findings.push(`Emails: ${emails.join(', ')}`);
    if (phones.length > 0) findings.push(`Phones: ${phones.join(', ')}`);
    if (isCallbackRequest) findings.push(`Callback Requested`);
    if (hasCompanyInfo) findings.push(`Company Context`);

    const leadLogEntry = `Input: "${inputVal.trim()}" | Detected: [${findings.join(' | ')}]`;
    logToGoogleSheet('user_data', leadLogEntry);
  }
}

/**
 * Core submission handler.
 */
function handleUserSubmit(inputVal) {
  if (!inputVal.trim()) return;

  // Run lead validation and logging
  detectAndLogUserLeads(inputVal);

  // Trigger UI transition if we are in landing page
  if (app.classList.contains('landing-mode')) {
    transitionToChatMode();
    // Delay message load slightly to match smooth center-to-bottom animation
    setTimeout(() => {
      appendUserMessage(inputVal);
      const reply = brain.processMessage(inputVal);
      if (reply.intentId === 'fallback') {
        logToGoogleSheet('unhandled', inputVal);
      }
      simulateResponse(reply.text, reply.chips);
    }, 550);
  } else {
    appendUserMessage(inputVal);
    const reply = brain.processMessage(inputVal);
    if (reply.intentId === 'fallback') {
      logToGoogleSheet('unhandled', inputVal);
    }
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

/* ==========================================================================
   TOP TABS SELECTION & HTML RESUME SHORTCUT ACTIONS
   ========================================================================== */

function switchTab(activeTabId) {
  if (activeTabId === 'interactive') {
    tabInteractive.classList.add('active');
    tabInteractive.setAttribute('aria-selected', 'true');
    tabClassic.classList.remove('active');
    tabClassic.setAttribute('aria-selected', 'false');
    contentInteractive.classList.add('active');
    contentClassic.classList.remove('active');
  } else {
    tabInteractive.classList.remove('active');
    tabInteractive.setAttribute('aria-selected', 'false');
    tabClassic.classList.add('active');
    tabClassic.setAttribute('aria-selected', 'true');
    contentInteractive.classList.remove('active');
    contentClassic.classList.add('active');
  }
}

if (tabInteractive && tabClassic) {
  tabInteractive.addEventListener('click', () => switchTab('interactive'));
  tabClassic.addEventListener('click', () => switchTab('classic'));
}

// Handle resume sharing and downloading

async function handleResumeDownloadOrShare(e) {
  if (e) e.preventDefault();
  const pdfUrl = 'resume/Sayantan_Ghosh_Product_Designer_Resume_V2.pdf';
  
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const file = new File([blob], 'Sayantan_Ghosh_Product_Designer_Resume_V2.pdf', { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Sayantan Ghosh - Product Designer Resume",
        text: "Sharing Sayantan Ghosh's Product Designer Resume V2"
      });
    } else if (navigator.share) {
      const absoluteUrl = new URL(pdfUrl, window.location.href).href;
      await navigator.share({
        title: "Sayantan Ghosh - Product Designer Resume",
        text: "Check out Sayantan Ghosh's Product Designer Resume V2",
        url: absoluteUrl
      });
    } else {
      triggerFallbackDownload(pdfUrl);
    }
  } catch (err) {
    console.error("Sharing failed, falling back to download:", err);
    triggerFallbackDownload(pdfUrl);
  }
}

function triggerFallbackDownload(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Sayantan_Ghosh_Product_Designer_Resume_V2.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Bind both download buttons to the Share/Download handler
const mainDownloadBtn = document.getElementById('download-btn');
if (mainDownloadBtn) {
  mainDownloadBtn.addEventListener('click', handleResumeDownloadOrShare);
}
if (classicActionDownload) {
  classicActionDownload.addEventListener('click', handleResumeDownloadOrShare);
}

// Font Resizer Accessibility controls
const btnFontDecrease = document.getElementById('btn-font-decrease');
const btnFontReset = document.getElementById('btn-font-reset');
const btnFontIncrease = document.getElementById('btn-font-increase');
const resumeScrollableBody = document.querySelector('.classic-resume-scrollable-body');

function setFontScale(scale, activeBtn) {
  if (resumeScrollableBody) {
    resumeScrollableBody.style.setProperty('--resume-font-scale', scale);
  }
  [btnFontDecrease, btnFontReset, btnFontIncrease].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  if (activeBtn) activeBtn.classList.add('active');
}

if (btnFontDecrease) {
  btnFontDecrease.addEventListener('click', () => setFontScale(0.85, btnFontDecrease));
}
if (btnFontReset) {
  btnFontReset.addEventListener('click', () => setFontScale(1.0, btnFontReset));
}
if (btnFontIncrease) {
  btnFontIncrease.addEventListener('click', () => setFontScale(1.2, btnFontIncrease));
}

// Prevent pinch-to-zoom (two-finger touch gestures)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Hidden Developer Panel: Click profile avatar 5 times to download logged unhandled questions
const avatarImg = document.querySelector('.header-avatar');
if (avatarImg) {
  let clickCount = 0;
  let clickTimeout = null;
  
  avatarImg.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimeout);
    
    clickTimeout = setTimeout(() => {
      clickCount = 0;
    }, 2000); // Reset count if clicks are spread out
    
    if (clickCount >= 5) {
      clickCount = 0;
      exportUnhandledQuestions();
    }
  });
}

function exportUnhandledQuestions() {
  // 1. Export Unhandled Questions
  const questionsList = JSON.parse(localStorage.getItem('unhandled_questions') || '[]');
  if (questionsList.length > 0) {
    const content = questionsList.join('\n\n');
    triggerTextDownload(content, 'unhandled_questions.txt');
  }

  // 2. Export User Provided Leads
  const leadsList = JSON.parse(localStorage.getItem('user_provided_data') || '[]');
  if (leadsList.length > 0) {
    const content = leadsList.join('\n\n');
    triggerTextDownload(content, 'user_provided_leads.txt');
  }

  if (questionsList.length === 0 && leadsList.length === 0) {
    alert("No logged queries or contact leads found yet!");
    return;
  }

  if (confirm("Data exported successfully! Would you like to clear the logged history in your browser?")) {
    localStorage.removeItem('unhandled_questions');
    localStorage.removeItem('user_provided_data');
  }
}

function triggerTextDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
