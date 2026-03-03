

## Transform "Instant Answer" into a Conversational Chatbot

### What it is now
The current Instant Answer tab is a single question-response form. User types a question, gets one structured answer, done. No back-and-forth. No images.

### What it will become
A full chat interface — like iMessage or ChatGPT — where users can have a multi-turn conversation. The AI will:
- Remember the full conversation context (sends all prior messages each turn)
- Use dead-simple language a 10-year-old could follow (updated system prompt)
- Generate images/diagrams when helpful to explain concepts visually
- Stream responses token-by-token for a responsive feel

### Changes

**1. New edge function: `coach-chat` (streaming, multi-turn, image support)**
- Accepts `messages[]` array (full conversation history) instead of a single `question`
- Streams SSE responses for real-time token rendering
- Updated system prompt: explain everything like you're talking to a complete beginner — short sentences, no jargon, use analogies, use pictures when it helps
- Supports image generation via `google/gemini-2.5-flash-image` when the user asks for a visual or when the AI decides a diagram would help
- Handles 429/402 errors properly
- Add `verify_jwt = false` in config.toml

**2. Rewrite the Instant Answer section of `CoachDrawer.tsx`**
- Replace the single Q&A form with a scrollable chat message list (user bubbles right, AI bubbles left)
- Bottom-pinned composer with send button
- Token-by-token streaming into the latest AI bubble
- Render markdown in AI messages, render inline images when returned
- Auto-scroll to bottom on new messages
- Keep the "Past Answers" history view (links to old single-shot answers)
- Keep the coach handoff CTA — after any AI message, show a subtle "Still stuck? Ask Coach RZ" link
- Category chips remain as conversation starters (pre-fill the first message)

**3. Update system prompt (beginner-first tone)**
New prompt instructs the AI to:
- Talk like you're explaining to a smart 10-year-old
- Use simple words, short sentences, real-world analogies ("think of it like a piggy bank")
- Avoid jargon — or if you must use a term, immediately explain it in parentheses
- Offer to draw/generate a picture when a visual would help
- Still refuse trade signals — stay educational

**4. Image generation flow**
- When the AI's response contains image data (from the gateway's `images` field), render it inline in the chat bubble
- User can also explicitly ask "show me a picture of…" or "draw a chart that explains…"
- Images are displayed as `<img>` tags inline within the AI message bubble

### Files to create/edit
- **Create** `supabase/functions/coach-chat/index.ts` — streaming multi-turn edge function with beginner system prompt + image generation support
- **Edit** `supabase/config.toml` — add `[functions.coach-chat]` with `verify_jwt = false`
- **Edit** `src/components/academy/CoachDrawer.tsx` — replace Instant Answer section with chat UI, streaming logic, image rendering

### Technical details
- Conversation state is local (useState array of `{role, content, images?}`) — no new DB table needed
- Past single-shot answers remain accessible via the history view
- SSE parsing uses the standard line-by-line approach with `[DONE]` handling
- Image responses are detected via `parsed.choices[0].message.images` in the non-streaming path (image gen requires a separate non-streamed call)
- Coach tab (human) stays exactly as-is

