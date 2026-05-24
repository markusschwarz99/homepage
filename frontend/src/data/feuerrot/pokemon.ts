import type { TypeName } from './types';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface PokemonEntry {
  id: number;
  name: string;       // Deutschsprachiger Name (FireRed DE)
  nameEn: string;     // Englischer Name zur Referenz
  types: TypeName[];
  tier: Tier;
  note: string;
  obtain: string;     // Wie man das Pokémon bekommt
  tradeRequired?: boolean;    // Tausch nötig zum Entwickeln
  versionExclusive?: 'FR' | 'LG'; // FireRed oder LeafGreen exklusiv
}

// Basis-Werte: [HP, ATK, DEF, SP.ATK, SP.DEF, SPD]
export const BASE_STATS: number[][] = [
  // #1–9 Starter
  [45, 49, 49, 65, 65, 45],   // Bisasam
  [60, 62, 63, 80, 80, 60],   // Bisaknosp
  [80, 82, 83, 100, 100, 80], // Bisaflor
  [39, 52, 43, 60, 50, 65],   // Glumanda
  [58, 64, 58, 80, 65, 80],   // Glutexo
  [78, 84, 78, 109, 85, 100], // Glurak
  [44, 48, 65, 50, 64, 43],   // Schiggy
  [59, 63, 80, 65, 80, 58],   // Schillok
  [79, 83, 100, 85, 105, 78], // Turtok
  // #10–15 Käfer
  [45, 30, 35, 20, 20, 45],   // Raupy
  [50, 20, 55, 25, 25, 30],   // Safcon
  [60, 45, 50, 90, 80, 70],   // Smettbo
  [40, 35, 30, 20, 20, 50],   // Hornliu
  [45, 25, 50, 25, 25, 35],   // Kokuna
  [65, 90, 40, 45, 80, 75],   // Bibor
  // #16–20 Vögel/Ratten
  [40, 45, 40, 35, 35, 56],   // Taubsi
  [63, 60, 55, 50, 50, 71],   // Tauboga
  [83, 80, 75, 70, 70, 91],   // Tauboss
  [30, 56, 35, 25, 35, 72],   // Rattfratz
  [55, 81, 60, 50, 70, 97],   // Rattikarl
  // #21–22
  [40, 60, 30, 31, 31, 70],   // Habitak
  [65, 90, 65, 61, 61, 100],  // Ibitak
  // #23–26
  [35, 60, 44, 40, 54, 55],   // Rettan
  [60, 85, 69, 65, 79, 80],   // Arbok
  [35, 55, 30, 50, 40, 90],   // Pikachu
  [60, 90, 55, 90, 80, 110],  // Raichu
  // #27–28
  [50, 75, 85, 20, 30, 40],   // Sandmann
  [75, 100, 110, 45, 55, 65], // Sandamer
  // #29–34 Nidoran-Linien
  [55, 47, 52, 40, 40, 41],   // Nidoran♀
  [70, 62, 67, 55, 55, 56],   // Nidorina
  [90, 92, 87, 75, 85, 76],   // Nidoqueen
  [46, 57, 40, 40, 40, 50],   // Nidoran♂
  [61, 72, 57, 55, 55, 65],   // Nidorino
  [81, 102, 77, 85, 75, 85],  // Nidoking
  // #35–40
  [70, 45, 48, 60, 65, 35],   // Piepi
  [95, 70, 73, 85, 90, 60],   // Pixi
  [38, 41, 40, 50, 65, 65],   // Vulpix
  [73, 76, 75, 81, 100, 100], // Vulnona
  [115, 45, 20, 45, 25, 20],  // Pummeluff
  [140, 70, 45, 75, 50, 45],  // Knuddeluff
  // #41–42
  [40, 45, 35, 30, 40, 55],   // Zubat
  [75, 80, 70, 65, 75, 90],   // Golbat
  // #43–45
  [45, 50, 55, 75, 65, 30],   // Myrapla
  [60, 65, 70, 85, 75, 40],   // Duflor
  [75, 80, 85, 110, 90, 50],  // Blubella
  // #46–49
  [35, 70, 55, 45, 55, 25],   // Paras
  [60, 95, 80, 60, 80, 30],   // Parasek
  [60, 55, 50, 40, 55, 45],   // Bluzuk
  [70, 65, 60, 90, 75, 90],   // Omot
  // #50–51
  [10, 55, 25, 35, 45, 95],   // Digda
  [35, 100, 50, 50, 70, 120], // Digdri
  // #52–55
  [40, 45, 35, 40, 40, 90],   // Mauzi
  [65, 70, 60, 65, 65, 115],  // Snobilikat
  [50, 52, 48, 65, 50, 55],   // Enton
  [80, 82, 78, 95, 80, 85],   // Entoron
  // #56–59
  [40, 80, 35, 35, 45, 70],   // Menki
  [65, 105, 60, 60, 70, 95],  // Rasaff
  [55, 70, 45, 70, 50, 60],   // Fukano
  [90, 110, 80, 100, 80, 95], // Arkani
  // #60–62
  [40, 50, 40, 40, 40, 90],   // Quapsel
  [65, 65, 65, 50, 50, 90],   // Quaputzi
  [90, 95, 95, 70, 90, 70],   // Quappo
  // #63–65
  [25, 20, 15, 105, 55, 90],  // Abra
  [40, 35, 30, 120, 70, 105], // Kadabra
  [55, 50, 45, 135, 85, 120], // Simsala
  // #66–68
  [70, 80, 50, 35, 35, 35],   // Machollo
  [80, 100, 70, 50, 60, 45],  // Maschock
  [90, 130, 80, 65, 85, 55],  // Machomei
  // #69–71
  [50, 75, 35, 70, 30, 40],   // Knofensa
  [65, 90, 50, 85, 45, 55],   // Ultrigaria
  [80, 105, 65, 100, 60, 70], // Sarzenia
  // #72–73
  [40, 40, 35, 50, 100, 70],  // Tentacha
  [80, 70, 65, 80, 120, 100], // Tentoxa
  // #74–76
  [40, 80, 100, 30, 30, 20],  // Kleinstein
  [55, 95, 115, 45, 45, 35],  // Georok
  [80, 120, 130, 55, 65, 45], // Geowaz
  // #77–78
  [50, 85, 55, 65, 65, 90],   // Ponita
  [65, 100, 70, 80, 80, 105], // Gallopa
  // #79–80
  [90, 65, 65, 40, 40, 15],   // Flegmon
  [95, 75, 110, 100, 80, 30], // Lahmus
  // #81–82
  [25, 35, 70, 95, 55, 45],   // Magnetilo
  [50, 60, 95, 120, 70, 70],  // Magneton
  // #83
  [52, 90, 55, 58, 62, 60],   // Porenta
  // #84–85
  [35, 85, 45, 35, 35, 75],   // Doduo
  [60, 110, 70, 60, 60, 110], // Dodri
  // #86–89
  [65, 45, 55, 45, 70, 45],   // Jurob
  [90, 70, 80, 70, 95, 70],   // Dewgong
  [80, 80, 50, 40, 50, 25],   // Sleima
  [105, 105, 75, 65, 100, 50],// Sleimok
  // #90–91
  [30, 65, 100, 45, 25, 40],  // Muschas
  [50, 95, 180, 85, 45, 70],  // Austos
  // #92–94
  [30, 35, 30, 100, 35, 80],  // Gastly
  [45, 50, 45, 115, 55, 95],  // Haunter
  [60, 65, 60, 130, 75, 110], // Gengar
  // #95
  [35, 45, 160, 30, 45, 70],  // Onix
  // #96–97
  [60, 48, 45, 43, 90, 42],   // Traumato
  [85, 73, 70, 73, 115, 67],  // Hypno
  // #98–99
  [30, 105, 90, 25, 25, 50],  // Krabby
  [55, 130, 115, 50, 50, 75], // Kingler
  // #100–101
  [40, 30, 50, 55, 55, 100],  // Voltobal
  [60, 50, 70, 80, 80, 140],  // Lektrobal
  // #102–103
  [60, 40, 80, 60, 45, 40],   // Owei
  [95, 95, 85, 125, 75, 55],  // Kokowei
  // #104–105
  [50, 50, 95, 40, 50, 35],   // Tragosso
  [60, 80, 110, 50, 80, 45],  // Knogga
  // #106–107
  [50, 120, 53, 35, 110, 87], // Kicklee
  [50, 105, 79, 35, 110, 76], // Nockchan
  // #108
  [90, 55, 75, 60, 75, 30],   // Schlurp
  // #109–110
  [40, 65, 95, 60, 45, 35],   // Smogon
  [65, 90, 120, 85, 70, 60],  // Smogmog
  // #111–112
  [80, 85, 95, 30, 30, 25],   // Rihorn
  [105, 130, 120, 45, 45, 40],// Rizeros
  // #113
  [250, 5, 5, 35, 105, 50],   // Chaneira
  // #114
  [65, 55, 115, 100, 40, 60], // Tangela
  // #115
  [105, 95, 80, 40, 80, 90],  // Kangama
  // #116–117
  [30, 40, 70, 70, 25, 60],   // Seeper
  [55, 65, 95, 95, 45, 85],   // Seemon
  // #118–119
  [45, 67, 60, 35, 50, 63],   // Goldini
  [80, 92, 65, 65, 80, 68],   // Golking
  // #120–121
  [30, 45, 55, 70, 55, 85],   // Staryu
  [60, 75, 85, 100, 85, 115], // Starmie
  // #122
  [40, 45, 65, 100, 120, 90], // Pantimos
  // #123
  [70, 110, 80, 55, 80, 105], // Scyther
  // #124
  [65, 50, 35, 115, 95, 95],  // Lappland
  // #125
  [65, 83, 57, 95, 85, 105],  // Elektek
  // #126
  [65, 95, 57, 100, 85, 93],  // Magmar
  // #127
  [65, 125, 100, 55, 70, 85], // Pinsir
  // #128
  [75, 100, 95, 40, 70, 110], // Tauros
  // #129–130
  [20, 10, 55, 15, 20, 80],   // Karpador
  [95, 125, 79, 60, 100, 81], // Garados
  // #131
  [130, 85, 80, 85, 95, 60],  // Lapras
  // #132
  [48, 48, 48, 48, 48, 48],   // Ditto
  // #133–136 Evoli-Entwicklungen
  [55, 55, 50, 45, 65, 55],   // Evoli
  [130, 65, 60, 110, 95, 65], // Aquana
  [65, 65, 60, 110, 95, 130], // Blitza
  [65, 130, 60, 95, 110, 65], // Flamara
  // #137
  [65, 60, 70, 85, 75, 40],   // Porygon
  // #138–139
  [35, 40, 100, 90, 55, 35],  // Amonitas
  [70, 60, 125, 115, 70, 55], // Amoroso
  // #140–141
  [30, 80, 90, 55, 45, 55],   // Kabuto
  [60, 115, 105, 65, 70, 80], // Kabutops
  // #142
  [80, 105, 65, 60, 75, 130], // Aerodactyl
  // #143
  [160, 110, 65, 65, 110, 30],// Relaxo
  // #144–146 Vögel-Legenden
  [90, 85, 100, 95, 125, 85], // Arktos
  [90, 90, 85, 125, 90, 100], // Zapdos
  [90, 100, 90, 125, 85, 90], // Lavados
  // #147–149
  [41, 64, 45, 50, 50, 50],   // Dratini
  [61, 84, 65, 70, 70, 70],   // Dragonir
  [91, 134, 95, 100, 100, 80],// Dragoran
  // #150–151
  [106, 110, 90, 154, 90, 130],// Mewtu
  [100, 100, 100, 100, 100, 100],// Mew
];

export const POKEMON: PokemonEntry[] = [
  {
    id: 1, name: 'Bisasam', nameEn: 'Bulbasaur', types: ['Pflanze', 'Gift'], tier: 'B',
    note: 'Starter mit frühem Vorteil gegen Arene 1 & 2. Fällt im Lategame hinter Starmie & Co zurück.',
    obtain: 'Starter (Eichhorn, Pallet Town)',
  },
  {
    id: 2, name: 'Bisaknosp', nameEn: 'Ivysaur', types: ['Pflanze', 'Gift'], tier: 'B',
    note: 'Entwicklungsstufe. Decent, aber Bisaflor lohnt sich.',
    obtain: 'Entwickelt sich aus Bisasam (Lv. 16)',
  },
  {
    id: 3, name: 'Bisaflor', nameEn: 'Venusaur', types: ['Pflanze', 'Gift'], tier: 'B',
    note: 'Schlafpulver + Traumfresser-Strategie. Solider Allrounder, aber Starmie/Lapras sind stärker.',
    obtain: 'Entwickelt sich aus Bisaknosp (Lv. 32)',
  },
  {
    id: 4, name: 'Glumanda', nameEn: 'Charmander', types: ['Feuer'], tier: 'B',
    note: 'Schwacher Start (Arene 1+2 schwierig), aber Glurak ist das Warten wert.',
    obtain: 'Starter (Eichhorn, Pallet Town)',
  },
  {
    id: 5, name: 'Glutexo', nameEn: 'Charmeleon', types: ['Feuer'], tier: 'B',
    note: 'Entwicklungsstufe.',
    obtain: 'Entwickelt sich aus Glumanda (Lv. 16)',
  },
  {
    id: 6, name: 'Glurak', nameEn: 'Charizard', types: ['Feuer', 'Flug'], tier: 'A',
    note: 'Starker Feuer/Flug-Angreifer. Großartig im Lategame, schwächelt nur gegen Wassergyms.',
    obtain: 'Entwickelt sich aus Glutexo (Lv. 36)',
  },
  {
    id: 7, name: 'Schiggy', nameEn: 'Squirtle', types: ['Wasser'], tier: 'A',
    note: 'Einsteigerfreundlichster Starter. Turtok ist sehr robust.',
    obtain: 'Starter (Eichhorn, Pallet Town)',
  },
  {
    id: 8, name: 'Schillok', nameEn: 'Wartortle', types: ['Wasser'], tier: 'A',
    note: 'Entwicklungsstufe.',
    obtain: 'Entwickelt sich aus Schiggy (Lv. 16)',
  },
  {
    id: 9, name: 'Turtok', nameEn: 'Blastoise', types: ['Wasser'], tier: 'A',
    note: 'Bulkiger Wasserangreifer mit Surfer + Eisstrahl. Zuverlässiger Begleiter fürs Endgame.',
    obtain: 'Entwickelt sich aus Schillok (Lv. 36)',
  },
  {
    id: 10, name: 'Raupy', nameEn: 'Caterpie', types: ['Käfer'], tier: 'D',
    note: 'Nur früh nützlich für Smettbo. Fällt komplett ab.',
    obtain: 'Route 2, Viridian Forest (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 11, name: 'Safcon', nameEn: 'Metapod', types: ['Käfer'], tier: 'D',
    note: 'Nutzlos im Kampf. Nur Übergang zu Smettbo.',
    obtain: 'Entwickelt sich aus Raupy (Lv. 7) oder Route 2 (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 12, name: 'Smettbo', nameEn: 'Butterfree', types: ['Käfer', 'Flug'], tier: 'C',
    note: 'Schlafpulver ist früh sehr nützlich zum Fangen. Fällt aber schnell ab.',
    obtain: 'Entwickelt sich aus Safcon (Lv. 10)',
  },
  {
    id: 13, name: 'Hornliu', nameEn: 'Weedle', types: ['Käfer', 'Gift'], tier: 'D',
    note: 'LeafGreen-exklusiv. Frühes Spiel, dann wertlos.',
    obtain: 'Route 2, Viridian Forest (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 14, name: 'Kokuna', nameEn: 'Kakuna', types: ['Käfer', 'Gift'], tier: 'D',
    note: 'Nutzlos im Kampf. Übergang zu Bibor.',
    obtain: 'Entwickelt sich aus Hornliu (Lv. 7) oder Route 2 (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 15, name: 'Bibor', nameEn: 'Beedrill', types: ['Käfer', 'Gift'], tier: 'C',
    note: 'LG-exklusiv. Hoher Angriff (Stachler), aber Käfer/Gift ist lategame schwach.',
    obtain: 'Entwickelt sich aus Kokuna (Lv. 10)',
    versionExclusive: 'LG',
  },
  {
    id: 16, name: 'Taubsi', nameEn: 'Pidgey', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Häufig, aber mittelmäßig. Tauboss ist ein solider Flieger, doch Dodri ist besser.',
    obtain: 'Route 1, 2, 3, 5, 6, 7, 8, 12–15',
  },
  {
    id: 17, name: 'Tauboga', nameEn: 'Pidgeotto', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Entwicklungsstufe.',
    obtain: 'Entwickelt sich aus Taubsi (Lv. 18) oder Route 15',
  },
  {
    id: 18, name: 'Tauboss', nameEn: 'Pidgeot', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Akzeptabler Flieger. Wird von Dodri in Angriff/Speed und von Arkani als Feuertyp übertroffen.',
    obtain: 'Entwickelt sich aus Tauboga (Lv. 36)',
  },
  {
    id: 19, name: 'Rattfratz', nameEn: 'Rattata', types: ['Normal'], tier: 'D',
    note: 'Früher Begleiter, aber nutzlos im Endgame.',
    obtain: 'Route 1, 2, 3, 4, 9, 10, 16–18',
  },
  {
    id: 20, name: 'Rattikarl', nameEn: 'Raticate', types: ['Normal'], tier: 'D',
    note: 'Hohe Initiative, aber Stats für das Lategame viel zu niedrig.',
    obtain: 'Entwickelt sich aus Rattfratz (Lv. 20)',
  },
  {
    id: 21, name: 'Habitak', nameEn: 'Spearow', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Früh verfügbar, als Ibitak decent. Kann gegen Tauros/Porenta getauscht werden.',
    obtain: 'Route 3, 4, 9, 10, 11, 16–18, 22, 23',
  },
  {
    id: 22, name: 'Ibitak', nameEn: 'Fearow', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Solider Angreifer und Flieger, aber kein Star im Lategame.',
    obtain: 'Entwickelt sich aus Habitak (Lv. 20) oder Route 23',
  },
  {
    id: 23, name: 'Rettan', nameEn: 'Ekans', types: ['Gift'], tier: 'C',
    note: 'FR-exklusiv. Als Arbok passabler Gift-Angreifer, aber kein Endgame-Favorit.',
    obtain: 'Route 4, 8, 9, 10, 11 (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 24, name: 'Arbok', nameEn: 'Arbok', types: ['Gift'], tier: 'C',
    note: 'FR-exklusiv. Decent, aber Gift-Typ hat im Lategame wenig Deckung.',
    obtain: 'Entwickelt sich aus Rettan (Lv. 22) oder Victory Road / Cerulean Cave (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 25, name: 'Pikachu', nameEn: 'Pikachu', types: ['Elektro'], tier: 'C',
    note: 'Deutlich schwächer als Raichu. Entwickeln mit Donnerstein. Blitza übertrifft beide.',
    obtain: 'Viridian Forest, Power Plant',
  },
  {
    id: 26, name: 'Raichu', nameEn: 'Raichu', types: ['Elektro'], tier: 'B',
    note: 'Gute Initiative und Spezial-Angriff. Wird von Blitza in der Initiative übertroffen.',
    obtain: 'Pikachu mit Donnerstein entwickeln',
  },
  {
    id: 27, name: 'Sandmann', nameEn: 'Sandshrew', types: ['Boden'], tier: 'C',
    note: 'LG-exklusiv. Decent physischer Bodenangreifer, wird aber von Rizeros/Nidoking übertroffen.',
    obtain: 'Route 4, 8, 9, 10, 11 (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 28, name: 'Sandamer', nameEn: 'Sandslash', types: ['Boden'], tier: 'C',
    note: 'LG-exklusiv. Hoher Angriff und Verteidigung, aber Rizeros ist besser.',
    obtain: 'Entwickelt sich aus Sandmann (Lv. 22)',
    versionExclusive: 'LG',
  },
  {
    id: 29, name: 'Nidoran♀', nameEn: 'Nidoran♀', types: ['Gift'], tier: 'C',
    note: 'Mit Mondstein sehr früh zu Nidoqueen entwickeln.',
    obtain: 'Route 22, 23',
  },
  {
    id: 30, name: 'Nidorina', nameEn: 'Nidorina', types: ['Gift'], tier: 'C',
    note: 'Übergang zur S-Tier-Nidoqueen.',
    obtain: 'Entwickelt sich aus Nidoran♀ (Lv. 16) oder Route 23',
  },
  {
    id: 31, name: 'Nidoqueen', nameEn: 'Nidoqueen', types: ['Gift', 'Boden'], tier: 'S',
    note: 'Mondstein früh → Erdbeben + Eisstrahl + Donner via TM. Einzigartige Typendeckung, unbedingt mitnehmen.',
    obtain: 'Nidorina mit Mondstein entwickeln',
  },
  {
    id: 32, name: 'Nidoran♂', nameEn: 'Nidoran♂', types: ['Gift'], tier: 'C',
    note: 'Mit Mondstein sehr früh zu Nidoking entwickeln.',
    obtain: 'Route 22, 23',
  },
  {
    id: 33, name: 'Nidorino', nameEn: 'Nidorino', types: ['Gift'], tier: 'C',
    note: 'Übergang zum S-Tier-Nidoking.',
    obtain: 'Entwickelt sich aus Nidoran♂ (Lv. 16) oder Route 23',
  },
  {
    id: 34, name: 'Nidoking', nameEn: 'Nidoking', types: ['Gift', 'Boden'], tier: 'S',
    note: 'Mondstein früh → Erdbeben + Eisstrahl + Donner. Komplette Typendeckung. Pflichtmitglied.',
    obtain: 'Nidorino mit Mondstein entwickeln',
  },
  {
    id: 35, name: 'Piepi', nameEn: 'Clefairy', types: ['Normal'], tier: 'C',
    note: 'Mondstein für Pixi aufheben. Pixi ist ein guter Allrounder.',
    obtain: 'Mt. Moon',
  },
  {
    id: 36, name: 'Pixi', nameEn: 'Clefable', types: ['Normal'], tier: 'B',
    note: 'Lernt fast jeden TM. Vielseitig, aber keine herausragenden Angriffswerte.',
    obtain: 'Piepi mit Mondstein entwickeln',
  },
  {
    id: 37, name: 'Vulpix', nameEn: 'Vulpix', types: ['Feuer'], tier: 'C',
    note: 'LG-exklusiv. Ninetales decent, aber Arkani (FR) ist weit besser.',
    obtain: 'Route 7, 8, Pokémon-Anwesen (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 38, name: 'Vulnona', nameEn: 'Ninetales', types: ['Feuer'], tier: 'C',
    note: 'LG-exklusiv. Decent Feuer mit guter Initiative, aber überholt.',
    obtain: 'Vulpix mit Feuerstein entwickeln',
    versionExclusive: 'LG',
  },
  {
    id: 39, name: 'Pummeluff', nameEn: 'Jigglypuff', types: ['Normal'], tier: 'C',
    note: 'Riesiges HP, aber alle anderen Stats sehr niedrig. Schlieflied ist situativ nützlich.',
    obtain: 'Route 3, 5, 6, 7, 8',
  },
  {
    id: 40, name: 'Knuddeluff', nameEn: 'Wigglytuff', types: ['Normal'], tier: 'C',
    note: 'Mondstein. Massives HP, aber schwache Kampfwerte für das Endgame.',
    obtain: 'Pummeluff mit Mondstein entwickeln',
  },
  {
    id: 41, name: 'Zubat', nameEn: 'Zubat', types: ['Gift', 'Flug'], tier: 'D',
    note: 'In Höhlen allgegenwärtig und nervig. Golbat ist passabel, aber kein Endgame-Pokémon.',
    obtain: 'Mt. Moon, Rock Tunnel, Silph Co., Seafoam Islands, Victory Road',
  },
  {
    id: 42, name: 'Golbat', nameEn: 'Golbat', types: ['Gift', 'Flug'], tier: 'C',
    note: 'Decent Basiswerte. Keine Entwicklung zu Crobat ohne Freundschaft.',
    obtain: 'Entwickelt sich aus Zubat (Lv. 22) oder Victory Road',
  },
  {
    id: 43, name: 'Myrapla', nameEn: 'Oddish', types: ['Pflanze', 'Gift'], tier: 'C',
    note: 'FR-exklusiv. Auf dem Weg zu Blubella decent, aber Pflanze/Gift ist lategame schwach.',
    obtain: 'Route 5, 6, 7, 8, 24, 25 (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 44, name: 'Duflor', nameEn: 'Gloom', types: ['Pflanze', 'Gift'], tier: 'C',
    note: 'Übergang zu Blubella.',
    obtain: 'Entwickelt sich aus Myrapla (Lv. 21)',
    versionExclusive: 'FR',
  },
  {
    id: 45, name: 'Blubella', nameEn: 'Vileplume', types: ['Pflanze', 'Gift'], tier: 'B',
    note: 'FR-exklusiv. Starker Spezialangreifer. Stärkstes Pflanze/Gift-Pokémon in FR.',
    obtain: 'Duflor mit Blattstein entwickeln',
    versionExclusive: 'FR',
  },
  {
    id: 46, name: 'Paras', nameEn: 'Paras', types: ['Käfer', 'Pflanze'], tier: 'D',
    note: 'Doppelt schwach gegen Flug und Feuer. Fällt früh ab.',
    obtain: 'Mt. Moon, Rock Tunnel',
  },
  {
    id: 47, name: 'Parasek', nameEn: 'Parasect', types: ['Käfer', 'Pflanze'], tier: 'D',
    note: '4-fach schwach gegen Feuer und Flug. Keine gute Wahl fürs Lategame.',
    obtain: 'Entwickelt sich aus Paras (Lv. 24)',
  },
  {
    id: 48, name: 'Bluzuk', nameEn: 'Venonat', types: ['Käfer', 'Gift'], tier: 'D',
    note: 'Schwache Stats, fällt früh weg.',
    obtain: 'Route 12, 13, 14, 15, 24, 25',
  },
  {
    id: 49, name: 'Omot', nameEn: 'Venomoth', types: ['Käfer', 'Gift'], tier: 'C',
    note: 'Schlafpulver + decent Spezialangriff, aber überholt.',
    obtain: 'Entwickelt sich aus Bluzuk (Lv. 31)',
  },
  {
    id: 50, name: 'Digda', nameEn: 'Diglett', types: ['Boden'], tier: 'D',
    note: 'Extrem niedrige HP. Fällt bei jedem Schaden um.',
    obtain: 'Diglett\'s Cave',
  },
  {
    id: 51, name: 'Digdri', nameEn: 'Dugtrio', types: ['Boden'], tier: 'C',
    note: 'Schnellstes Boden-Pokémon. Arena-Trap nützlich, aber Glaskanone.',
    obtain: 'Entwickelt sich aus Digda (Lv. 26) oder Diglett\'s Cave (selten)',
  },
  {
    id: 52, name: 'Mauzi', nameEn: 'Meowth', types: ['Normal'], tier: 'D',
    note: 'LG-exklusiv. Zu schwach fürs Lategame.',
    obtain: 'Route 5, 6, 7, 8 (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 53, name: 'Snobilikat', nameEn: 'Persian', types: ['Normal'], tier: 'C',
    note: 'LG-exklusiv. Schnell, aber Stats reichen nicht fürs Endgame.',
    obtain: 'Entwickelt sich aus Mauzi (Lv. 28)',
    versionExclusive: 'LG',
  },
  {
    id: 54, name: 'Enton', nameEn: 'Psyduck', types: ['Wasser'], tier: 'C',
    note: 'Entoron ist ein brauchbarer Wasser-Angreifer, aber Starmie übertrifft ihn deutlich.',
    obtain: 'Route 25, Seafoam Islands (Surfen)',
  },
  {
    id: 55, name: 'Entoron', nameEn: 'Golduck', types: ['Wasser'], tier: 'C',
    note: 'Decent, aber kein Psycho-Bonus. Surfer + Eisstrahl reicht fürs Endgame.',
    obtain: 'Entwickelt sich aus Enton (Lv. 33)',
  },
  {
    id: 56, name: 'Menki', nameEn: 'Mankey', types: ['Kampf'], tier: 'C',
    note: 'FR-exklusiv. Früh verfügbar, als Rasaff solid.',
    obtain: 'Route 22, 23 (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 57, name: 'Rasaff', nameEn: 'Primeape', types: ['Kampf'], tier: 'B',
    note: 'FR-exklusiv. Hoher Angriff und decent Initiative. Guter Kampf-Typ.',
    obtain: 'Entwickelt sich aus Menki (Lv. 28)',
    versionExclusive: 'FR',
  },
  {
    id: 58, name: 'Fukano', nameEn: 'Growlithe', types: ['Feuer'], tier: 'C',
    note: 'FR-exklusiv. Arkani ist ausgezeichnet — Feuerstein nicht vergessen.',
    obtain: 'Route 7, 8, Pokémon-Anwesen (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 59, name: 'Arkani', nameEn: 'Arcanine', types: ['Feuer'], tier: 'A',
    note: 'FR-exklusiv. Bester Feuer-Typ in FR. Hervorragende Stats in allen Bereichen.',
    obtain: 'Fukano mit Feuerstein entwickeln',
    versionExclusive: 'FR',
  },
  {
    id: 60, name: 'Quapsel', nameEn: 'Poliwag', types: ['Wasser'], tier: 'C',
    note: 'Früh über Angeln oder Surfen erreichbar.',
    obtain: 'Route 22–25 (Surfen/Angeln), Vermilion (Angeln)',
  },
  {
    id: 61, name: 'Quaputzi', nameEn: 'Poliwhirl', types: ['Wasser'], tier: 'C',
    note: 'Mit Lappland tauschen (Cerulean City) oder mit Wasserstein zu Quappo entwickeln.',
    obtain: 'Entwickelt sich aus Quapsel (Lv. 25)',
  },
  {
    id: 62, name: 'Quappo', nameEn: 'Poliwrath', types: ['Wasser', 'Kampf'], tier: 'B',
    note: 'Wasser/Kampf ist eine starke Kombination. Gute Bulk + Erdbeben-Kompatibilität.',
    obtain: 'Quaputzi mit Wasserstein entwickeln',
  },
  {
    id: 63, name: 'Abra', nameEn: 'Abra', types: ['Psycho'], tier: 'C',
    note: 'Teleportiert bei jeder Begegnung. Braucht Pokéball-Trick. Entwickeln zu Kadabra lohnt.',
    obtain: 'Route 24, 25',
  },
  {
    id: 64, name: 'Kadabra', nameEn: 'Kadabra', types: ['Psycho'], tier: 'B',
    note: 'Ohne Tausch die stärkste erreichbare Psycho-Option nach Starmie. Massiver Spezialangriff.',
    obtain: 'Entwickelt sich aus Abra (Lv. 16)',
  },
  {
    id: 65, name: 'Simsala', nameEn: 'Alakazam', types: ['Psycho'], tier: 'A',
    note: 'Tausch erforderlich. Monster-Spezialangriff (135) und Spitzeninitiative (120). Glaskanone.',
    obtain: 'Kadabra im Tausch entwickeln',
    tradeRequired: true,
  },
  {
    id: 66, name: 'Machollo', nameEn: 'Machop', types: ['Kampf'], tier: 'C',
    note: 'Mt. Moon oder als Tausch-Geschenk in Vermilion. Wird zu Machomei.',
    obtain: 'Mt. Moon, Rock Tunnel, Tausch in Vermilion (für Exeggutor)',
  },
  {
    id: 67, name: 'Maschock', nameEn: 'Machoke', types: ['Kampf'], tier: 'C',
    note: 'Entwicklungsstufe. Wird zu Machomei via Tausch.',
    obtain: 'Entwickelt sich aus Machollo (Lv. 28) oder Victory Road',
  },
  {
    id: 68, name: 'Machomei', nameEn: 'Machamp', types: ['Kampf'], tier: 'B',
    note: 'Tausch erforderlich. Massiver Angriff (130). Initiativeproblem, aber vernichtend.',
    obtain: 'Maschock im Tausch entwickeln',
    tradeRequired: true,
  },
  {
    id: 69, name: 'Knofensa', nameEn: 'Bellsprout', types: ['Pflanze', 'Gift'], tier: 'C',
    note: 'LG-exklusiv. Tausch für Abra in Cerulean City möglich. Decent als Sarzenia.',
    obtain: 'Route 5, 6, 7, 12 (LG) oder Tausch für Abra in Cerulean',
    versionExclusive: 'LG',
  },
  {
    id: 70, name: 'Ultrigaria', nameEn: 'Weepinbell', types: ['Pflanze', 'Gift'], tier: 'C',
    note: 'Übergang zu Sarzenia.',
    obtain: 'Entwickelt sich aus Knofensa (Lv. 21)',
    versionExclusive: 'LG',
  },
  {
    id: 71, name: 'Sarzenia', nameEn: 'Victreebel', types: ['Pflanze', 'Gift'], tier: 'B',
    note: 'LG-exklusiv. Sehr hoher Angriff + decent Spezialangriff. Stark als Angreifer.',
    obtain: 'Ultrigaria mit Blattstein entwickeln',
    versionExclusive: 'LG',
  },
  {
    id: 72, name: 'Tentacha', nameEn: 'Tentacool', types: ['Wasser', 'Gift'], tier: 'C',
    note: 'Überall auf Wasser anzutreffen. Nervt beim Surfen, ist aber als Tentoxa decent.',
    obtain: 'Beim Surfen auf allen Wasserrouten',
  },
  {
    id: 73, name: 'Tentoxa', nameEn: 'Tentacruel', types: ['Wasser', 'Gift'], tier: 'B',
    note: 'Hohe Spez.-Verteidigung und decent Initiative. Früherer Einsatz als viele Wassertypen.',
    obtain: 'Entwickelt sich aus Tentacha (Lv. 30)',
  },
  {
    id: 74, name: 'Kleinstein', nameEn: 'Geodude', types: ['Gestein', 'Boden'], tier: 'C',
    note: 'In Höhlen häufig. Wird zu Geowaz mit Tausch — Erdbeben via TM nützlich.',
    obtain: 'Mt. Moon, Rock Tunnel, Victory Road',
  },
  {
    id: 75, name: 'Georok', nameEn: 'Graveler', types: ['Gestein', 'Boden'], tier: 'C',
    note: 'Entwicklungsstufe. Tausch für Geowaz.',
    obtain: 'Entwickelt sich aus Kleinstein (Lv. 25) oder Victory Road',
  },
  {
    id: 76, name: 'Geowaz', nameEn: 'Golem', types: ['Gestein', 'Boden'], tier: 'B',
    note: 'Tausch erforderlich. Massiver Angriff und Verteidigung. Erdbeben ist Top.',
    obtain: 'Georok im Tausch entwickeln',
    tradeRequired: true,
  },
  {
    id: 77, name: 'Ponita', nameEn: 'Ponyta', types: ['Feuer'], tier: 'C',
    note: 'Route 17, aber Arkani (FR) ist deutlich stärker. Nur als Notlösung.',
    obtain: 'Route 17',
  },
  {
    id: 78, name: 'Gallopa', nameEn: 'Rapidash', types: ['Feuer'], tier: 'C',
    note: 'Schnell und decent. Arkani überholt es in allen Bereichen.',
    obtain: 'Entwickelt sich aus Ponita (Lv. 40)',
  },
  {
    id: 79, name: 'Flegmon', nameEn: 'Slowpoke', types: ['Wasser', 'Psycho'], tier: 'C',
    note: 'Sehr früh verfügbar (Route 25). Als Lahmus eine der besten frühen Psycho-Optionen.',
    obtain: 'Route 25, Slowpoke-Brunnen, Seafoam Islands (Surfen)',
  },
  {
    id: 80, name: 'Lahmus', nameEn: 'Slowbro', types: ['Wasser', 'Psycho'], tier: 'A',
    note: 'Hohe Verteidigung (110) und starker Spezialangriff. Außerordentlich zäh. Hervorragend fürs Endgame.',
    obtain: 'Entwickelt sich aus Flegmon (Lv. 37)',
  },
  {
    id: 81, name: 'Magnetilo', nameEn: 'Magnemite', types: ['Elektro', 'Stahl'], tier: 'C',
    note: 'Route 10 und Power Plant. Decent Spezialangriff als Magneton.',
    obtain: 'Route 10, Power Plant',
  },
  {
    id: 82, name: 'Magneton', nameEn: 'Magneton', types: ['Elektro', 'Stahl'], tier: 'C',
    note: 'Guter Spezialangriff, aber viele Schwächen. Elektek übertrifft ihn.',
    obtain: 'Entwickelt sich aus Magnetilo (Lv. 30) oder Power Plant',
  },
  {
    id: 83, name: 'Porenta', nameEn: 'Farfetch\'d', types: ['Normal', 'Flug'], tier: 'D',
    note: 'Tausch (Habitak in Vermilion). Decent Angriff, aber kein Grund ihn mitzunehmen.',
    obtain: 'Tausch: Habitak gegen Porenta in Vermilion City',
  },
  {
    id: 84, name: 'Doduo', nameEn: 'Doduo', types: ['Normal', 'Flug'], tier: 'C',
    note: 'Entwickeln zu Dodri: sehr schnell mit hohem Angriff.',
    obtain: 'Route 16, 17, 18, 22 (FR)',
  },
  {
    id: 85, name: 'Dodri', nameEn: 'Dodrio', types: ['Normal', 'Flug'], tier: 'B',
    note: 'Schnellster Normal/Flug-Angreifer. Bohrschnabel + Erdbeben ist eine starke Kombination.',
    obtain: 'Entwickelt sich aus Doduo (Lv. 31)',
  },
  {
    id: 86, name: 'Jurob', nameEn: 'Seel', types: ['Wasser'], tier: 'C',
    note: 'Seafoam Islands. Entwickelt sich zu Dewgong: decent Wasser/Eis.',
    obtain: 'Seafoam Islands',
  },
  {
    id: 87, name: 'Dewgong', nameEn: 'Dewgong', types: ['Wasser', 'Eis'], tier: 'B',
    note: 'Bulk + Surfer + Eisstrahl + Donner via TM. Solider Allrounder fürs Endgame.',
    obtain: 'Entwickelt sich aus Jurob (Lv. 34) oder Seafoam Islands',
  },
  {
    id: 88, name: 'Sleima', nameEn: 'Grimer', types: ['Gift'], tier: 'D',
    note: 'FR-exklusiv im Pokémon-Anwesen. Sleimok ist decent, aber Gift-Typ ist lategame schwach.',
    obtain: 'Pokémon-Anwesen (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 89, name: 'Sleimok', nameEn: 'Muk', types: ['Gift'], tier: 'C',
    note: 'Massives HP und Angriff. Gift-Typ hat aber wenig nützliche Deckung.',
    obtain: 'Entwickelt sich aus Sleima (Lv. 38)',
    versionExclusive: 'FR',
  },
  {
    id: 90, name: 'Muschas', nameEn: 'Shellder', types: ['Wasser'], tier: 'C',
    note: 'Angeln (Superangel). Als Austos astronomische Verteidigung, aber schlechte Spez.-Verteidigung.',
    obtain: 'Cinnabar, Seafoam Islands, Fuchsia (Angeln)',
  },
  {
    id: 91, name: 'Austos', nameEn: 'Cloyster', types: ['Wasser', 'Eis'], tier: 'C',
    note: 'Rekordverdächtige physische Verteidigung (180). Spez.-Verteidigung katastrophal niedrig.',
    obtain: 'Muschas mit Wasserstein entwickeln',
  },
  {
    id: 92, name: 'Gastly', nameEn: 'Gastly', types: ['Geist', 'Gift'], tier: 'C',
    note: 'Pokémon-Turm. Als Gengar enormer Spezialangriff — Tausch nötig.',
    obtain: 'Pokémon-Turm (Lavender Town)',
  },
  {
    id: 93, name: 'Haunter', nameEn: 'Haunter', types: ['Geist', 'Gift'], tier: 'B',
    note: 'Guter Spezialangriff ohne Tausch. Für Gengar muss getauscht werden.',
    obtain: 'Entwickelt sich aus Gastly (Lv. 25)',
  },
  {
    id: 94, name: 'Gengar', nameEn: 'Gengar', types: ['Geist', 'Gift'], tier: 'B',
    note: 'Tausch erforderlich. Massiver Spezialangriff (130) und hohe Initiative. Geist-Typ für Psycho-Gyms top.',
    obtain: 'Haunter im Tausch entwickeln',
    tradeRequired: true,
  },
  {
    id: 95, name: 'Onix', nameEn: 'Onix', types: ['Gestein', 'Boden'], tier: 'D',
    note: 'Rekordverdächtige Verteidigung, aber Angriff und HP sind katastrophal.',
    obtain: 'Rock Tunnel, Victory Road, Tausch',
  },
  {
    id: 96, name: 'Traumato', nameEn: 'Drowzee', types: ['Psycho'], tier: 'C',
    note: 'Route 11. Als Hypno decent mit guter Spez.-Verteidigung.',
    obtain: 'Route 11',
  },
  {
    id: 97, name: 'Hypno', nameEn: 'Hypno', types: ['Psycho'], tier: 'B',
    note: 'Früh verfügbar (Route 11). Solid Spez.-Verteidigung + decent Psycho-Angriff.',
    obtain: 'Entwickelt sich aus Traumato (Lv. 26) oder Cerulean Cave',
  },
  {
    id: 98, name: 'Krabby', nameEn: 'Krabby', types: ['Wasser'], tier: 'C',
    note: 'Angeln. Als Kingler sehr hoher Angriff, aber shallow Movepool.',
    obtain: 'Route 25, Vermilion (Angeln)',
  },
  {
    id: 99, name: 'Kingler', nameEn: 'Kingler', types: ['Wasser'], tier: 'C',
    note: 'Höchster Angriffswert unter Wasser-Typen, aber kaum nützliche Attacken im Lategame.',
    obtain: 'Entwickelt sich aus Krabby (Lv. 28)',
  },
  {
    id: 100, name: 'Voltobal', nameEn: 'Voltorb', types: ['Elektro'], tier: 'D',
    note: 'Route 10 und Power Plant. Selbstzerstörer-Strategie, aber zu schwach.',
    obtain: 'Route 10, Power Plant',
  },
  {
    id: 101, name: 'Lektrobal', nameEn: 'Electrode', types: ['Elektro'], tier: 'C',
    note: 'Schnellstes Elektro-Pokémon (Ini 140). Glaskanone mit wenig HP.',
    obtain: 'Entwickelt sich aus Voltobal (Lv. 30) oder Power Plant',
  },
  {
    id: 102, name: 'Owei', nameEn: 'Exeggcute', types: ['Pflanze', 'Psycho'], tier: 'C',
    note: 'Safari Zone. Mit Blattstein zu Kokowei — starker Spezialangreifer.',
    obtain: 'Safari Zone',
  },
  {
    id: 103, name: 'Kokowei', nameEn: 'Exeggutor', types: ['Pflanze', 'Psycho'], tier: 'B',
    note: 'Pflanze/Psycho mit sehr hohem Spezialangriff (125). Solid für das Lategame.',
    obtain: 'Owei mit Blattstein entwickeln',
  },
  {
    id: 104, name: 'Tragosso', nameEn: 'Cubone', types: ['Boden'], tier: 'C',
    note: 'Pokémon-Turm und Safari Zone. Als Knogga decent mit Dickknochen-Item.',
    obtain: 'Pokémon-Turm (Lavender Town), Safari Zone',
  },
  {
    id: 105, name: 'Knogga', nameEn: 'Marowak', types: ['Boden'], tier: 'C',
    note: 'Mit Rindknochen-Heldenmut decent. Überholt aber von Rizeros und Nidoking.',
    obtain: 'Entwickelt sich aus Tragosso (Lv. 28)',
  },
  {
    id: 106, name: 'Kicklee', nameEn: 'Hitmonlee', types: ['Kampf'], tier: 'B',
    note: 'Geschenk in Saffron (Kampfdojo). Sehr hoher Angriff (120). Rollkick + Erdbeben ist stark.',
    obtain: 'Geschenk im Kampfdojo, Saffron City (nach Silph Co.)',
  },
  {
    id: 107, name: 'Nockchan', nameEn: 'Hitmonchan', types: ['Kampf'], tier: 'B',
    note: 'Geschenk im Kampfdojo. Gute Elementar-Attacken via TM (Feuer-, Eis-, Donnerschlag).',
    obtain: 'Geschenk im Kampfdojo, Saffron City (nach Silph Co.)',
  },
  {
    id: 108, name: 'Schlurp', nameEn: 'Lickitung', types: ['Normal'], tier: 'D',
    note: 'Tausch (Lahmus gegen Schlurp). Keine Entwicklung in FireRed. Schlechte Stats.',
    obtain: 'Tausch: Lahmus gegen Schlurp im Haus östlich der Safari Zone',
  },
  {
    id: 109, name: 'Smogon', nameEn: 'Koffing', types: ['Gift'], tier: 'C',
    note: 'LG-exklusiv im Pokémon-Anwesen. Gift-Typ ist lategame schwach.',
    obtain: 'Pokémon-Anwesen (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 110, name: 'Smogmog', nameEn: 'Weezing', types: ['Gift'], tier: 'C',
    note: 'LG-exklusiv. Decent Verteidigung, aber überholt.',
    obtain: 'Entwickelt sich aus Smogon (Lv. 35)',
    versionExclusive: 'LG',
  },
  {
    id: 111, name: 'Rihorn', nameEn: 'Rhyhorn', types: ['Boden', 'Gestein'], tier: 'C',
    note: 'Safari Zone und Victory Road. Als Rizeros ein Top-Angreifer.',
    obtain: 'Safari Zone, Victory Road',
  },
  {
    id: 112, name: 'Rizeros', nameEn: 'Rhydon', types: ['Boden', 'Gestein'], tier: 'A',
    note: 'Massiver Angriff (130) und Verteidigung (120). Erdbeben ist vernichtend. Top-Tier physischer Angreifer.',
    obtain: 'Entwickelt sich aus Rihorn (Lv. 42) oder Cerulean Cave',
  },
  {
    id: 113, name: 'Chaneira', nameEn: 'Chansey', types: ['Normal'], tier: 'D',
    note: 'Nur für Grinding (viel Erfahrung). Im Kampf nutzlos durch minimalen Angriff.',
    obtain: 'Safari Zone, Pokémon-Turm (selten), Cerulean Cave (selten)',
  },
  {
    id: 114, name: 'Tangela', nameEn: 'Tangela', types: ['Pflanze'], tier: 'C',
    note: 'Route 21. Decent Spezialangriff und hohe Verteidigung, aber Pflanze allein ist begrenzt.',
    obtain: 'Route 21',
  },
  {
    id: 115, name: 'Kangama', nameEn: 'Kangaskhan', types: ['Normal'], tier: 'B',
    note: 'Safari Zone. Ausgezeichnete Allround-Stats. Gutes HP (105), Angriff (95) und Initiative (90).',
    obtain: 'Safari Zone',
  },
  {
    id: 116, name: 'Seeper', nameEn: 'Horsea', types: ['Wasser'], tier: 'C',
    note: 'Angeln (Superangel). Als Seemon decent, aber keine Endentwicklung ohne Tausch.',
    obtain: 'Seafoam Islands, Route 19–22 (Angeln)',
  },
  {
    id: 117, name: 'Seemon', nameEn: 'Seadra', types: ['Wasser'], tier: 'C',
    note: 'Keine Entwicklung zu Kingdra in FireRed. Gut fürs Lategame, aber Starmie ist besser.',
    obtain: 'Entwickelt sich aus Seeper (Lv. 32)',
  },
  {
    id: 118, name: 'Goldini', nameEn: 'Goldeen', types: ['Wasser'], tier: 'D',
    note: 'Schwache Stats. Golking ist passabler, aber deutlich überholt.',
    obtain: 'Gewässer (Angeln)',
  },
  {
    id: 119, name: 'Golking', nameEn: 'Seaking', types: ['Wasser'], tier: 'C',
    note: 'Decent Initiative und Angriff, aber Starmie übertrifft es deutlich.',
    obtain: 'Entwickelt sich aus Goldini (Lv. 33)',
  },
  {
    id: 120, name: 'Staryu', nameEn: 'Staryu', types: ['Wasser'], tier: 'B',
    note: 'Seafoam Islands oder Vermilion/Fuchsia (Superangel). Mit Wasserstein zu Starmie.',
    obtain: 'Seafoam Islands, Cerulean / Fuchsia / Vermilion (Angeln)',
  },
  {
    id: 121, name: 'Starmie', nameEn: 'Starmie', types: ['Wasser', 'Psycho'], tier: 'S',
    note: 'Beste Initiative unter Wasser-Typen (115). Lernt fast jeden TM. Surfer + Eisstrahl + Psystrahl + Donner. Unverzichtbar.',
    obtain: 'Staryu mit Wasserstein entwickeln',
  },
  {
    id: 122, name: 'Pantimos', nameEn: 'Mr. Mime', types: ['Psycho'], tier: 'C',
    note: 'Tausch (Piepi in der Route-2-Hütte). Decent Spez.-Werte, aber Lahmus/Hypno sind besser.',
    obtain: 'Tausch: Piepi gegen Pantimos in der Route-2-Hütte',
  },
  {
    id: 123, name: 'Scyther', nameEn: 'Scyther', types: ['Käfer', 'Flug'], tier: 'B',
    note: 'FR-exklusiv. Safari Zone (Zone 1). Sehr hoher Angriff (110) und decent Initiative (105).',
    obtain: 'Safari Zone (Zone 1, FR)',
    versionExclusive: 'FR',
  },
  {
    id: 124, name: 'Lappland', nameEn: 'Jynx', types: ['Eis', 'Psycho'], tier: 'C',
    note: 'Tausch (Quaputzi in Cerulean). Eis/Psycho mit decent Spezialangriff.',
    obtain: 'Tausch: Quaputzi gegen Lappland in Cerulean City',
  },
  {
    id: 125, name: 'Elektek', nameEn: 'Electabuzz', types: ['Elektro'], tier: 'A',
    note: 'FR-exklusiv. Bester Elektro-Typ im Spiel. Hoher Spezialangriff (95) + Spitzeninitiative (105).',
    obtain: 'Route 10, Power Plant (FR)',
    versionExclusive: 'FR',
  },
  {
    id: 126, name: 'Magmar', nameEn: 'Magmar', types: ['Feuer'], tier: 'C',
    note: 'LG-exklusiv im Pokémon-Anwesen. OK Feuer, aber Arkani (FR) ist besser.',
    obtain: 'Pokémon-Anwesen (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 127, name: 'Pinsir', nameEn: 'Pinsir', types: ['Käfer'], tier: 'C',
    note: 'LG-exklusiv. Safari Zone. Hoher Angriff, aber Käfer allein ist lategame schwach.',
    obtain: 'Safari Zone (LG)',
    versionExclusive: 'LG',
  },
  {
    id: 128, name: 'Tauros', nameEn: 'Tauros', types: ['Normal'], tier: 'A',
    note: 'Safari Zone. Bester Normal-Typ. Hoher Angriff (100) + Spitzeninitiative (110). Vernichtend.',
    obtain: 'Safari Zone (alle Zonen)',
  },
  {
    id: 129, name: 'Karpador', nameEn: 'Magikarp', types: ['Wasser'], tier: 'D',
    note: 'Nutzlos bis Level 20. Danach → Garados, einer der besten Kämpfer im Spiel.',
    obtain: 'Alte Angelrute überall, auch kaufbar in Pokémon-Zentren',
  },
  {
    id: 130, name: 'Garados', nameEn: 'Gyarados', types: ['Wasser', 'Flug'], tier: 'A',
    note: 'Massiver Angriff (125). Schwach gegen Elektro, aber dennoch einer der besten Wassertypen.',
    obtain: 'Entwickelt sich aus Karpador (Lv. 20)',
  },
  {
    id: 131, name: 'Lapras', nameEn: 'Lapras', types: ['Wasser', 'Eis'], tier: 'S',
    note: 'Geschenk in der Silph Co. Massives HP (130) + Spez.-Verteidigung (95). Surfer + Eisstrahl + Donner = perfekte Deckung.',
    obtain: 'Geschenk im 7. Stock der Silph Co., Saffron City',
  },
  {
    id: 132, name: 'Ditto', nameEn: 'Ditto', types: ['Normal'], tier: 'C',
    note: 'Nützlich zum Transformieren. Im Kampf situationsabhängig und schwach.',
    obtain: 'Route 13, 14, 15, Pokémon-Anwesen, Cerulean Cave',
  },
  {
    id: 133, name: 'Evoli', nameEn: 'Eevee', types: ['Normal'], tier: 'C',
    note: 'Geschenk in Koroheim (Celadon). Wähle die Entwicklung nach Team-Bedarf.',
    obtain: 'Geschenk im Koroheim-Wohnhaus (Celadon City)',
  },
  {
    id: 134, name: 'Aquana', nameEn: 'Vaporeon', types: ['Wasser'], tier: 'A',
    note: 'Wasserstein. Bestes HP unter den Evoli-Entwicklungen (130). Ausgezeichneter Wasser-Tank.',
    obtain: 'Evoli mit Wasserstein entwickeln',
  },
  {
    id: 135, name: 'Blitza', nameEn: 'Jolteon', types: ['Elektro'], tier: 'A',
    note: 'Donnerstein. Schnellste Evoli-Entwicklung (130 Ini) + hoher Spezialangriff. Beste Elektro-Wahl ohne FR-Exklusiv.',
    obtain: 'Evoli mit Donnerstein entwickeln',
  },
  {
    id: 136, name: 'Flamara', nameEn: 'Flareon', types: ['Feuer'], tier: 'B',
    note: 'Feuerstein. Sehr hoher Angriff (130), aber physische Feuer-Moves sind begrenzt.',
    obtain: 'Evoli mit Feuerstein entwickeln',
  },
  {
    id: 137, name: 'Porygon', nameEn: 'Porygon', types: ['Normal'], tier: 'C',
    note: 'Nur über Spielautomat (Koroheim). Teuer, aber decent Normal-Typ.',
    obtain: 'Spielautomat in Koroheim (Celadon City)',
  },
  {
    id: 138, name: 'Amonitas', nameEn: 'Omanyte', types: ['Gestein', 'Wasser'], tier: 'C',
    note: 'Helix-Fossil (Mt. Moon). Decent Spezialangriff als Amoroso.',
    obtain: 'Helix-Fossil aus Mt. Moon → Revival in Cinnabar Labor',
  },
  {
    id: 139, name: 'Amoroso', nameEn: 'Omastar', types: ['Gestein', 'Wasser'], tier: 'B',
    note: 'Hohe Verteidigung (125) + decent Spezialangriff (115). Guter Gestein/Wasser-Angreifer.',
    obtain: 'Entwickelt sich aus Amonitas (Lv. 40)',
  },
  {
    id: 140, name: 'Kabuto', nameEn: 'Kabuto', types: ['Gestein', 'Wasser'], tier: 'C',
    note: 'Panzer-Fossil (Mt. Moon). Als Kabutops hoher Angriff.',
    obtain: 'Panzer-Fossil aus Mt. Moon → Revival in Cinnabar Labor',
  },
  {
    id: 141, name: 'Kabutops', nameEn: 'Kabutops', types: ['Gestein', 'Wasser'], tier: 'B',
    note: 'Sehr hoher Angriff (115). Skalpell + Erdbeben ist eine starke Kombination.',
    obtain: 'Entwickelt sich aus Kabuto (Lv. 40)',
  },
  {
    id: 142, name: 'Aerodactyl', nameEn: 'Aerodactyl', types: ['Gestein', 'Flug'], tier: 'A',
    note: 'Alter Bernstein (Gewitter-Stein). Höchste Initiative aller nicht-Legenden (130). Stark im Endgame.',
    obtain: 'Alter Bernstein aus Silph Co. → Revival in Cinnabar Labor',
  },
  {
    id: 143, name: 'Relaxo', nameEn: 'Snorlax', types: ['Normal'], tier: 'A',
    note: 'Poké-Flöte (Route 12 oder 16). Massives HP (160) und Angriff (110). Kann fast alles wegschlagen.',
    obtain: 'Route 12 oder Route 16 (Poké-Flöte nötig)',
  },
  {
    id: 144, name: 'Arktos', nameEn: 'Articuno', types: ['Eis', 'Flug'], tier: 'A',
    note: 'Seafoam Islands. Legendär. Massive Spez.-Verteidigung (125) + Surfer + Eisstrahl + Psystrahl.',
    obtain: 'Seafoam Islands (Unterlauf)',
  },
  {
    id: 145, name: 'Zapdos', nameEn: 'Zapdos', types: ['Elektro', 'Flug'], tier: 'A',
    note: 'Kraftwerk. Legendär. 125 Spezialangriff. Bester Elektro-Typ im Spiel.',
    obtain: 'Kraftwerk (Power Plant)',
  },
  {
    id: 146, name: 'Lavados', nameEn: 'Moltres', types: ['Feuer', 'Flug'], tier: 'A',
    note: 'Felsspitze (Sevii Islands). Legendär. 125 Spezialangriff. Starker Feuer/Flug-Angreifer.',
    obtain: 'Felsspitze / Mt. Ember (Sevii Islands)',
  },
  {
    id: 147, name: 'Dratini', nameEn: 'Dratini', types: ['Drache'], tier: 'B',
    note: 'Safari Zone (Angeln) oder Spielautomat. Langer Weg bis Dragoran — lohnt sich aber.',
    obtain: 'Safari Zone (Angeln, Superangel)',
  },
  {
    id: 148, name: 'Dragonir', nameEn: 'Dragonair', types: ['Drache'], tier: 'B',
    note: 'Entwicklungsstufe. Weiter bis Dragoran.',
    obtain: 'Entwickelt sich aus Dratini (Lv. 30)',
  },
  {
    id: 149, name: 'Dragoran', nameEn: 'Dragonite', types: ['Drache', 'Flug'], tier: 'A',
    note: 'Drachen/Flug mit massivstem Angriff (134). Sehr gute Allround-Stats. Spät verfügbar, aber stark.',
    obtain: 'Entwickelt sich aus Dragonir (Lv. 55)',
  },
  {
    id: 150, name: 'Mewtu', nameEn: 'Mewtwo', types: ['Psycho'], tier: 'S',
    note: 'Cerulean Cave. Bestes Pokémon im Spiel. 154 Spezialangriff + 130 Initiative. Absolut vernichtend.',
    obtain: 'Cerulean Cave (nach der Pokémon Liga)',
  },
  {
    id: 151, name: 'Mew', nameEn: 'Mew', types: ['Psycho'], tier: 'S',
    note: 'Event-Only (nicht mehr aktiv). Lernt JEDEN TM. Perfekter Allrounder — heute nur per Cheat erreichbar.',
    obtain: 'Event (GameBoy Advance Event, nicht mehr aktiv)',
  },
];
