/**
 * Level pictures. Each row is a string of palette keys; every cell is a
 * pixel (pictures are full rectangles, background included).
 */
export interface PictureDef {
  id: string;
  name: string;
  /** Deck lanes the collectors are dealt into. */
  lanes: number;
  palette: Record<string, string>;
  art: string[];
}

export const PICTURES: PictureDef[] = [
  {
    id: 'heart',
    name: 'Heart',
    lanes: 3,
    palette: { B: '#BFE3F7', R: '#E53950', W: '#FFFFFF' },
    art: [
      'BBBBBBBBBB',
      'BRRBBBBRRB',
      'RRRRBBRRRR',
      'RWRRRRRRRR',
      'RRRRRRRRRR',
      'BRRRRRRRRB',
      'BBRRRRRRBB',
      'BBBRRRRBBB',
      'BBBBRRBBBB',
      'BBBBBBBBBB',
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    lanes: 3,
    palette: { S: '#CDEBFF', W: '#FFFFFF', M: '#7A4E2D', B: '#D2452B', A: '#2F7FD1' },
    art: [
      'SSSSSSSSSSSS',
      'SSSSSWSSSSSS',
      'SSSSSWWSSSSS',
      'SSSSSWWWSSSS',
      'SSSSSWWWWSSS',
      'SSSSSWWWWWSS',
      'SSSSSMSSSSSS',
      'SBBBBBBBBBBS',
      'SSBBBBBBBBSS',
      'AAAAAAAAAAAA',
      'AAAAAAAAAAAA',
      'AAAAAAAAAAAA',
    ],
  },
  {
    id: 'tree',
    name: 'Tree',
    lanes: 3,
    palette: { S: '#E3F4FF', G: '#2E9E4F', L: '#7CD67A', T: '#8B5A2B', H: '#5FB342' },
    art: [
      'SSSSSSSSSSSS',
      'SSSSGGGGSSSS',
      'SSSGGGGGGSSS',
      'SSGGGGLGGGSS',
      'SSGGLGGGGGSS',
      'SSGGGGGGLGSS',
      'SSSGGGGGGSSS',
      'SSSSGTTGSSSS',
      'SSSSSTTSSSSS',
      'SSSSSTTSSSSS',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
    ],
  },
  {
    id: 'fish',
    name: 'Fish',
    lanes: 3,
    palette: { A: '#4FB3E8', O: '#FF8A1F', F: '#E0531F', Y: '#FFD23F', K: '#1B1B1B' },
    art: [
      'AAAAAAAAAAAA',
      'AAAAAAAAAAAA',
      'AAAAAOOOOAAA',
      'FAAAOOOOOOAA',
      'FFAOOOOOOKOA',
      'FFFOOYOOOOOA',
      'FFFOOYOOOOOA',
      'FFAOOOOOOOOA',
      'FAAAOOOOOOAA',
      'AAAAAOOOOAAA',
      'AAAAAAAAAAAA',
      'AAAAAAAAAAAA',
    ],
  },
  {
    id: 'house',
    name: 'House',
    lanes: 4,
    palette: {
      S: '#CFEAFF',
      U: '#FFD23F',
      R: '#C0392B',
      W: '#F3E2C3',
      N: '#5DADE2',
      D: '#7A4E2D',
      H: '#58B04A',
      P: '#A9A9A9',
    },
    art: [
      'SSSSSSSSSSSSSS',
      'SSSSSSRRSSSUUS',
      'SSSSSRRRRSSUUS',
      'SSSSRRRRRRSUUS',
      'SSSRRRRRRRRSSS',
      'SSRRRRRRRRRRSS',
      'SRRRRRRRRRRRRS',
      'SSWWWWWWWWWWSS',
      'SSWNNWWWWNNWSS',
      'SSWNNWWWWNNWSS',
      'SSWWWWDDWWWWSS',
      'SSWWWWDDWWWWSS',
      'HHHHHHPPHHHHHH',
      'HHHHHHPPHHHHHH',
    ],
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    lanes: 4,
    palette: { G: '#D8F3E6', R: '#D93A3A', W: '#FFFFFF', C: '#F5E6C8', H: '#5FB342' },
    art: [
      'GGGGGGGGGGGGGG',
      'GGGGGRRRRGGGGG',
      'GGGRRRWWRRRGGG',
      'GGRRWWRRRRWRGG',
      'GRRRWWRRRRRRRG',
      'GRRRRRRRWWRRRG',
      'RRWRRRRRWWRRWR',
      'RRRRRRRRRRRRRR',
      'GGGCCCCCCCCGGG',
      'GGGGCCCCCCGGGG',
      'GGGGCCCCCCGGGG',
      'GGGGCCCCCCGGGG',
      'HHHHHCCCCHHHHH',
      'HHHHHHHHHHHHHH',
    ],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    lanes: 4,
    palette: {
      Y: '#FFE08A',
      O: '#FFAA5C',
      P: '#F2777A',
      S: '#FFF4B0',
      A: '#2E6FB7',
      L: '#F7C873',
      D: '#E8CF97',
    },
    art: [
      'YYYYYYYYYYYYYY',
      'YYYYYYYYYYYYYY',
      'OOOOOOOOOOOOOO',
      'OOOOOSSSSOOOOO',
      'OOOOSSSSSSOOOO',
      'PPPSSSSSSSSPPP',
      'PPPSSSSSSSSPPP',
      'PPPPPPPPPPPPPP',
      'AAAAAAAAAAAAAA',
      'AAALLLLLLLLAAA',
      'AAAAALLLLAAAAA',
      'AAAAAAAAAAAAAA',
      'DDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDD',
    ],
  },
];

/** Converts a picture definition into colour indices + a colour list. */
export const parsePicture = (def: PictureDef) => {
  const keys = Object.keys(def.palette);
  const grid = def.art.map(row => [...row].map(ch => keys.indexOf(ch)));
  return { grid, colors: keys.map(k => def.palette[k]) };
};
