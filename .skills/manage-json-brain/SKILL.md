---
name: manage-json-brain
description: Orchestrates maintenance, updates, and integrity checks for Sayantan's conversational portfolio database (brain_data.json).
---

# JSON Brain Management Skill

Use this skill to update, debug, or verify the keyword scoring routing engine and data inside `brain_data.json`.

## 1. Schema Validation

Ensure that any changes to `brain_data.json` adhere to the structured database schema:

```json
{
  "welcome": {
    "responses": [ "String containing markup response" ],
    "chips": [ "Array of quick action chip texts" ]
  },
  "fallback": {
    "responses": [ "String suggestions when intent matching fails" ],
    "chips": [ "Array of fallback action chips" ]
  },
  "intents": [
    {
      "id": "unique-intent-id",
      "keywords": [ "array", "of", "search", "keywords" ],
      "responses": [ "String detail matching this query" ],
      "chips": [ "Related next-step quick action chips" ]
    }
  ]
}
```

## 2. Intent Rules & Keyword Guidelines

- **Keywords Matching**: Choose unique keywords and phrases that map reliably to the intent. Multi-word phrases (e.g. "contact details", "work history") are weighted higher during search tokenization.
- **Tone & Identity**: Keep responses informative, structured, and focused on Sayantan Ghosh's portfolio credentials. Do not write creative, flowery generative responses; use formatted list items and bold tags.
- **Link Syncing**: Ensure URLs matched in responses point to the active assets:
  - Resume PDF: `resume/Sayantan_Ghosh_Product_Designer_Resume_V2.pdf`
  - Portfolio URL: `https://uxsayantan.com`
  - LinkedIn: `https://linkedin.com/in/uxsayantan`
  - Medium: `https://medium.com/@ghosh.sayantan1982`
  - Email: `ghosh.sayantan1982@gmail.com`

## 3. Update Checklist

When modifying the brain data:
1. Verify that new intents contain at least 4-5 diverse keywords.
2. Confirm the `chips` array contains actions that map directly to other existing intents (e.g. "Explore Projects", "View Skills").
3. Ensure HTML text inside responses uses double asterisks (`**bold**`) which the formatter processes safely into `<strong>` tags.
