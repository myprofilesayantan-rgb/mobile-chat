import { ChatBrain } from './brain.js';
import fs from 'fs';

async function runTests() {
  console.log("=== Initializing ChatBrain Test Runner ===");
  
  // Read database directly in Node.js
  const rawData = fs.readFileSync('./brain_data.json', 'utf-8');
  const data = JSON.parse(rawData);
  
  const brain = new ChatBrain();
  await brain.init(data);
  
  console.log("Brain initialized successfully with database.\n");

  const testCases = [
    // Standard inputs
    { input: "hello there", expectedIntent: "greeting" },
    { input: "hi", expectedIntent: "greeting" },
    { input: "thank you", expectedIntent: "thanks" },
    { input: "bye", expectedIntent: "goodbye" },
    { input: "what's his contact details ?", expectedIntent: "contact" },
    { input: "who are you?", expectedIntent: "about" },
    { input: "what is your stack?", expectedIntent: "skills" },
    { input: "show me some of your work", expectedIntent: "projects" },
    { input: "tell me more about SmartBI", expectedIntent: "smartbi" },
    { input: "how can I contact you?", expectedIntent: "contact" },
    { input: "show me TRACTO dashboard", expectedIntent: "tracto" },
    { input: "how do you use AI?", expectedIntent: "ai_workflow" },
    { input: "skill on AI", expectedIntent: "ai_workflow" },
    { input: "tell me about RummyCircle", expectedIntent: "rummycircle" },
    { input: "what is your user research process?", expectedIntent: "methodology" },
    { input: "why are you looking for a change?", expectedIntent: "reason_for_change" },
    { input: "how do you collaborate with developers?", expectedIntent: "developer_collaboration" },
    { input: "where are your case study links?", expectedIntent: "portfolio_links" },
    { input: "do you require visa sponsorship?", expectedIntent: "visa_remote" },
    { input: "what is your design philosophy?", expectedIntent: "design_philosophy" },
    { input: "aksdjhfklashdf", expectedIntent: "typing_mistake" },
    { input: "dfdfdf", expectedIntent: "typing_mistake" },
    { input: "sdsdere", expectedIntent: "typing_mistake" },
    { input: "jdfkr", expectedIntent: "typing_mistake" },

    // Edge Cases: Case Sensitivity & Spaces
    { input: "   HI   ", expectedIntent: "greeting" },
    { input: "HeLlO tHeRe", expectedIntent: "greeting" },
    { input: "tHaNkS a LoT", expectedIntent: "thanks" },
    { input: "bYe ByE!", expectedIntent: "goodbye" },
    { input: "ho", expectedIntent: "greeting" },
    { input: "hii", expectedIntent: "greeting" },
    { input: "hlo", expectedIntent: "greeting" },

    // Edge Cases: Punctuation & Special Characters
    { input: "...hello...", expectedIntent: "greeting" },
    { input: "thanks!!!", expectedIntent: "thanks" },
    { input: "what is your stack???", expectedIntent: "skills" },
    { input: "???!!!", expectedIntent: "fallback" },
    { input: "", expectedIntent: "fallback" },
    { input: "   ", expectedIntent: "fallback" },

    // Edge Cases: Substring vs. Whole Word matching (Crucial Fix validation)
    { input: "this", expectedIntent: "fallback" }, // 'hi' in 'this'
    { input: "history", expectedIntent: "experience" }, // 'hi' in 'history'
    { input: "contact", expectedIntent: "contact" }, // 'con' in 'contact' (abusive 'con' must not flag it)
    { input: "initiate", expectedIntent: "fallback" }, // 'init' in 'initiate'
    { input: "welcome-back", expectedIntent: "fallback" }, // 'welcome' with dash
    { input: "starting", expectedIntent: "fallback" }, // 'start' in 'starting'
    
    { input: "okay how much experience you have in dingdong", expectedIntent: "experience" },
    { input: "do you have variable pay?", expectedIntent: "deflect_ctc" },
    { input: "what is the company share component?", expectedIntent: "deflect_ctc" },
    { input: "what health insurance do you offer?", expectedIntent: "deflect_ctc" },
    { input: "what is your hourly rate?", expectedIntent: "deflect_ctc" },
    { input: "what are your stock options?", expectedIntent: "deflect_ctc" },
    { input: "what is your expected salary?", expectedIntent: "deflect_ctc" },
    
    // Edge Cases: Abuse Block (caps/spaces/punctuation)
    { input: " FUCK ", expectedIntent: "abuse_block" },
    { input: "!!!shit!!!", expectedIntent: "abuse_block" },
    { input: "porn", expectedIntent: "abuse_block" }
  ];

  let passed = 0;
  for (const tc of testCases) {
    const response = brain.processMessage(tc.input);
    const matched = response.intentId === tc.expectedIntent;
    if (matched) {
      console.log(`✅ PASSED: "${tc.input}" -> Matched intent "${response.intentId}"`);
      passed++;
    } else {
      console.log(`❌ FAILED: "${tc.input}" -> Got "${response.intentId}", Expected "${tc.expectedIntent}"`);
      console.log(`   Response text: ${response.text}`);
    }
  }

  // State-Based Edge Case (Context follow-up)
  console.log("\n--- Testing Context State Edge Cases ---");
  brain.reset();
  
  // Step 1: Set context to skills
  let r1 = brain.processMessage("what is your stack?");
  let step1Passed = r1.intentId === "skills";
  console.log(`${step1Passed ? "✅" : "❌"} Step 1 (Set Context to skills): ${r1.intentId}`);

  // Step 2: Follow up with "tell me more" without specifying topic
  let r2 = brain.processMessage("tell me more");
  let step2Passed = r2.intentId === "skills";
  console.log(`${step2Passed ? "✅" : "❌"} Step 2 (Follow up 'tell me more' inherits skills): ${r2.intentId}`);

  // Step 3: Reset context and verify follow-up goes to fallback
  brain.reset();
  let r3 = brain.processMessage("tell me more");
  let step3Passed = r3.intentId === "fallback";
  console.log(`${step3Passed ? "✅" : "❌"} Step 3 (Follow up without context goes to fallback): ${r3.intentId}`);

  if (step1Passed && step2Passed && step3Passed) {
    passed += 3;
  }
  
  // Step 4: Spelling suggestion / fuzzy matching verification for "con-" -> YES
  console.log("\n--- Testing Fuzzy Matches & Spelling Autocorrect ---");
  brain.reset();
  let r4 = brain.processMessage("con-");
  let step4Passed = r4.intentId === "clarification" && r4.text.includes("contact details");
  console.log(`${step4Passed ? "✅" : "❌"} Step 4 (Con- triggers clarification for contact details): ${r4.intentId} (${r4.text})`);
  
  let r4Confirm = brain.processMessage("yes");
  let step4ConfirmPassed = r4Confirm.intentId === "contact";
  console.log(`${step4ConfirmPassed ? "✅" : "❌"} Step 4 Confirm (Yes displays contact details): ${r4Confirm.intentId}`);

  // Step 5: Spelling suggestion for "pornfolio" -> YES
  let r5 = brain.processMessage("pornfolio");
  let step5Passed = r5.intentId === "clarification" && r5.text.includes("portfolio");
  console.log(`${step5Passed ? "✅" : "❌"} Step 5 (Pornfolio triggers clarification for portfolio): ${r5.intentId} (${r5.text})`);
  
  let r5Confirm = brain.processMessage("yes");
  let step5ConfirmPassed = r5Confirm.intentId === "projects";
  console.log(`${step5ConfirmPassed ? "✅" : "❌"} Step 5 Confirm (Yes displays projects): ${r5Confirm.intentId}`);

  // Step 6: Spelling suggestion for "ridume" -> NO
  let r6 = brain.processMessage("ridume");
  let step6Passed = r6.intentId === "clarification" && r6.text.includes("resume");
  console.log(`${step6Passed ? "✅" : "❌"} Step 6 (Ridume triggers clarification for resume): ${r6.intentId} (${r6.text})`);
  
  let r6Confirm = brain.processMessage("no");
  let step6ConfirmPassed = r6Confirm.intentId === "fallback";
  console.log(`${step6ConfirmPassed ? "✅" : "❌"} Step 6 Reject (No triggers standard fallback): ${r6Confirm.intentId}`);

  if (step4Passed && step4ConfirmPassed && step5Passed && step5ConfirmPassed && step6Passed && step6ConfirmPassed) {
    passed += 6;
  }

  // Step 7: First-time typo welcome verification
  console.log("\n--- Testing First-Time Typo Welcome ---");
  brain.reset();
  let r7 = brain.processMessage("hfdfo");
  let step7Passed = r7.intentId === "typing_mistake" && r7.text.startsWith("Welcome!");
  console.log(`${step7Passed ? "✅" : "❌"} Step 7 (First-time typo welcomes the user): ${r7.intentId}`);
  
  // Subsequent typo does NOT have Welcome
  let r7Subsequent = brain.processMessage("dfdfdf");
  let step7SubsequentPassed = r7Subsequent.intentId === "typing_mistake" && !r7Subsequent.text.startsWith("Welcome!");
  console.log(`${step7SubsequentPassed ? "✅" : "❌"} Step 7 Subsequent (Second typo does not welcome): ${r7Subsequent.intentId}`);

  if (step7Passed && step7SubsequentPassed) {
    passed += 2;
  }

  // Step 8: Spelling suggestion for "mane" -> "name"
  console.log("\n--- Testing Spelling Suggestion for mane -> name ---");
  brain.reset();
  let r8 = brain.processMessage("What is you mane?");
  let step8Passed = r8.intentId === "clarification" && r8.text.includes("name");
  console.log(`${step8Passed ? "✅" : "❌"} Step 8 (What is you mane? triggers clarification for name): ${r8.intentId} (${r8.text})`);

  let r8Confirm = brain.processMessage("yes");
  let step8ConfirmPassed = r8Confirm.intentId === "about";
  console.log(`${step8ConfirmPassed ? "✅" : "❌"} Step 8 Confirm (Yes displays about details): ${r8Confirm.intentId}`);

  if (step8Passed && step8ConfirmPassed) {
    passed += 2;
  }

  const totalTests = testCases.length + 13;
  console.log(`\nSummary: ${passed}/${totalTests} tests passed.`);
  if (passed === totalTests) {
    console.log("🚀 All edge case, standard, context, and fuzzy suggestion tests passed successfully!");
  } else {
    console.log("⚠️ Test suite failures found. Verify keyword matches and boundary logic.");
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
});
