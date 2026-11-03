import { api, newsService } from './news-service.js';
import { config } from './config.js';
const completedDownloadPreviews = new Set();
export const playProgress = Object.freeze({
  hasDownloadPreview: (accountId = 'guest') => completedDownloadPreviews.has(accountId),
  completeDownloadPreview: (accountId = 'guest') => completedDownloadPreviews.add(accountId),
});
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
export const features = [
  { icon: '♜', label: 'EXPLORE NORTHREND', title: 'A frozen world awaits', text: 'From Howling Fjord to the heights of Icecrown. Rediscover the lands that defined an era.' },
  { icon: '⚔', label: 'DUNGEONS & RAIDS', title: 'Face legendary foes', text: 'Gather your party. Descend into ancient halls, challenge mighty bosses, and earn your place.' },
  { icon: '⚑', label: 'HORDE & ALLIANCE', title: 'Fight for your faction', text: 'Rally under your banner. Find your guild, test your mettle, and build a legacy together.' },
];
export const rules = [
  ['Respect the people behind the characters', 'Harassment, hate speech, threats, and targeted abuse have no place here. Treat other players and staff with respect.'],
  ['Keep the playing field fair', 'Do not use cheats, bots, exploits, or unauthorized automation. Report bugs instead of using them for an advantage.'],
  ['Protect your account', 'Keep your credentials private. Never impersonate staff or request another player’s password.'],
  ['Play honestly', 'Scamming, real-money trading, and intentionally disrupting other players are prohibited.'],
  ['Help build a better realm', 'Use the appropriate channels for reports and feedback. Final enforcement procedures will be published before launch.'],
];
export const dataService = {
  async getNews() { return (await newsService.list()).items; },
  async getRealm() { return (await api('realm')).realm; },
  async getRankings(category = 'players') {
    if (category === 'guilds') return [['Dawnwatch', 'Alliance', 48, 18240], ['Ironbound', 'Horde', 45, 17930], ['Nightfall', 'Horde', 39, 16820], ['Wildheart', 'Alliance', 42, 16110]];
    return players.map((p, i) => category === 'pvp' ? [...p.slice(0, 4), p[4] - i * 8] : p);
  },
};
