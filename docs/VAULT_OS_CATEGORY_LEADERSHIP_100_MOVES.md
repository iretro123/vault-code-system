# Vault OS Category Leadership Plan

## The decision

Vault OS should not try to win as a signal service, trade journal, calculator collection, or static course library. It should become:

> **The private live trading school that feels alive every day.**

The product promise is not “we help you make winning trades.” It is:

> **Know what to learn today, join serious traders live, and get better without learning alone.**

That gives beginners a clear path, intermediates a reason to return, and advanced members a place to sharpen and contribute. It also makes the brand bigger than a founder. The experience is powered by programming, hosts, members, and a growing library—not one personality being constantly available.

The core loop should be:

`Open Today → see the next show → RSVP or join → learn one idea → discuss/share a takeaway → return for the next episode`

Trade tracking, calculators, and journals can remain available as optional tools, but they should not define the product or occupy primary navigation.

## The million-dollar thesis

AI will make explanations, summaries, market information, and generic course content abundant. Vault should not build its moat around owning more information than everyone else. Its scarce assets should be:

- **Curation:** members trust what Vault chooses to teach and what it refuses to promote.
- **Live context:** a reliable weekly rhythm of classes, discussions, and events that matters now.
- **People:** recognizable instructors, study partners, community captains, and member reputation.
- **Progression:** a clear path from newcomer to capable member to contributor to certified host.
- **Identity:** a professional trading-learning profile and relationships that members do not want to lose.
- **Production:** every live moment becomes a useful, searchable, multilingual learning asset.
- **Standards:** educators participate under Vault teaching, claims, conduct, and content-rights rules.

The long-term model is a **branded trading-school network**. Vault owns the campus, curriculum architecture, quality bar, member graph, event system, and subscription. Carefully selected outside educators own shows or limited “creator residencies” inside that system. Members subscribe to Vault, not to a single personality.

This should grow in three deliberate horizons:

| Horizon | Product | Business model | Proof needed before advancing |
|---|---|---|---|
| 1 — School | One excellent Vault campus with repeatable weekly programming | Free Lobby + $99 House + limited $199 Studio | Members repeatedly attend, learn, connect, and retain without founder dependence |
| 2 — Network | Certified guest teachers, creator residencies, multilingual rooms, regional schedules | Subscription plus creator revenue share | Creator cohorts generate retained members and meet teaching/compliance standards |
| 3 — Platform | Tools for approved educators to program classes and grow communities within Vault | Subscription, premium rooms, event revenue, selective B2B licensing | Supply quality, moderation, rights, payments, and discovery are operationally reliable |

Do not jump straight to a marketplace. First prove one school format so strong that other educators want to teach inside it.

## Honest end-to-end audit

### What is already valuable

- A real iOS app, Android shell, responsive web product, authenticated member experience, Stripe membership, push notifications, and admin tools already exist.
- Live sessions, a learning library, community chat, wins, profiles, referrals, onboarding, replays, and coaching infrastructure are already present.
- The live page is the strongest seed of the future product: scheduled sessions, replays, notifications, attendance, and admin controls.
- Community already contains real people, roles, posts, reactions, and social handles. Vault does not need to manufacture a fake community from zero.
- The codebase has passing automated tests and a successful production build.

### The biggest leaks

| Priority | Leak | Evidence | Why it matters |
|---|---|---|---|
| 1 | No sharp promise | Welcome says only “Join a team of serious traders”; checkout sells “full app access” | A stranger cannot see why this is worth $99 in five seconds |
| 2 | Product has no single daily destination | Home mixes onboarding, notes, markets, community, lessons, tools, and inactivity | Members must decide what to do instead of being given a compelling “Today” |
| 3 | Trade OS dominates the brand | Trade tracking and risk utilities are primary navigation | It contradicts the intended education/community positioning |
| 4 | The curriculum feels like a catalog | Learn opens at 0/89 lessons across eleven large modules, including two Chapter 1 labels | Beginners are overwhelmed; advanced members cannot quickly find their lane |
| 5 | Live classes are not yet a complete event product | Add to Calendar and Notify Me now exist, but RSVP identity, pre-class questions, a true lobby, and a replay discussion loop do not | The strongest value is being delivered like a utility instead of a show |
| 6 | Founder dependency remains visible | “Schedule 1:1” is primary navigation | The product promises access to a person, which cannot scale |
| 7 | Community feels chronological, not intentional | Chat, Signals, Wins, and older posts are the main structure | Energy disappears quickly and useful knowledge is hard to rediscover |
| 8 | Social identity is hidden | Social-profile fields exist, but Profile and Settings largely show the same settings experience | Members cannot build reputations, friendships, or reasons to return for one another |
| 9 | Visible unfinished inventory | Multiple Resources cards say “Coming soon” | Premium members experience promises instead of value |
| 10 | Influencer economics cannot be trusted yet | Referral signup tracking exists; paid/converted attribution is explicitly not wired | Creator spend cannot be connected to retained revenue |
| 11 | Public distribution is underbuilt | No strong app-store path in the product, generic store metadata, only one public App Store rating | Promotion leaks at the install decision |
| 12 | Schedules can contradict one another | Static Live copy says Tue/Thu at 9:30 while current programming differs | Missed sessions destroy trust faster than almost any visual flaw |
| 13 | Personalization is collected but underused | Onboarding asks beginner/intermediate/advanced and goals | The app knows who a member is but still shows a largely generic experience |
| 14 | Release hygiene needs work | Build and 152 tests pass, but lint reports 75 issues; major bundles exceed 500 KB and one source image is about 20 MB | Slower first use and preventable regressions hurt activation |
| 15 | Compliance details conflict | Local privacy copy says 17+ while the current App Store listing says 9+ | Hard promotion should not begin with avoidable policy inconsistency |

### What the current walkthrough revealed

- The first public tour leads with **“Real trader wins, every week”** and ends with **“Personal Vault OS mentoring.”** That frames the offer around profit proof and founder-style access before it explains education.
- Free signup calls the product a **“video library account”** and says the membership provides **“on-demand video content only.”** That language erases Live, community, and the school concept.
- The $99 signup path asks for an account and subscription commitment without showing a real weekly schedule, teachers, rooms, replays, or the first-week experience.
- Home begins with an inactivity warning, trade-plan language, economic events, a partially completed onboarding checklist, a Trade Floor card, and one lesson. It has many widgets but no single exciting next action.
- Live has the best foundation: current session, countdown, Zoom, Add to Calendar, Notify Me, and weekly program cards. However, its static copy still advertises “entries, exits, and alerts” and a schedule that conflicts with the real scheduled event.
- Learn shows 89 lessons and eleven modules at once. The first viewport is dominated by a large course poster rather than a recommended seven-day path or a live-linked lesson.
- Community can surface months-old P&L screenshots as the first visible content. It currently rewards claimed returns more visibly than questions, explanations, attendance, or helpfulness.
- `/academy/profile` redirects a completed member to Settings. There is no destination where a member can discover another member’s story, expertise, interests, rooms, or contributions.
- Weekly Progress emphasizes journal entries, trades posted, and mistakes. It does not show classes attended, concepts mastered, questions answered, classmates helped, or current learning path.
- Resources still shows six unfinished “Coming soon” cards.
- Bootcamp looks visually stronger but presents a static “9 spots left” and “Every Beginning of the Month” rather than a real cohort, exact date, teachers, syllabus, classmates, or cohort room.
- Support remains a sparse 1:1 Calendly page and says requested product updates may be handled after calls. That is expensive, founder-dependent positioning.

## The first 15 moves

These are the moves that create the largest change in member perception and growth. Do them before adding another calculator or tracker.

1. Rename the signed-in home destination **Today** and give it one dominant next action.
2. Replace the public promise with “The private live trading school that feels alive every day.”
3. Replace “Trade OS” in primary navigation with **Vault TV** or **Classrooms**; keep utilities under More/Tools.
4. Establish one authoritative event schedule used by Home, Live, notifications, SMS, email, and admin.
5. Add RSVP, Add to Calendar, pre-class questions, attendee faces, and automated reminder preferences to every session.
6. Turn each live call into a replay package within 24 hours: chapters, three clips, notes, key terms, quiz, and discussion thread.
7. Launch three named weekly shows with repeatable formats and rotating hosts.
8. Replace the ten-chapter catalog entrance with three lanes: **Start Here**, **Build Consistency**, and **Advanced Lab**.
9. Make member profiles public inside Vault and show bio, level, interests, contribution, and optional Instagram/TikTok/YouTube links.
10. Remove every “Coming soon” card until the asset is actually available.
11. Replace “Schedule 1:1” in navigation with **Coach Desk**, using group office hours, question queues, and rotating coaches.
12. Instrument the growth funnel from store/creator link through retained paid membership; do not track members’ P&L.
13. Wire referrals to paid and retained conversions before paying influencers at scale.
14. Rebuild the App Store product page around real screens, real programming, and member identity, then launch In-App Events.
15. Run a 30-day Founding Creator pilot with 10 carefully matched micro-creators, not a wide celebrity blast.

## The product architecture to build toward

Vault should feel small and obvious in navigation even as the school becomes large:

| Destination | Member question it answers | Core content |
|---|---|---|
| **Today** | What should I do now? | Live Now, Next Up, one recommended lesson, one active conversation |
| **Live** | What can I attend? | Schedule, RSVP, lobbies, attendance, questions, replays |
| **Learn** | What is my path? | Start Here, Build Consistency, Advanced Lab, seasons and mastery marks |
| **Campus** | Who can I learn with? | Classrooms, study crews, Member Wall, hosts, clubs, contribution feed |
| **Profile** | Who am I becoming here? | Learning identity, interests, attendance, contributions, connections, optional social links |
| **More** | Where are utilities? | Trade journal, calculators, settings, support, policies |

The global layer should be built into those destinations rather than becoming another feed: timezone-correct schedules, captions and translated summaries, language/topic clubs, regional hosts, follow-the-sun programming, and optional broad-region discovery. Never expose precise location by default.

### Rebuild onboarding as one commitment loop

The current eight-step feature tour should become five purposeful steps:

1. **Choose a lane:** Beginner, Intermediate, or Advanced, with a concrete outcome for each.
2. **Reserve the first class:** Show the next two relevant sessions in the member's timezone and let them RSVP immediately.
3. **Create a learning identity:** Add a photo, short introduction, topics of interest, timezone, and optional social links.
4. **Meet the room:** Join a new-member table or study crew and follow three recommended classmates/hosts.
5. **Set the return trigger:** Choose class and daily-learning reminders, then land in the live lobby or first seven-minute lesson.

Do not celebrate “account created.” Celebrate the first meaningful action: reserved a class, completed a primer, introduced themselves, or joined the room.

## 100 concrete ways to make Vault OS a real category-leading app

### 1–10: Own a clear category

1. **Own one category phrase.** Put “private live trading school” on the store page, website, welcome screen, creator briefs, and inside the app.
2. **Sell the daily feeling.** Lead with “Never wonder what to study today or learn alone,” not a list of software features.
3. **Name the world.** Use one memorable system: Vault Today, Vault Live, Vault TV, Classrooms, Member Wall, Coach Desk.
4. **Define the enemy.** Position against lonely YouTube learning, dead course libraries, noisy signal chats, and personality-dependent groups.
5. **Make education the product.** Signals, P&L, and calculators become optional utilities; classes, practice, replays, and discussion become the front door.
6. **Create a public programming guide.** Show this week’s real sessions before signup so prospects can see what they are buying.
7. **Use a transformation ladder.** Beginner: understand the language. Intermediate: build repeatable decision-making. Advanced: sharpen and teach.
8. **Turn the brand into a team.** Market hosts, coaches, moderators, editors, and community captains—not only the founder.
9. **Write a product constitution.** Every new feature must improve Learn, Belong, Attend, or Return; otherwise it waits.
10. **Create a recognizable visual broadcast system.** Every show gets consistent cover art, host card, color, intro sting, and replay thumbnail.

### 11–20: Make the first ten minutes undeniable

11. **Replace the generic welcome screen.** Show three real product moments: today’s live class, a chaptered replay, and a member discussion.
12. **Let prospects enter an Open Lobby.** Free users can see the schedule, trailers, public member profiles, and one orientation without seeing premium content.
13. **Build a 60-second orientation.** “Choose your level, pick your first show, meet your room, turn on reminders.”
14. **Use onboarding answers immediately.** A beginner should land on Start Here; an advanced member should land on Advanced Lab.
15. **Ask for one goal, not a questionnaire.** Use it to select a seven-day path and explain that choice on screen.
16. **Create a first-session reservation during signup.** Activation becomes an upcoming commitment, not an empty dashboard.
17. **Show real attendee faces.** “Ruben and 18 members are going” makes the first live event feel alive.
18. **Pair every new member with a welcome captain.** Use trained community members and an automated intro prompt.
19. **Give a Day One win.** A five-minute interactive lesson ends with a shareable “first takeaway” card posted inside Vault.
20. **Celebrate activation, not account creation.** The real welcome moment happens after the member joins a class, completes a lesson, or comments.

### 21–30: Build television-quality weekly programming

21. **Create Vault Today.** One screen shows Live Now, Next Up, today’s seven-minute lesson, and the active class discussion.
22. **Launch Sunday War Room.** A weekly educational market-preparation show with the same structure and rotating analyst.
23. **Launch Opening Bell Classroom.** Live observation and decision explanation with explicit educational framing, not alerts.
24. **Launch Chart Court.** Members submit charts; a coach explains what evidence is strong, weak, or missing.
25. **Launch Trade Film Room.** Review historical decisions and alternate scenarios without turning it into a P&L leaderboard.
26. **Launch Rookie Office Hours.** A safe beginner room where basic questions are expected and answered without embarrassment.
27. **Launch Advanced Roundtable.** Moderated peer discussion, thesis defense, and market-structure debate for experienced members.
28. **Launch The Debrief.** A short end-of-week show: three lessons, three community moments, and what to study next.
29. **Publish a season calendar.** Package four to six weeks around a theme so membership feels like an unfolding program.
30. **Create show bibles.** Each show gets a run-of-show, host script, learning objective, visual template, moderation rules, and post-production checklist.

### 31–40: Turn live sessions into a learning engine

31. **Add one-tap RSVP.** Going/Interested states should appear on Today, Live, profiles, and reminders.
32. **Add calendar files and timezone-safe display.** The same source of truth must power every event surface.
33. **Collect pre-class questions.** Let the host see ranked questions before going live.
34. **Open a class lobby 15 minutes early.** Use a prompt, poll, member roll call, and resource card instead of a dead waiting screen.
35. **Automate event reminders.** Let members choose 24 hours, 15 minutes, and Live Now; no manual button dependency.
36. **Create a live status bar everywhere.** When a class starts, every relevant screen gets one consistent join action.
37. **Build replay chapters.** Jump directly to the setup, concept, member question, or recap.
38. **Attach transcripts and summaries.** Search across what coaches actually taught, with links back to the exact timestamp.
39. **Keep the class conversation alive.** Each replay owns a durable thread for follow-up questions and member takeaways.
40. **Ship a 24-hour replay SLA.** Recording, title, thumbnail, chapters, summary, clips, quiz, and thread publish through one checklist.

### 41–50: Make learning fun without making it childish

41. **Replace chapter sprawl with learning lanes.** Start Here, Build Consistency, and Advanced Lab become the three entry shelves.
42. **Package lessons as seasons and episodes.** A finite season is more inviting than an endless course library.
43. **Use seven-minute daily episodes.** Each ends with one decision, one example, and one discussion question.
44. **Add “Watch before class.”** Link one short primer directly to every upcoming live session.
45. **Create interactive chart reveals.** Ask members what they see before revealing the instructor’s explanation.
46. **Build concept collections.** Supply and demand, market structure, options mechanics, psychology, and execution get searchable hubs.
47. **Show three depths for one concept.** Explain it as Beginner, Intermediate, and Advanced without hiding the other versions.
48. **Award mastery marks for evidence.** Reward completed explanations, quizzes, and helpful answers—not profit claims or trade volume.
49. **Create learning duos.** Two friends keep a shared weekly learning streak based on class/lesson participation.
50. **End every lesson socially.** “Post your takeaway,” “compare your answer,” or “ask the room” should be the final action.

### 51–60: Turn the community into the product moat

51. **Replace Settings-as-Profile with a real Member Wall.** Show bio, avatar, experience, interests, location/timezone, joined date, and optional social links.
52. **Create a searchable member directory.** Filter by level, interests, class, timezone, and willingness to help.
53. **Add Follow and Connect.** Members should be able to build a feed of people whose thinking they respect.
54. **Create class-based rooms.** Every season and live show gets a persistent classroom instead of sending all conversation into one stream.
55. **Add study crews of five to eight.** Small recurring groups create belonging without requiring the founder.
56. **Create a New Member table.** A seven-day room with introductions, orientation, and captain-led prompts.
57. **Build contribution reputation.** Recognize great questions, clear explanations, helpful replies, and consistent attendance.
58. **Feature Member of the Week.** Tell the story of how someone learned or helped—not how much money they claim to have made.
59. **Create a “What I learned” feed.** Structured reflection produces safer, higher-quality social proof than screenshot wins.
60. **Let members tag their Instagram optionally.** Give them polished share cards that link back to their Vault profile or class page.

### 61–70: Create a credible influencer and ambassador engine

61. **Recruit audience fit, not follower count.** Start with 10–20 micro-creators whose comments show real beginner/intermediate demand.
62. **Create the Founding Creator cohort.** A 30-day pilot gives creators access, a guest class, content assets, a unique page, and measured economics.
63. **Give each creator a co-branded store page.** Screenshots and copy should match the exact promise they are promoting.
64. **Give each creator a deep link.** Send people directly to the featured show, Open Week, or learning lane after install.
65. **Pay for retained members, not downloads.** Commission becomes eligible only after payment and the refund/chargeback window.
66. **Use a 30–60 day attribution window.** Publish the rules, last-click logic, exclusions, payout date, and dispute process.
67. **Build a real creator dashboard.** Show clicks, installs where available, signups, trials, paid starts, retained conversions, refunds, and earned commission.
68. **Turn creators into programming.** Guest teachers, hosts, watch parties, and creator classrooms give their audiences a reason to stay.
69. **Ship a weekly creator kit.** Three hooks, five approved clips, caption options, screenshots, FAQs, disclosures, and prohibited claims.
70. **Create a promotion approval lane.** Review trading/earnings claims, testimonials, and disclosure placement before content runs.

### 71–80: Get more qualified app downloads

71. **Rebuild App Store screenshots as a story.** Frame 1: Today. Frame 2: Join live. Frame 3: Pick your level. Frame 4: Meet the room. Frame 5: Replay with chapters.
72. **Replace the generic store description.** Lead with weekly programming, social learning, and who the app is for.
73. **Publish Apple In-App Events.** Promote real livestreams and season premieres so people can discover, download, and request start notifications from the store.
74. **Create Apple custom product pages.** Make separate pages for beginners, live-class seekers, advanced learners, and each creator campaign.
75. **Verify and complete public Google Play distribution.** The Android shell exists; confirm public availability, listing quality, billing, push, and deep links before creator promotion.
76. **Use Google Play promotional content when eligible.** Feature real-time classes, Open Week, new seasons, and meaningful releases.
77. **Put official download badges everywhere.** Website header, social bios, YouTube descriptions, email footer, creator kits, QR cards, and event pages.
78. **Create one shareable public event page per marquee class.** Show the host, learning outcome, countdown, preview clip, and app download route.
79. **Run an honest review flywheel.** Ask active members for an App Store review after a completed class or helpful replay; never condition or reward positive ratings.
80. **Build web-to-app continuity.** Preserve creator, campaign, event, and intended destination through signup and first app open.

### 81–90: Build a content machine instead of random promotion

81. **Make every live class a content factory.** Produce three short clips, one carousel, one email, one public lesson excerpt, and one in-app recap.
82. **Use Hook–Retain–Reward for every clip.** Name the problem immediately, keep one open loop, and deliver one useful idea before the CTA.
83. **Run a Rule-of-100 sprint.** For 100 working days, publish or conduct 100 minutes of focused short-form/content outreach activity daily.
84. **Choose one primary acquisition channel for 30 days.** Short-form creator content is the best first candidate; improve it before adding many paid channels.
85. **Promote Open Week, not “download our app.”** The app is the delivery vehicle; the event and community are the reason to install.
86. **Create recurring proof franchises.** Member Journey, Question of the Week, Best Takeaway, Inside the Classroom, and Coach Breakdown.
87. **Capture proof at moments of delight.** Ask for a short reaction after orientation, live attendance, a solved question, or a completed season.
88. **Build a proof library with permissions.** Store source, exact consent, approved channels, expiration, and claims review for every testimonial.
89. **Publish instructor-led YouTube episodes.** Each long-form episode should point to a specific free in-app class or Open Week.
90. **Run a weekly growth review.** Compare hooks, pages, creators, activations, retained conversions, and member feedback; kill weak variants quickly.

### 91–100: Increase MRR without making the founder the product

91. **Use a three-level offer.** Free Lobby; $99 Vault House; limited $199 Vault Studio with small-group labs and coach feedback.
92. **Do not promise founder access at $199.** Promise a service standard delivered by a certified coaching team and published schedule.
93. **Add annual only after retention is proven.** Offer annual membership when 30- and 90-day cohorts show members stay for programming and community.
94. **Replace one-to-one scheduling with Coach Desk.** Questions enter a queue and are answered in office hours, clips, FAQs, or classrooms by the roster.
95. **Create a host bench.** One lead educator, two to four certified coaches, guest creators, community captains, and a producer can run the week.
96. **Certify hosts against a show standard.** Rubric: teaching clarity, educational framing, evidence, pacing, community inclusion, compliance, and replay quality.
97. **Automate the program clock.** Creating an event should schedule in-app reminders, push, email/SMS rules, lobby opening, Live Now state, replay tasks, and recap.
98. **Measure growth behavior, not trades.** Track source-to-install, signup-to-RSVP, first meaningful action, weekly attendance, replay completion, contribution, upgrade, retention, and referral conversion.
99. **Fix release trust.** Remove schedule contradictions and unfinished cards, align age-rating/legal copy, shrink oversized assets/chunks, resolve lint errors, and add critical-path tests.
100. **Create a monthly programming council.** Product, education, community, growth, and compliance review what members watched, attended, discussed, requested, upgraded for, and left over.

## The offer I would launch

### Free — Vault Lobby

- App download and member profile
- Public weekly schedule and show trailers
- Seven-day Start Here path
- One live orientation and selected Open Week events
- Read access to a curated community feed
- Clear preview of Vault House programming

### $99/month — Vault House

- Full weekly live programming
- Vault TV replay library with chapters, summaries, and class discussions
- All three learning lanes and seasons
- Classrooms, Member Wall, study crews, and community events
- Coach Desk group Q&A
- Member-only guest instructors and challenges

### $199/month — Vault Studio

- Everything in Vault House
- Limited-seat small-group labs
- Structured chart/case feedback from the coaching roster
- Advanced Roundtable and studio workshops
- Priority question queue
- Defined monthly service capacity; no promise of unlimited or founder-specific access

This tiering should be validated with real conversion and retention data before a wide launch. The $199 tier must feel meaningfully smaller and more interactive, not merely contain more videos.

## The CEO-independent operating model

| Role | Job | Minimum system |
|---|---|---|
| Head of Programming | Owns the weekly schedule and seasons | 6-week calendar, show bibles, substitute list |
| Lead Educator | Maintains teaching standards | Curriculum map, host rubric, monthly calibration |
| Certified Hosts | Deliver recurring shows | Templates, run-of-show, compliance training |
| Community Captains | Welcome members and run crews | Daily prompts, escalation rules, recognition budget |
| Producer/Editor | Turns live into Vault TV | 24-hour replay checklist and clip pipeline |
| Member Success | Handles access and product questions | Help center, response SLA, churn-save playbook |
| Growth Lead | Runs content/creator channel | Campaign dashboard, creator kit, weekly experiment review |
| Compliance Reviewer | Reviews claims and promotions | Approved language, prohibited claims, archive of approvals |

The founder can host one marquee monthly show and set the vision. The weekly member promise should still be delivered if the founder takes a month off.

## The creator and TikTok model

### What Vault can safely build first

1. **Connected creator profiles.** Let an educator link a TikTok username and display the creator’s official embedded profile or approved published videos with TikTok attribution.
2. **Creator Passport.** A Vault profile shows teaching topics, timezone, languages, upcoming Vault classes, previous sessions, member feedback, and linked social profiles.
3. **TikTok-to-Vault event funnel.** A creator goes live on their own TikTok account and sends viewers to a public Vault class page or Open Week. Vault does not copy the stream.
4. **Vault Creator Residency.** Invite a creator to produce a four-week Vault-native educational series under a written agreement, teaching rubric, and claims policy.
5. **Authorized dual broadcast.** Only when the creator owns/controls the presentation and has granted Vault explicit rights, produce a clean feed that can be distributed to both the creator’s approved channels and Vault. Avoid music, clips, chart data, or other media that is licensed only for one platform.
6. **Official post embeds.** After a creator publishes an educational TikTok, use TikTok’s supported embed or Display API rather than downloading and re-uploading the video.
7. **Share back to TikTok.** Give members and hosts original Vault-made takeaway clips/cards that they can intentionally share using TikTok’s supported sharing or posting products after developer review.

### What Vault should not do

- Do not scrape, screen-record, restream, download, crop out attribution, or charge for access to arbitrary creators’ TikTok LIVE broadcasts.
- Do not assume public availability equals permission to rebroadcast.
- Do not assume a creator’s permission covers music, third-party clips, chart feeds, guest likenesses, or every jurisdiction.
- Do not promise that linking or embedding TikTok content means TikTok endorses Vault.
- Do not let any creator issue personalized investment advice, guaranteed returns, or undisclosed paid endorsements through Vault.

TikTok’s current public developer documentation supports official embeds for published videos and creator profiles, plus Display API access after authorization/review. It does not document a general-purpose product for embedding arbitrary third-party LIVE video inside another subscription app. The safer product decision is therefore to link to the creator’s TikTok LIVE or contract for a separate Vault-native class—not to rebroadcast the TikTok feed.

### Minimum creator agreement checklist

- Non-exclusive permission to livestream, record, edit, caption, clip, translate, distribute, and promote the specifically commissioned Vault content.
- Exact term, territories, channels, takedown process, archive rights, name/likeness rights, and payment/revenue share.
- Creator warranty that submitted assets, guests, music, recordings, and examples are authorized.
- Clear educational-only boundaries, prohibited performance claims, testimonial standards, and escalation rules.
- Required sponsorship disclosures in the post and periodically during sponsored live streams.
- Vault moderation, brand-safety review, correction, suspension, and termination rights.
- Member privacy and consent rules, especially before featuring a member’s image, voice, chart, story, or social handle.

This is a product design direction, not legal advice. Have qualified counsel review creator agreements, securities/financial-education boundaries, privacy, and the intended use of every third-party platform before launch.

## 90-day execution plan

### Days 1–14: Stop the leaks

- Approve the category statement, naming system, and offer architecture.
- Rewrite Welcome, App Store metadata, and membership upgrade around the live-school promise.
- Replace or hide every visible “Coming soon” item.
- Make the schedule database the only source used by all member and notification surfaces.
- Align age rating, legal copy, claims, subscription language, and store metadata.
- Move Trade OS and founder 1:1 out of primary navigation.
- Define growth events and install privacy-conscious analytics.
- Wire paid/retained referral attribution and test refund/chargeback handling.
- Optimize the approximately 20 MB source image and lazy-load the largest member routes.
- Resolve the lint baseline and protect signup, payment, RSVP, join-live, replay, and notification paths with tests.

### Days 15–30: Build the habit

- Ship Vault Today, one-tap RSVP, Add to Calendar, reminder preferences, and class lobbies.
- Launch three recurring shows with two or more hosts.
- Repackage Learn into three lanes and build the seven-day Start Here sequence.
- Publish a real Member Wall and searchable directory using existing profile data.
- Begin the 24-hour replay pipeline with chapters, notes, clips, quiz, and discussion.
- Create the public Open Week landing/event experience.

### Days 31–60: Build the community and creator loop

- Launch class rooms, study crews, captain program, contribution recognition, and learning duos.
- Recruit and onboard 10 Founding Creators.
- Give each creator an approved kit, deep link, page, rules, and dashboard.
- Run the first Open Week and compare creator cohorts by activation and retained paid conversion.
- Request honest store reviews from activated members at appropriate moments.

### Days 61–90: Scale only what retains

- Publish Apple In-App Events and custom product pages for the winning personas/creators.
- Complete or validate the public Android release and use Google promotional content when eligible.
- Expand the winning show and creator formats; stop low-retention formats.
- Pilot Vault Studio with a small capacity and a non-founder coaching roster.
- Add paid acquisition only to the best-retaining page/event cohort, with a clear loss limit.
- Decide whether annual pricing is appropriate from 30- and 90-day retention evidence.

## The scorecard

These are business and learning-experience metrics, not member trade or P&L tracking.

### Acquisition

- Product-page view → install
- Creator/event page → install
- Install → account created
- Cost per activated member by source
- Creator retained-revenue-to-cost ratio

### Activation

- Signup → learning lane selected
- Signup → first RSVP
- Signup → first live attendance or replay completion
- Signup → first meaningful contribution
- Time to first meaningful value

### Retention

- Weekly active learners
- Weekly live/replay participation
- Percentage with at least one Vault connection or study crew
- D7, D30, and D90 paid retention by acquisition source
- Show-level return rate and replay completion

### Revenue

- Free → Vault House conversion
- Vault House → Vault Studio conversion
- Monthly recurring revenue and net revenue retention
- Refund, chargeback, involuntary churn, and voluntary churn
- Retained paid referrals by member and creator

## What not to do

- Do not add trade alerts back as the identity of the app.
- Do not make P&L, win rate, risk calculators, or journals the daily home experience.
- Do not pay many influencers before retained paid attribution works.
- Do not buy installs that cannot be tied to activation and retention.
- Do not use fake scarcity, fake attendance, cherry-picked profit screenshots, or guaranteed-income claims.
- Do not build a massive Discord clone; build the few social mechanics that improve learning and belonging.
- Do not keep empty “Coming soon” cards visible to paid members.
- Do not add another navigation destination without removing or combining one.
- Do not make the founder the only credible host or customer-support path.
- Do not scale paid traffic until the first-session and first-week experience retain members.

## External patterns worth adapting

- Apple In-App Events can surface livestreamed experiences on the App Store, let people download from the event card, and let them opt into a start notification: <https://developer.apple.com/app-store/in-app-events/>
- Apple allows up to 70 custom product pages with distinct screenshots, previews, promotional copy, keywords, URLs, and conversion reporting: <https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions>
- Google Play promotional content supports real-time events, offers, and major updates that can attract downloads and re-engagement, subject to eligibility: <https://support.google.com/googleplay/android-developer/answer/12929029?hl=en>
- Circle’s event model demonstrates the baseline members now expect: event pages, RSVP, calendar support, reminders, live access, replays, transcripts, summaries, and follow-on discussion: <https://circle.so/events>
- Duolingo reports that learners with at least one Friend Streak were 22% more likely to complete a daily lesson, which supports a learning-duo mechanic rather than a trading-performance leaderboard: <https://blog.duolingo.com/product-lessons-friend-streak/>
- TikTok provides official embeds for published videos that retain creator attribution and link back to TikTok: <https://developers.tiktok.com/docs/en/embed-videos>
- TikTok’s Display API is designed for authorized display of a creator’s profile and published videos; production integrations require registration and review: <https://developers.tiktok.com/docs/en/display-api-overview>
- TikTok’s terms prohibit broadcasting, copying, or exploiting TikTok content outside expressly permitted uses without the appropriate consent: <https://www.tiktok.com/legal/page/us/terms-of-service/en>
- The FTC requires clear disclosure of material influencer relationships. Vault should provide disclosure language and review placements rather than leaving compliance entirely to creators: <https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers>
- The SEC’s February 2026 investor alert warns that stock-tip scams may operate through social groups and says investors should not make decisions solely from social media or apps. Vault’s education-first boundaries should be visible in product design, not only buried in legal copy: <https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/social-media-stock-scams>

## Bottom line

Vault OS does not have a shortage of features. It has a focus, packaging, habit, proof, and distribution problem.

The winning version is not “another trading app.” It is a living private school with a daily front door, recognizable weekly shows, multiple trusted hosts, structured learning lanes, replay products, member identity, small-group belonging, and creator-powered acquisition that can be traced to retained revenue.

If Vault ships the first 15 moves in order, it will feel like a different product before it needs a large amount of new technology.
