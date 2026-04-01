

## Fix: Search Breaks on Multi-Word Queries

### Root Cause
Line 80 uses `.or(`title.ilike.${searchTerm},subtitle.ilike.${searchTerm}`)` which passes the search term inline in PostgREST's filter string syntax. When the query contains spaces (e.g. "supply and demand"), the word `and` gets interpreted as a PostgREST logical operator, breaking the filter.

The `.ilike()` method calls on lines 86 and 91 work fine because they pass the value as a parameter, not inline in a filter string.

### Fix — `src/components/academy/VaultSearchModal.tsx`
Replace the `.or()` filter string with two separate `.ilike()` calls combined properly, or use PostgREST's quoted syntax. The cleanest approach:

Replace line 80:
```ts
.or(`title.ilike.${searchTerm},subtitle.ilike.${searchTerm}`)
```
With properly quoted values:
```ts
.or(`title.ilike.%${trimmed}%,subtitle.ilike.%${trimmed}%`)
```

Actually the real fix is to **URL-encode** or **quote** the value. PostgREST expects values with special characters to be quoted. The simplest reliable fix is to use `"` quoting:
```ts
.or(`title.ilike."%${trimmed}%",subtitle.ilike."%${trimmed}%"`)
```

This wraps the ILIKE value in double quotes so PostgREST treats the entire string (including spaces and the word "and") as a literal value.

### Single file change
- `src/components/academy/VaultSearchModal.tsx` — line 80: quote the filter values in the `.or()` call

