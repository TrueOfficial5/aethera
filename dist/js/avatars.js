export const avatars = Object.freeze([
  { id: 'human', name: 'Human', image: './images/avatars/human.png' },
  { id: 'orc', name: 'Orc', image: './images/avatars/orc.png' },
  { id: 'night-elf', name: 'Night Elf', image: './images/avatars/night-elf.png' },
  { id: 'blood-elf', name: 'Blood Elf', image: './images/avatars/blood-elf.png' },
  { id: 'dwarf', name: 'Dwarf', image: './images/avatars/dwarf.png' },
  { id: 'undead', name: 'Undead', image: './images/avatars/undead.png' },
  { id: 'custom', name: 'Custom', image: null },
]);

export const portraitSize = Object.freeze({ minimum: 256, recommended: 512 });
export function customPortraitUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
