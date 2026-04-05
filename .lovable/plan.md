

## Replace Agreement Text with VAULT OS Conditional Performance Guarantee

### Overview
Replace the current "Important Agreement" legal text in the signup modal with the new "VAULT OS CONDITIONAL PERFORMANCE GUARANTEE" — updating the title, header, body content, and checkbox label to match the new legal document exactly.

### Changes — `src/pages/Signup.tsx`

**1. Modal header (lines 414-415)**
- Change title from "Important Agreement" to "VAULT OS Conditional Performance Guarantee"
- Update subtitle to "Please read all terms carefully before proceeding"
- Also update the `DialogTitle` sr-only text (line 406)

**2. Agreement card label (line 381)**
- Change from "Important Agreement" to "Performance Guarantee"

**3. Legal body text (lines 426-443)**
- Replace the entire content inside the scrollable container with the full 12-section guarantee document provided, using proper section headings (`font-semibold text-foreground`) and numbered formatting with `<br/>` spacing between sections
- Every word preserved exactly as provided

**4. Checkbox label (lines 455-461)**
- Update to: "I have read and agree to the VAULT OS Conditional Performance Guarantee, including all eligibility requirements, disqualification conditions, and limitations of liability. I understand this is not a guarantee of trading profits or success."

### Files changed
- `src/pages/Signup.tsx`

