# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"트렌드 TOP 10" (Trend TOP 10) is a dashboard-style homepage that shows two ranking lists:

- 구매 순위 TOP 10 (Purchase ranking TOP 10)
- 검색 순위 TOP 10 (Search ranking TOP 10)

This is a brand-new project with no existing code. The user is a coding beginner building this
with Claude Code, so prefer simple, readable solutions over clever or heavily abstracted ones,
and explain non-obvious choices in plain terms as you make them.

## Current stage

The first version is intentionally minimal:

- A single self-contained HTML file: `index.html`
- HTML, CSS, and JavaScript all live in this one file (inline `<style>` and `<script>` tags) —
  no build step, no bundler, no package.json, no framework.
- Ranking data is example/placeholder data hardcoded as a JS array/object in the file, not
  fetched from a real API.

Do not introduce a build tool, framework, or multi-file project structure unless the user asks
for it. Later stages may split into separate CSS/JS files or add real data fetching, but the
project should grow one deliberate step at a time.

## Running the project

There is no server or build process. Open `index.html` directly in a browser to view it
(e.g. double-click the file, or use a simple static server if the user wants live reload).

## Data shape

Each ranking list (purchase / search) should be an array of 10 items. Keep each item simple,
e.g. rank, name/title, and a metric (count, score, or change indicator). Keep both lists using
the same shape so the rendering logic can be shared between them.

## Future direction: API integration, not CSV upload

The user decided against adding CSV file upload. The planned path forward is API-based data
instead: eventually `purchaseData` / `searchData` should come from an API response (e.g. a
mock/fake API server first, then a real one) rather than a CSV file or hardcoded arrays. Keep
this in mind when proposing next steps — don't suggest CSV import as a data-loading option.

Real API integration requires a server component, because a browser-only static page cannot
call the Naver API directly (CORS restrictions, and any API key/secret would be exposed in the
page's source). Do not add real Naver API keys/secrets into `index.html` or any client-side code
— they must live in a server-side environment once a backend exists.
