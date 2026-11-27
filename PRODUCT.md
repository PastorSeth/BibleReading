# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS with no build step or dependencies, installable as a PWA and hosted on GitHub Pages. Optional accounts sync through a Google Apps Script web app backed by a Google Sheet. Decided with Seth on 2026-11-26 (see docs/specs/2026-11-26-reading-plan-app-design.md).

## Users

- **Primary:** Seth (a pastor) and his wife, each reading on their own phone at their own time, and wanting to see each other's progress.
- **Also:** anyone Seth shares the link with, such as friends, family or church members. It must make sense to someone who opens it with no explanation.

They use it once or twice a day with a **physical Bible open**: glance at today's references, read on paper, come back and check them off.

## Product Purpose

A companion to one 2027 reading plan: Foundations NT260 (one New Testament chapter each weekday), the F260 Old Testament selection (one reading each weekday), Psalms on Mon/Wed/Fri, Proverbs in short portions on Tue/Thu. (The plan's weekly memory verse was removed at Seth's request on 2026-11-26.) Weekends are left open for catching up or rest. Week 1 starts Monday, January 4, 2027 and the plan ends Friday, December 31, 2027.

Success is people reading their Bibles, not time spent in the app.

## Positioning

It isn't a Bible app and doesn't show scripture text. It tells you what to open your own Bible to today, remembers what you've read, and lets a reading partner see your checkmarks. Online passage links (Biblia.com) are deliberately quiet and can be turned off.

## Operating Context

- Phone first, often next to an open printed Bible, at any time of day.
- Reading partners (mutual, by username) see each other's checkmarks.
- Being behind is normal: catch-up happens on weekends.

## Capabilities and Constraints

- Works fully with no account. Checkmarks are saved on the phone.
- Optional username + PIN account syncs to a Google Sheet. There's a "Forgot your PIN?" email link to Seth.
- Screens: Today, Week, Plan (all 52 weeks), Catch up, Account/settings (translation, show online links).
- Must cost $0 to run, and work offline and on iPhone and Android.

## Brand Commitments

Working name "Bible Reading 2027" (may change). Nothing else committed: no logo or palette.

## Evidence on Hand

The real plan data in readings.js (every reading for 52 weeks). There are no testimonials, user counts or endorsements, so none may be invented.

## Product Principles

1. The physical Bible is the main event. The app points to it and then gets out of the way.
2. It's calm about being behind: no streaks, badges, red warnings or guilt.
3. Optional everything: no account, name or setup is required to read today's passages.
4. Two people reading apart should still feel they're reading together.
5. It's not churchy or ornate: no stained glass, scrolls, parchment or calligraphy.

## Accessibility & Inclusion

Standard text sizes are fine (confirmed). Bible references stay large and easy to glance at. Meet WCAG AA contrast, including the quiet link icon (at least 3:1).
