import { registerAsset } from '../../../lib/assets/catalog';

export type Group = 'produce' | 'dairy' | 'bakery' | 'pantry';

export type Shape =
  | 'round' | 'cluster' | 'carton' | 'cup' | 'box'
  | 'bag' | 'pouch' | 'jar' | 'bottle' | 'loaf' | 'buns';

export interface Item {
  id: string;
  name: string;
  group: Group;
  shape: Shape;
  /** Packaging fill. */
  body: string;
  /** Darker shade for the bottom border and shading. */
  dark: string;
  /** Cap, lid or label-band colour. */
  accent?: string;
  /** Leaf colour on produce. */
  leaf?: string;
  /** Short text printed on the packaging label band. */
  label?: string;
  /** The lookalike this item seeds as a decoy. Deliberately asymmetric in places. */
  twin: string;
  /** Undefined where no distinct emoji exists; packaging plus name carries it. */
  emoji?: string;
}

export const ITEMS: Item[] = [
  { id: 'apples',   name: 'Apples',   group: 'produce', shape: 'round',   body: '#D0453C', dark: '#A32F28', leaf: '#5AA83F', twin: 'tomatoes', emoji: '🍎' },
  { id: 'tomatoes', name: 'Tomatoes', group: 'produce', shape: 'round',   body: '#D9483A', dark: '#AB3126', leaf: '#4E9636', twin: 'apples',   emoji: '🍅' },
  { id: 'oranges',  name: 'Oranges',  group: 'produce', shape: 'round',   body: '#E8912B', dark: '#B96C16', leaf: '#5AA83F', twin: 'apples',   emoji: '🍊' },
  { id: 'grapes',   name: 'Grapes',   group: 'produce', shape: 'cluster', body: '#7B4EA8', dark: '#5A3480', leaf: '#4E9636', twin: 'plums',    emoji: '🍇' },
  { id: 'plums',    name: 'Plums',    group: 'produce', shape: 'cluster', body: '#8A4E9E', dark: '#653679', leaf: '#4E9636', twin: 'grapes' },
  { id: 'milk',     name: 'Milk',     group: 'dairy',   shape: 'carton',  body: '#F7F5EF', dark: '#D2CEC0', accent: '#3D7CC9', label: 'MILK',   twin: 'cream',   emoji: '🥛' },
  { id: 'cream',    name: 'Cream',    group: 'dairy',   shape: 'carton',  body: '#F7F5EF', dark: '#D2CEC0', accent: '#6FA8D8', label: 'CREAM',  twin: 'milk' },
  { id: 'yogurt',   name: 'Yogurt',   group: 'dairy',   shape: 'cup',     body: '#FBFAF6', dark: '#D9D4C6', accent: '#D0453C', label: 'YOG',    twin: 'butter' },
  { id: 'butter',   name: 'Butter',   group: 'dairy',   shape: 'box',     body: '#F2D97A', dark: '#C9AE4B', accent: '#8C6D1F', label: 'BUTTER', twin: 'yogurt',  emoji: '🧈' },
  { id: 'bread',    name: 'Bread',    group: 'bakery',  shape: 'loaf',    body: '#D9A860', dark: '#B0803C', twin: 'buns',   emoji: '🍞' },
  { id: 'buns',     name: 'Buns',     group: 'bakery',  shape: 'buns',    body: '#DCB070', dark: '#B4864A', twin: 'bread' },
  { id: 'rice',     name: 'Rice',     group: 'pantry',  shape: 'bag',     body: '#E4D2AC', dark: '#BFA97F', accent: '#3D7CC9', label: 'RICE',   twin: 'sugar',   emoji: '🍚' },
  { id: 'sugar',    name: 'Sugar',    group: 'pantry',  shape: 'bag',     body: '#CFE0B4', dark: '#A6BC86', accent: '#5AA83F', label: 'SUGAR',  twin: 'flour' },
  { id: 'flour',    name: 'Flour',    group: 'pantry',  shape: 'bag',     body: '#EEE3C8', dark: '#C6B893', accent: '#B0803C', label: 'FLOUR',  twin: 'rice' },
  { id: 'pasta',    name: 'Pasta',    group: 'pantry',  shape: 'box',     body: '#C63A31', dark: '#992821', accent: '#F5D778', label: 'PASTA',  twin: 'cereal',  emoji: '🍝' },
  { id: 'cereal',   name: 'Cereal',   group: 'pantry',  shape: 'box',     body: '#2F6BA8', dark: '#234F7C', accent: '#F5D778', label: 'FLAKES', twin: 'pasta',   emoji: '🥣' },
  { id: 'chips',    name: 'Chips',    group: 'pantry',  shape: 'pouch',   body: '#EFC13C', dark: '#C39718', accent: '#8C6D1F', label: 'CHIPS',  twin: 'cereal',  emoji: '🍟' },
  { id: 'jam',      name: 'Jam',      group: 'pantry',  shape: 'jar',     body: '#B93A34', dark: '#8C2823', accent: '#FBEFD5', label: 'JAM',    twin: 'honey' },
  { id: 'honey',    name: 'Honey',    group: 'pantry',  shape: 'jar',     body: '#DE9C22', dark: '#B07714', accent: '#FBEFD5', label: 'HONEY',  twin: 'jam',     emoji: '🍯' },
  { id: 'oil',      name: 'Oil',      group: 'pantry',  shape: 'bottle',  body: '#E8B830', dark: '#B78F17', accent: '#FBEFD5', label: 'OIL',    twin: 'vinegar' },
  { id: 'vinegar',  name: 'Vinegar',  group: 'pantry',  shape: 'bottle',  body: '#9C5B2E', dark: '#75411F', accent: '#FBEFD5', label: 'VIN',    twin: 'oil' },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

export const GROUPS: Group[] = ['produce', 'dairy', 'bakery', 'pantry'];

// Registered at module load, matching how the other games publish their art.
ITEMS.forEach((it) => {
  if (it.emoji) registerAsset({ assetId: `mm-${it.id}`, token: it.emoji });
});
