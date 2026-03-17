
# Fix: Add Missing `FileText` Import

The build error is straightforward — `FileText` is used on line 1276 but wasn't included in the lucide-react import on line 14.

**File:** `src/components/academy/RoomChat.tsx` line 14

Add `FileText` to the existing lucide-react import list.
