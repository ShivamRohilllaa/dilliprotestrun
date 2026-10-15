export interface CatchEnding {
  title: string;
  message: string;
  extra: string;
}

const ENDINGS: Record<string, CatchEnding> = {
  mobi: {
    title: 'Chai pe charcha?',
    message: 'Now you have to drink a chai with Mobi ji.',
    extra: 'One cup. Then one more run.',
  },
  amit: {
    title: 'Plot twist!',
    message: 'Now you’re a “terrorist”!',
    extra: 'A fictional accusation from Amit kaka. Hit retry for a fresh start.',
  },
  baba: {
    title: 'House gone. Mars next?',
    message: 'Now your house is gone. Better leave Earth!',
    extra: 'Baba ji’s cartoon ending: pack a rocket for Mars, then respawn.',
  },
  bajrang: {
    title: 'The bheed caught up.',
    message: 'Bajrang Brigade wins this round. You’re surrounded!',
    extra: 'Find your next gap. Chai tokens help you stay ahead.',
  },
  rss: {
    title: 'The squad caught up.',
    message: 'Shakha Squad has caught you. That was a lot of running!',
    extra: 'Take a breather, then give the crowd another chase.',
  },
};

export function catchEndingFor(pursuerId: string): CatchEnding {
  return ENDINGS[pursuerId] ?? ENDINGS.mobi;
}
