

## Add "Schedule 1:1" Sidebar Tab + Calendly Booking Page

### Changes

**1. New page: `src/pages/academy/AcademySupport.tsx`**
- Bold headline: "TUESDAY & THURSDAY" (large, centered)
- Subheading: "Schedule 1:1"
- Description paragraph (the text you provided)
- Embedded Calendly widget via iframe pointing to `https://calendly.com/rz_/vault-os-support-calls-1-on-1`
- Clean, premium dark styling consistent with the rest of the academy

**2. `src/components/layout/AcademySidebar.tsx`**
- Add a new nav item in `coreNav` before Settings:
  `{ icon: CalendarCheck, label: "Schedule 1:1", path: "/academy/support", pageKey: "support" }`

**3. `src/App.tsx`**
- Import `AcademySupport` and add route: `<Route path="support" element={<AcademySupport />} />`

### Page layout
```text
┌──────────────────────────────────┐
│   TUESDAY & THURSDAY             │  ← big bold headline
│                                  │
│   paragraph text                 │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  Calendly iframe embed       │ │  ← full-width, ~700px tall
│ │                              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

3 files total: 1 new page, 2 edits (sidebar + router).

