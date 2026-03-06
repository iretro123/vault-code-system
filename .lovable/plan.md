

## Change Back Arrow to Open Sidebar on Mobile

### Change — 1 file

**`src/components/layout/AcademyLayout.tsx`**

Update the mobile back arrow's `onClick` handler: instead of `navigate("/academy/home")`, call the sidebar's `setOpenMobile(true)` to slide open the sidebar overlay. This lets users pick any destination rather than being forced to the dashboard.

- Import `useSidebar` from the sidebar component
- Replace `navigate("/academy/home")` with `setOpenMobile(true)` in the back arrow button's click handler

