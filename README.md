# Billions Network Puzzle

A daily browser-based puzzle game built for the Billions Network community.

Originally created in September 2025.

## Overview

Billions Network Puzzle is a static web game where players solve a new image puzzle each day, track their time and score, and share the result socially.

The project combines a lightweight front-end with simple content-generation scripts for daily Open Graph images and share pages.

## Features

- Daily image-based puzzle experience
- Score and timer tracking
- Hint and reset actions
- Share-friendly daily preview pages
- Generated Open Graph images for each puzzle date
- Community-focused rotating puzzle subjects

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- JSON data source
- Node.js utility scripts
- Sharp for OG image generation
- Netlify configuration and edge function support

## Project Structure

```text
.
|-- index.html                         # Main puzzle game page
|-- styles.css                         # UI styling
|-- script.js                          # Puzzle gameplay logic
|-- puzzle-data.json                   # Daily puzzle schedule and source data
|-- img/                               # Puzzle source images and branding assets
|-- og/                                # Generated Open Graph images
|-- share/                             # Generated social share HTML pages
|-- generate-og-images.js              # Builds OG images for each day
|-- generate-share-pages.js            # Builds share pages for each day
|-- verify-build.js                    # Checks generated outputs against puzzle data
|-- netlify/edge-functions/            # Netlify edge logic
|-- netlify.toml                       # Netlify configuration
|-- _redirects                         # Redirect rules
```

## How It Works

1. The game loads the current day’s puzzle.
2. Players drag pieces from the tray onto the board.
3. The timer and score update as the puzzle progresses.
4. Players can use hints or reset the current daily board.
5. Share metadata is generated separately so each daily puzzle can preview correctly on social platforms.

## Local Development

Install dependencies:

```bash
npm install
```

Run the validation step:

```bash
npm run verify
```

Generate social preview assets:

```bash
npm run build:og
npm run build:share
```

Run the full asset build and verification flow:

```bash
npm run build:all
```

After that, serve the folder with any static server.

Example:

```bash
npx serve .
```

## Puzzle Data

Daily puzzle entries are defined in `puzzle-data.json`.

Each item includes:

- `date`
- `img`
- `difficulty`
- `username`

This drives:

- the puzzle schedule
- OG image generation
- share page generation

## Deployment

This project is structured for static deployment with Netlify.

Relevant deployment files:

- `netlify.toml`
- `_redirects`
- `netlify/edge-functions/future-guard.js`

The production base URL referenced in the build scripts is:

- `https://puzzle.billionscommunitygames.com`

## Notes

- The generated `og/` and `share/` folders are part of the project output and are validated by `verify-build.js`.
- The project was originally created in September 2025 and later imported into GitHub.

## License

No license file is currently included in this repository.
Add one if you want to define reuse or distribution terms explicitly.