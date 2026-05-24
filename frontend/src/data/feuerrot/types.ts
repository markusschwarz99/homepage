// Gen 3 Typen-Chart (FireRed/LeafGreen)
export const TYPE_NAMES = [
  'Normal', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Eis',
  'Kampf', 'Gift', 'Boden', 'Flug', 'Psycho', 'Käfer',
  'Gestein', 'Geist', 'Drache', 'Unlicht', 'Stahl',
] as const;

export type TypeName = typeof TYPE_NAMES[number];

// RAW[angreifer][verteidiger]: 0 | 0.5 | 1 | 2
// Reihenfolge: Normal Feuer Wasser Pflanze Elektro Eis Kampf Gift Boden Flug Psycho Käfer Gestein Geist Drache Unlicht Stahl
const RAW: number[][] = [
  //NOR  FEU  WAS  PFL  ELE  EIS  KAM  GIF  BOD  FLU  PSY  KÄF  GES  GEI  DRA  UNL  STA
  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1, 0.5,   0,   1,   1, 0.5], // Normal
  [  1, 0.5, 0.5,   2,   1,   2,   1,   1,   1,   1,   1,   2, 0.5,   1, 0.5,   1,   2], // Feuer
  [  1,   2, 0.5, 0.5,   1,   1,   1,   1,   2,   1,   1,   1,   2,   1, 0.5,   1,   1], // Wasser
  [  1, 0.5,   2, 0.5,   1,   1,   1, 0.5,   2, 0.5,   1, 0.5,   2,   1, 0.5,   1, 0.5], // Pflanze
  [  1,   1,   2, 0.5, 0.5,   1,   1,   1,   0,   2,   1,   1,   1,   1, 0.5,   1,   1], // Elektro
  [  1, 0.5, 0.5,   2,   1, 0.5,   1,   1,   2,   2,   1,   1,   1,   1,   2,   1, 0.5], // Eis
  [  2,   1,   1,   1,   1,   2,   1, 0.5,   1, 0.5, 0.5, 0.5,   2,   0,   1,   2,   2], // Kampf
  [  1,   1,   1,   2,   1,   1,   1, 0.5, 0.5,   1,   1,   1, 0.5, 0.5,   1,   1,   0], // Gift
  [  1,   2,   1, 0.5,   2,   1,   1,   2,   1,   0,   1, 0.5,   2,   1,   1,   1,   2], // Boden
  [  1,   1,   1,   2, 0.5,   1,   2,   1,   1,   1,   1,   2, 0.5,   1,   1,   1, 0.5], // Flug
  [  1,   1,   1,   1,   1,   1,   2,   2,   1,   1, 0.5,   1,   1,   1,   1,   0, 0.5], // Psycho
  [  1, 0.5,   1,   2,   1,   1, 0.5,   1,   1, 0.5,   2,   1,   1, 0.5,   1,   2, 0.5], // Käfer
  [  1,   2,   1,   1,   1,   2, 0.5,   1, 0.5,   2,   1,   2,   1,   1,   1,   1, 0.5], // Gestein
  [  0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,   1,   2,   1, 0.5, 0.5], // Geist
  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1, 0.5], // Drache
  [  1,   1,   1,   1,   1,   1, 0.5,   1,   1,   1,   2, 0.5,   1,   2,   1, 0.5, 0.5], // Unlicht
  [  1, 0.5, 0.5,   1, 0.5,   2,   1,   1,   1,   1,   1,   1,   2,   1,   1,   1, 0.5], // Stahl
];

export const typeEffectiveness: Record<TypeName, Record<TypeName, number>> = Object.fromEntries(
  TYPE_NAMES.map((atk, i) => [
    atk,
    Object.fromEntries(TYPE_NAMES.map((def, j) => [def, RAW[i][j]])),
  ])
) as Record<TypeName, Record<TypeName, number>>;

export const TYPE_COLORS: Record<TypeName, string> = {
  Normal:   'bg-gray-400 text-white',
  Feuer:    'bg-orange-500 text-white',
  Wasser:   'bg-blue-500 text-white',
  Pflanze:  'bg-green-500 text-white',
  Elektro:  'bg-yellow-400 text-black',
  Eis:      'bg-cyan-300 text-black',
  Kampf:    'bg-red-700 text-white',
  Gift:     'bg-purple-500 text-white',
  Boden:    'bg-amber-700 text-white',
  Flug:     'bg-indigo-400 text-white',
  Psycho:   'bg-pink-500 text-white',
  Käfer:    'bg-lime-500 text-black',
  Gestein:  'bg-stone-500 text-white',
  Geist:    'bg-purple-800 text-white',
  Drache:   'bg-blue-700 text-white',
  Unlicht:  'bg-gray-800 text-white',
  Stahl:    'bg-slate-400 text-white',
};
