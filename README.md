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
- Log a watch: 5-category star ratings, review text, an optional memorable
  quote (unlocks a shareable quote card for that log), rewatch/spoiler flags
- Quote-only posts: a separate "Quote" button on the film page (next to "Log
  & review") opens a lightweight quote-only screen — just the quote text and
  a mood category (funny, romantic, philosophical, sad, motivational, dark,
  iconic), no rating or review required. Fully independent of the full log
  flow, so a film can have both a review and a standalone quote from the same
  person
- Showcases: browse public showcases, create your own (ranked or not,
  public/private, tags), edit a showcase's details, add films from inside the
  showcase itself (not just from the film page), remove films, and — for
  ranked showcases — long-press a film and drag to reorder the list
- Community: activity feed split into Reviews and Quotes tabs (each further
  filterable by everyone / people you follow), with a search box in each tab
  (searches review text or quote text) and mood-category chips in the Quotes
  tab; like, expand-in-place comments, share a review or quote as an image
- Comments: threaded (one level of replies) on films, showcases, and logs,
  with @mention autocomplete (users and cast/crew) — tap a mention to jump to
  their profile or person page
- Share cards: turn a review into a quote card or a review card (poster +
  rating + snippet), swap in a custom cover photo if you want, then save it
  to your photo library or open the native share sheet
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

A new migration also shipped this round (`quote_category` on `logs`, for the
quote-only posting feature below) — run `php artisan migrate` in
`showcase-api` before trying it.

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
`expo-image-picker` and `expo-image-manipulator`, on top of last round's
drag-and-drop packages), run `npm install` again before restarting Expo —
same as any time `package.json` changes.

## New this round: quotes split from reviews

- **Quote-only posting.** The film page now has two inline buttons: the
  existing "Log & review" and a new "Quote" button. Quote opens a dedicated
  screen (`app/quote/[tmdbId].tsx`) with just a quote text field and a
  single-select mood category (Funny, Romantic, Philosophical, Sad,
  Motivational, Dark, Iconic) — no stars, no review. It posts to the same
  `/logs` endpoint as a standalone log entry, so it's fully independent of
  the full log flow: a user can still add a quote alongside a rated review
  from the log screen, or post one from the film page anytime, and both can
  coexist for the same film.
- **Backend: `quote_category`.** New nullable `quote_category` column on
  `logs` (migration `2026_07_29_090000_add_quote_category_to_logs_table`),
  validated against a fixed list in `StoreLogRequest`, and exposed through
  `LogResource`. `GET /logs` gained `type` (`quote`/`review`), `category`,
  and `search` query params so the feed can filter/search by content type.
- **Community: Reviews/Quotes tabs.** Community now has a top-level
  Reviews/Quotes toggle (in addition to the existing Everyone/Following
  toggle), a search box that searches review text or quote text depending on
  the active tab, and — in the Quotes tab — category filter chips. A log
  with both a review and a quote shows up in both tabs, displaying whichever
  text matches that tab. Card design is unchanged from before.

## Fixes (this round)

- **Avatar upload still failing after the previous fix.** The prior fix
  re-encoded the picked photo through `expo-image-manipulator` before
  upload, but that re-encode step is itself a native module call that can
  fail on some devices/URIs — when it did, the generic "Upload failed /
  Please try again" you saw was actually that failure, not a network error
  (the alert only showed a real message for server-side `ApiError`s, so a
  manipulator crash fell through to a blank fallback string). Now: if the
  resize/re-encode step throws, the app falls back to uploading the original
  picked file instead of aborting, and the failure alert shows the real
  underlying error message either way, so if it fails again the message
  itself will say why.
- **Camera badge invisible on the avatar.** The small camera icon was drawn
  *inside* the same circular view that clips the avatar photo to a circle —
  its bottom-right corner position was exactly the area that circular
  `overflow: hidden` cuts away, so it was always invisible. It's now drawn
  in a sibling wrapper outside the clipped circle, sitting right on the
  avatar's edge instead of being swallowed by it.

## Fixes (previous round)

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
- **Avatar upload failing with "Network request failed."** Re-encoding the
  picked photo through `expo-image-manipulator` (still done, see below) made
  it more reliable but didn't fully fix it — POSTing the binary through our
  own `php artisan serve` dev server over a phone's Wi-Fi turned out to still
  be the weak link. Avatar upload now follows the exact same path as the web
  app's share-card cover photo: sign a direct-to-Cloudinary upload via
  `POST /uploads/cloudinary-sign` (now takes an optional `folder`, whitelisted
  to `avatars`/`showcase-covers`), upload the file straight to Cloudinary's
  API, then `PATCH /me` with the returned `secure_url` — the binary never
  touches our own server at all. The photo is still resized to 640×640 and
  recompressed to JPEG via `expo-image-manipulator` first, for a faster
  upload regardless.
- **No way to add a quote.** The log form only had a "Review" field — there
  was no input for `quote` at all, so a quote card could never be unlocked
  from the mobile app. Added a dedicated "memorable quote" field (matching
  the web app's log dialog) below the review field.
- **Only the review card's cover could change; quote card text wasn't
  centered.** Added a "Change cover" button in the share sheet (camera or
  photo library) that swaps the backdrop image on whichever card style is
  currently shown. Also fixed the quote card specifically: the quote text
  now centers both horizontally and vertically in the space below the
  cover image, and the showcase logo at the bottom is horizontally centered
  instead of pinned to the left. The review card's layout is unchanged.
