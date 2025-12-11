# Sonic Flow - Immersive Music Player

A modern, immersive web-based music player featuring a glassmorphism design, aurora borealis background effects, and a 3D tilt interface.

## Features

- **Immersive UI**: Glassmorphism design with dynamic aurora backgrounds.
- **Interactive Visuals**: Custom particle system and 3D tilt effects on the player card.
- **Spotify Integration**: Connects to Spotify to fetch user playlists and profile data.
- **Smooth Animations**: Advanced CSS keyframe animations and transitions.

## Setup

1. Open `auth.html` (or deploy via GitHub Pages and visit `/auth.html`).
2. Click **Authenticate with Spotify**. This page displays the exact Redirect URI you must copy into the Spotify Developer Dashboard.
3. After a successful login you are redirected to `index.html`, which hosts the Sonic Flow player.

## Technologies

- HTML5
- CSS3 (Variables, Flexbox, Grid, Animations)
- JavaScript (ES6+, Canvas API, Fetch API)

## Spotify Configuration

- Redirect URI to add in the Spotify dashboard: `https://yashraj-ghemud.github.io/song-go/index.html`
- Enable the **Implicit Grant** flow for your application so `response_type=token` is accepted.
- The Access Portal (`auth.html`) dynamically shows the redirect URI in case you deploy under a different domain.
