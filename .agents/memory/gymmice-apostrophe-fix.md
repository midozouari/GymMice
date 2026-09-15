---
name: GymMice apostrophe issue
description: Metro/Babel syntax error from apostrophes inside single-quoted JS strings in mockData and chat files.
---

## Problem
Metro bundler (Babel parser) crashes with `SyntaxError: Unexpected token` when a single-quoted string contains an apostrophe:
```ts
// BAD — breaks Metro
'Consistency is key, you'll see results 🔥'
"That's fire 🔥"  // fine — double quotes
```

## Fix
Use double quotes for any string value that contains a contraction or possessive apostrophe.

**Why:** Metro uses Babel for TS transpilation. Babel's parser (not TypeScript's) throws on unescaped apostrophes in single-quoted strings. The fix is to use double quotes or escape with `\'`.

**Where it appeared:** `constants/mockData.ts` (conversation messages) and `app/chat/[name].tsx` (AUTO_REPLIES array).
