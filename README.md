# Showcase — mobile

An Expo (React Native + TypeScript) app for Showcase, talking to the same Laravel
API as the web app — every action (logs, ratings, watchlist, showcases, likes,
follows, comments) writes to the same database the web app reads from. Built
with `expo-router`.

## What's included

- Sign in / register (token auth via `expo-secure-store`)
- Explore: search + genre filters + infinite-scroll discover grid
- Film detail: full cast & crew, related films, "more from this director",
  where-to-watch providers, friends' activity, like/watchlist/log actions,
  add-to-showcase, comments
- Person detail: bio + filmography, linked from cast/crew
- Log a watch: 5-category star ratings, review text, rewatch/spoiler flags
- Showcases: browse public showcases, create your own (ranked or not,
  public/private, tags), edit a showcase's details, add films from inside the
  showcase itself (not just from the film page), remove films, and — for
  ranked showcases — long-press a film and drag to reorder the list
- Community: activity feed of reviews (everyone / people you follow), like,
  expand-in-place comments, share a review as an image
- Comments: threaded (one level of replies) on films, showcases, and logs,
  with @mention autocomplete (users and cast/crew) — tap a mention to jump to
  their profile or person page
- Share cards: turn a review into a quote card or a review card (poster +
  rating + snippet), then save it to your photo library or open the native
  share sheet
- Social: follow/unfollow, followers/following lists, notifications (likes,
  comments, follows, mentions) with an unread badge
- Profile: tap your avatar to take or pick a new profile photo, pick up to 5
  favorite films (with an editable picker and empty "+" slots), stats, a
  recent-activity list rendered as sentences ("You logged The Godfather
  ★★★★★" / "You watched ... on 29/07/2026"), watchlist, sign out; public
  profile view for any user with their showcases, recent activity, and
  watchlist
- Find friends: search people by name or username and follow/unfollow them
  right from the results (Profile → Find friends); friends' activity then
  shows up in Community's "Following" feed
- Bilingual copy (Arabic/English) with a language toggle, matching the web app's tone

Not ported: suggestions (send-a-friend-a-film).

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # then edit EXPO_PUBLIC_API_URL, see notes in that file
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) or press `i` / `a` for a
simulator/emulator. Make sure your Laravel API (`showcase-api`) is running —
`php artisan serve` — before opening the app.

### API URL gotcha

The web app talks to `127.0.0.1:8000`, which only works because a browser and
the API run on the same machine. A phone or emulator is a different device on
the network, so `127.0.0.1` won't reach your computer. Set
`EXPO_PUBLIC_API_URL` in `.env` per the instructions inside `.env.example`
(LAN IP for a physical phone, `10.0.2.2` for the Android emulator, `127.0.0.1`
is fine for the iOS Simulator).

### One-time backend setup for avatars

Profile photos are stored on the Laravel server itself (no Cloudinary keys
needed). Two one-time steps in `showcase-api`:

1. Run `php artisan storage:link` once, so uploaded avatars are actually
   served back out.
2. In `showcase-api/.env`, set `APP_URL` to the **same host** you used for
   `EXPO_PUBLIC_API_URL` (your LAN IP for a physical phone, not
   `http://localhost`) — otherwise avatar images will upload fine but won't
   load back on the phone, the same `127.0.0.1`-class issue as the API URL
   above.

## Notes / simplifications

- RTL layout isn't fully mirrored (React Native's RTL flip requires a full
  app reload and is easy to get wrong across components) — Arabic text
  displays correctly, but the layout direction stays LTR. Can revisit with
  `I18nManager.forceRTL` if you want the full mirrored layout.
- Browsing currently requires signing in first (same as the very first
  version of the app) — the web app lets guests browse Explore/Community/film
  pages without an account and only gates actions. Happy to open that up if
  you'd like guest browsing on mobile too.
- App icons are Expo's placeholder icons (`mobile/assets/`) — swap them for
  your real branding whenever you're ready.
- Saving a share card asks for photo library permission the first time; if
  you deny it, the app tells you and you can allow it again from your
  phone's Settings.
- Verified with `npx tsc --noEmit` (clean) and a full Metro/`expo export`
  bundle (1722+ modules, no errors) rather than a live device, since this
  environment doesn't have a simulator attached.
- Drag-to-reorder uses `react-native-reanimated` + `react-native-worklets` +
  `react-native-draggable-flatlist`, on top of the New Architecture
  (`newArchEnabled: true` in `app.json`, already on). Long-press any poster in
  a ranked showcase you own to pick it up and drop it in a new spot; the new
  order saves automatically. Non-ranked showcases and other people's
  showcases keep the plain grid.
- A share card's quote/review toggle now resets per-log (it used to get
  stuck on whichever style was shown first), so both the quote card and the
  review card are reliably downloadable/shareable for any log that has both.
- Changing your avatar asks for camera/photo permission the first time (via
  `expo-image-picker`); if you deny it, the app tells you and you can allow
  it again from your phone's Settings.
- "Find friends" search and the favorites picker both require being signed
  in, same as the rest of the app.

Since new native modules were added this round (avatar picking needs
`expo-image-picker`, on top of last round's drag-and-drop packages), run
`npm install` again before restarting Expo — same as any time `package.json`
changes.

## Fixes (latest round)

- **Follow button / following count not updating.** `UserResource`,
  `CommentResource`, and `LogResource` were resolving the viewer with
  `$request->user()`, which only works on routes wrapped in the
  `auth:sanctum` middleware. Several viewer-aware routes (public profile
  `GET /users/{username}`, the logs feed, comments) aren't wrapped in that
  middleware, so `is_followed_by_viewer`, `liked_by_viewer`, and `is_own`
  silently stayed `false`/stale on those routes no matter what — the profile
  page could show "Follow" even right after you'd followed someone.
  `FilmResource` already had this right, using the explicit
  `$request->user('sanctum')` guard, which resolves the Bearer-token viewer
  regardless of route middleware; the other three resources now do the same.
  Also added: following/unfollowing someone now bumps your own "Following"
  stat on Profile immediately, instead of waiting for a full profile
  refresh.
- **Drag-and-drop doing nothing, then jumping the card to #1.** The
  long-press was wired to a plain React Native `Pressable`, but the list's
  actual drag-tracking gesture comes from `react-native-gesture-handler`.
  Mixing the two meant Android handed the touch to the wrong gesture system:
  the long-press registered (so the item "picked up" internally) but the
  drag gesture never got the finger's movement, so on release it fell back
  to its default drop position (index 0) — exactly the "snaps to #1" bug.
  The card's touchable is now `Pressable` imported from
  `react-native-gesture-handler` instead of `react-native`, so the long-press
  and the drag gesture share the same native gesture arena. A medium haptic
  (`expo-haptics`, already a dependency) now fires the moment a card is
  picked up, so it's obvious you're in reorder mode, and the long-press
  threshold is a slightly more deliberate 350ms so it doesn't trigger during
  a normal tap-to-open.
