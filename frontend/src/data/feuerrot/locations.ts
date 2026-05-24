export type EncounterMethod = 'Gras' | 'Surfen' | 'Alte Angel' | 'Gute Angel' | 'Superangel' | 'Spezial' | 'Interaktion' | 'Tausch';

export interface Encounter {
  pokemonId: number;
  method: EncounterMethod;
  levels: string;
  rarity?: 'Häufig' | 'Gelegentlich' | 'Selten';
  fireRedOnly?: boolean;
  leafGreenOnly?: boolean;
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  region?: string;
  encounters: Encounter[];
}

export const LOCATIONS: Location[] = [
  {
    id: 'route1',
    name: 'Route 1',
    region: 'Pallet Town → Viridian City',
    encounters: [
      { pokemonId: 16, method: 'Gras', levels: '2–3', rarity: 'Häufig' },
      { pokemonId: 19, method: 'Gras', levels: '2–3', rarity: 'Häufig' },
    ],
  },
  {
    id: 'route2',
    name: 'Route 2',
    region: 'Viridian City → Pewter City',
    encounters: [
      { pokemonId: 16, method: 'Gras', levels: '3–4', rarity: 'Häufig' },
      { pokemonId: 19, method: 'Gras', levels: '3–4', rarity: 'Häufig' },
      { pokemonId: 10, method: 'Gras', levels: '3–4', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 13, method: 'Gras', levels: '3–4', rarity: 'Gelegentlich', leafGreenOnly: true },
      // Nördlicher Abschnitt (nach Diglett's Cave-Abkürzung)
      { pokemonId: 29, method: 'Gras', levels: '13', rarity: 'Gelegentlich', note: 'Nördlicher Teil' },
      { pokemonId: 32, method: 'Gras', levels: '13', rarity: 'Gelegentlich', note: 'Nördlicher Teil' },
    ],
  },
  {
    id: 'viridian-forest',
    name: 'Viridian Forest',
    region: 'Viridian City → Pewter City',
    encounters: [
      { pokemonId: 10, method: 'Gras', levels: '3–5', rarity: 'Häufig', fireRedOnly: true },
      { pokemonId: 11, method: 'Gras', levels: '4–6', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 13, method: 'Gras', levels: '3–5', rarity: 'Häufig', leafGreenOnly: true },
      { pokemonId: 14, method: 'Gras', levels: '4–6', rarity: 'Gelegentlich', leafGreenOnly: true },
      { pokemonId: 25, method: 'Gras', levels: '3–5', rarity: 'Selten' },
    ],
  },
  {
    id: 'route3',
    name: 'Route 3',
    region: 'Pewter City → Mt. Moon',
    encounters: [
      { pokemonId: 21, method: 'Gras', levels: '6–8', rarity: 'Häufig' },
      { pokemonId: 16, method: 'Gras', levels: '6–8', rarity: 'Gelegentlich' },
      { pokemonId: 39, method: 'Gras', levels: '6–8', rarity: 'Gelegentlich' },
      { pokemonId: 29, method: 'Gras', levels: '6–8', rarity: 'Gelegentlich' },
      { pokemonId: 32, method: 'Gras', levels: '6–8', rarity: 'Gelegentlich' },
    ],
  },
  {
    id: 'mt-moon',
    name: 'Mt. Moon',
    region: 'Route 3 → Cerulean City',
    encounters: [
      { pokemonId: 41, method: 'Gras', levels: '6–8', rarity: 'Häufig' },
      { pokemonId: 74, method: 'Gras', levels: '8–10', rarity: 'Häufig' },
      { pokemonId: 46, method: 'Gras', levels: '8–10', rarity: 'Gelegentlich' },
      { pokemonId: 35, method: 'Gras', levels: '8–10', rarity: 'Selten' },
      { pokemonId: 27, method: 'Gras', levels: '8–10', rarity: 'Gelegentlich', leafGreenOnly: true },
    ],
  },
  {
    id: 'route4',
    name: 'Route 4',
    region: 'Mt. Moon → Cerulean City',
    encounters: [
      { pokemonId: 21, method: 'Gras', levels: '8–12', rarity: 'Häufig' },
      { pokemonId: 19, method: 'Gras', levels: '8–12', rarity: 'Häufig' },
      { pokemonId: 23, method: 'Gras', levels: '8–12', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 27, method: 'Gras', levels: '8–12', rarity: 'Gelegentlich', leafGreenOnly: true },
      { pokemonId: 56, method: 'Gras', levels: '8–12', rarity: 'Gelegentlich', fireRedOnly: true },
      // östlich nach Cerulean
      { pokemonId: 30, method: 'Gras', levels: '12–14', rarity: 'Selten', note: 'Östlicher Teil' },
      { pokemonId: 33, method: 'Gras', levels: '12–14', rarity: 'Selten', note: 'Östlicher Teil' },
    ],
  },
  {
    id: 'route24-25',
    name: 'Route 24 & 25',
    region: 'Cerulean City → Bills Haus',
    encounters: [
      { pokemonId: 63, method: 'Gras', levels: '12–17', rarity: 'Gelegentlich' },
      { pokemonId: 43, method: 'Gras', levels: '12–17', rarity: 'Häufig', fireRedOnly: true },
      { pokemonId: 69, method: 'Gras', levels: '12–17', rarity: 'Häufig', leafGreenOnly: true },
      { pokemonId: 48, method: 'Gras', levels: '13–17', rarity: 'Gelegentlich' },
      { pokemonId: 10, method: 'Gras', levels: '12–14', rarity: 'Gelegentlich' },
      { pokemonId: 16, method: 'Gras', levels: '12–14', rarity: 'Gelegentlich' },
      { pokemonId: 60, method: 'Surfen', levels: '20–30', rarity: 'Häufig' },
      { pokemonId: 54, method: 'Surfen', levels: '20–30', rarity: 'Gelegentlich' },
      { pokemonId: 98, method: 'Gute Angel', levels: '10–20' },
      { pokemonId: 129, method: 'Alte Angel', levels: '5' },
    ],
  },
  {
    id: 'route5-8',
    name: 'Route 5–8',
    region: 'Cerulean City → Celadon City',
    encounters: [
      { pokemonId: 16, method: 'Gras', levels: '13–15', rarity: 'Häufig' },
      { pokemonId: 43, method: 'Gras', levels: '13–15', rarity: 'Häufig', fireRedOnly: true },
      { pokemonId: 69, method: 'Gras', levels: '13–15', rarity: 'Häufig', leafGreenOnly: true },
      { pokemonId: 52, method: 'Gras', levels: '13–15', rarity: 'Gelegentlich', leafGreenOnly: true },
      { pokemonId: 58, method: 'Gras', levels: '13–15', rarity: 'Gelegentlich', fireRedOnly: true, note: 'Route 7 & 8' },
      { pokemonId: 37, method: 'Gras', levels: '13–15', rarity: 'Gelegentlich', leafGreenOnly: true, note: 'Route 7 & 8' },
      { pokemonId: 84, method: 'Gras', levels: '13–15', rarity: 'Gelegentlich', note: 'Route 6' },
    ],
  },
  {
    id: 'route9-10',
    name: 'Route 9 & 10',
    region: 'Cerulean City → Lavender Town',
    encounters: [
      { pokemonId: 19, method: 'Gras', levels: '15–20', rarity: 'Häufig' },
      { pokemonId: 23, method: 'Gras', levels: '15–20', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 27, method: 'Gras', levels: '15–20', rarity: 'Gelegentlich', leafGreenOnly: true },
      { pokemonId: 81, method: 'Gras', levels: '17–22', rarity: 'Häufig', note: 'Route 10 (am Kraftwerk)' },
      { pokemonId: 100, method: 'Gras', levels: '17–22', rarity: 'Gelegentlich', note: 'Route 10' },
      { pokemonId: 60, method: 'Gute Angel', levels: '10–20' },
      { pokemonId: 129, method: 'Alte Angel', levels: '5' },
    ],
  },
  {
    id: 'rock-tunnel',
    name: 'Rock Tunnel',
    region: 'Route 10 → Lavender Town',
    encounters: [
      { pokemonId: 41, method: 'Gras', levels: '15–18', rarity: 'Häufig' },
      { pokemonId: 74, method: 'Gras', levels: '16–19', rarity: 'Häufig' },
      { pokemonId: 66, method: 'Gras', levels: '17–20', rarity: 'Gelegentlich' },
      { pokemonId: 95, method: 'Gras', levels: '16–19', rarity: 'Gelegentlich' },
      { pokemonId: 46, method: 'Gras', levels: '16–19', rarity: 'Selten' },
    ],
  },
  {
    id: 'route11-15',
    name: 'Route 11–15',
    region: 'Vermilion City → Fuchsia City',
    encounters: [
      { pokemonId: 96, method: 'Gras', levels: '11–15', rarity: 'Häufig', note: 'Route 11' },
      { pokemonId: 84, method: 'Gras', levels: '20–26', rarity: 'Gelegentlich', note: 'Route 16–18, 22' },
      { pokemonId: 48, method: 'Gras', levels: '18–22', rarity: 'Häufig', note: 'Route 12–15' },
      { pokemonId: 43, method: 'Gras', levels: '18–22', rarity: 'Gelegentlich', fireRedOnly: true, note: 'Route 12–15' },
      { pokemonId: 69, method: 'Gras', levels: '18–22', rarity: 'Gelegentlich', leafGreenOnly: true, note: 'Route 12–15' },
      { pokemonId: 23, method: 'Gras', levels: '20–25', rarity: 'Gelegentlich', fireRedOnly: true, note: 'Route 12–15' },
      { pokemonId: 72, method: 'Surfen', levels: '20–40', rarity: 'Häufig' },
      { pokemonId: 129, method: 'Alte Angel', levels: '5' },
      { pokemonId: 60, method: 'Gute Angel', levels: '10–20' },
      { pokemonId: 90, method: 'Superangel', levels: '20–40', rarity: 'Gelegentlich', note: 'Route 12, 13' },
    ],
  },
  {
    id: 'digletts-cave',
    name: 'Diglett\'s Cave',
    region: 'Route 2 → Vermilion City',
    encounters: [
      { pokemonId: 50, method: 'Gras', levels: '15–22', rarity: 'Häufig' },
      { pokemonId: 51, method: 'Gras', levels: '22–31', rarity: 'Selten' },
    ],
  },
  {
    id: 'pokemon-tower',
    name: 'Pokémon-Turm',
    region: 'Lavender Town',
    encounters: [
      { pokemonId: 92, method: 'Gras', levels: '17–22', rarity: 'Häufig' },
      { pokemonId: 93, method: 'Gras', levels: '22–28', rarity: 'Selten' },
      { pokemonId: 104, method: 'Gras', levels: '18–22', rarity: 'Gelegentlich' },
    ],
  },
  {
    id: 'safari-zone',
    name: 'Safari Zone',
    region: 'Fuchsia City',
    encounters: [
      { pokemonId: 128, method: 'Gras', levels: '22–26', rarity: 'Gelegentlich', note: 'Alle Zonen' },
      { pokemonId: 102, method: 'Gras', levels: '24–26', rarity: 'Gelegentlich', note: 'Zone 2 & 3' },
      { pokemonId: 115, method: 'Gras', levels: '22–26', rarity: 'Selten', note: 'Zone 2' },
      { pokemonId: 113, method: 'Gras', levels: '22–26', rarity: 'Selten', note: 'Zone 3' },
      { pokemonId: 123, method: 'Gras', levels: '22–26', rarity: 'Selten', fireRedOnly: true, note: 'Zone 1' },
      { pokemonId: 127, method: 'Gras', levels: '22–26', rarity: 'Selten', leafGreenOnly: true, note: 'Zone 1' },
      { pokemonId: 111, method: 'Gras', levels: '22–26', rarity: 'Gelegentlich', note: 'Zone 1' },
      { pokemonId: 104, method: 'Gras', levels: '22–24', rarity: 'Gelegentlich', note: 'Zone 1' },
      { pokemonId: 46, method: 'Gras', levels: '22–24', rarity: 'Gelegentlich', note: 'Zone 1' },
      { pokemonId: 147, method: 'Superangel', levels: '10', rarity: 'Selten', note: 'Zone 4 (Wasser)' },
      { pokemonId: 116, method: 'Superangel', levels: '5–15', rarity: 'Häufig', note: 'Zone 4 (Wasser)' },
      { pokemonId: 90, method: 'Superangel', levels: '10–30', rarity: 'Gelegentlich', note: 'Zone 4 (Wasser)' },
      { pokemonId: 54, method: 'Surfen', levels: '15–25', rarity: 'Häufig', note: 'Zone 4' },
    ],
  },
  {
    id: 'pokemon-mansion',
    name: 'Pokémon-Anwesen',
    region: 'Cinnabar Island',
    encounters: [
      { pokemonId: 88, method: 'Gras', levels: '28–36', rarity: 'Häufig', fireRedOnly: true },
      { pokemonId: 109, method: 'Gras', levels: '28–36', rarity: 'Häufig', leafGreenOnly: true },
      { pokemonId: 58, method: 'Gras', levels: '30–36', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 37, method: 'Gras', levels: '30–36', rarity: 'Gelegentlich', leafGreenOnly: true },
      { pokemonId: 132, method: 'Gras', levels: '28–36', rarity: 'Gelegentlich' },
      { pokemonId: 126, method: 'Gras', levels: '30–36', rarity: 'Selten', leafGreenOnly: true },
    ],
  },
  {
    id: 'power-plant',
    name: 'Kraftwerk',
    region: 'Route 10 (Norden)',
    encounters: [
      { pokemonId: 81, method: 'Gras', levels: '22–28', rarity: 'Häufig' },
      { pokemonId: 100, method: 'Gras', levels: '22–30', rarity: 'Häufig' },
      { pokemonId: 25, method: 'Gras', levels: '22–26', rarity: 'Gelegentlich' },
      { pokemonId: 26, method: 'Gras', levels: '26–30', rarity: 'Selten' },
      { pokemonId: 101, method: 'Gras', levels: '28–35', rarity: 'Gelegentlich' },
      { pokemonId: 125, method: 'Gras', levels: '30–35', rarity: 'Selten', fireRedOnly: true },
      { pokemonId: 82, method: 'Gras', levels: '28–35', rarity: 'Selten' },
    ],
  },
  {
    id: 'seafoam-islands',
    name: 'Seafoam Islands',
    region: 'Route 20',
    encounters: [
      { pokemonId: 86, method: 'Gras', levels: '28–35', rarity: 'Häufig' },
      { pokemonId: 87, method: 'Gras', levels: '35–40', rarity: 'Gelegentlich' },
      { pokemonId: 41, method: 'Gras', levels: '28–33', rarity: 'Häufig' },
      { pokemonId: 42, method: 'Gras', levels: '33–36', rarity: 'Gelegentlich' },
      { pokemonId: 79, method: 'Surfen', levels: '20–30', rarity: 'Häufig' },
      { pokemonId: 54, method: 'Surfen', levels: '20–30', rarity: 'Häufig' },
      { pokemonId: 120, method: 'Surfen', levels: '25–30', rarity: 'Gelegentlich' },
      { pokemonId: 98, method: 'Gute Angel', levels: '15–25' },
      { pokemonId: 90, method: 'Superangel', levels: '20–40' },
      { pokemonId: 144, method: 'Spezial', levels: '50', note: 'Boss-Kampf im Unterlauf' },
    ],
  },
  {
    id: 'victory-road',
    name: 'Victory Road',
    region: 'Route 23 → Pokémon Liga',
    encounters: [
      { pokemonId: 41, method: 'Gras', levels: '36–40', rarity: 'Häufig' },
      { pokemonId: 74, method: 'Gras', levels: '34–38', rarity: 'Häufig' },
      { pokemonId: 75, method: 'Gras', levels: '36–41', rarity: 'Gelegentlich' },
      { pokemonId: 67, method: 'Gras', levels: '36–41', rarity: 'Gelegentlich' },
      { pokemonId: 95, method: 'Gras', levels: '36–40', rarity: 'Gelegentlich' },
      { pokemonId: 111, method: 'Gras', levels: '38–42', rarity: 'Selten' },
    ],
  },
  {
    id: 'cerulean-cave',
    name: 'Cerulean Cave',
    region: 'Cerulean City (nach Pokémon-Liga)',
    encounters: [
      { pokemonId: 132, method: 'Gras', levels: '47–55', rarity: 'Häufig' },
      { pokemonId: 24, method: 'Gras', levels: '47–55', rarity: 'Gelegentlich', fireRedOnly: true },
      { pokemonId: 42, method: 'Gras', levels: '47–52', rarity: 'Häufig' },
      { pokemonId: 97, method: 'Gras', levels: '49–55', rarity: 'Gelegentlich' },
      { pokemonId: 64, method: 'Gras', levels: '49–55', rarity: 'Gelegentlich' },
      { pokemonId: 112, method: 'Gras', levels: '50–55', rarity: 'Gelegentlich' },
      { pokemonId: 67, method: 'Gras', levels: '49–55', rarity: 'Gelegentlich' },
      { pokemonId: 113, method: 'Gras', levels: '55', rarity: 'Selten' },
      { pokemonId: 150, method: 'Spezial', levels: '70', note: 'Boss-Kampf (einmalig)' },
    ],
  },
  {
    id: 'route22-23',
    name: 'Route 22 & 23',
    region: 'Pallet Town → Pokémon Liga',
    encounters: [
      { pokemonId: 29, method: 'Gras', levels: '3–5', rarity: 'Häufig', note: 'Route 22' },
      { pokemonId: 32, method: 'Gras', levels: '3–5', rarity: 'Häufig', note: 'Route 22' },
      { pokemonId: 56, method: 'Gras', levels: '3–5', rarity: 'Gelegentlich', fireRedOnly: true, note: 'Route 22' },
      { pokemonId: 84, method: 'Gras', levels: '19–22', rarity: 'Häufig', note: 'Route 23' },
      { pokemonId: 30, method: 'Gras', levels: '22–26', rarity: 'Häufig', note: 'Route 23 (FR)' },
      { pokemonId: 24, method: 'Gras', levels: '22–26', rarity: 'Selten', fireRedOnly: true, note: 'Route 23' },
    ],
  },
  {
    id: 'special-obtainment',
    name: 'Besondere Fundorte / Geschenke',
    encounters: [
      { pokemonId: 131, method: 'Interaktion', levels: '25', note: 'Geschenk im 7. Stock der Silph Co.' },
      { pokemonId: 133, method: 'Interaktion', levels: '25', note: 'Geschenk im Koroheim-Wohnhaus (Celadon)' },
      { pokemonId: 106, method: 'Interaktion', levels: '25', note: 'Einer von zwei: Kampfdojo, Saffron City' },
      { pokemonId: 107, method: 'Interaktion', levels: '25', note: 'Einer von zwei: Kampfdojo, Saffron City' },
      { pokemonId: 138, method: 'Spezial', levels: '5', note: 'Helix-Fossil aus Mt. Moon → Revival in Cinnabar' },
      { pokemonId: 140, method: 'Spezial', levels: '5', note: 'Panzer-Fossil aus Mt. Moon → Revival in Cinnabar' },
      { pokemonId: 142, method: 'Spezial', levels: '5', note: 'Alter Bernstein aus Silph Co. → Revival in Cinnabar' },
      { pokemonId: 143, method: 'Interaktion', levels: '30', note: 'Schläft auf Route 12 oder 16 (Poké-Flöte nötig)' },
      { pokemonId: 145, method: 'Spezial', levels: '50', note: 'Kraftwerk (Power Plant), einmaliger Kampf' },
      { pokemonId: 146, method: 'Spezial', levels: '50', note: 'Felsspitze / Mt. Ember auf den Sevii Islands' },
      { pokemonId: 83, method: 'Tausch', levels: '20', note: 'Tausch: Habitak → Porenta (Mann in Vermilion City)' },
      { pokemonId: 122, method: 'Tausch', levels: '15', note: 'Tausch: Piepi → Pantimos (Hütte nördlich Route 2)' },
      { pokemonId: 124, method: 'Tausch', levels: '15', note: 'Tausch: Quaputzi → Lappland (Cerulean City)' },
      { pokemonId: 108, method: 'Tausch', levels: '26', note: 'Tausch: Lahmus → Schlurp (östl. Fuchsia City)' },
      { pokemonId: 137, method: 'Spezial', levels: '26', note: 'Spielautomat in Koroheim (Celadon City), teuer' },
    ],
  },
];
