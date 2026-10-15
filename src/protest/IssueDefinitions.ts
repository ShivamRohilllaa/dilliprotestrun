export interface IssueDefinition {
  id: string;
  name: string;
  description: string;
  symbol: string;
  slogans: readonly { roman: string; hindi: string }[];
}

export const ISSUES: readonly IssueDefinition[] = [
  {
    id: 'vote-chori',
    name: 'Vote chori',
    description: 'Fair counting. Clear answers.',
    symbol: '✓',
    slogans: [
      { roman: 'Vote chori band karo!', hindi: 'वोट चोरी बंद करो!' },
      { roman: 'Ginti saaf, jawab saaf!', hindi: 'गिनती साफ़, जवाब साफ़!' },
    ],
  },
  {
    id: 'gyaanu',
    name: 'Gyaanu resign',
    description: 'Your campaign. Your call for change.',
    symbol: '!',
    slogans: [
      { roman: 'Gyaanu ji, resign karo!', hindi: 'ज्ञानू जी, इस्तीफ़ा दो!' },
      { roman: 'Jawab do! Jawab do!', hindi: 'जवाब दो! जवाब दो!' },
    ],
  },
  {
    id: 'dharam',
    name: 'Dharam resign',
    description: 'Turn the volume up for accountability.',
    symbol: '↗',
    slogans: [
      { roman: 'Dharam ji, resign karo!', hindi: 'धरम जी, इस्तीफ़ा दो!' },
      { roman: 'Zimmedari lo, jawab do!', hindi: 'ज़िम्मेदारी लो, जवाब दो!' },
    ],
  },
  {
    id: 'exams',
    name: 'Exam fairness',
    description: 'No leaks. No cancelled dreams.',
    symbol: '?',
    slogans: [
      { roman: 'Paper leak band karo!', hindi: 'पेपर लीक बंद करो!' },
      { roman: 'Mehnat ka insaaf karo!', hindi: 'मेहनत का इंसाफ़ करो!' },
    ],
  },
  {
    id: 'schools',
    name: 'School sudhaaro',
    description: 'Better classrooms. A better tomorrow.',
    symbol: '+',
    slogans: [
      { roman: 'School theek karo!', hindi: 'स्कूल ठीक करो!' },
      { roman: 'Padhai ko sahara do!', hindi: 'पढ़ाई को सहारा दो!' },
    ],
  },
];

export const issueById = (id: string): IssueDefinition =>
  ISSUES.find((issue) => issue.id === id) ?? ISSUES[0];
