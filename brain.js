/**
 * ChatBrain - The logic engine of the portfolio chat system.
 * It processes user messages, performs keyword scoring against a JSON database,
 * manages conversation state, and returns matches.
 */
export class ChatBrain {
  constructor() {
    this.data = null;
    this.history = [];
    this.currentState = {
      lastIntentId: null,
      contextDepth: 0
    };
  }

  /**
   * Initializes the brain by loading the JSON database.
   * @param {string|object} dataSource - URL to the JSON file or a pre-loaded object.
   */
  async init(dataSource = './brain_data.json') {
    if (typeof dataSource === 'object') {
      this.data = dataSource;
    } else {
      try {
        const response = await fetch(dataSource);
        this.data = await response.json();
      } catch (error) {
        console.error('Failed to initialize ChatBrain data:', error);
        throw error;
      }
    }
  }

  /**
   * Resets the conversation state.
   */
  reset() {
    this.history = [];
    this.currentState = {
      lastIntentId: null,
      contextDepth: 0
    };
  }

  /**
   * Cleans and tokenizes text for keyword matching.
   * @param {string} text 
   * @returns {string[]} tokens
   */
  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Checks if the keyword tokens exist as a sub-sequence within the message tokens.
   * @param {string[]} messageTokens
   * @param {string} keyword
   * @returns {boolean}
   */
  hasKeywordTokens(messageTokens, keyword) {
    const keywordTokens = this.tokenize(keyword);
    if (keywordTokens.length === 0) return false;
    
    for (let i = 0; i <= messageTokens.length - keywordTokens.length; i++) {
      let match = true;
      for (let j = 0; j < keywordTokens.length; j++) {
        if (messageTokens[i + j] !== keywordTokens[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  /**
   * Calculates the Levenshtein distance between two strings.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Processes a user message and returns a reply.
   * @param {string} userMessage 
   * @returns {Object} response { text: string, chips: string[], intentId: string }
   */
  processMessage(userMessage) {
    if (!this.data) {
      return {
        text: "System loading... Matrix is not yet fully initialized.",
        chips: [],
        intentId: "system_loading"
      };
    }

    const cleanedMessage = userMessage.trim().toLowerCase();

    // 1. Check if we are waiting for a Y/N confirmation for a typo suggestion
    if (this.currentState.pendingConfirmation) {
      const pending = this.currentState.pendingConfirmation;
      this.currentState.pendingConfirmation = null; // Clear immediately
      
      const yesWords = ['y', 'yes', 'yeah', 'yep', 'sure', 'correct', 'indeed', 'yes, please'];
      const noWords = ['n', 'no', 'nope', 'nah', 'incorrect', 'no, thanks'];
      
      if (yesWords.includes(cleanedMessage)) {
        const matchedIntent = this.data.intents.find(i => i.id === pending.suggestedIntentId);
        if (matchedIntent) {
          this.currentState.lastIntentId = matchedIntent.id;
          this.currentState.contextDepth += 1;
          return {
            text: this.getRandomElement(matchedIntent.responses),
            chips: matchedIntent.chips,
            intentId: matchedIntent.id
          };
        }
      } else if (noWords.includes(cleanedMessage)) {
        return {
          text: "Understood. What else would you like to explore? You can ask about my **skills**, **projects**, or **experience**.",
          chips: ["View Skills", "Explore Projects", "Get Contact Details"],
          intentId: "fallback"
        };
      }
    }

    // Special exact matches (e.g. for suggestion chips)
    if (cleanedMessage === 'start over' || cleanedMessage === 'reset' || cleanedMessage === 'clear') {
      this.reset();
      const welcome = this.data.welcome;
      return {
        text: this.getRandomElement(welcome.responses),
        chips: welcome.chips,
        intentId: "welcome"
      };
    }

    // Tokenize the input
    const tokens = this.tokenize(userMessage);

    // Strict multi-language abuse check before scoring any other intent
    const abuseIntent = this.data.intents.find(i => i.id === "abuse_block");
    if (abuseIntent) {
      const isAbusive = abuseIntent.keywords.some(keyword => {
        return this.hasKeywordTokens(tokens, keyword);
      });
      if (isAbusive) {
        return {
          text: this.getRandomElement(abuseIntent.responses),
          chips: abuseIntent.chips,
          intentId: "abuse_block"
        };
      }
    }

    // Track intent matches and scores
    let bestMatch = null;
    let highestScore = 0;

    // Evaluate all intents in the JSON database
    for (const intent of this.data.intents) {
      let score = 0;
      
      // Look for keyword matches
      for (const keyword of intent.keywords) {
        // Full phrase check (e.g. "contact details", "aero chat")
        if (this.hasKeywordTokens(tokens, keyword)) {
          // Increase weight for exact/longer matches
          score += keyword.split(' ').length * 2.5;
        }

        // Individual token matching
        for (const token of tokens) {
          if (token === keyword) {
            score += 1.0;
          }
        }
      }

      // Contextual boosting (e.g., if user mentions details/more and the last intent was related)
      if (this.currentState.lastIntentId && intent.id === this.currentState.lastIntentId) {
        // Boost slightly if they check details
        const detailsKeywords = ['more', 'details', 'tell', 'explain', 'show', 'info', 'information'];
        if (tokens.some(t => detailsKeywords.includes(t))) {
          score += 1.5;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = intent;
      }
    }

    // Contextual handling: check if user asks "tell me more" or "details" without naming a topic
    if (highestScore < 1.0 && this.currentState.lastIntentId) {
      const followUpTokens = ['more', 'details', 'explain', 'expand', 'what', 'show'];
      if (tokens.some(t => followUpTokens.includes(t))) {
        // Find the intent matching the last active one
        const lastIntent = this.data.intents.find(i => i.id === this.currentState.lastIntentId);
        if (lastIntent) {
          bestMatch = lastIntent;
          highestScore = 1.0; // force a match
        }
      }
    }

    // Determine the response
    let responseText = "";
    let suggestionChips = [];
    let matchedIntentId = null;

    if (bestMatch && highestScore >= 1.0) {
      responseText = this.getRandomElement(bestMatch.responses);
      suggestionChips = bestMatch.chips;
      matchedIntentId = bestMatch.id;
      
      // Update state
      this.currentState.lastIntentId = bestMatch.id;
      this.currentState.contextDepth += 1;
    } else {
      // Fuzzy spelling autocorrect / suggestion edge-cases
      const suggestionTargets = [
        { term: "contact", intentId: "contact", displayName: "contact details" },
        { term: "portfolio", intentId: "projects", displayName: "portfolio" },
        { term: "projects", intentId: "projects", displayName: "projects" },
        { term: "resume", intentId: "experience", displayName: "resume" },
        { term: "skills", intentId: "skills", displayName: "skills" },
        { term: "experience", intentId: "experience", displayName: "experience" }
      ];

      for (const token of tokens) {
        const cleanedToken = token.replace(/[^a-zA-Z]/g, ""); // Remove trailing/leading symbols
        if (cleanedToken.length < 3) continue;

        for (const target of suggestionTargets) {
          let isMatch = false;

          // 1. Prefix match (e.g. "con-" or "con" for "contact")
          if (cleanedToken.length >= 3 && target.term.startsWith(cleanedToken)) {
            isMatch = true;
          }

          // 2. Levenshtein edit distance check (e.g. "pornfolio" -> "portfolio", "ridume" -> "resume")
          if (!isMatch) {
            const dist = this.getLevenshteinDistance(cleanedToken, target.term);
            const maxAllowedDist = target.term.length >= 6 ? 2 : 1;
            if (dist <= maxAllowedDist) {
              isMatch = true;
            }
          }

          if (isMatch) {
            this.currentState.pendingConfirmation = {
              originalInput: userMessage,
              suggestedIntentId: target.intentId,
              suggestionText: target.displayName
            };
            
            return {
              text: `Are you asking for my **${target.displayName}**?`,
              chips: ["Yes", "No"],
              intentId: "clarification"
            };
          }
        }
      }

      // Fallback if no fuzzy matches found
      const fallback = this.data.fallback;
      responseText = this.getRandomElement(fallback.responses);
      suggestionChips = fallback.chips;
      matchedIntentId = "fallback";
    }

    // Record history
    this.history.push({
      user: userMessage,
      bot: responseText,
      intent: matchedIntentId
    });

    return {
      text: responseText,
      chips: suggestionChips,
      intentId: matchedIntentId
    };
  }

  /**
   * Gets a random element from an array.
   */
  getRandomElement(array) {
    if (!array || array.length === 0) return "";
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }
}
