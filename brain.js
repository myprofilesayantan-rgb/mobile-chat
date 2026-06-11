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
   * Checks if a keyword exists in the text as a whole word or phrase.
   * @param {string} text
   * @param {string} keyword
   * @returns {boolean}
   */
  hasWholeWordOrPhrase(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
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
        return this.hasWholeWordOrPhrase(cleanedMessage, keyword);
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
        if (this.hasWholeWordOrPhrase(cleanedMessage, keyword)) {
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
      // Fallback
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
