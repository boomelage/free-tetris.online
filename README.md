# 𝚃𝚎𝚝𝚛𝚒𝚜 — [free-tetris.online](https://free-tetris.online)

A free, modern, no-nonsense Tetris clone that runs entirely in your browser. No
accounts, no ads, no tracking, no build step — just open the page and play.

Built with plain HTML5 Canvas and vanilla JavaScript (zero dependencies, zero
frameworks) and served as a static site via GitHub Pages.

## Play

- **Live:** <https://free-tetris.online>
- **Locally:** clone the repo and open `index.html` in any modern browser, or
  serve the folder with a static file server (recommended so relative asset
  paths resolve cleanly):

  ```bash
  # Python 3
  python -m http.server 8000
  # then visit http://localhost:8000
  ```

No installation, dependencies, or build tooling required.

## Controls

| Key            | Action                          |
| -------------- | ------------------------------- |
| `←` / `→`      | Move left / right               |
| `↓`            | Soft drop (+1 point per cell)   |
| `↑`            | Rotate (clockwise, with SRS wall kicks) |
| `Space`        | Hard drop (+2 points per cell)  |
| `Z`            | Hold / swap piece (once per piece) |
| `G`            | Toggle ghost piece              |
| `P`            | Pause / unpause                 |

Held left/right uses DAS/ARR auto-shift for smooth, repeatable movement.

## Features

- **Standard 10×20 playfield** rendered on an HTML5 `<canvas>`.
- **7-bag randomizer** — every batch of seven pieces contains exactly one of
  each tetromino, so droughts and floods are eliminated.
- **SRS rotation system** with full wall-kick tables (separate kick data for the
  `I` piece and for `J/L/S/T/Z`).
- **Hold/swap queue** — stash a piece for later, usable once per drop.
- **Ghost piece** showing where the current piece will land (toggleable).
- **Lock delay** with move/rotate resets (up to a cap) for precise placement.
- **Next-piece preview.**
- **Scoring & leveling** — classic line-clear scoring (40 / 100 / 300 / 1200 ×
  level), soft- and hard-drop bonuses, with gravity speeding up every 10 lines.
- **Persistent high score** stored in `localStorage` (gracefully degrades if
  storage is unavailable, e.g. private browsing).
- **Responsive input handling** with DAS (delayed auto-shift), ARR (auto-repeat
  rate), and soft-drop tuning.

## Scoring

| Lines cleared | Base points (× current level) |
| ------------- | ----------------------------- |
| 1 (single)    | 40                            |
| 2 (double)    | 100                           |
| 3 (triple)    | 300                           |
| 4 (tetris)    | 1200                          |

Plus **+1** per cell of soft drop and **+2** per cell of hard drop. The level
increases by one for every 10 lines cleared, and each level shortens the gravity
interval (down to a 100 ms floor).

## Project structure

```
.
├── index.html            # Markup: canvases, sidebar, game-over screen
├── CNAME                 # Custom domain for GitHub Pages (free-tetris.online)
├── LICENSE               # GNU GPL v3
└── assets/
    ├── icon.png          # Favicon
    ├── css/
    │   └── style.css     # Styling (dark theme, monospace, fixed banner)
    └── js/
        └── script.js     # All game logic (~720 lines, vanilla JS)
```

## How it works

The entire game lives in `assets/js/script.js`:

- **Game loop** driven by `requestAnimationFrame`, applying gravity, auto-shift,
  soft drop, and the lock-delay countdown each frame, then re-rendering.
- **Board** is a 20×10 matrix; cells store either `0` (empty) or a color string
  for locked blocks.
- **Tetrominoes** are defined as rotation-state shape arrays plus a color, with
  collision detection, SRS kick attempts, and ghost-position computation handled
  separately.
- **Rendering** draws the board grid, the active piece, the translucent ghost,
  and the next/stashed previews onto their respective canvases.

## Tech

- HTML5 Canvas 2D
- Vanilla JavaScript (ES modules-free, `'use strict'`)
- CSS
- Hosted on GitHub Pages with a custom domain

No frameworks, no bundlers, no package manager.

## Contributing

Issues and pull requests are welcome. Since there's no build step, just edit the
files and open `index.html` to test your changes.

## License

Licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE)
for the full text.
