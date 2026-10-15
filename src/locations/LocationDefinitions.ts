export interface LocationDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  difficulty: number;
  price: number;
  accent: string;
  sky: string;
}
export const LOCATIONS: readonly LocationDefinition[] = [
  {
    id: 'jantar',
    name: 'Jantar Mantar',
    subtitle: 'THE CITY HAS SOMETHING TO SAY',
    description: 'Terracotta streets, chai stops & a crowd with opinions.',
    difficulty: 1,
    price: 0,
    accent: '#e77a54',
    sky: '#d5dbcf',
  },
  {
    id: 'india',
    name: 'India Gate',
    subtitle: 'BIG ARCH. BIGGER ENERGY.',
    description: 'A golden boulevard. Open skies. Autos with attitude.',
    difficulty: 2,
    price: 80,
    accent: '#d4b26d',
    sky: '#cadce0',
  },
  {
    id: 'ramlila',
    name: 'Ramlila Maidan',
    subtitle: 'ALL THE WORLD’S A STAGE',
    description: 'Festival tents, colourful banners & maximum josh.',
    difficulty: 3,
    price: 160,
    accent: '#b586b5',
    sky: '#d8cedc',
  },
];
export const locationById = (id: string): LocationDefinition =>
  LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
