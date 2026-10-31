# Aethera

Buildless MMORPG website foundation using modular HTML, CSS, and JavaScript. Project-wide development rules are in the parent AGENTS.md.

## Local preview

Run `npm run dev` from this directory and open http://127.0.0.1:4173. Run `npm run check` for JavaScript syntax validation. Deploy the contents of `dist` on any static host.

## Structure

- `dist/js/config.js`: shared server identity and proposed realm configuration.
- `dist/js/data.js`: centralized demonstration content and asynchronous data service.
- `dist/js/components.js`: buttons, branding, navigation, footer, headings, badges, news cards, feature cards, notices, and tables.
- `dist/js/pages.js`: homepage, news, articles, server information, getting started, rankings, account preview, and rules.
- `dist/js/app.js`: hash routing and interaction handling.
- `dist/css/styles.css`: global tokens, shared component styles, scoped page styles, responsive rules, and reduced-motion support.

## Backend integration

Replace the data service methods with real API requests when available. Authentication is a clearly labeled interface preview and does not persist or transmit credentials. Downloads, connection addresses, and launch dates remain unannounced. Rankings and news are demonstration content. No live server is connected.

Fantasy artwork is generated with the built-in image generation tool and stored locally in `dist/assets`. Fonts are loaded from Google Fonts and require an internet connection.

## Art direction

The interface uses charcoal and silver glass surfaces, translucent layers, soft blur, fine borders, and restrained ice-blue accents. Manrope headings and Inter body text keep the interface clean. The Wrath-era fantasy illustrations remain unchanged. Shared CSS tokens control the identity, glass blur, surface opacity, borders, and buttons across all pages.

Generated artwork briefs:

- `dist/assets/frozen-throne.png`: widescreen painterly MMORPG key art, armored death knight and glowing runeblade on the right, gothic frozen fortress, dark snowy battlefield on the left for headline placement, navy and cyan with subtle embers, no text or logos.
- `dist/assets/frost-dragon.png`: undead frost dragon flying above an icy gothic citadel in a snowstorm, painterly game key art with navy and cyan lighting, no text or logos.
- `dist/assets/factions.png`: green orc warrior in red-accented armor facing a human paladin in gold and blue armor across a snowy mountain pass, painterly heroic game art, no text or logos.
