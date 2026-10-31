import { config } from './config.js';
export const news = [
  { id: 'new-chapter', category: 'Announcement', date: '2026-10-28', title: 'Every great adventure begins with a new chapter.', excerpt: 'Introducing our vision for a realm built around the things that made us fall in love with Azeroth.', image: 'photo-1464822759023-fed622ff2c3b', body: 'Welcome to the beginning of Aethera. Our goal is simple: create a thoughtful home for players who love the journey as much as the destination. This website is an early demonstration of that vision. Realm settings, launch timing, and service availability are still being decided. Follow this space for confirmed development updates.' },
  { id: 'realm-philosophy', category: 'Development', date: '2026-10-24', title: 'Built for the journey. Designed to last.', excerpt: 'A closer look at our approach to progression, quality of life, and a world worth exploring.', image: 'photo-1472396961693-142e6e269027', body: 'A good realm needs more than a destination. It needs meaningful progression, clear communication, and room for a community to grow. Our proposed foundation pairs Wrath-era content with considered quality-of-life improvements. These are design goals, not a list of live server features. Specific systems will be announced as they are developed and tested.' },
  { id: 'community', category: 'Community', date: '2026-10-20', title: 'A world is only as great as its people.', excerpt: 'There is a place for every kind of adventurer. Help shape what comes next.', image: 'photo-1448375240586-882707db888b', body: 'Whether you explore every corner, push your limits in raids, or spend an evening helping a friend, you belong in the conversation. Community channels will open closer to testing. Until then, the news section will serve as the home for project updates. No account registration or game connection is available in this demonstration.' },
].map(article => ({ ...article, body: article.body.replaceAll('Aethera', config.name) }));
const players = [
  ['Vaelith', 'Paladin', 'Alliance', 'Dawnwatch', 2486],
  ['Thorn', 'Warrior', 'Horde', 'Ironbound', 2412],
  ['Seraphine', 'Priest', 'Alliance', 'Dawnwatch', 2384],
  ['Nyx', 'Rogue', 'Horde', 'Nightfall', 2341],
  ['Elowen', 'Druid', 'Alliance', 'Wildheart', 2306],
  ['Kaelros', 'Mage', 'Horde', 'Nightfall', 2289],
  ['Ashen', 'Death Knight', 'Horde', 'Ironbound', 2247],
  ['Liora', 'Hunter', 'Alliance', 'Wildheart', 2218],
];
export const realm = { status: 'In development', online: '—', accounts: '—', uptime: '—' };
export const features = [
  { icon: '◈', label: 'THE WORLD', title: 'Rediscover the adventure.', text: 'From quiet forests to frozen peaks. A familiar world, ready for a fresh start.' },
  { icon: '⚔', label: 'THE CHALLENGE', title: 'Make every victory count.', text: 'Dungeons, raids, and the arena. Find your challenge and face it together.' },
  { icon: '⌘', label: 'THE COMMUNITY', title: 'Find your people.', text: 'Old friends. New guildmates. The stories that happen between the quests.' },
];
export const rules = [
  ['Respect the people behind the characters', 'Harassment, hate speech, threats, and targeted abuse have no place here. Treat other players and staff with respect.'],
  ['Keep the playing field fair', 'Do not use cheats, bots, exploits, or unauthorized automation. Report bugs instead of using them for an advantage.'],
  ['Protect your account', 'Keep your credentials private. Never impersonate staff or request another player’s password.'],
  ['Play honestly', 'Scamming, real-money trading, and intentionally disrupting other players are prohibited.'],
  ['Help build a better realm', 'Use the appropriate channels for reports and feedback. Final enforcement procedures will be published before launch.'],
];
export const dataService = {
  async getNews() { return news; },
  async getRealm() { return realm; },
  async getRankings(category = 'players') {
    if (category === 'guilds') return [['Dawnwatch', 'Alliance', 48, 18240], ['Ironbound', 'Horde', 45, 17930], ['Nightfall', 'Horde', 39, 16820], ['Wildheart', 'Alliance', 42, 16110]];
    return players.map((p, i) => category === 'pvp' ? [...p.slice(0, 4), p[4] - i * 8] : p);
  },
};
