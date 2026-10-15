/** Original stylised features drawn from public appearance references. */
export interface CharacterAppearance {
  skin: string;
  hair: string;
  hairStyle: 'swept' | 'tousled' | 'short' | 'receding' | 'bald' | 'shaved';
  beard: 'none' | 'stubble' | 'full' | 'long';
  moustache: boolean;
  glasses: 'none' | 'round' | 'rectangular';
  clothing: 'shirt' | 'polo' | 'kurta' | 'vest' | 'robe' | 'sweater';
  build: 'slim' | 'regular' | 'broad';
  trousers: string;
  tilak?: boolean;
  headwear?: 'saffron-band' | 'black-cap';
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  accent: string;
  accessory: 'scarf' | 'apron' | 'headphones' | 'crown' | 'none';
  price: number;
  inspiredBy?: string;
  appearance?: CharacterAppearance;
}
const CAST: readonly CharacterDefinition[] = [
  {
    id: 'runner',
    name: 'Dilli Runner',
    description: 'Local legend. Loud scarf. Always late.',
    color: '#eb683e',
    accent: '#ffe1a0',
    accessory: 'scarf',
    price: 0,
  },
  {
    id: 'chai',
    name: 'Chai Master',
    description: 'Fuelled by chai. Unstoppable by nature.',
    color: '#5ca68f',
    accent: '#ffe8b9',
    accessory: 'apron',
    price: 60,
  },
  {
    id: 'metro',
    name: 'Metro Ninja',
    description: 'Mind the gap. Find your own rhythm.',
    color: '#638bc5',
    accent: '#fbc452',
    accessory: 'headphones',
    price: 120,
  },
  {
    id: 'meme',
    name: 'Meme King',
    description: 'Main character energy. Zero context.',
    color: '#ae74b8',
    accent: '#ffd25b',
    accessory: 'crown',
    price: 200,
  },
  {
    id: 'abhiteep',
    name: 'Abhiteep Bauna',
    inspiredBy: 'Abhijeet Dipke',
    description: 'Tousled hair. Big beard. Bigger arcade entrance.',
    color: '#48534b',
    accent: '#343c37',
    accessory: 'none',
    price: 0,
    appearance: {
      skin: '#bf885e',
      hair: '#252329',
      hairStyle: 'tousled',
      beard: 'full',
      moustache: true,
      glasses: 'none',
      clothing: 'polo',
      build: 'regular',
      trousers: '#263c4d',
    },
  },
  {
    id: 'german',
    name: 'German Sepherd',
    inspiredBy: 'Dhruv Rathee',
    description: 'Studio-ready hair. A very unscripted sprint.',
    color: '#303540',
    accent: '#a23c42',
    accessory: 'none',
    price: 0,
    appearance: {
      skin: '#d6a37b',
      hair: '#25282c',
      hairStyle: 'swept',
      beard: 'stubble',
      moustache: true,
      glasses: 'none',
      clothing: 'sweater',
      build: 'slim',
      trousers: '#2d3d50',
    },
  },
  {
    id: 'udhar',
    name: 'Udhar Galib',
    inspiredBy: 'Umar Khalid',
    description: 'Round frames and a quick change of lane.',
    color: '#d78236',
    accent: '#e2d3b1',
    accessory: 'scarf',
    price: 0,
    appearance: {
      skin: '#b77f57',
      hair: '#292b30',
      hairStyle: 'swept',
      beard: 'stubble',
      moustache: true,
      glasses: 'round',
      clothing: 'kurta',
      build: 'slim',
      trousers: '#344758',
    },
  },
  {
    id: 'jaleel',
    name: 'Jaleel Imaan',
    inspiredBy: 'Sharjeel Imam',
    description: 'Full beard. Round frames. Chai on the horizon.',
    color: '#b7b4ab',
    accent: '#45667a',
    accessory: 'none',
    price: 0,
    appearance: {
      skin: '#c08a62',
      hair: '#29272a',
      hairStyle: 'tousled',
      beard: 'long',
      moustache: true,
      glasses: 'round',
      clothing: 'kurta',
      build: 'regular',
      trousers: '#273c4d',
    },
  },
  {
    id: 'pappu',
    name: 'Pappu',
    inspiredBy: 'Rahul Gandhi',
    description: 'White polo. Salt-and-pepper beard. Keep walking? Run.',
    color: '#f3eee1',
    accent: '#dbd8ca',
    accessory: 'none',
    price: 0,
    appearance: {
      skin: '#d4a079',
      hair: '#777974',
      hairStyle: 'short',
      beard: 'full',
      moustache: true,
      glasses: 'none',
      clothing: 'polo',
      build: 'regular',
      trousers: '#314d68',
    },
  },
  {
    id: 'khujliwaal',
    name: 'Khujliwaal',
    inspiredBy: 'Arvind Kejriwal',
    description: 'Square specs. Signature moustache. Everyday sprint.',
    color: '#7fb4cd',
    accent: '#e6f1ed',
    accessory: 'none',
    price: 0,
    appearance: {
      skin: '#ba865b',
      hair: '#303039',
      hairStyle: 'swept',
      beard: 'none',
      moustache: true,
      glasses: 'rectangular',
      clothing: 'shirt',
      build: 'regular',
      trousers: '#474e55',
    },
  },
];
/** Reward portraits stay separate from the playable roster and saved avatar selection. */
export const REWARD_CHARACTERS = CAST.filter((c) => c.id === 'udhar' || c.id === 'jaleel');
export const CROWD_CHARACTERS = CAST.filter((c) => !c.inspiredBy);
export const CHARACTERS = CAST.filter((c) => c.inspiredBy && c.id !== 'udhar' && c.id !== 'jaleel');
export const characterById = (id: string): CharacterDefinition =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
