

## Apply Chat Image Sizing to All Community Tabs

The Chat tab uses optimized image sizing: `max-w-full sm:max-w-[360px] w-auto h-auto object-contain` with rounded corners and subtle border. The other tabs use oversized rendering.

### Changes

**1. Announcements — `src/components/academy/AnnouncementsFeed.tsx` (line 79-84)**
Change the image from `max-w-full max-h-[300px] object-cover` to match chat sizing:
```
className="rounded-xl max-w-full sm:max-w-[360px] w-auto h-auto object-contain border border-white/[0.08] mt-2"
```

**2. Signals — `src/components/academy/community/CommunityDailySetups.tsx` (line 137-141)**
Change from `max-w-full max-h-[400px] object-cover` to:
```
className="rounded-xl max-w-full sm:max-w-[360px] w-auto h-auto object-contain border border-white/[0.08]"
```

**3. Wins — `src/components/academy/community/CommunityWins.tsx` (lines 101-109)**
Replace the full-width `aspect-video` container with a constrained image matching chat style. Remove the wrapping `div` with `aspect-video` and render the image directly:
```
{imageAtt && (
  <div className="p-4 pb-0">
    <img
      src={(imageAtt as any).url}
      alt="Trade screenshot"
      className="rounded-xl max-w-full sm:max-w-[360px] w-auto h-auto object-contain border border-white/[0.08]"
      loading="lazy"
    />
  </div>
)}
```

All three tabs will match the Chat tab's compact, contained image rendering.

