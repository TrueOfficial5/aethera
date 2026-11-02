# Aethera

Buildless MMORPG website foundation using modular HTML, CSS, and JavaScript. Project-wide development rules are in the parent AGENTS.md.

## Local preview

Use Node.js 24 or newer with built-in SQLite. Run `npm run dev` from this directory and open http://127.0.0.1:4173. Run `npm run check` for JavaScript syntax validation and `npm test` for authentication checks.

For working local test accounts, run `npm run dev:test`, then open `http://127.0.0.1:4173/#/account`. You can register an ordinary test account in the interface. Provision an administrator with `npm run account:create -- --username NAME --role admin`; the command prints a generated password once. Existing usernames are not overwritten. Credentials and sessions persist in `.data/site.sqlite`, which is excluded from version control. Keep this database private.

Local authentication is explicitly enabled only by the testing command and refuses production mode or a non-local origin. Test credentials are website-only and cannot be used in the game. The default server leaves authentication unavailable until a provider is configured. A static deployment can display the frontend but cannot run the authentication API; the backend needs a Node runtime and persistent storage.

## Structure

- `dist/js/config.js`: shared server identity and proposed realm configuration.
- `dist/js/data.js`: centralized demonstration content and asynchronous data service.
- `dist/js/components.js`: buttons, branding, navigation, footer, headings, badges, news cards, feature cards, notices, and tables.
- `dist/js/pages.js`: homepage, news, articles, server information, getting started, rankings, account forms, and rules.
- `dist/js/auth-service.js`: shared session state and authentication API requests.
- `server/auth.mjs`: authentication providers, password hashing, and session management.
- `dist/js/app.js`: hash routing and interaction handling.
- `dist/css/styles.css`: global tokens, shared component styles, scoped page styles, responsive rules, and reduced-motion support.

## Backend integration

Authentication uses replaceable server-side providers, salted scrypt password hashes for local accounts, opaque HttpOnly sessions, origin validation, and login throttling. Roles are stored and checked by the server. A future WoW provider must validate the actual core's credential format; no game connection is currently implemented. Downloads, connection addresses, and launch dates remain unannounced. Rankings remain demonstration content. News uses the persistent SQLite API: published articles appear on the homepage and journal. Seeded articles are labeled as demonstration content on their article pages.

The main character artwork is supplied by the project owner and stored in `dist/images/Aetheras-character.png`. Supporting fantasy artwork is generated with the built-in image generation tool and stored locally in `dist/assets`. Fonts are loaded from Google Fonts and require an internet connection.

## Art direction

The interface uses charcoal and silver glass surfaces, translucent layers, soft blur, fine borders, and restrained ice-blue accents. Manrope headings and Inter body text keep the interface clean. The Wrath-era fantasy illustrations remain unchanged. Shared CSS tokens control the identity, glass blur, surface opacity, borders, and buttons across all pages.

Generated artwork briefs:

- `dist/assets/frozen-throne.png`: widescreen painterly MMORPG key art, armored death knight and glowing runeblade on the right, gothic frozen fortress, dark snowy battlefield on the left for headline placement, navy and cyan with subtle embers, no text or logos.
- `dist/assets/frost-dragon.png`: undead frost dragon flying above an icy gothic citadel in a snowstorm, painterly game key art with navy and cyan lighting, no text or logos.
- `dist/assets/factions.png`: green orc warrior in red-accented armor facing a human paladin in gold and blue armor across a snowy mountain pass, painterly heroic game art, no text or logos.

## Profiles and news management

After signing in, Account shows the profile with account details and an explicit game-integration placeholder. Administrators see Manage news and Categories. Open `/#/admin` to search/filter articles, create drafts, publish, hide, or delete them. Open `/#/admin/categories` to create/rename categories or remove them without deleting articles. Optional images accept local asset paths or HTTPS URLs. Article content is plain text and escaped when displayed. Saving an outdated article version returns a conflict instead of overwriting newer changes. Deletion uses a shared confirmation dialog.

News, categories, accounts, and sessions persist in `.data/site.sqlite`. Back up this private database before production migration. Game characters and profile editing are not implemented. The local test provider is not a WoW account provider.

Scheduled publication: choose Planned and a future date/time in the editor. The interface displays your browser timezone; the server stores UTC. Planned articles remain private until due. The running Node server publishes due articles within approximately one second, and catches up after a restart. Switching to Draft or Hidden cancels the schedule. Scheduled changes also increment the article version to prevent concurrent overwrites.

Realm information: administrators can edit the realm name, expansion, client version, experience text, maximum level, and status at /#/admin/realm. Values persist in the SQLite metadata table and are shared by the homepage, server information, and client-version guidance. This changes website content only, not the game server configuration. Updates require the current version to avoid overwriting concurrent edits.

Mobile review: public pages and administrator views were checked in browser viewports at 320/390px, 768px tablet, 844×390 landscape, and 1440px desktop. Mobile navigation includes account access; wide tables retain internal scrolling with a swipe hint. Forms use readable 16px controls, section arrows avoid covering tall sections, and touch devices retain native scrolling. Physical iOS/Android touch and keyboard behavior still require device testing. Future UI changes must include responsive checks under AGENTS.md.
