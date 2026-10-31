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

Landscape photography is loaded from Unsplash. Fonts are loaded from Google Fonts. These assets require an internet connection. Replace with locally hosted licensed assets before production if desired.
