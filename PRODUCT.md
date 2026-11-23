# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Svelte 5 + Vite SPA, TypeScript core behind a storage interface, one Node process storing JSON files, WebSockets for live sync of the open Hill chart. No React. See `docs/adr/0001-json-files-behind-a-storage-interface.md`.

## Users

One organization, internal. Three equal audiences:

- **The team in a sync meeting**: the Hill chart on a shared screen or embedded in Notion during a check-in, people moving their own Scopes as they talk.
- **Leaders scanning status**: glancing across many Projekt to spot what is stuck uphill.
- **A Scope's Ägare updating alone**: dropping in between meetings, often on a phone, to nudge a Scope's Läge.

## Product Purpose

Show each Projekt's work as a Hill chart, so the team sees uncertainty rather than percentages: uphill is figuring it out, downhill is making it happen. Success is that the chart is the thing people look at and update during and between meetings, and that a Scope stuck near the top gets talked about.

## Positioning

Simple and beautiful, free to run, no sign-in: anyone with the URL can view and edit. Each Projekt's Hill chart can be embedded in Notion and edited there.

## Operating Context

- Site structure: start page → Funktionsområden → Projekt → Projekt page with its Hill chart.
- Used live in meetings (shared screen, Notion embed) and asynchronously on desktop and phone.
- Edited by touch on phones in v1.
- Every edit is an Uppdatering kept in history; restore to an earlier state is the safety net against mistakes and vandalism.

## Capabilities and Constraints

- UI in Swedish. Domain terms are in `GLOSSARY.md` (Funktionsområde, Projekt, Hill chart, Scope, Ägare, Läge, Uppdatering).
- A Scope has only Namn, Läge (0–100) and Ägare. Its colour comes from Läge and is not stored.
- Anyone can create, rename and delete Funktionsområden, Projekt and Scopes.
- Optional remembered name, saved with each Uppdatering; may be lost inside the Notion embed on Safari/iOS.
- Notion embed: the user drags its height; it must work without cookies or storage.
- Undecided: embed-mode UI, deletion protection, how Ägare is entered, history/restore UI.

## Brand Commitments

- Name: **Apogee**, part of an app family named on a physics/astronomy theme. Its own identity; no organization brand to follow.

## Evidence on Hand

No real Projekt data, screenshots or logo exist yet. Prototypes use invented sample Projekt and must not be presented as real.

## Product Principles

1. The Hill chart is the product; everything else is navigation to it.
2. Position means uncertainty, not progress: never turn Läge into a percentage bar.
3. Editing is as direct as pointing: drag the dot, on desktop, phone or inside Notion.
4. No gatekeeping: no sign-in, history makes it safe.

## Accessibility & Inclusion

Baseline only: sensible contrast and keyboard/touch support, no formal standard required.
