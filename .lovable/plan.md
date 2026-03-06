

## Fix Spelling + Style "Vault OS" in Paragraph

### Changes — 1 file edit

**`src/pages/academy/AcademySupport.tsx`**

1. **Headline spelling**: Currently correct ("Tuesday & Thursday") — no issues found.

2. **Style "Vault OS" in the paragraph**: Replace the plain text "Vault OS" with inline spans:
   - "Vault" → `<span className="text-white font-semibold">Vault</span>`
   - "OS" → `<span className="text-primary font-semibold">OS</span>`

This makes "Vault" pop in white and "OS" in the brand blue, standing out from the muted-foreground paragraph text.

