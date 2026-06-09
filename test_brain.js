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
    { input: "hello there", expectedIntent: "greeting" },
    { input: "who are you?", expectedIntent: "about" },
    { input: "what is your stack?", expectedIntent: "skills" },
    { input: "show me some of your work", expectedIntent: "projects" },
    { input: "tell me more about AeroChat", expectedIntent: "aerochat" },
    { input: "how can I contact you?", expectedIntent: "contact" },
    { input: "show me lumina", expectedIntent: "lumina" },
    { input: "aksdjhfklashdf", expectedIntent: "fallback" }
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

  console.log(`\nSummary: ${passed}/${testCases.length} tests passed.`);
  if (passed === testCases.length) {
    console.log("🚀 All tests passed! The brain is working perfectly.");
  } else {
    console.log("⚠️ Some tests failed. Check logic rules.");
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
});
