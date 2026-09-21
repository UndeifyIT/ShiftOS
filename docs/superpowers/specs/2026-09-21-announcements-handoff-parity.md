# Announcements — Handoff Parity

**Created:** 2026-09-21
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — `PAGES["Manager/Announcements"]` (line 3369), the shared toolbar (markup 363-376), the `kindAnnouncements` block (1215-1283), `ANNOUNCEMENTS` / `RECIPIENTS` (3502-3530), the values at 4966-5016 and the `newAnnouncement` / `remind` modals (3669, 3694).
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/announcements` was a list with a create form. It is now the handoff's screen: the posts on the left, each with its audience pill, acknowledgement bar and Receipts button, and the receipts panel for the selected one in the right-hand column.

| Handoff part | Real behaviour |
|---|---|
| Header "Announcements", "3 posted · 2 awaiting acknowledgement", New announcement | Counted from the branch's own posts |
| Toolbar: Search announcements, All / Pinned / Unacknowledged, "3 announcements" | Search covers title, body and author. Unacknowledged means *asks for acknowledgement and somebody still hasn't* |
| Card: audience pill, "Pinned", time, title, body, author, bar, "16 of 18 acknowledged", Receipts | All real. The time reads "Today, 07:30 AM" / "Yesterday, 05:40 PM" / "12 May" as the design does; the author comes from the membership that posted it |
| Pinned card styling (`#F7DFD1` border on `#FEFAF7`), selected card (`#F7C9B2`) | As drawn. Clicking the "Pinned" pill unpins the post (the handoff has no unpin control, and a pin nobody can remove is a trap) |
| Receipts panel: eyebrow, title, bar, percentage, summary, Everyone / Acknowledged / Outstanding, rows, Remind, Export | Rows are the branch's active employees, acknowledged first. Export downloads exactly what is on screen |
| Remind | Really sends: `remind_announcement` writes an in-app notification to everyone who has not acknowledged, and reports back how many had no ShiftOS login rather than counting them as reached |
| New announcement (Audience, Title, Message, Require acknowledgement, Pin to top) | Creates and publishes in one step |
| Empty: "No announcements yet" | Shown when the branch has none |

## Migration 067

Two of the design's controls had no column behind them:

- **`is_pinned`** — the pinned card, the "Pinned" pill and the Pinned filter.
- **`requires_acknowledgement`** — the New announcement form's "Require acknowledgement". `announcement_acknowledgements` (016) already recorded *who* acknowledged; what was missing was the *intent*. Without it every post would show as awaiting acknowledgement from everyone, which reads as a chase list for posts nobody was asked to answer.

Both default to false, so existing rows keep today's behaviour; no constraint, trigger or policy changes. **067 must be applied before this ships** — `create_announcement` now always writes both columns.

New RPCs: `list_announcement_receipts` (who it went to, and who has acknowledged) and `remind_announcement`.

## What the receipts panel can and cannot prove

The handoff's panel has four statuses: Acknowledged, Read, Unread, Not delivered. This system records **acknowledgement only** — there is no read tracking and no delivery pipeline, so "Read" and "Not delivered" would be decoration. The panel shows the two states that are real:

- **Acknowledged**, with when;
- **Outstanding**, and for anyone with no email on file it says so — that is the honest version of the handoff's "Not delivered", since without an address there is no ShiftOS login to notify.

The summary line follows: "16 acknowledged · 2 outstanding · 0 with no email", and the Remind button names what it can actually reach.

**Audience** is the other limit. The handoff shows "Sales Floor" and "Supervisors" as audiences; `announcements` targets a branch or the whole organization and nothing narrower, so those are the two choices offered.

## A correction about the prototype

An earlier note in `2026-09-21-recent-activity-handoff-parity.md` said the handoff's `kindActivity` block was malformed and that this was why the prototype rendered `{{ a.time }}` placeholders. **That conclusion was wrong.** The prototype loads its runtime from a CDN; when that is unreachable the page never hydrates and the whole file renders as raw template — every page's markup at once, with `{{ }}` everywhere. That is what was being measured, not a broken block. (The stray `</sc-if>` is really in the source, but nothing here shows it breaks anything.)

Consequence for both screens: the numbers came from the handoff's **literal inline styles**, which are exact — they are written in the file — rather than from a rendered comparison.

## Verified in the browser

At 1440px, the app's computed values against the handoff's own style declarations: card radius 16 / padding 17px 18px / pinned `#FEFAF7` on `#F7DFD1` / selected `#F7C9B2`; audience pill 11px/700 at 4px 10px; "Pinned" 10.5px/800; title 15.5px/800 at `-0.015em`, 11px above; body 13px `#57504A`, 6px above; foot 13px above with an 11px rule; bar 104 × 6; Receipts button 30px at radius 9; panel head 16px 18px with a 10.5px/800 eyebrow, a 14.5px/800 title and a 7px bar; chips 30px at radius 9; the list capped at 420px; rows 11px 18px with a 30px avatar; the foot 13px 18px with a 36px Remind and Export.

Walked: selecting a post, all three receipt filters, all three card filters, search, the reminder (dialog → "Reminded 15 people"), posting a new pinned announcement (subtitle went to "4 posted · 3 awaiting acknowledgement", card first in the list) and unpinning it again. No console errors.
