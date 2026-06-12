export const GROUPS = {
  A: ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', 'Côte d’Ivoire', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Congo DR', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

export const GROUP_IDS = Object.keys(GROUPS)

const PAIRINGS = [
  [0, 1],
  [2, 3],
  [0, 2],
  [3, 1],
  [3, 0],
  [1, 2],
]

export const TEAMS = Object.fromEntries(
  GROUP_IDS.flatMap((groupId) =>
    GROUPS[groupId].map((name, index) => {
      const id = `${groupId}${index + 1}`
      return [id, { id, name, groupId }]
    }),
  ),
)

export const FIXTURES = Object.fromEntries(
  GROUP_IDS.map((groupId) => [
    groupId,
    PAIRINGS.map(([homeIndex, awayIndex], index) => ({
      id: `${groupId}-${index + 1}`,
      groupId,
      matchday: Math.floor(index / 2) + 1,
      homeId: `${groupId}${homeIndex + 1}`,
      awayId: `${groupId}${awayIndex + 1}`,
    })),
  ]),
)

export const ROUND_OF_32 = [
  { id: 73, slots: ['2A', '2B'] },
  { id: 74, slots: ['1E', { thirdFor: 'E', candidates: 'A/B/C/D/F' }] },
  { id: 75, slots: ['1F', '2C'] },
  { id: 76, slots: ['1C', '2F'] },
  { id: 77, slots: ['1I', { thirdFor: 'I', candidates: 'C/D/F/G/H' }] },
  { id: 78, slots: ['2E', '2I'] },
  { id: 79, slots: ['1A', { thirdFor: 'A', candidates: 'C/E/F/H/I' }] },
  { id: 80, slots: ['1L', { thirdFor: 'L', candidates: 'E/H/I/J/K' }] },
  { id: 81, slots: ['1D', { thirdFor: 'D', candidates: 'B/E/F/I/J' }] },
  { id: 82, slots: ['1G', { thirdFor: 'G', candidates: 'A/E/H/I/J' }] },
  { id: 83, slots: ['2K', '2L'] },
  { id: 84, slots: ['1H', '2J'] },
  { id: 85, slots: ['1B', { thirdFor: 'B', candidates: 'E/F/G/I/J' }] },
  { id: 86, slots: ['1J', '2H'] },
  { id: 87, slots: ['1K', { thirdFor: 'K', candidates: 'D/E/I/J/L' }] },
  { id: 88, slots: ['2D', '2G'] },
]

export const KNOCKOUT_ROUNDS = [
  {
    id: 'r32',
    label: 'Round of 32',
    matches: ROUND_OF_32,
  },
  {
    id: 'r16',
    label: 'Round of 16',
    matches: [
      { id: 89, from: [73, 75] },
      { id: 90, from: [74, 77] },
      { id: 91, from: [76, 78] },
      { id: 92, from: [79, 80] },
      { id: 93, from: [83, 84] },
      { id: 94, from: [81, 82] },
      { id: 95, from: [86, 88] },
      { id: 96, from: [85, 87] },
    ],
  },
  {
    id: 'qf',
    label: 'Quarterfinals',
    matches: [
      { id: 97, from: [89, 90] },
      { id: 98, from: [93, 94] },
      { id: 99, from: [91, 92] },
      { id: 100, from: [95, 96] },
    ],
  },
  {
    id: 'sf',
    label: 'Semifinals',
    matches: [
      { id: 101, from: [97, 98] },
      { id: 102, from: [99, 100] },
    ],
  },
  {
    id: 'final',
    label: 'Final',
    matches: [{ id: 104, from: [101, 102] }],
  },
]
