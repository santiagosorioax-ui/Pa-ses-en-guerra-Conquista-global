import { COUNTRIES_195, type Continent, type CountrySeed } from './countries195';

export type FocusCategory = 'origin' | 'economy' | 'military' | 'diplomacy' | 'restoration';

export interface FocusRequirement {
  moneyCost: number;
  minCities?: number;
  minGoldMines?: number;
  minArmy?: number;
  minAllies?: number;
  minExpansionPct?: number;
  historicalTargetIso2?: string[];
}

export interface FocusEffects {
  moneyBonus?: number;
  incomeBonus?: number;
  armyBonus?: number;
  armyCapBonus?: number;
  defenseBonusPct?: number;
  relationsContinentDelta?: number;
  newName?: string;
}

export interface FocusNode {
  id: 'root' | 'eco1' | 'mil1' | 'eco2' | 'mil2' | 'restore';
  tier: 0 | 1 | 2 | 3;
  lane: 'center' | 'left' | 'right';
  parents: Array<'root' | 'eco1' | 'mil1' | 'eco2' | 'mil2'>;
  requireAnyParent?: boolean;
  category: FocusCategory;
  era: string;
  title: string;
  historicalFact: string;
  requirements: FocusRequirement;
  effects: FocusEffects;
}

export interface CountryGenealogyTree {
  iso2: string;
  subtitle: string;
  ancestors: string[];
  restoredName: string;
  nodes: FocusNode[];
}

interface BespokeTreeSpec {
  subtitle: string;
  ancestors: string[];
  root: { era: string; title: string; fact: string };
  eco1: { era: string; title: string; fact: string };
  mil1: { era: string; title: string; fact: string };
  eco2: { era: string; title: string; fact: string };
  mil2: { era: string; title: string; fact: string };
  restore: {
    era: string;
    title: string;
    fact: string;
    newName: string;
    targets?: string[];
  };
}

const BESPOKE_TREES: Record<string, BespokeTreeSpec> = {
  // ======================== AMÉRICA ========================
  CO: {
    subtitle: 'De Nueva Granada a la Gran Colombia',
    ancestors: ['Muiscas y Taironas', 'Virreinato de Nueva Granada', 'República de Colombia'],
    root: {
      era: '1810',
      title: 'Grito de Independencia',
      fact: 'El 20 de julio de 1810 Santa Fe de Bogotá proclamó su autonomía y encendió la emancipación neogranadina.',
    },
    eco1: {
      era: '1880–1930',
      title: 'Bonanza Cafetera y Puertos',
      fact: 'La expansión cafetera del Eje y las rutas de Cartagena y Buenaventura impulsaron la economía nacional.',
    },
    mil1: {
      era: '1819',
      title: 'Batalla de Boyacá',
      fact: 'Tras el heroico paso por el Páramo de Pisba, el ejército libertador selló la independencia en el Puente de Boyacá.',
    },
    eco2: {
      era: '1969',
      title: 'Integración Andina y Caribeña',
      fact: 'Colombia impulsó el Acuerdo de Cartagena para unir el comercio y la diplomacia de las repúblicas andinas.',
    },
    mil2: {
      era: '1821',
      title: 'Constitución de Cúcuta',
      fact: 'El Congreso de Cúcuta unificó las fuerzas y leyes bolivarianas para proyectar poder sobre el norte sudamericano.',
    },
    restore: {
      era: '1819–1831',
      title: 'Restaurar la Gran Colombia',
      fact: 'Reúne el sueño histórico de Simón Bolívar uniendo a los pueblos bolivarianos bajo una sola gran república.',
      newName: 'Gran Colombia',
      targets: ['VE', 'EC', 'PA'],
    },
  },
  VE: {
    subtitle: 'Cuna de la Campaña Admirable y el Ideal Bolivariano',
    ancestors: ['Capitanía General de Venezuela', 'Primera República (1811)', 'Venezuela'],
    root: {
      era: '1811',
      title: 'Acta de Independencia',
      fact: 'El 5 de julio de 1811 Venezuela se convirtió en la primera nación hispanoamericana en declarar independencia total.',
    },
    eco1: {
      era: '1922',
      title: 'Faja Petrolera del Orinoco',
      fact: 'El estallido del pozo Barroso II transformó a Venezuela en una potencia energética mundial del siglo XX.',
    },
    mil1: {
      era: '1821',
      title: 'Victoria de Carabobo',
      fact: 'Los llaneros de Páez y las tropas de Bolívar aseguraron la libertad venezolana en la llanura de Carabobo.',
    },
    eco2: {
      era: '1960',
      title: 'Fundación de la OPEP',
      fact: 'Venezuela lideró la creación de la OPEP para coordinar la renta energética y la influencia diplomática.',
    },
    mil2: {
      era: '1813',
      title: 'Legado de la Campaña Admirable',
      fact: 'Reorganiza las divisiones terrestres y navales del Caribe con espíritu expedicionario bolivariano.',
    },
    restore: {
      era: '1819–1831',
      title: 'Restaurar la Gran Colombia',
      fact: 'Retoma la unión original de Venezuela, Nueva Granada, Quito y el Istmo bajo la bandera tricolor.',
      newName: 'Gran Colombia',
      targets: ['CO', 'EC', 'PA'],
    },
  },
  EC: {
    subtitle: 'De la Real Audiencia de Quito a la Unión Bolivariana',
    ancestors: ['Reino de Quito', 'Real Audiencia de Quito', 'Ecuador'],
    root: {
      era: '1809',
      title: 'Luz de América',
      fact: 'El 10 de agosto de 1809 Quito instaló la primera junta soberana de Sudamérica, ganando el título de Luz de América.',
    },
    eco1: {
      era: '1895–1908',
      title: 'Ferrocarril Trasandino',
      fact: 'La obra unió la costa de Guayaquil con la sierra de Quito, integrando el comercio cacaotero y portuario.',
    },
    mil1: {
      era: '1822',
      title: 'Batalla del Pichincha',
      fact: 'Antonio José de Sucre derrotó a las fuerzas realistas en las faldas del volcán Pichincha y liberó Quito.',
    },
    eco2: {
      era: '1978',
      title: 'Corredor del Pacífico y Galápagos',
      fact: 'Consolida el control marítimo ecuatorial y el comercio estratégico entre los Andes y el Pacífico.',
    },
    mil2: {
      era: '1829',
      title: 'Defensa de Tarqui',
      fact: 'Fortalece las brigadas de montaña y las fortificaciones fronterizas de los Andes ecuatoriales.',
    },
    restore: {
      era: '1822–1830',
      title: 'Restaurar la Gran Colombia',
      fact: 'Desde Quito, el antiguo Distrito del Sur reunifica la gran república bolivariana de los Andes.',
      newName: 'Gran Colombia',
      targets: ['CO', 'VE', 'PA'],
    },
  },
  PA: {
    subtitle: 'Puente del Mundo y Corazón del Istmo',
    ancestors: ['Castilla del Oro', 'Departamento del Istmo', 'Panamá'],
    root: {
      era: '1821',
      title: 'Independencia del Istmo',
      fact: 'Panamá proclamó su independencia de España en 1821 y se unió voluntariamente al proyecto de la Gran Colombia.',
    },
    eco1: {
      era: '1914',
      title: 'Inauguración del Canal de Panamá',
      fact: 'La apertura del canal interoceánico convirtió al istmo en la arteria marítima más valiosa del planeta.',
    },
    mil1: {
      era: '1977',
      title: 'Tratados Torrijos-Carter',
      fact: 'Panamá negoció la recuperación total de la soberanía sobre la Zona del Canal y sus defensas estratégicas.',
    },
    eco2: {
      era: '1999',
      title: 'Centro Financiero y Logístico Global',
      fact: 'Bajo administración panameña, la ampliación del canal multiplicó el tráfico entre el Atlántico y el Pacífico.',
    },
    mil2: {
      era: '1826',
      title: 'Congreso Anfictiónico de Panamá',
      fact: 'Retoma el congreso convocado por Bolívar en Ciudad de Panamá para articular una defensa hemisférica común.',
    },
    restore: {
      era: '1821–1831',
      title: 'Restaurar la Gran Colombia',
      fact: 'Reúne el Istmo con las tierras bolivarianas formando una potencia bioceánica bajo el nombre de Gran Colombia.',
      newName: 'Gran Colombia',
      targets: ['CO', 'VE', 'EC'],
    },
  },
  MX: {
    subtitle: 'De Tenochtitlán y la Nueva España al Imperio Mexicano',
    ancestors: ['Imperio Mexica y Mayas', 'Virreinato de Nueva España', 'México'],
    root: {
      era: '1810–1821',
      title: 'Grito de Dolores y Plan de Iguala',
      fact: 'El levantamiento de Hidalgo y el pacto de 1821 consumaron la independencia de la nación mexicana.',
    },
    eco1: {
      era: '1938',
      title: 'Soberanía Energética e Industria',
      fact: 'La nacionalización petrolera y la red ferroviaria sentaron las bases de la industrialización de México.',
    },
    mil1: {
      era: '1862',
      title: 'Batalla de Puebla',
      fact: 'El 5 de mayo de 1862 el Ejército de Oriente venció a una potencia europea y se volvió símbolo nacional.',
    },
    eco2: {
      era: '1950–1970',
      title: 'Milagro Económico Mexicano',
      fact: 'Décadas de expansión urbana, puertos en ambos océanos y manufactura consolidaron a México como potencia regional.',
    },
    mil2: {
      era: '1821',
      title: 'Ejército Trigarante',
      fact: 'Reorganiza el mando militar combinando despliegue rápido en el norte y control estratégico del Golfo.',
    },
    restore: {
      era: '1821–1823',
      title: 'Restaurar el Imperio Mexicano',
      fact: 'Reconstruye el histórico dominio mexicano desde el norte hasta Centroamérica bajo una sola corona o república imperial.',
      newName: 'Imperio Mexicano',
      targets: ['GT', 'BZ', 'SV', 'HN'],
    },
  },
  AR: {
    subtitle: 'De la Revolución de Mayo a las Provincias Unidas',
    ancestors: ['Virreinato del Río de la Plata', 'Provincias Unidas (1816)', 'Argentina'],
    root: {
      era: '1810–1816',
      title: 'Revolución de Mayo y Tucumán',
      fact: 'Buenos Aires abrió el camino en 1810 y el Congreso de Tucumán declaró la independencia de las Provincias Unidas.',
    },
    eco1: {
      era: '1880–1920',
      title: 'Granero del Mundo',
      fact: 'La pampa fértil, los ferrocarriles y el puerto del Río de la Plata convirtieron a Argentina en una gran potencia exportadora.',
    },
    mil1: {
      era: '1817',
      title: 'Cruce de los Andes',
      fact: 'José de San Martín condujo al Ejército de los Andes por las cumbres más altas para liberar Chile y Perú.',
    },
    eco2: {
      era: '1991',
      title: 'Eje Comercial del Cono Sur',
      fact: 'Impulsa la integración fluvial de la cuenca del Plata y la industria energética patagónica.',
    },
    mil2: {
      era: '1814',
      title: 'Armada del Atlántico Sur',
      fact: 'Siguiendo el legado del almirante Brown, refuerza las defensas australes y la proyección naval.',
    },
    restore: {
      era: '1816',
      title: 'Restaurar las Provincias Unidas del Río de la Plata',
      fact: 'Reunifica la histórica cuenca rioplatense bajo el nombre fundacional de 1816.',
      newName: 'Provincias Unidas del Río de la Plata',
      targets: ['UY', 'PY', 'BO'],
    },
  },
  BR: {
    subtitle: 'Del Grito de Ipiranga al Imperio del Brasil',
    ancestors: ['Reino Unido de Portugal y Brasil', 'Imperio del Brasil (1822)', 'Brasil'],
    root: {
      era: '1822',
      title: 'Grito de Ipiranga',
      fact: 'El 7 de septiembre de 1822 Brasil proclamó su independencia preservando intacta su gigantesca unidad territorial.',
    },
    eco1: {
      era: '1850–1910',
      title: 'Ciclo del Café y del Caucho',
      fact: 'El auge exportador de São Paulo y la Amazonía financió puertos modernos, bancos e infraestructura nacional.',
    },
    mil1: {
      era: '1865–1870',
      title: 'Doctrina del Duque de Caxias',
      fact: 'La profesionalización del ejército imperial consolidó la supremacía terrestre y fluvial brasileña en Sudamérica.',
    },
    eco2: {
      era: '1960',
      title: 'Fundación de Brasilia e Industria',
      fact: 'La nueva capital en el interior integró todo el continente brasileño con energía hidroeléctrica y siderurgia.',
    },
    mil2: {
      era: '1944',
      title: 'Fuerza Expedicionaria Brasileña',
      fact: 'Brasil fue la única nación sudamericana en enviar divisiones de combate a Europa, forjando una doctrina moderna.',
    },
    restore: {
      era: '1822–1889',
      title: 'Restaurar el Imperio del Brasil',
      fact: 'Recobra la grandeza histórica del Imperio de Pedro II como potencia hegemónica del Atlántico Sur.',
      newName: 'Imperio del Brasil',
      targets: ['UY', 'PY', 'BO', 'GY'],
    },
  },
  PE: {
    subtitle: 'Herederos del Tahuantinsuyo y del Virreinato del Perú',
    ancestors: ['Imperio Inca (Tahuantinsuyo)', 'Virreinato del Perú', 'República del Perú'],
    root: {
      era: '1821',
      title: 'Proclamación en Lima',
      fact: 'El 28 de julio de 1821 se proclamó la independencia del Perú, heredero de la civilización andina más extensa.',
    },
    eco1: {
      era: '1845–1870',
      title: 'Era del Guano y Minería Andina',
      fact: 'Las exportaciones costeras y los minerales de los Andes financiaron ferrocarriles y puertos estratégicos.',
    },
    mil1: {
      era: '1824',
      title: 'Batallas de Junín y Ayacucho',
      fact: 'En la Pampa de la Quinua se libró la batalla decisiva que selló la libertad de toda Sudamérica.',
    },
    eco2: {
      era: '1438–1533',
      title: 'Red del Qhapaq Ñan',
      fact: 'Moderniza las rutas logísticas andinas inspiradas en el gran sistema vial que unía el Imperio Inca.',
    },
    mil2: {
      era: '1879',
      title: 'Legado del Almirante Grau',
      fact: 'La hazaña naval del Huáscar inspira una doctrina de defensa marítima y resistencia patriótica.',
    },
    restore: {
      era: '1438–1533',
      title: 'Restaurar el Imperio Inca',
      fact: 'Reconstruye el legendario Tahuantinsuyo de los Cuatro Suyos a lo largo de la cordillera de los Andes.',
      newName: 'Imperio Inca',
      targets: ['BO', 'EC', 'CL'],
    },
  },
  BO: {
    subtitle: 'De Tiahuanaco y el Alto Perú a la Confederación Andina',
    ancestors: ['Cultura Tiahuanaco', 'Charcas / Alto Perú', 'Bolivia'],
    root: {
      era: '1825',
      title: 'Fundación de la República de Bolívar',
      fact: 'El 6 de agosto de 1825 nació Bolivia en Chuquisaca, corazón mineral y geográfico de Sudamérica.',
    },
    eco1: {
      era: '1545–1900',
      title: 'Riqueza de Potosí y el Altiplano',
      fact: 'La histórica plata de Potosí, el estaño y el litio del Salar de Uyuni sostienen la economía altiplánica.',
    },
    mil1: {
      era: '1836',
      title: 'Ejército de Santa Cruz',
      fact: 'El mariscal Andrés de Santa Cruz construyó uno de los ejércitos más disciplinados del continente en el siglo XIX.',
    },
    eco2: {
      era: '1952',
      title: 'Integración del Altiplano y los Llanos',
      fact: 'Conecta las regiones mineras andinas con el polo agroindustrial de Santa Cruz.',
    },
    mil2: {
      era: '1837',
      title: 'Fortalezas de los Andes Centrales',
      fact: 'Aprovecha la altitud de la cordillera para crear un bastión defensivo casi inexpugnable.',
    },
    restore: {
      era: '1836–1839',
      title: 'Restaurar la Confederación Perú-Boliviana',
      fact: 'Revive la gran confederación ideada por Andrés de Santa Cruz uniendo los destinos del Perú y Bolivia.',
      newName: 'Confederación Perú-Boliviana',
      targets: ['PE', 'CL', 'PY'],
    },
  },
  CL: {
    subtitle: 'República Austral y Guardián del Pacífico Sur',
    ancestors: ['Capitanía General de Chile', 'Patria Vieja (1810)', 'Chile'],
    root: {
      era: '1818',
      title: 'Batalla de Maipú e Independencia',
      fact: 'Bernardo O’Higgins y San Martín consolidaron la independencia chilena en Maipú y abrieron el Pacífico.',
    },
    eco1: {
      era: '1880–1971',
      title: 'Riqueza del Salitre y del Cobre',
      fact: 'Los yacimientos del norte convirtieron a Chile en el mayor productor mundial de cobre y pilar minero global.',
    },
    mil1: {
      era: '1879–1884',
      title: 'Campaña del Pacífico',
      fact: 'La combinación de escuadra naval y tropas disciplinadas otorgó a Chile el dominio del Pacífico sudamericano.',
    },
    eco2: {
      era: '1914–2000',
      title: 'Puertos de Valparaíso y Magallanes',
      fact: 'Controla el paso austral del Estrecho de Magallanes y potencia el comercio transpacífico.',
    },
    mil2: {
      era: '1820',
      title: 'Escuadra Libertadora del Pacífico',
      fact: 'Retoma la tradición oceánica chilena para proyectar poder desde Atacama hasta la Antártida.',
    },
    restore: {
      era: '1883',
      title: 'Proclamar la República Austral del Pacífico',
      fact: 'Consolida la hegemonía austral y andina bajo una potencia marítima del Cono Sur.',
      newName: 'República Austral del Pacífico',
      targets: ['PE', 'BO', 'AR'],
    },
  },
  US: {
    subtitle: 'De las Trece Colonias a la Unión Hemisférica',
    ancestors: ['Trece Colonias (1776)', 'Unión Constitucional (1787)', 'Estados Unidos'],
    root: {
      era: '1776',
      title: 'Declaración de Independencia',
      fact: 'Las Trece Colonias fundaron la primera república constitucional moderna en Filadelfia el 4 de julio de 1776.',
    },
    eco1: {
      era: '1869–1920',
      title: 'Ferrocarril Transcontinental e Industria',
      fact: 'La unión ferroviaria de costa a costa y la manufactura masiva hicieron de EE. UU. la mayor economía industrial.',
    },
    mil1: {
      era: '1941–1945',
      title: 'Arsenal de la Democracia',
      fact: 'La movilización industrial y las flotas de dos océanos proyectaron el poder estadounidense en todo el globo.',
    },
    eco2: {
      era: '1969',
      title: 'Carrera Espacial y Revolución Digital',
      fact: 'La llegada a la Luna y la innovación tecnológica crearon una ventaja económica y logística sin precedentes.',
    },
    mil2: {
      era: '1823',
      title: 'Doctrina Hemisférica y Dos Océanos',
      fact: 'Asegura el dominio naval del Atlántico y el Pacífico con bases estratégicas en todo el continente.',
    },
    restore: {
      era: '1823–2026',
      title: 'Proclamar la Unión Panamericana',
      fact: 'Integra Norteamérica y sus aliados en una superpotencia continental bajo un solo mando federal.',
      newName: 'Unión Panamericana',
      targets: ['CA', 'MX', 'CU'],
    },
  },
  CA: {
    subtitle: 'De la Confederación de 1867 al Dominio Boreal',
    ancestors: ['Nueva Francia y Norteamérica Británica', 'Confederación Canadiense (1867)', 'Canadá'],
    root: {
      era: '1867',
      title: 'Acta de la Confederación',
      fact: 'Las provincias fundadoras se unieron en 1867 para crear el Dominio de Canadá de mar a mar.',
    },
    eco1: {
      era: '1885',
      title: 'Ferrocarril Canadian Pacific',
      fact: 'La línea transcontinental unió el Atlántico con el Pacífico y abrió las praderas y recursos minerales del norte.',
    },
    mil1: {
      era: '1917',
      title: 'Batalla de Vimy Ridge',
      fact: 'El Cuerpo Canadiense conquistó la cresta de Vimy en una operación brillante que forjó la identidad militar del país.',
    },
    eco2: {
      era: '1959',
      title: 'Vía Marítima de San Lorenzo y Ártico',
      fact: 'Conecta los Grandes Lagos con el Atlántico y desarrolla la riqueza energética del Ártico canadiense.',
    },
    mil2: {
      era: '1944',
      title: 'Legado de Playa Juno',
      fact: 'Refuerza la defensa ártica y las fuerzas expedicionarias aliadas en el Atlántico Norte.',
    },
    restore: {
      era: '1867',
      title: 'Proclamar el Dominio Boreal de Norteamérica',
      fact: 'Expande el modelo confederal canadiense como gran potencia del norte atlántico y ártico.',
      newName: 'Dominio Boreal',
      targets: ['US', 'GB', 'DK'],
    },
  },
  UY: {
    subtitle: 'Legado Artiguista y Banda Oriental',
    ancestors: ['Banda Oriental', 'Liga Federal (1815)', 'Uruguay'],
    root: {
      era: '1825',
      title: 'Cruzada de los Treinta y Tres Orientales',
      fact: 'La declaratoria de la Florida en 1825 selló la independencia oriental y el nacimiento de la república.',
    },
    eco1: {
      era: '1903–1915',
      title: 'Reformas de Batlle y Puerto de Montevideo',
      fact: 'Uruguay construyó uno de los estados más estables, educados y prósperos de toda América Latina.',
    },
    mil1: {
      era: '1811',
      title: 'Batalla de Las Piedras',
      fact: 'José Gervasio Artigas obtuvo la gran victoria oriental y lideró el histórico Éxodo del Pueblo Oriental.',
    },
    eco2: {
      era: '1991',
      title: 'Sede del Mercosur y Puerta del Plata',
      fact: 'Montevideo se consolida como núcleo diplomático, financiero y portuario del Atlántico Sur.',
    },
    mil2: {
      era: '1815',
      title: 'Banderas de la Liga de los Pueblos Libres',
      fact: 'Retoma el federalismo artiguista para defender la soberanía de la cuenca del Río de la Plata.',
    },
    restore: {
      era: '1815–1820',
      title: 'Restaurar la Liga Federal Artiguista',
      fact: 'Revive la federación de los Pueblos Libres soñada por Artigas en el Río de la Plata.',
      newName: 'Liga Federal Artiguista',
      targets: ['AR', 'PY', 'BR'],
    },
  },
  PY: {
    subtitle: 'Corazón Guaraní y Bastión del Río Paraguay',
    ancestors: ['Misiones Guaraníes', 'Intendencia del Paraguay', 'Paraguay'],
    root: {
      era: '1811',
      title: 'Independencia de Mayo en Asunción',
      fact: 'El 14 y 15 de mayo de 1811 Paraguay se emancipó de forma pacífica y protegió celosamente su autonomía.',
    },
    eco1: {
      era: '1844–1862',
      title: 'Fundición de Ybycuí y Primer Ferrocarril',
      fact: 'Paraguay construyó uno de los primeros ferrocarriles, telégrafos y astilleros industriales de Sudamérica.',
    },
    mil1: {
      era: '1866',
      title: 'Defensa de Curupayty',
      fact: 'La tenacidad defensiva paraguaya en las fortalezas fluviales demostró una resistencia legendaria.',
    },
    eco2: {
      era: '1984',
      title: 'Potencia Hidroeléctrica de Itaipú',
      fact: 'Las gigantescas represas del Paraná convierten a Paraguay en exportador clave de energía limpia.',
    },
    mil2: {
      era: '1932–1935',
      title: 'Veteranos del Chaco',
      fact: 'Aplica la doctrina de maniobra y defensa profunda que aseguró el territorio chaqueño.',
    },
    restore: {
      era: '1811',
      title: 'Proclamar la República Guaraní del Plata',
      fact: 'Eleva a Paraguay como potencia central de las cuencas del Paraná y el Paraguay.',
      newName: 'República Guaraní del Plata',
      targets: ['BO', 'AR', 'UY'],
    },
  },
  CU: {
    subtitle: 'La Perla de las Antillas y Encrucijada del Caribe',
    ancestors: ['Taínos de Cuba', 'Capitanía General de Cuba', 'Cuba'],
    root: {
      era: '1868–1898',
      title: 'Grito de Yara y Lucha Mambisa',
      fact: 'Desde Céspedes hasta José Martí y Antonio Maceo, Cuba forjó una larga gesta por su independencia.',
    },
    eco1: {
      era: '1900–1950',
      title: 'Puertos de La Habana y Comercio Azucarero',
      fact: 'La Habana se consolidó como principal puerto estratégico y cultural de todo el Caribe.',
    },
    mil1: {
      era: '1895',
      title: 'Invasión de Oriente a Occidente',
      fact: 'Las columnas móviles mambisas recorrieron toda la isla demostrando una notable táctica de maniobra.',
    },
    eco2: {
      era: '1960–2020',
      title: 'Diplomacia Médica y Biotecnología',
      fact: 'La proyección científica y diplomática fortalece las alianzas cubanas en América Latina y el Caribe.',
    },
    mil2: {
      era: '1961',
      title: 'Doctrina de Bastión Insular',
      fact: 'Fortifica las costas y estrechos del Caribe haciendo de la isla una fortaleza naval.',
    },
    restore: {
      era: '1895',
      title: 'Proclamar la Confederación Antillana',
      fact: 'Cumple el sueño de Martí, Hostos y Betances de unir a las grandes islas del Caribe en una confederación.',
      newName: 'Confederación Antillana',
      targets: ['DO', 'HT', 'JM'],
    },
  },
  DO: {
    subtitle: 'Primada de América y Corazón de La Española',
    ancestors: ['Taínos de Quisqueya', 'Capitanía de Santo Domingo', 'República Dominicana'],
    root: {
      era: '1844',
      title: 'Independencia de La Trinitaria',
      fact: 'Juan Pablo Duarte y los trinitarios proclamaron la República Dominicana el 27 de febrero de 1844.',
    },
    eco1: {
      era: '1509–1950',
      title: 'Puertos de Santo Domingo y Comercio Caribeño',
      fact: 'La primera ciudad europea de América impulsó el comercio marítimo y agrícola del Caribe central.',
    },
    mil1: {
      era: '1863–1865',
      title: 'Guerra de la Restauración',
      fact: 'El pueblo dominicano restauró la soberanía nacional mediante una tenaz campaña territorial.',
    },
    eco2: {
      era: '1990–2025',
      title: 'Motor Económico del Caribe',
      fact: 'El turismo, las zonas francas y los puertos modernos convierten al país en líder económico antillano.',
    },
    mil2: {
      era: '1844',
      title: 'Legado del 19 y 30 de Marzo',
      fact: 'Refuerza la guardia fronteriza y naval inspirada en las victorias fundacionales de Azua y Santiago.',
    },
    restore: {
      era: '1844',
      title: 'Proclamar la Unión de La Española',
      fact: 'Unifica el legado histórico de Quisqueya y lidera una gran república antillana.',
      newName: 'República de La Española',
      targets: ['HT', 'CU', 'JM'],
    },
  },
  HT: {
    subtitle: 'Primera República Negra Independiente del Mundo',
    ancestors: ['Taínos de Ayiti', 'Saint-Domingue', 'Haití'],
    root: {
      era: '1804',
      title: 'Revolución Haitiana e Independencia',
      fact: 'En 1804 Haití abolió la esclavitud y se convirtió en la primera república independiente de América Latina y el Caribe.',
    },
    eco1: {
      era: '1806–1820',
      title: 'Reconstrucción de Cabo Haitiano',
      fact: 'Organiza la agricultura, los puertos del norte y el comercio atlántico para revitalizar el tesoro.',
    },
    mil1: {
      era: '1803',
      title: 'Batalla de Vertières',
      fact: 'Las tropas de Dessalines y Toussaint derrotaron a uno de los ejércitos más poderosos de Europa.',
    },
    eco2: {
      era: '1816',
      title: 'Solidaridad de Alexandre Pétion',
      fact: 'Haití apoyó decisivamente a Bolívar en 1816; retoma esa diplomacia solidaria para ganar aliados en América.',
    },
    mil2: {
      era: '1805–1820',
      title: 'Ciudadela Laferrière',
      fact: 'Inspirada en la mayor fortaleza del Caribe, multiplica la capacidad defensiva del territorio nacional.',
    },
    restore: {
      era: '1804–1806',
      title: 'Restaurar el Imperio de Haití',
      fact: 'Retoma el prestigio revolucionario de 1804 proyectando liderazgo en toda La Española y las Antillas.',
      newName: 'Imperio de Haití',
      targets: ['DO', 'CU', 'JM'],
    },
  },
  GT: {
    subtitle: 'Corazón del Mundo Maya y de Centroamérica',
    ancestors: ['Civilización Maya', 'Capitanía General de Guatemala', 'Guatemala'],
    root: {
      era: '1821',
      title: 'Acta de Independencia de Centroamérica',
      fact: 'El 15 de septiembre de 1821 se firmó en Ciudad de Guatemala la independencia de todo el istmo centroamericano.',
    },
    eco1: {
      era: '1871–1920',
      title: 'Reforma Liberal y Rutas del Café',
      fact: 'La conexión ferroviaria entre ambos océanos y las exportaciones agrícolas modernizaron el país.',
    },
    mil1: {
      era: '1823',
      title: 'Ejército de la Federación del Istmo',
      fact: 'Reorganiza las fuerzas terrestres siguiendo el espíritu unionista centroamericano del siglo XIX.',
    },
    eco2: {
      era: '1960',
      title: 'Mercado Común Centroamericano',
      fact: 'Impulsa el comercio integrado y la diplomacia regional entre las repúblicas del istmo.',
    },
    mil2: {
      era: '1856',
      title: 'Pacto Defensivo Centroamericano',
      fact: 'Aumenta la preparación militar y las fortificaciones de montaña en toda la sierra.',
    },
    restore: {
      era: '1823–1839',
      title: 'Restaurar la República Federal de Centroamérica',
      fact: 'Reunifica a las provincias históricas de la antigua Capitanía General bajo una sola federación.',
      newName: 'República Federal de Centroamérica',
      targets: ['SV', 'HN', 'NI', 'CR', 'BZ'],
    },
  },

  // ======================== EUROPA ========================
  ES: {
    subtitle: 'De la Corona Hispánica al Imperio Español',
    ancestors: ['Reinos de Castilla y Aragón', 'Monarquía Hispánica (1492)', 'España'],
    root: {
      era: '1492',
      title: 'Unión de las Coronas y Era Oceánica',
      fact: 'La unión dinástica y la llegada a América en 1492 inauguraron la primera red global del planeta.',
    },
    eco1: {
      era: '1550–1650',
      title: 'Siglo de Oro y Carrera de Indias',
      fact: 'Sevilla, Cádiz y el esplendor cultural del Siglo de Oro hicieron de España el eje comercial de dos continentes.',
    },
    mil1: {
      era: '1534–1643',
      title: 'Legado de los Tercios Españoles',
      fact: 'Durante más de un siglo, los Tercios fueron la infantería más temida y disciplinada de Europa.',
    },
    eco2: {
      era: '1986',
      title: 'Modernización Europea y Puertos Atlánticos',
      fact: 'La red de alta velocidad, energías renovables y puentes comerciales con Iberoamérica fortalecen la tesorería.',
    },
    mil2: {
      era: '1571',
      title: 'Armada de Lepanto y Defensa Naval',
      fact: 'Recuerda la victoria naval de Lepanto para proyectar poder en el Mediterráneo y el Atlántico.',
    },
    restore: {
      era: '1580–1700',
      title: 'Restaurar el Imperio Español',
      fact: 'Reconstruye el prestigio imperial hispánico uniendo la península y proyectándose sobre mares y continentes.',
      newName: 'Imperio Español',
      targets: ['PT', 'FR', 'MA', 'IT'],
    },
  },
  PT: {
    subtitle: 'Pioneros de la Era de los Descubrimientos',
    ancestors: ['Condado Portucalense (1143)', 'Imperio Portugués (1415)', 'Portugal'],
    root: {
      era: '1143',
      title: 'Tratado de Zamora',
      fact: 'Afonso Henriques fundó el Reino de Portugal, uno de los estados con fronteras más antiguas de Europa.',
    },
    eco1: {
      era: '1498',
      title: 'Ruta Marítima a la India',
      fact: 'Vasco da Gama abrió la ruta del Cabo de Buena Esperanza y creó una red comercial de especias en tres océanos.',
    },
    mil1: {
      era: '1385',
      title: 'Batalla de Aljubarrota',
      fact: 'La victoria táctica en Aljubarrota garantizó la independencia portuguesa y forjó su doctrina defensiva.',
    },
    eco2: {
      era: '1419–1500',
      title: 'Escuela Náutica de Sagres',
      fact: 'La cartografía, las carabelas y los puertos atlánticos multiplican los ingresos y alianzas oceánicas.',
    },
    mil2: {
      era: '1510',
      title: 'Armadas del Índico y el Atlántico',
      fact: 'Fortalece las bases costeras y la capacidad expedicionaria naval portuguesa.',
    },
    restore: {
      era: '1415–1822',
      title: 'Restaurar el Imperio Portugués',
      fact: 'Revive la gran talasocracia lusitana que conectó Europa, África, Asia y América.',
      newName: 'Imperio Portugués',
      targets: ['ES', 'BR', 'AO', 'MZ'],
    },
  },
  FR: {
    subtitle: 'De la Revolución Francesa al Primer Imperio',
    ancestors: ['Reino de los Francos', 'Revolución Francesa (1789)', 'Francia'],
    root: {
      era: '1789',
      title: 'Revolución Francesa y Derechos del Hombre',
      fact: 'La toma de la Bastilla transformó la política mundial e inauguró la era contemporánea en Europa.',
    },
    eco1: {
      era: '1804',
      title: 'Código Civil y Modernización Estatal',
      fact: 'El Código Napoleónico y el Banco de Francia sentaron un modelo administrativo adoptado en todo el mundo.',
    },
    mil1: {
      era: '1805',
      title: 'La Grande Armée en Austerlitz',
      fact: 'La organización por cuerpos de ejército y la artillería móvil revolucionaron el arte de la guerra.',
    },
    eco2: {
      era: '1957',
      title: 'Arquitectos de la Unión Europea',
      fact: 'Francia impulsó la integración europea, la energía nuclear civil y la industria aeroespacial.',
    },
    mil2: {
      era: '1916',
      title: 'Espíritu de Verdún y Disuasión',
      fact: 'Combina fortificaciones modernas con una fuerza de proyección rápida de alcance mundial.',
    },
    restore: {
      era: '1804–1815',
      title: 'Restaurar el Imperio Francés',
      fact: 'Devuelve a París el liderazgo continental bajo el estandarte histórico del Imperio Francés.',
      newName: 'Imperio Francés',
      targets: ['BE', 'ES', 'IT', 'DE'],
    },
  },
  GB: {
    subtitle: 'Cuna de la Revolución Industrial y Señora de los Mares',
    ancestors: ['Reinos de Inglaterra y Escocia', 'Acta de Unión (1707)', 'Reino Unido'],
    root: {
      era: '1707',
      title: 'Acta de Unión de Gran Bretaña',
      fact: 'La unión de Inglaterra y Escocia dio origen a la mayor potencia naval y parlamentaria de la Edad Moderna.',
    },
    eco1: {
      era: '1760–1840',
      title: 'Revolución Industrial',
      fact: 'La máquina de vapor, el ferrocarril y la banca londinense transformaron la economía de toda la humanidad.',
    },
    mil1: {
      era: '1805',
      title: 'Victoria de Trafalgar',
      fact: 'La Royal Navy aseguró un siglo de supremacía oceánica bajo el liderazgo del almirante Nelson.',
    },
    eco2: {
      era: '1931',
      title: 'Mancomunidad de Naciones',
      fact: 'Teje una red comercial y diplomática global inspirada en la Commonwealth.',
    },
    mil2: {
      era: '1940',
      title: 'Batalla de Inglaterra',
      fact: 'El radar y la defensa insular resistieron la tormenta y prepararon la ofensiva aliada.',
    },
    restore: {
      era: '1815–1922',
      title: 'Restaurar el Imperio Británico',
      fact: 'Reclama el legado marítimo global bajo la corona del histórico Imperio Británico.',
      newName: 'Imperio Británico',
      targets: ['IE', 'FR', 'CA', 'AU'],
    },
  },
  DE: {
    subtitle: 'De la Unificación Alemana al Imperio Alemán',
    ancestors: ['Sacro Imperio Romano Germánico', 'Reino de Prusia', 'Alemania'],
    root: {
      era: '1871',
      title: 'Unificación de Bismarck',
      fact: 'En 1871 los estados alemanes se unificaron en una potencia industrial y científica en el centro de Europa.',
    },
    eco1: {
      era: '1834',
      title: 'Zollverein e Ingeniería Industrial',
      fact: 'La unión aduanera, la química y la siderurgia convirtieron a Alemania en el motor industrial europeo.',
    },
    mil1: {
      era: '1866–1871',
      title: 'Estado Mayor General',
      fact: 'La planificación ferroviaria y logística del Estado Mayor estableció nuevos estándares de mando militar.',
    },
    eco2: {
      era: '1950–1990',
      title: 'Milagro Económico y Reunificación',
      fact: 'El Wirtschaftswunder y la caída del Muro de Berlín en 1989 consolidaron el liderazgo económico europeo.',
    },
    mil2: {
      era: '1871',
      title: 'Doctrina de Mando por Misión',
      fact: 'Aumenta la disciplina táctica, la capacidad de movilización y las defensas centroeuropeas.',
    },
    restore: {
      era: '1871–1918',
      title: 'Restaurar el Imperio Alemán',
      fact: 'Restablece la hegemonía centroeuropea proclamando nuevamente el Imperio Alemán.',
      newName: 'Imperio Alemán',
      targets: ['AT', 'PL', 'CZ', 'DK'],
    },
  },
  IT: {
    subtitle: 'De la Roma Clásica y el Renacimiento al Nuevo Imperio',
    ancestors: ['República e Imperio Romano', 'Ciudades-Estado del Renacimiento', 'Italia'],
    root: {
      era: '1861',
      title: 'El Risorgimento',
      fact: 'Garibaldi, Cavour y Mazzini unificaron la península italiana tras siglos de división política.',
    },
    eco1: {
      era: '1400–1600',
      title: 'Banca y Comercio del Renacimiento',
      fact: 'Florencia, Venecia y Génova inventaron la banca moderna y el comercio mediterráneo.',
    },
    mil1: {
      era: '27 a. C.',
      title: 'Legado de las Legiones Romanas',
      fact: 'La ingeniería militar, las calzadas y la disciplina legionaria forjaron la civilización mediterránea.',
    },
    eco2: {
      era: '1957',
      title: 'Tratados de Roma',
      fact: 'Roma fue sede de los tratados fundacionales de la integración europea y del milagro industrial italiano.',
    },
    mil2: {
      era: '1571',
      title: 'Mare Nostrum y Flota Veneciana',
      fact: 'Consolida el control naval del Mediterráneo central y la defensa alpina del norte.',
    },
    restore: {
      era: '27 a. C.–476 d. C.',
      title: 'Restaurar el Imperio Romano',
      fact: 'Desde la Ciudad Eterna, proclama la resurrección del Imperio Romano sobre el Mediterráneo.',
      newName: 'Imperio Romano',
      targets: ['GR', 'ES', 'FR', 'TN', 'HR'],
    },
  },
  RU: {
    subtitle: 'De la Rus y los Zares al Imperio Euroasiático',
    ancestors: ['Gran Principado de Moscú', 'Imperio Ruso (1721)', 'Rusia'],
    root: {
      era: '1721',
      title: 'Reformas de Pedro el Grande',
      fact: 'La fundación de San Petersburgo y la apertura al Báltico convirtieron a Rusia en gran potencia europea.',
    },
    eco1: {
      era: '1891–1916',
      title: 'Ferrocarril Transiberiano',
      fact: 'La vía férrea más larga del mundo unió Moscú con el Pacífico y abrió las riquezas de Siberia.',
    },
    mil1: {
      era: '1812',
      title: 'Defensa Patria de 1812 y 1943',
      fact: 'La profundidad estratégica y la resistencia en Stalingrado y Borodino definieron su doctrina militar.',
    },
    eco2: {
      era: '1957–1961',
      title: 'Pioneros del Espacio (Sputnik y Gagarin)',
      fact: 'El primer satélite y el primer cosmonauta demostraron la capacidad científica e industrial del país.',
    },
    mil2: {
      era: '1783',
      title: 'Guardia Imperial y Bastión Euroasiático',
      fact: 'Expande las reservas estratégicas de tropas y las defensas en la gran llanura oriental.',
    },
    restore: {
      era: '1721–1917',
      title: 'Restaurar el Imperio Ruso',
      fact: 'Unifica el espacio euroasiático bajo la histórica bandera del Imperio Ruso.',
      newName: 'Imperio Ruso',
      targets: ['BY', 'UA', 'KZ', 'FI'],
    },
  },
  UA: {
    subtitle: 'Herederos de la Rus de Kiev y los Cosacos de Zaporiyia',
    ancestors: ['Rus de Kiev (882)', 'Hetmanato Cosaco', 'Ucrania'],
    root: {
      era: '882–1240',
      title: 'Legado de la Rus de Kiev',
      fact: 'Kiev fue el gran centro comercial, cultural y político que conectaba el Báltico con Constantinopla.',
    },
    eco1: {
      era: '1880–2025',
      title: 'Granero de Europa',
      fact: 'Las tierras negras (chernozem) y los puertos del Mar Negro sostienen el comercio agrícola mundial.',
    },
    mil1: {
      era: '1648',
      title: 'Sich de Zaporiyia',
      fact: 'Los cosacos ucranianos crearon una fuerza móvil famosa por su independencia y espíritu combativo.',
    },
    eco2: {
      era: '1991',
      title: 'Corredor del Mar Negro e Industria',
      fact: 'Conecta la metalurgia, la aeronáutica y los puertos de Odesa con socios europeos.',
    },
    mil2: {
      era: '2022',
      title: 'Doctrina de Defensa Resiliente',
      fact: 'Perfecciona la defensa territorial moderna y la movilización rápida ante amenazas externas.',
    },
    restore: {
      era: '882–1240',
      title: 'Restaurar la Rus de Kiev',
      fact: 'Recobra el esplendor histórico de la gran federación medieval centrada en Kiev.',
      newName: 'Rus de Kiev',
      targets: ['BY', 'RU', 'PL', 'MD'],
    },
  },
  PL: {
    subtitle: 'De los Húsares Alados a la Mancomunidad',
    ancestors: ['Reino de Polonia (1025)', 'Mancomunidad Polaco-Lituana (1569)', 'Polonia'],
    root: {
      era: '1569',
      title: 'Unión de Lublin',
      fact: 'Polonia y Lituania fundaron una de las repúblicas nobiliarias más grandes y tolerantes de Europa.',
    },
    eco1: {
      era: '1791',
      title: 'Constitución del 3 de Mayo',
      fact: 'Polonia promulgó la primera constitución moderna de Europa, impulsando reformas civiles y económicas.',
    },
    mil1: {
      era: '1683',
      title: 'Carga de los Húsares en Viena',
      fact: 'El rey Juan III Sobieski lideró la mayor carga de caballería de la historia para salvar Viena.',
    },
    eco2: {
      era: '1980–2004',
      title: 'Solidaridad y Despegue Europeo',
      fact: 'El movimiento Solidarność cambió Europa del Este y lanzó un crecimiento industrial sostenido.',
    },
    mil2: {
      era: '1920',
      title: 'Milagro del Vístula',
      fact: 'Una brillante contraofensiva aseguró la independencia polaca y estableció una doctrina móvil.',
    },
    restore: {
      era: '1569–1795',
      title: 'Restaurar la Mancomunidad Polaco-Lituana',
      fact: 'Une nuevamente las tierras entre el Báltico y el Mar Negro bajo la Mancomunidad.',
      newName: 'Mancomunidad Polaco-Lituana',
      targets: ['LT', 'BY', 'UA'],
    },
  },
  GR: {
    subtitle: 'Cuna de la Democracia y Heredera de Bizancio',
    ancestors: ['Grecia Clásica', 'Imperio Bizantino (330–1453)', 'Grecia'],
    root: {
      era: '1821',
      title: 'Guerra de Independencia Griega',
      fact: 'En 1821 los helenos se alzaron para restaurar un Estado griego libre en el Egeo.',
    },
    eco1: {
      era: '500 a. C.–2025',
      title: 'Flota Mercante del Egeo',
      fact: 'Desde la Atenas clásica hasta hoy, la marina mercante griega domina las rutas marítimas globales.',
    },
    mil1: {
      era: '480 a. C.',
      title: 'Espíritu de Salamina y las Termópilas',
      fact: 'La defensa de los pasos estrechos y la táctica naval en el Egeo son orgullo de la historia griega.',
    },
    eco2: {
      era: '532',
      title: 'Legado Cultural de Constantinopla',
      fact: 'El derecho, la arquitectura y la diplomacia bizantina fortalecen el prestigio internacional heleno.',
    },
    mil2: {
      era: '1912',
      title: 'Cruceros del Egeo y Defensas Insulares',
      fact: 'Fortifica las islas y prepara a las fuerzas armadas para controlar el Mediterráneo oriental.',
    },
    restore: {
      era: '330–1453',
      title: 'Restaurar el Imperio Bizantino',
      fact: 'Renace el Imperio Romano de Oriente con el águila bicéfala sobre el Egeo y los Balcanes.',
      newName: 'Imperio Bizantino',
      targets: ['TR', 'BG', 'CY', 'MK'],
    },
  },
  AT: {
    subtitle: 'Casa de Habsburgo y Centro del Danubio',
    ancestors: ['Archiducado de Austria', 'Imperio Austrohúngaro (1867)', 'Austria'],
    root: {
      era: '1804',
      title: 'Proclamación del Imperio de Austria',
      fact: 'Viena se erigió como capital diplomática y cultural de Europa central durante el siglo XIX.',
    },
    eco1: {
      era: '1815',
      title: 'Congreso de Viena y Comercio Danubiano',
      fact: 'La diplomacia vienesa trazó un siglo de equilibrio europeo e impulsó el comercio a lo largo del Danubio.',
    },
    mil1: {
      era: '1683',
      title: 'Bastión de Viena',
      fact: 'La defensa victoriosa de Viena y las campañas del príncipe Eugenio consolidaron el poder imperial.',
    },
    eco2: {
      era: '1955',
      title: 'Puente Alpino de Europa Central',
      fact: 'Industria de precisión, banca y neutralidad activa consolidan una economía sumamente estable.',
    },
    mil2: {
      era: '1867',
      title: 'Compromiso Dual del Danubio',
      fact: 'Coordina las fuerzas alpinas y centroeuropeas para defender toda la cuenca del Danubio.',
    },
    restore: {
      era: '1867–1918',
      title: 'Restaurar el Imperio Austrohúngaro',
      fact: 'Reúne la histórica monarquía dual del Danubio bajo el liderazgo de Viena.',
      newName: 'Imperio Austrohúngaro',
      targets: ['HU', 'CZ', 'SK', 'SI', 'HR'],
    },
  },
  HU: {
    subtitle: 'Reino de San Esteban y Corona del Danubio',
    ancestors: ['Principado Magiar (895)', 'Reino de Hungría (1000)', 'Hungría'],
    root: {
      era: '1000',
      title: 'Corona de San Esteban',
      fact: 'El rey Esteban I fundó el Reino de Hungría en el año 1000, anclando la cuenca de los Cárpatos en Europa.',
    },
    eco1: {
      era: '1458–1490',
      title: 'Renacimiento de Matías Corvino',
      fact: 'Buda se convirtió en una de las cortes más cultas, ricas y prósperas de la Europa renacentista.',
    },
    mil1: {
      era: '1456',
      title: 'Ejército Negro y Defensa del Danubio',
      fact: 'Hungría mantuvo uno de los primeros ejércitos profesionales permanentes de Europa.',
    },
    eco2: {
      era: '1873',
      title: 'Unión de Budapest',
      fact: 'La fusión de Buda y Pest creó una gran metrópoli ferroviaria e industrial en el corazón europeo.',
    },
    mil2: {
      era: '1848',
      title: 'Guardia Nacional de 1848',
      fact: 'Inspira la movilización patriótica y las fortificaciones de la llanura panónica.',
    },
    restore: {
      era: '1867–1918',
      title: 'Restaurar el Imperio Austrohúngaro',
      fact: 'Desde Budapest, restaura la gran unión imperial de la cuenca de los Cárpatos y el Danubio.',
      newName: 'Imperio Austrohúngaro',
      targets: ['AT', 'SK', 'RO', 'HR'],
    },
  },
  SE: {
    subtitle: 'De Gustavo Adolfo al Imperio del Báltico',
    ancestors: ['Reinos Nórdicos', 'Imperio Sueco (1611–1721)', 'Suecia'],
    root: {
      era: '1523',
      title: 'Independencia de Gustavo Vasa',
      fact: 'Suecia consolidó un Estado soberano y moderno que pronto lideraría el norte de Europa.',
    },
    eco1: {
      era: '1895',
      title: 'Innovación, Acero y Premios Nobel',
      fact: 'La metalurgia, la industria tecnológica y el legado de Alfred Nobel distinguieron a Suecia en el mundo.',
    },
    mil1: {
      era: '1631',
      title: 'Reformas de Gustavo Adolfo',
      fact: 'La artillería ligera y las armas combinadas suecas revolucionaron la táctica militar europea.',
    },
    eco2: {
      era: '1952',
      title: 'Consejo Nórdico de Cooperación',
      fact: 'Integra el comercio, la ciencia y la diplomacia entre las naciones escandinavas.',
    },
    mil2: {
      era: '1700',
      title: 'Disciplina de los Carolinos',
      fact: 'Prepara fuerzas árticas y navales altamente entrenadas para dominar el Mar Báltico.',
    },
    restore: {
      era: '1611–1721',
      title: 'Restaurar el Imperio Sueco',
      fact: 'Recupera la supremacía nórdica proclamando el histórico Imperio Sueco (Stormaktstiden).',
      newName: 'Imperio Sueco',
      targets: ['NO', 'FI', 'DK', 'EE'],
    },
  },
  DK: {
    subtitle: 'Guardianes de los Estrechos y la Unión de Kalmar',
    ancestors: ['Era Vikinga', 'Unión de Kalmar (1397)', 'Dinamarca'],
    root: {
      era: '965',
      title: 'Piedras de Jelling',
      fact: 'Harald Blåtand unificó Dinamarca hace más de mil años, creando una de las monarquías más antiguas del mundo.',
    },
    eco1: {
      era: '1429–1857',
      title: 'Peaje del Sund y Navieras Globales',
      fact: 'El control de los estrechos del Báltico y las rutas marítimas convirtieron a Copenhague en eje comercial.',
    },
    mil1: {
      era: '1397',
      title: 'Corona de la Reina Margarita I',
      fact: 'Dinamarca articuló la unión política de toda Escandinavia bajo una sola corona en Kalmar.',
    },
    eco2: {
      era: '1970–2025',
      title: 'Energía Eólica y Diseño Nórdico',
      fact: 'Líder en transición energética, logística marítima y cooperación ártica a través de Groenlandia.',
    },
    mil2: {
      era: '1801',
      title: 'Flota de los Estrechos Bálticos',
      fact: 'Asegura el paso entre el Mar del Norte y el Báltico con defensas navales modernas.',
    },
    restore: {
      era: '1397–1523',
      title: 'Restaurar la Unión de Kalmar',
      fact: 'Reunifica a Dinamarca, Noruega y Suecia bajo la bandera histórica de la Unión de Kalmar.',
      newName: 'Unión de Kalmar',
      targets: ['SE', 'NO', 'IS'],
    },
  },
  NO: {
    subtitle: 'De los Fiordos Vikingos a la Unión Nórdica',
    ancestors: ['Reino de Noruega (872)', 'Reino del Mar del Norte', 'Noruega'],
    root: {
      era: '872',
      title: 'Unificación de Hafrsfjord',
      fact: 'Harald Cabellera Hermosa unió los reinos noruegos e inició una gran tradición marítima.',
    },
    eco1: {
      era: '1969',
      title: 'Energía del Mar del Norte y Fondo Soberano',
      fact: 'El petróleo, la hidroelectricidad y el mayor fondo soberano del planeta crearon prosperidad duradera.',
    },
    mil1: {
      era: '1016',
      title: 'Navegantes del Atlántico Norte',
      fact: 'Los marinos noruegos surcaron desde el Mar del Norte hasta Islandia, Groenlandia y Vinlandia.',
    },
    eco2: {
      era: '1905',
      title: 'Soberanía y Flota Mercante',
      fact: 'Tras recuperar su independencia plena en 1905, Noruega desplegó una de las mayores flotas mercantes.',
    },
    mil2: {
      era: '1940',
      title: 'Defensa de los Fiordos y el Ártico',
      fact: 'Fortifica la costa montañosa y coordina la vigilancia del Atlántico Norte.',
    },
    restore: {
      era: '1016–1035',
      title: 'Restaurar la Unión de Kalmar',
      fact: 'Desde Oslo, lidera la gran unión escandinava del Mar del Norte y el Báltico.',
      newName: 'Unión de Kalmar',
      targets: ['SE', 'DK', 'IS'],
    },
  },
  NL: {
    subtitle: 'República Mercantil y Siglo de Oro Neerlandés',
    ancestors: ['Provincias Unidas (1581)', 'Reino Unido de los Países Bajos (1815)', 'Países Bajos'],
    root: {
      era: '1581',
      title: 'Acta de Abjuración',
      fact: 'Las Siete Provincias Unidas proclamaron su independencia y crearon una república pionera en comercio y ciencia.',
    },
    eco1: {
      era: '1602',
      title: 'Compañía de las Indias y Bolsa de Ámsterdam',
      fact: 'Ámsterdam inventó la primera bolsa de valores moderna y dominó el comercio marítimo mundial.',
    },
    mil1: {
      era: '1667',
      title: 'Escuadra del Almirante De Ruyter',
      fact: 'La armada neerlandesa demostró excelencia naval defendiendo sus rutas comerciales globales.',
    },
    eco2: {
      era: '1953–1997',
      title: 'Obras del Plan Delta y Puerto de Róterdam',
      fact: 'La ingeniería hidráulica que ganó tierra al mar y el mayor puerto de Europa impulsan la economía.',
    },
    mil2: {
      era: '1944',
      title: 'Unión del Benelux',
      fact: 'Integra la defensa y logística con los países vecinos del Mar del Norte.',
    },
    restore: {
      era: '1815–1830',
      title: 'Restaurar el Reino Unido de los Países Bajos',
      fact: 'Reúne el Benelux histórico en una potencia comercial y marítima de primer orden.',
      newName: 'Reino Unido de los Países Bajos',
      targets: ['BE', 'LU', 'DE'],
    },
  },
  RS: {
    subtitle: 'De Stefan Dušan a la Federación de los Balcanes',
    ancestors: ['Imperio Serbio (1346)', 'Reino de Yugoslavia (1918)', 'Serbia'],
    root: {
      era: '1804–1878',
      title: 'Levantamientos Serbios e Independencia',
      fact: 'Las insurrecciones del siglo XIX devolvieron a Belgrado su soberanía en el corazón de los Balcanes.',
    },
    eco1: {
      era: '1349',
      title: 'Código de Dušan y Comercio del Danubio',
      fact: 'El histórico código legal y las rutas fluviales de Belgrado impulsaron la organización estatal.',
    },
    mil1: {
      era: '1914',
      title: 'Batalla de Cer y Defensa Balcánica',
      fact: 'La resistencia en los ríos Drina y Danubio forjó una reputación de férrea determinación militar.',
    },
    eco2: {
      era: '1961',
      title: 'Cumbre de Belgrado y Diplomacia',
      fact: 'Belgrado albergó la primera cumbre del Movimiento de Países No Alineados, ganando peso diplomático.',
    },
    mil2: {
      era: '1918',
      title: 'Ejército de los Balcanes Centrales',
      fact: 'Consolida la capacidad de movilización terrestre y las fortalezas de la cuenca balcánica.',
    },
    restore: {
      era: '1918–1992',
      title: 'Restaurar la Federación Yugoslava',
      fact: 'Reunifica a los pueblos eslavos del sur bajo una gran federación balcánica.',
      newName: 'Federación Yugoslava',
      targets: ['HR', 'BA', 'ME', 'MK', 'SI'],
    },
  },
  VA: {
    subtitle: 'Sede Apostólica y Legado de los Estados Pontificios',
    ancestors: ['Estados Pontificios (754–1870)', 'Pactos de Letrán (1929)', 'Ciudad del Vaticano'],
    root: {
      era: '1929',
      title: 'Pactos de Letrán',
      fact: 'El tratado de 1929 reconoció la plena soberanía territorial del Estado de la Ciudad del Vaticano.',
    },
    eco1: {
      era: '1506–1626',
      title: 'Mecenazgo del Renacimiento y Basílica de San Pedro',
      fact: 'El impulso artístico y cultural de Roma atrajo a Miguel Ángel, Rafael y visitantes de todo el mundo.',
    },
    mil1: {
      era: '1506',
      title: 'Guardia Suiza Pontificia',
      fact: 'Fundada por Julio II en 1506, es el cuerpo militar activo más antiguo y leal del planeta.',
    },
    eco2: {
      era: '1962',
      title: 'Diplomacia Universal de la Santa Sede',
      fact: 'Mantiene relaciones diplomáticas con casi todo el planeta, potenciando alianzas internacionales.',
    },
    mil2: {
      era: '1571',
      title: 'Liga Santa del Mediterráneo',
      fact: 'Retoma el histórico llamado diplomático y defensivo que unió flotas europeas en el siglo XVI.',
    },
    restore: {
      era: '754–1870',
      title: 'Restaurar los Estados Pontificios',
      fact: 'Recupera la antigua denominación soberana del centro de la península itálica.',
      newName: 'Estados Pontificios',
      targets: ['IT', 'SM', 'CH'],
    },
  },

  // ======================== ASIA ========================
  CN: {
    subtitle: 'Cinco Milenios de Dinastías y la Ruta de la Seda',
    ancestors: ['Dinastías Qin, Han y Tang', 'Dinastía Ming', 'China'],
    root: {
      era: '221 a. C.',
      title: 'Unificación de Qin y Gran Muralla',
      fact: 'La unificación de escritura, leyes y fronteras creó el Imperio del Medio hace más de dos mil años.',
    },
    eco1: {
      era: '130 a. C.',
      title: 'Ruta de la Seda y Cuatro Grandes Inventos',
      fact: 'Papel, imprenta, brújula y pólvora junto al comercio euroasiático marcaron la historia universal.',
    },
    mil1: {
      era: '1405–1433',
      title: 'Flotas del Tesoro de Zheng He',
      fact: 'Las gigantescas expediciones navales Ming recorrieron el sudeste asiático, la India y África oriental.',
    },
    eco2: {
      era: '1978–2025',
      title: 'Fábrica del Mundo y Nueva Ruta de la Seda',
      fact: 'Trenes de alta velocidad, megapuerto tras megapuerto e industria avanzada multiplican la renta nacional.',
    },
    mil2: {
      era: '500 a. C.',
      title: 'Doctrina de El Arte de la Guerra',
      fact: 'Aplica los principios estratégicos de Sun Tzu para coordinar defensas y grandes ejércitos.',
    },
    restore: {
      era: '1368–1912',
      title: 'Restaurar el Imperio del Medio',
      fact: 'Reclama la majestad histórica de la Dinastía Celestial como gran potencia de Asia Oriental.',
      newName: 'Imperio del Medio',
      targets: ['MN', 'KP', 'VN', 'KZ'],
    },
  },
  JP: {
    subtitle: 'De la Restauración Meiji al Imperio del Sol Naciente',
    ancestors: ['Shogunato Tokugawa', 'Restauración Meiji (1868)', 'Japón'],
    root: {
      era: '1868',
      title: 'Restauración Meiji',
      fact: 'En pocas décadas Japón pasó del feudalismo samurái a ser una potencia industrial y tecnológica moderna.',
    },
    eco1: {
      era: '1964',
      title: 'Tren Bala Shinkansen y Milagro Japonés',
      fact: 'El primer tren de alta velocidad del mundo y la electrónica hicieron de Tokio un referente global.',
    },
    mil1: {
      era: '1905',
      title: 'Doctrina Naval del Almirante Togo',
      fact: 'La disciplina táctica y las escuadras del Pacífico consolidaron la potencia marítima japonesa.',
    },
    eco2: {
      era: '1980–2025',
      title: 'Robótica y Comercio del Pacífico',
      fact: 'La industria de precisión y los astilleros de Osaka y Yokohama fortalecen la economía insular.',
    },
    mil2: {
      era: '1603',
      title: 'Disciplina Bushido y Defensa Insular',
      fact: 'Combina un sistema costero altamente fortificado con tropas profesionales de élite.',
    },
    restore: {
      era: '1868–1945',
      title: 'Proclamar el Imperio del Sol Naciente',
      fact: 'Alza nuevamente el histórico título imperial nipón sobre el archipiélago y el Pacífico occidental.',
      newName: 'Imperio del Sol Naciente',
      targets: ['KR', 'PH', 'CN'],
    },
  },
  IN: {
    subtitle: 'De los Imperios Maurya y Gupta a la Potencia del Índico',
    ancestors: ['Imperio Maurya (322 a. C.)', 'Imperio Gupta', 'India'],
    root: {
      era: '1947',
      title: 'Independencia de la India',
      fact: 'El 15 de agosto de 1947 nació la democracia más poblada del planeta, heredera de civilizaciones milenarias.',
    },
    eco1: {
      era: '320–550',
      title: 'Edad de Oro Gupta y Matemáticas',
      fact: 'La invención del sistema decimal, el cero y el comercio del Índico enriquecieron al subcontinente.',
    },
    mil1: {
      era: '322 a. C.',
      title: 'Estrategia de Chandragupta y Chanakya',
      fact: 'El tratado Arthashastra sistematizó la geopolítica, el espionaje y los ejércitos unificados de la India.',
    },
    eco2: {
      era: '2023',
      title: 'Misión Chandrayaan y Polo Tecnológico',
      fact: 'El alunizaje en el polo sur lunar y la industria informática consolidan el auge económico indio.',
    },
    mil2: {
      era: '1971',
      title: 'Escudo del Himalaya y del Océano Índico',
      fact: 'Refuerza el despliegue fronterizo en el norte y la armada del Océano Índico.',
    },
    restore: {
      era: '322–185 a. C.',
      title: 'Restaurar el Imperio Maurya',
      fact: 'Reunifica el subcontinente bajo el legendario Imperio Maurya de Ashoka y Chandragupta.',
      newName: 'Imperio Maurya',
      targets: ['PK', 'BD', 'NP', 'LK'],
    },
  },
  TR: {
    subtitle: 'De la Sublime Puerta a la República de Anatolia',
    ancestors: ['Imperio Selyúcida', 'Imperio Otomano (1299–1922)', 'Turquía'],
    root: {
      era: '1923',
      title: 'República de Atatürk',
      fact: 'Mustafa Kemal Atatürk defendió Anatolia y fundó la República de Turquía modernizando el Estado.',
    },
    eco1: {
      era: '1453–1600',
      title: 'Encrucijada del Bósforo',
      fact: 'Estambul controla el puente comercial estratégico entre Europa, Asia y el Mar Negro.',
    },
    mil1: {
      era: '1453',
      title: 'Cuerpo de Jenízaros y Artillería',
      fact: 'La ingeniería de asedio y la disciplina militar otomana dominaron tres continentes durante siglos.',
    },
    eco2: {
      era: '1973–2025',
      title: 'Puentes de Eurasia e Industria',
      fact: 'Los enlaces intercontinentales sobre el Bósforo y la manufactura potencian los ingresos turcos.',
    },
    mil2: {
      era: '1915',
      title: 'Defensa de Galípoli',
      fact: 'La defensa victoriosa de los Dardanelos inspira unas defensas costeras y terrestres formidables.',
    },
    restore: {
      era: '1299–1922',
      title: 'Restaurar el Imperio Otomano',
      fact: 'Reclama la herencia de Solimán el Magnífico restaurando el histórico Imperio Otomano.',
      newName: 'Imperio Otomano',
      targets: ['GR', 'SY', 'IQ', 'BG'],
    },
  },
  IR: {
    subtitle: 'Herederos de Ciro el Grande y el Imperio Persa',
    ancestors: ['Imperio Aqueménida (550 a. C.)', 'Imperio Sasánida y Safávida', 'Irán'],
    root: {
      era: '550 a. C.',
      title: 'Cilindro de Ciro y Camino Real',
      fact: 'Ciro el Grande unificó Persia y creó el primer sistema postal y administrativo transcontinental.',
    },
    eco1: {
      era: '1598',
      title: 'Esplendor de Isfahán',
      fact: 'La capital safávida floreció como joya de la Ruta de la Seda, la arquitectura y el comercio de sedas.',
    },
    mil1: {
      era: '520 a. C.',
      title: 'Los Inmortales de Persia',
      fact: 'La guardia de élite aqueménida representó la disciplina militar y logística de la meseta iraní.',
    },
    eco2: {
      era: '1951',
      title: 'Recursos del Golfo y Meseta Iraní',
      fact: 'El control del Estrecho de Ormuz y las reservas energéticas fortalecen el tesoro estatal.',
    },
    mil2: {
      era: '224–651',
      title: 'Catafractos y Bastión de los Zagros',
      fact: 'Aprovecha las cadenas montañosas persas para construir una defensa territorial inquebrantable.',
    },
    restore: {
      era: '550 a. C.–651 d. C.',
      title: 'Restaurar el Imperio Persa',
      fact: 'Recupera el nombre milenario del Imperio Persa desde el Tigris hasta Asia Central.',
      newName: 'Imperio Persa',
      targets: ['IQ', 'AF', 'AZ', 'TM'],
    },
  },
  MN: {
    subtitle: 'Estepas de Gengis Kan y el Mayor Imperio Contiguo',
    ancestors: ['Confederación Xiongnu', 'Imperio Mongol (1206)', 'Mongolia'],
    root: {
      era: '1206',
      title: 'Kurultái de Gengis Kan',
      fact: 'En 1206 Temüjin unificó las tribus de la estepa y fundó el Imperio Mongol, el mayor imperio contiguo de la historia.',
    },
    eco1: {
      era: '1250–1350',
      title: 'Pax Mongolica y Sistema Yam',
      fact: 'Las postas a caballo garantizaron comercio seguro, moneda y comunicaciones de China hasta Europa.',
    },
    mil1: {
      era: '1220',
      title: 'Táctica de los Tumens',
      fact: 'La organización decimal y la movilidad de la caballería arquera derrotaron ejércitos mucho mayores.',
    },
    eco2: {
      era: '1990–2025',
      title: 'Minería del Gobi y Rutas Euroasiáticas',
      fact: 'El cobre, el carbón y el tránsito entre Rusia y China impulsan la economía mongola moderna.',
    },
    mil2: {
      era: '1271',
      title: 'Estandarte de las Nueve Colas',
      fact: 'Moviliza una fuerza rápida de choque capaz de expandirse por las llanuras de Asia.',
    },
    restore: {
      era: '1206–1368',
      title: 'Restaurar el Imperio Mongol',
      fact: 'Alza el estandarte de Karakórum y proclama nuevamente el legendario Imperio Mongol.',
      newName: 'Imperio Mongol',
      targets: ['CN', 'RU', 'KZ'],
    },
  },
  SA: {
    subtitle: 'Corazón de la Península Arábiga',
    ancestors: ['Primer Estado Saudí (1744)', 'Reinos del Hiyaz y Néyed', 'Arabia Saudita'],
    root: {
      era: '1932',
      title: 'Unificación del Reino de Arabia Saudita',
      fact: 'Abdulaziz bin Saúd unificó Néyed y el Hiyaz en 1932 formando el reino moderno de la península.',
    },
    eco1: {
      era: '1938',
      title: 'Descubrimiento del Pozo Dammam N.º 7',
      fact: 'El hallazgo petrolero en la Provincia Oriental convirtió al reino en eje de la economía energética mundial.',
    },
    mil1: {
      era: '1902',
      title: 'Toma de la Fortaleza de Masmak',
      fact: 'La audaz operación en Riad inició la reunificación militar y política de Arabia.',
    },
    eco2: {
      era: '2016–2030',
      title: 'Visión de Diversificación y Puertos del Mar Rojo',
      fact: 'Megaciudades, comercio marítimo y finanzas soberanas consolidan un flujo constante de riqueza.',
    },
    mil2: {
      era: '1981',
      title: 'Escudo de la Península',
      fact: 'Coordina la defensa aérea y terrestre de los estados árabes del Golfo.',
    },
    restore: {
      era: '632–1932',
      title: 'Proclamar la Federación de Arabia',
      fact: 'Unifica las tierras históricas de la Península Arábiga bajo un solo mando soberano.',
      newName: 'Federación de Arabia',
      targets: ['AE', 'OM', 'YE', 'KW', 'QA'],
    },
  },
  KR: {
    subtitle: 'De Goryeo y Joseon al Milagro del Río Han',
    ancestors: ['Tres Reinos y Goryeo', 'Dinastía Joseon (1392)', 'Corea del Sur'],
    root: {
      era: '1443',
      title: 'Invención del Hangul por el Rey Sejong',
      fact: 'La creación del alfabeto coreano impulsó la alfabetización, la ciencia y la identidad cultural.',
    },
    eco1: {
      era: '1962–1996',
      title: 'Milagro del Río Han',
      fact: 'Corea del Sur pasó de la posguerra a convertirse en gigante mundial de semiconductores, barcos y automóviles.',
    },
    mil1: {
      era: '1592',
      title: 'Barcos Tortuga del Almirante Yi Sun-sin',
      fact: 'Los acorazados Geobukseon permanecieron invictos en 23 batallas navales defendiendo Corea.',
    },
    eco2: {
      era: '2000–2025',
      title: 'Ola Hallyu y Alta Tecnología',
      fact: 'La exportación cultural y tecnológica eleva el prestigio diplomático y económico global.',
    },
    mil2: {
      era: '1953',
      title: 'Fortificación Peninsular y Defensa Moderna',
      fact: 'Crea una industria de defensa propia y una línea fortificada de alta tecnología.',
    },
    restore: {
      era: '918–1910',
      title: 'Restaurar el Gran Imperio de Corea',
      fact: 'Reunifica la península coreana retomando el legado histórico de Goryeo y el Gran Imperio Coreano.',
      newName: 'Gran Imperio de Corea',
      targets: ['KP', 'JP', 'CN'],
    },
  },
  KP: {
    subtitle: 'Herencia de Goguryeo y la Península del Norte',
    ancestors: ['Reino de Goguryeo (37 a. C.)', 'Dinastía Goryeo', 'Corea del Norte'],
    root: {
      era: '37 a. C.',
      title: 'Legado del Reino de Goguryeo',
      fact: 'Con capital en Pionyang, Goguryeo fue la mayor potencia militar de la antigua Corea y Manchuria.',
    },
    eco1: {
      era: '1956',
      title: 'Industrialización Pesada del Norte',
      fact: 'Aprovecha la minería y la siderurgia de las montañas del norte para sostener la producción estatal.',
    },
    mil1: {
      era: '612',
      title: 'Victoria del Río Salsu',
      fact: 'El general Eulji Mundeok derrotó una invasión masiva mediante defensas hidráulicas y emboscadas.',
    },
    eco2: {
      era: '1970',
      title: 'Autosuficiencia y Minería Estratégica',
      fact: 'Refuerza la extracción de minerales y la planificación interna de suministros.',
    },
    mil2: {
      era: '1950–2025',
      title: 'Fortaleza de Montaña del Norte',
      fact: 'Convierte la geografía montañosa en un sistema defensivo subterráneo de gran resistencia.',
    },
    restore: {
      era: '37 a. C.–668',
      title: 'Restaurar el Reino de Goguryeo',
      fact: 'Reunifica la península bajo el nombre histórico de la potencia guerrera de Goguryeo.',
      newName: 'Imperio de Goguryeo',
      targets: ['KR', 'CN'],
    },
  },
  VN: {
    subtitle: 'Mil Años de Resistencia y Dai Viet',
    ancestors: ['Reino de Au Lac', 'Imperio de Dai Viet (1054)', 'Vietnam'],
    root: {
      era: '938',
      title: 'Victoria del Río Bach Dang',
      fact: 'Ngo Quyen expulsó el dominio imperial extranjero usando estacas ocultas bajo la marea y fundó un Vietnam libre.',
    },
    eco1: {
      era: '1986',
      title: 'Reformas Doi Moi',
      fact: 'La apertura manufacturera y los puertos del Delta del Mekong convirtieron a Vietnam en motor industrial asiático.',
    },
    mil1: {
      era: '1288',
      title: 'Genio de Tran Hung Dao',
      fact: 'Vietnam rechazó tres invasiones del Imperio Mongol, una hazaña única en Asia continental.',
    },
    eco2: {
      era: '1995',
      title: 'Integración ASEAN y Comercio del Pacífico',
      fact: 'Hanói y Ho Chi Minh lideran las cadenas comerciales del sudeste asiático.',
    },
    mil2: {
      era: '1954',
      title: 'Estrategia de Dien Bien Phu',
      fact: 'La logística audaz en terrenos difíciles y la guerra defensiva fortalecen enormemente al ejército.',
    },
    restore: {
      era: '1054–1804',
      title: 'Restaurar el Imperio de Dai Viet',
      fact: 'Proclama el renacimiento del histórico Imperio de Dai Viet como potencia de Indochina.',
      newName: 'Imperio de Dai Viet',
      targets: ['LA', 'KH', 'TH'],
    },
  },
  TH: {
    subtitle: 'El Reino Jamás Colonizado del Sudeste Asiático',
    ancestors: ['Reino de Sukhothai (1238)', 'Reino de Ayutthaya', 'Tailandia'],
    root: {
      era: '1238',
      title: 'Fundación de Sukhothai',
      fact: 'El primer gran reino tailandés creó la escritura thai y sentó las bases de la identidad nacional.',
    },
    eco1: {
      era: '1351–1767',
      title: 'Comercio Cosmopolita de Ayutthaya',
      fact: 'Ayutthaya fue una de las ciudades más grandes y ricas del mundo, comerciando con Europa, Persia y China.',
    },
    mil1: {
      era: '1767–1782',
      title: 'Reunificación de Taksin y Bangkok',
      fact: 'El reino se levantó de sus cenizas, recuperó su territorio y estableció la dinastía Chakri en Bangkok.',
    },
    eco2: {
      era: '1868–1910',
      title: 'Diplomacia del Rey Chulalongkorn',
      fact: 'Gracias a reformas brillantes y diplomacia hábil, Siam fue el único país del sudeste asiático nunca colonizado.',
    },
    mil2: {
      era: '1967',
      title: 'Pilar Defensivo de Indochina',
      fact: 'Asegura el golfo de Tailandia y las rutas centrales del continente sudasiático.',
    },
    restore: {
      era: '1782–1939',
      title: 'Restaurar el Gran Reino de Siam',
      fact: 'Recobra el nombre histórico de Siam liderando la prosperidad del sudeste asiático.',
      newName: 'Reino de Siam',
      targets: ['LA', 'KH', 'MM', 'MY'],
    },
  },
  ID: {
    subtitle: 'Del Imperio Marítimo Majapahit al Archipiélago Unido',
    ancestors: ['Reino de Srivijaya', 'Imperio Majapahit (1293)', 'Indonesia'],
    root: {
      era: '1945',
      title: 'Proclamación de Yakarta',
      fact: 'El 17 de agosto de 1945 Indonesia proclamó su independencia uniendo más de 17.000 islas bajo un solo lema.',
    },
    eco1: {
      era: '650–1377',
      title: 'Rutas de las Especias de Srivijaya',
      fact: 'El control del Estrecho de Malaca y las islas de las especias generó una enorme riqueza marítima.',
    },
    mil1: {
      era: '1336',
      title: 'Juramento Palapa de Gajah Mada',
      fact: 'El gran primer ministro de Majapahit juró unificar todo el archipiélago de Nusantara.',
    },
    eco2: {
      era: '1955',
      title: 'Conferencia de Bandung',
      fact: 'Indonesia lideró la histórica cumbre afroasiática, consolidando su peso diplomático mundial.',
    },
    mil2: {
      era: '1967',
      title: 'Armada de los Estrechos',
      fact: 'Protege los mares interiores del archipiélago y refuerza la capacidad anfibia.',
    },
    restore: {
      era: '1293–1527',
      title: 'Restaurar el Imperio Majapahit',
      fact: 'Unifica los mares de Nusantara bajo el esplendor histórico del Imperio Majapahit.',
      newName: 'Imperio Majapahit',
      targets: ['MY', 'SG', 'BN', 'TL'],
    },
  },
  IQ: {
    subtitle: 'Cuna de la Civilización entre el Tigris y el Éufrates',
    ancestors: ['Sumeria y Babilonia', 'Califato Abasí de Bagdad', 'Irak'],
    root: {
      era: '1750 a. C.',
      title: 'Código de Hammurabi',
      fact: 'Mesopotamia dio al mundo la escritura cuneiforme, la rueda y el primer gran código legal escrito.',
    },
    eco1: {
      era: '762–1258',
      title: 'Casa de la Sabiduría de Bagdad',
      fact: 'Durante la Edad de Oro abasí, Bagdad fue la capital científica, comercial y cultural del planeta.',
    },
    mil1: {
      era: '605 a. C.',
      title: 'Murallas de Babilonia',
      fact: 'Las imponentes fortificaciones mesopotámicas protegieron los valles fértiles durante siglos.',
    },
    eco2: {
      era: '1927',
      title: 'Riqueza Petrolera del Tigris',
      fact: 'El desarrollo energético y agrícola de los dos ríos reconstruye el tesoro nacional.',
    },
    mil2: {
      era: '1932',
      title: 'Guardia de Mesopotamia',
      fact: 'Moderniza las brigadas terrestres para defender el corazón de Oriente Medio.',
    },
    restore: {
      era: '1894–539 a. C.',
      title: 'Restaurar el Imperio de Babilonia',
      fact: 'Revive la gloria milenaria de Mesopotamia proclamando el Imperio de Babilonia.',
      newName: 'Imperio de Babilonia',
      targets: ['SY', 'KW', 'JO'],
    },
  },

  // ======================== ÁFRICA ========================
  EG: {
    subtitle: 'Cinco Mil Años del Nilo al Canal de Suez',
    ancestors: ['Antiguo Egipto Faraónico', 'Sultanato Mameluco', 'Egipto'],
    root: {
      era: '3100 a. C.',
      title: 'Unificación del Alto y Bajo Egipto',
      fact: 'La unión de los dos reinos del Nilo dio origen al Estado continuo más antiguo de la historia.',
    },
    eco1: {
      era: '1869',
      title: 'Canal de Suez',
      fact: 'La apertura del Canal de Suez conectó el Mediterráneo con el Mar Rojo y revolucionó el comercio global.',
    },
    mil1: {
      era: '1260',
      title: 'Victoria de Ain Yalut',
      fact: 'Las fuerzas egipcias detuvieron por primera vez el avance imparable del Imperio Mongol en Oriente Medio.',
    },
    eco2: {
      era: '1970',
      title: 'Presa de Asuán y Delta del Nilo',
      fact: 'El control de las aguas del Nilo garantizó electricidad, cosechas y crecimiento urbano en El Cairo.',
    },
    mil2: {
      era: '1956–1973',
      title: 'Soberanía del Suez y Defensa del Sinaí',
      fact: 'La nacionalización del canal y el cruce de 1973 forjaron una potente doctrina militar regional.',
    },
    restore: {
      era: '1550–1070 a. C.',
      title: 'Restaurar el Imperio Egipcio',
      fact: 'Proclama el renacimiento del Imperio del Nilo proyectando su influencia por África y el Levante.',
      newName: 'Imperio Egipcio',
      targets: ['SD', 'LY', 'PS', 'JO'],
    },
  },
  ET: {
    subtitle: 'Imperio de Aksum y Símbolo de África Libre',
    ancestors: ['Reino de Aksum (100 d. C.)', 'Imperio de Abisinia', 'Etiopía'],
    root: {
      era: '100 d. C.',
      title: 'Civilización de Aksum',
      fact: 'Aksum acuñó su propia moneda, levantó obeliscos monumentales y comerciaba con Roma y la India.',
    },
    eco1: {
      era: '1963',
      title: 'Capital Diplomática de África',
      fact: 'Adís Abeba es la sede fundacional de la Unión Africana y corazón político del continente.',
    },
    mil1: {
      era: '1896',
      title: 'Victoria de Adua',
      fact: 'Etiopía derrotó a una potencia colonial europea en Adua, manteniéndose libre e inspirando a toda África.',
    },
    eco2: {
      era: '2020–2025',
      title: 'Gran Presa del Renacimiento',
      fact: 'La mayor obra hidroeléctrica de África multiplica la energía y los ingresos del país.',
    },
    mil2: {
      era: '1270',
      title: 'Fortalezas del Macizo Etíope',
      fact: 'Las tierras altas forman una ciudadela natural ideal para defender el Cuerno de África.',
    },
    restore: {
      era: '1270–1974',
      title: 'Restaurar el Imperio de Abisinia',
      fact: 'Recobra el título imperial milenario de Abisinia liderando el Cuerno de África.',
      newName: 'Imperio de Abisinia',
      targets: ['ER', 'DJ', 'SO', 'SS'],
    },
  },
  MA: {
    subtitle: 'Puerta del Estrecho y Legado Almohade',
    ancestors: ['Dinastía Idrisí (788)', 'Imperio Almorávide y Almohade', 'Marruecos'],
    root: {
      era: '788',
      title: 'Fundación de Fez',
      fact: 'Fez albergó la universidad más antigua en funcionamiento del mundo (Al-Qarawiyyin, 859).',
    },
    eco1: {
      era: '1147–1269',
      title: 'Rutas Transaharianas y del Estrecho',
      fact: 'Marruecos conectó el oro de África occidental con los mercados del Mediterráneo y el Atlántico.',
    },
    mil1: {
      era: '1578',
      title: 'Batalla de Alcazarquivir',
      fact: 'La victoria decisiva de los Tres Reyes preservó la soberanía marroquí durante siglos.',
    },
    eco2: {
      era: '2007–2025',
      title: 'Puerto Tánger-Med y Energía Solar',
      fact: 'El mayor puerto de África y sus parques solares consolidan a Marruecos como puente euroafricano.',
    },
    mil2: {
      era: '1956',
      title: 'Guardianes del Atlas y el Estrecho',
      fact: 'Fortalece las posiciones montañosas del Atlas y las costas atlánticas.',
    },
    restore: {
      era: '1147–1269',
      title: 'Restaurar el Imperio Almohade',
      fact: 'Revive la gran potencia del Magreb occidental bajo el nombre histórico del Imperio Almohade.',
      newName: 'Imperio Almohade',
      targets: ['DZ', 'MR', 'TN', 'ES'],
    },
  },
  TN: {
    subtitle: 'De la Legendaria Cartago al Mediterráneo',
    ancestors: ['República de Cartago (814 a. C.)', 'Reino Hafsí', 'Túnez'],
    root: {
      era: '814 a. C.',
      title: 'Fundación de Cartago',
      fact: 'Cartago se convirtió en la gran república comercial y marítima que rivalizó con Roma por el Mediterráneo.',
    },
    eco1: {
      era: '500 a. C.',
      title: 'Puerto Circular de Cartago',
      fact: 'Los navegantes cartagineses exploraron el Atlántico africano y tejieron una vasta red de puertos.',
    },
    mil1: {
      era: '218 a. C.',
      title: 'Estrategia de Aníbal Barca',
      fact: 'El cruce de los Alpes y la maniobra de Cannas siguen estudiándose en todas las academias militares.',
    },
    eco2: {
      era: '1956',
      title: 'Modernización y Educación del Magreb',
      fact: 'Tras su independencia, Túnez destacó por su infraestructura mediterránea y apertura diplomática.',
    },
    mil2: {
      era: '1881–1956',
      title: 'Centinela del Canal de Sicilia',
      fact: 'Refuerza la defensa costera en el punto más estratégico entre Europa y África.',
    },
    restore: {
      era: '814–146 a. C.',
      title: 'Restaurar la República de Cartago',
      fact: 'Resucita la legendaria potencia naval y mercantil de Cartago en el corazón del Mediterráneo.',
      newName: 'República de Cartago',
      targets: ['LY', 'DZ', 'IT', 'MT'],
    },
  },
  ML: {
    subtitle: 'Imperio del Oro y Bibliotecas de Tombuctú',
    ancestors: ['Imperio de Ghana', 'Imperio de Malí (1235)', 'Malí'],
    root: {
      era: '1235',
      title: 'Carta de Mandén de Sundiata Keïta',
      fact: 'El fundador del Imperio de Malí promulgó una de las cartas de derechos humanos más antiguas del mundo.',
    },
    eco1: {
      era: '1324',
      title: 'Riqueza de Mansa Musa',
      fact: 'El oro del Imperio de Malí y su famosa peregrinación asombraron a todo el Mediterráneo y Oriente Medio.',
    },
    mil1: {
      era: '1235',
      title: 'Caballería del Níger',
      fact: 'Los ejércitos mandingas aseguraron las rutas caravaneras desde el Atlántico hasta el Sáhara.',
    },
    eco2: {
      era: '1400–1591',
      title: 'Universidad de Sankore en Tombuctú',
      fact: 'Cientos de miles de manuscritos convirtieron a Tombuctú en faro mundial del saber y el comercio.',
    },
    mil2: {
      era: '1464',
      title: 'Herencia Songhai del Sahel',
      fact: 'Organiza columnas rápidas del desierto para defender el gran arco del río Níger.',
    },
    restore: {
      era: '1235–1600',
      title: 'Restaurar el Imperio de Malí',
      fact: 'Recobra el esplendor dorado del Imperio de Malí en toda África Occidental.',
      newName: 'Imperio de Malí',
      targets: ['SN', 'GN', 'BF', 'NE'],
    },
  },
  NG: {
    subtitle: 'De los Bronces de Benín al Gigante de África',
    ancestors: ['Reino de Benín e Imperio Oyo', 'Califato de Sokoto', 'Nigeria'],
    root: {
      era: '1960',
      title: 'Independencia de la Federación Nigeriana',
      fact: 'Heredera de Nok, Benín y Sokoto, Nigeria nació como la nación más poblada y dinámica de África.',
    },
    eco1: {
      era: '1440–1897',
      title: 'Artesanos y Comercio de Benín y Kano',
      fact: 'Los célebres bronces de Benín y las rutas de Kano crearon grandes centros urbanos y comerciales.',
    },
    mil1: {
      era: '1804',
      title: 'Unificación de Sokoto',
      fact: 'Consolidó una de las administraciones y fuerzas militares más extensas del África precolonial.',
    },
    eco2: {
      era: '1975–2025',
      title: 'Lagos, Nollywood y Motor de la CEDEAO',
      fact: 'La energía, las finanzas de Lagos y su industria cultural lideran la economía africana.',
    },
    mil2: {
      era: '1990',
      title: 'Fuerza de Estabilización Occidental',
      fact: 'Despliega el mayor ejército de África Occidental para asegurar la región del Golfo de Guinea.',
    },
    restore: {
      era: '1804–1903',
      title: 'Proclamar el Imperio de Benín y Sokoto',
      fact: 'Fusiona el legado de los grandes reinos nigerianos en una superpotencia de África Occidental.',
      newName: 'Imperio de Benín y Sokoto',
      targets: ['BJ', 'CM', 'NE', 'GH'],
    },
  },
  ZA: {
    subtitle: 'Cabo de Buena Esperanza y Nación Arcoíris',
    ancestors: ['Reinos Zulú y Xhosa', 'Unión Sudafricana (1910)', 'Sudáfrica'],
    root: {
      era: '1994',
      title: 'Transición Democrática de Mandela',
      fact: 'El fin del apartheid y el liderazgo de Nelson Mandela inspiraron la reconciliación en todo el planeta.',
    },
    eco1: {
      era: '1886',
      title: 'Oro y Diamantes de Johannesburgo',
      fact: 'La riqueza minera del Witwatersrand levantó el mayor centro financiero e industrial del África austral.',
    },
    mil1: {
      era: '1816–1879',
      title: 'Táctica de los Cuernos del Búfalo',
      fact: 'El ingenio táctico de Shaka Zulú revolucionó el combate de infantería en el sur de África.',
    },
    eco2: {
      era: '1967',
      title: 'Pioneros Médicos y Puertos del Cabo',
      fact: 'Desde el primer trasplante cardíaco en Ciudad del Cabo hasta el comercio entre dos océanos.',
    },
    mil2: {
      era: '1910',
      title: 'Centinela de Dos Océanos',
      fact: 'Controla el paso marítimo del Cabo de Buena Esperanza entre el Atlántico y el Índico.',
    },
    restore: {
      era: '1910',
      title: 'Proclamar la Unión de África Austral',
      fact: 'Consolida una poderosa federación meridional uniendo las naciones del sur africano.',
      newName: 'Unión de África Austral',
      targets: ['NA', 'BW', 'ZW', 'LS', 'SZ'],
    },
  },
  ZW: {
    subtitle: 'Herederos de las Murallas del Gran Zimbabue',
    ancestors: ['Reino del Gran Zimbabue (1100)', 'Imperio Mutapa', 'Zimbabue'],
    root: {
      era: '1100–1450',
      title: 'Ciudad de Piedra del Gran Zimbabue',
      fact: 'Sus monumentales murallas de granito sin argamasa fueron la capital de un próspero reino del oro.',
    },
    eco1: {
      era: '1430',
      title: 'Comercio de Oro del Imperio Mutapa',
      fact: 'Las minas de la meseta conectaban directamente con las caravanas y barcos del Océano Índico.',
    },
    mil1: {
      era: '1980',
      title: 'Independencia de Zimbabue',
      fact: 'Tras una larga lucha de liberación, el país adoptó el nombre de su legendaria civilización ancestral.',
    },
    eco2: {
      era: '1960',
      title: 'Presa de Kariba y Agricultura de la Meseta',
      fact: 'Aprovecha la energía del Zambeze y las tierras fértiles para revitalizar las arcas.',
    },
    mil2: {
      era: '1450',
      title: 'Bastión del Zambeze',
      fact: 'Fortifica las rutas comerciales y las mesetas del sur africano.',
    },
    restore: {
      era: '1100–1629',
      title: 'Restaurar el Imperio del Gran Zimbabue',
      fact: 'Revive la grandeza de los constructores de piedra en el África austral.',
      newName: 'Imperio del Gran Zimbabue',
      targets: ['ZM', 'MZ', 'BW'],
    },
  },

  // ======================== OCEANÍA ========================
  AU: {
    subtitle: 'De la Federación de 1901 a Australasia',
    ancestors: ['Pueblos Aborígenes (60.000 años)', 'Colonias Australianas', 'Australia'],
    root: {
      era: '1901',
      title: 'Federación de la Mancomunidad de Australia',
      fact: 'Las seis colonias se unieron pacíficamente el 1 de enero de 1901 para gobernar todo un continente.',
    },
    eco1: {
      era: '1851–1900',
      title: 'Fiebre del Oro y Minería Continental',
      fact: 'El oro de Victoria y los inmensos yacimientos minerales financiaron ciudades y puertos de clase mundial.',
    },
    mil1: {
      era: '1915',
      title: 'Espíritu ANZAC',
      fact: 'La camaradería y valor de las tropas australianas y neozelandesas definieron la identidad militar del país.',
    },
    eco2: {
      era: '1973–2025',
      title: 'Ópera de Sídney y Puente Indo-Pacífico',
      fact: 'Ciencia, exportación de recursos y comercio marítimo hacen de Australia un pilar del Pacífico.',
    },
    mil2: {
      era: '1942',
      title: 'Escudo del Mar del Coral',
      fact: 'Fortifica el norte y despliega una flota capaz de proteger todo el Pacífico Sur.',
    },
    restore: {
      era: '1901',
      title: 'Proclamar la Federación de Australasia',
      fact: 'Integra el continente australiano y el Pacífico Sur en una gran federación oceánica.',
      newName: 'Federación de Australasia',
      targets: ['NZ', 'PG', 'FJ'],
    },
  },
  NZ: {
    subtitle: 'Aotearoa: Navegantes Maoríes y Pioneros Democráticos',
    ancestors: ['Navegantes Polinesios Maoríes', 'Tratado de Waitangi (1840)', 'Nueva Zelanda'],
    root: {
      era: '1840',
      title: 'Tratado de Waitangi',
      fact: 'El pacto fundacional de 1840 sentó las bases modernas de Aotearoa Nueva Zelanda.',
    },
    eco1: {
      era: '1893',
      title: 'Primer País con Sufragio Femenino',
      fact: 'En 1893 Nueva Zelanda hizo historia mundial al ser el primer país en aprobar el voto femenino.',
    },
    mil1: {
      era: '1915',
      title: 'Cuerpo ANZAC y Batallón Maorí',
      fact: 'Sus unidades ganaron admiración internacional por su valentía y disciplina en ambos hemisferios.',
    },
    eco2: {
      era: '1882–2025',
      title: 'Comercio Refrigerado y Energía Geotérmica',
      fact: 'Pioneros del transporte marítimo refrigerado y de energías limpias en el Pacífico Sur.',
    },
    mil2: {
      era: '1280',
      title: 'Rutas Oceánicas de Polinesia',
      fact: 'Combina la tradición marítima del Pacífico con patrullaje y defensa insular moderna.',
    },
    restore: {
      era: '1840',
      title: 'Proclamar la Mancomunidad de Aotearoa',
      fact: 'Erige a Aotearoa como gran unión marítima de las islas del Pacífico Sur.',
      newName: 'Mancomunidad de Aotearoa',
      targets: ['AU', 'FJ', 'WS', 'TO'],
    },
  },
  TO: {
    subtitle: 'El Reino Insular que Dominó el Pacífico',
    ancestors: ['Cultura Lapita', 'Imperio Tu’i Tonga (950–1865)', 'Tonga'],
    root: {
      era: '950',
      title: 'Dinastía Tu’i Tonga',
      fact: 'Tonga construyó un vasto imperio marítimo polinesio y nunca perdió formalmente su monarquía soberana.',
    },
    eco1: {
      era: '1200',
      title: 'Trilito Ha’amonga y Rutas de Canoas',
      fact: 'Los monumentos megalíticos y el comercio interinsular demostraron una ingeniería marítima admirable.',
    },
    mil1: {
      era: '1845',
      title: 'Unificación de Jorge Tupou I',
      fact: 'Unificó el archipiélago, abolió la servidumbre y promulgó la constitución de 1875.',
    },
    eco2: {
      era: '1970',
      title: 'Foro de las Islas del Pacífico',
      fact: 'Lidera la diplomacia oceánica y el aprovechamiento sostenible de la inmensa zona marítima.',
    },
    mil2: {
      era: '1400',
      title: 'Flota de Doble Casco (Kalia)',
      fact: 'Inspirada en las legendarias canoas de guerra polinesias, proyecta fuerza en el Pacífico.',
    },
    restore: {
      era: '950–1865',
      title: 'Restaurar el Imperio Tu’i Tonga',
      fact: 'Revive la gran talasocracia polinesia que unió a los archipiélagos del Pacífico Sur.',
      newName: 'Imperio Tu’i Tonga',
      targets: ['WS', 'FJ', 'NZ'],
    },
  },
};

// Specific curated formable names & historical deeds for ALL other iconic nations
// so every country on Earth feels historically authentic!
interface RegionalQuickSpec {
  ancestors: string[];
  restoredName: string;
  era: string;
  rootDeed: string;
  ecoDeed: string;
  milDeed: string;
  restoreFact: string;
  targets?: string[];
}

const COUNTRY_QUICK_SPECS: Record<string, RegionalQuickSpec> = {
  // América extra
  CR: {
    ancestors: ['Provincia de Costa Rica', 'República Federal (1823)', 'Costa Rica'],
    restoredName: 'República Federal de Centroamérica',
    era: '1823–1839',
    rootDeed: 'En 1821 proclamó su independencia pacífica y en 1948 abolió el ejército para invertir en educación y paz.',
    ecoDeed: 'El café, la conservación ambiental y la alta tecnología convirtieron al país en modelo regional.',
    milDeed: 'En 1856 la Campaña Nacional de Santa Rosa y Rivas defendió la libertad de toda Centroamérica.',
    restoreFact: 'Desde San José, impulsa una moderna unión democrática de las repúblicas centroamericanas.',
    targets: ['NI', 'PA', 'HN', 'SV', 'GT'],
  },
  SV: {
    ancestors: ['Señorío de Cuzcatlán', 'Provincia de San Salvador', 'El Salvador'],
    restoredName: 'República Federal de Centroamérica',
    era: '1823–1839',
    rootDeed: 'El primer grito de independencia centroamericano resonó en San Salvador el 5 de noviembre de 1811.',
    ecoDeed: 'El añil, el café y la industria portuaria del Pacífico dinamizaron la economía salvadoreña.',
    milDeed: 'Francisco Morazán lideró desde San Salvador la defensa histórica de la unión centroamericana.',
    restoreFact: 'Reunifica el sueño federal de Morazán bajo la República Federal de Centroamérica.',
    targets: ['GT', 'HN', 'NI', 'CR'],
  },
  HN: {
    ancestors: ['Copán Maya', 'Provincia de Honduras', 'Honduras'],
    restoredName: 'República Federal de Centroamérica',
    era: '1823–1839',
    rootDeed: 'Cuna de la ciudad maya de Copán y de próceres unionistas como José Cecilio del Valle y Morazán.',
    ecoDeed: 'Sus puertos caribeños y la producción agrícola integraron el comercio entre ambos océanos.',
    milDeed: 'La defensa territorial centroamericana y la logística del istmo forjaron su fuerza armada.',
    restoreFact: 'Retoma el ideario de Valle y Morazán para restaurar la Federación de Centroamérica.',
    targets: ['GT', 'SV', 'NI', 'CR'],
  },
  NI: {
    ancestors: ['Reinos Nicarao y Chorotega', 'Provincia de Nicaragua', 'Nicaragua'],
    restoredName: 'República Federal de Centroamérica',
    era: '1823–1839',
    rootDeed: 'Tierra de lagos, volcanes y cuna del poeta Rubén Darío, revolucionó las letras hispanas.',
    ecoDeed: 'La ruta de tránsito del río San Juan y el Gran Lago conectaron históricamente el Atlántico y el Pacífico.',
    milDeed: 'La Batalla de San Jacinto en 1856 selló la defensa soberana del territorio nicaragüense.',
    restoreFact: 'Unifica las naciones del istmo en la histórica República Federal de Centroamérica.',
    targets: ['HN', 'CR', 'SV', 'GT'],
  },
  BZ: {
    ancestors: ['Ciudades Mayas de Caracol', 'Honduras Británica', 'Belice'],
    restoredName: 'Federación Maya del Caribe',
    era: '1981',
    rootDeed: 'Sede de grandes urbes mayas como Caracol y Xunantunich, obtuvo su plena independencia en 1981.',
    ecoDeed: 'Su barrera de coral —la segunda más grande del mundo— y sus puertos impulsan el comercio caribeño.',
    milDeed: 'La defensa de la Bahía de San Jorge en 1798 consolidó el control marítimo beliceño.',
    restoreFact: 'Une el legado maya y caribeño bajo una potencia marítima del golfo de Honduras.',
    targets: ['GT', 'MX', 'HN'],
  },
  JM: {
    ancestors: ['Taínos de Xaymaca', 'Cimarrones Libres', 'Jamaica'],
    restoredName: 'Federación de las Indias Occidentales',
    era: '1958–1962',
    rootDeed: 'Independiente en 1962, Jamaica proyectó su cultura, el reggae y el deporte por todo el planeta.',
    ecoDeed: 'El puerto de Kingston y la minería de bauxita consolidaron su papel como eje comercial antillano.',
    milDeed: 'La resistencia histórica de los cimarrones en las Montañas Azules demostró un espíritu indomable.',
    restoreFact: 'Revive la gran Federación de las Indias Occidentales liderando el Caribe anglófono.',
    targets: ['CU', 'HT', 'BS', 'TT'],
  },
  TT: {
    ancestors: ['Pueblos Arahuacos y Caribes', 'Indias Occidentales', 'Trinidad y Tobago'],
    restoredName: 'Federación de las Indias Occidentales',
    era: '1958–1962',
    rootDeed: 'Puerto España fue capital de la Federación de las Indias Occidentales y cuna del steelpan.',
    ecoDeed: 'Sus reservas de gas natural, petróleo y el mayor lago de asfalto natural impulsan la industria.',
    milDeed: 'Vigila el paso estratégico entre el Atlántico y el Caribe frente a Sudamérica.',
    restoreFact: 'Desde Puerto España, reunifica a las islas del Caribe bajo la Federación Antillana.',
    targets: ['BB', 'GD', 'VE', 'GY'],
  },
  GY: {
    ancestors: ['Pueblos Arahuacos', 'Guayana', 'Guyana'],
    restoredName: 'Federación de las Guayanas',
    era: '1966',
    rootDeed: 'Independiente en 1966, Georgetown alberga la sede de la Comunidad del Caribe (CARICOM).',
    ecoDeed: 'Sus bosques amazónicos, bauxita y gigantescos yacimientos energéticos transforman su economía.',
    milDeed: 'Resguarda los grandes ríos Esequibo y Demerara y la frontera amazónica.',
    restoreFact: 'Unifica las tierras guayanesas en una próspera Federación de las Guayanas.',
    targets: ['SR', 'VE', 'BR'],
  },
  SR: {
    ancestors: ['Pueblos Caribes', 'Guayana Neerlandesa', 'Surinam'],
    restoredName: 'Federación de las Guayanas',
    era: '1975',
    rootDeed: 'Independiente en 1975, es uno de los países más boscosos y diversos de Sudamérica.',
    ecoDeed: 'La bauxita, el oro y la energía hidroeléctrica sostienen el puerto de Paramaribo.',
    milDeed: 'Protege la densa selva interior y las costas del Atlántico ecuatorial.',
    restoreFact: 'Lidera la integración de la costa guayanesa bajo la Federación de las Guayanas.',
    targets: ['GY', 'BR'],
  },

  // Europa extra
  BE: {
    ancestors: ['Flandes y Brabante', 'Revolución Belga (1830)', 'Bélgica'],
    restoredName: 'Unión del Benelux',
    era: '1830–1944',
    rootDeed: 'En 1830 Bélgica proclamó su independencia y fue el primer país continental en industrializarse.',
    ecoDeed: 'Bruselas es el corazón político de la Unión Europea y Amberes uno de los mayores puertos del mundo.',
    milDeed: 'La tenaz defensa del río Yser en 1914 preservó la soberanía belga en los momentos más duros.',
    restoreFact: 'Consolida la integración económica y política de los Países Bajos históricos en la Unión del Benelux.',
    targets: ['NL', 'LU', 'FR'],
  },
  CH: {
    ancestors: ['Pacto Federal de 1291', 'Antigua Confederación', 'Suiza'],
    restoredName: 'Confederación Helvética Alpina',
    era: '1291–1848',
    rootDeed: 'El Juramento del Rütli de 1291 fundó una de las confederaciones más longevas de la historia.',
    ecoDeed: 'Relojería de precisión, banca, Ginebra como sede de la Cruz Roja y el acelerador CERN.',
    milDeed: 'El Reducto Nacional Alpino y los célebres piqueros suizos garantizaron siglos de inviolabilidad.',
    restoreFact: 'Amplía la paz y fortaleza de los cantones proclamando la Confederación Helvética Alpina.',
    targets: ['AT', 'LI', 'IT', 'DE'],
  },
  IE: {
    ancestors: ['Altos Reyes de Tara', 'Alzamiento de Pascua (1916)', 'Irlanda'],
    restoredName: 'Unión Celta',
    era: '1922',
    rootDeed: 'Tras siglos de resistencia cultural y la gesta de 1916, Irlanda consolidó su república independiente.',
    ecoDeed: 'El "Tigre Celta" convirtió a Dublín en polo tecnológico, farmacéutico y literario mundial.',
    milDeed: 'Las milicias irlandesas lograron la independencia con tácticas ágiles de defensa territorial.',
    restoreFact: 'Revive la herencia histórica del Atlántico norte fundando la Unión Celta.',
    targets: ['GB', 'IS', 'FR'],
  },
  FI: {
    ancestors: ['Tierras de Kalevala', 'Independencia de 1917', 'Finlandia'],
    restoredName: 'Mancomunidad Nórdica',
    era: '1917',
    rootDeed: 'Independiente en 1917, Finlandia creó un sistema educativo y tecnológico admirado en todo el mundo.',
    ecoDeed: 'Ingeniería naval rompehielos, telecomunicaciones e industria forestal impulsan su economía.',
    milDeed: 'La legendaria defensa invernal de 1939–1940 (Sisu) aseguró la libertad finlandesa.',
    restoreFact: 'Desde Helsinki, articula la gran unión estratégica de las naciones nórdicas y bálticas.',
    targets: ['SE', 'NO', 'EE'],
  },
  CZ: {
    ancestors: ['Reino de Bohemia (1198)', 'Checoslovaquia (1918)', 'Chequia'],
    restoredName: 'República Checoslovaca',
    era: '1918–1992',
    rootDeed: 'Praga fue capital imperial de Carlos IV y cuna de la primera universidad de Europa Central (1348).',
    ecoDeed: 'La ingeniería industrial, cristalera y automotriz de Bohemia es motor de Centroeuropa.',
    milDeed: 'Las tácticas innovadoras de carros fortificados husitas cambiaron la guerra medieval europea.',
    restoreFact: 'Reunifica el legado industrial y cultural de Bohemia, Moravia y Eslovaquia.',
    targets: ['SK', 'AT', 'PL'],
  },
  SK: {
    ancestors: ['Gran Moravia (833)', 'Checoslovaquia (1918)', 'Eslovaquia'],
    restoredName: 'Gran Moravia',
    era: '833–907',
    rootDeed: 'Heredera de la Gran Moravia y de los montes Tatra, consolidó su república moderna en 1993.',
    ecoDeed: 'Bratislava y su corredor automotriz del Danubio lideran la manufactura per cápita europea.',
    milDeed: 'El Alzamiento Nacional Eslovaco de 1944 demostró el coraje defensivo en los Cárpatos.',
    restoreFact: 'Restaura el histórico nombre medieval de la Gran Moravia en Europa Central.',
    targets: ['CZ', 'HU', 'PL'],
  },
  RO: {
    ancestors: ['Reino de Dacia', 'Principados de Valaquia y Moldavia', 'Rumania'],
    restoredName: 'Gran Rumania (Dacia)',
    era: '1859–1918',
    rootDeed: 'La unión de Valaquia y Moldavia en 1859 y la Gran Unión de 1918 forjaron el Estado rumano.',
    ecoDeed: 'El Delta del Danubio, el puerto de Constanza y los recursos de los Cárpatos sostienen la economía.',
    milDeed: 'La defensa de los pasos de los Cárpatos en Mărășești (1917) salvó la nación.',
    restoreFact: 'Reúne la herencia dacia y rumana bajo el nombre histórico de la Gran Rumania.',
    targets: ['MD', 'BG', 'HU', 'UA'],
  },
  BG: {
    ancestors: ['Primer Imperio Búlgaro (681)', 'Segundo Imperio Búlgaro', 'Bulgaria'],
    restoredName: 'Imperio Búlgaro',
    era: '681–1396',
    rootDeed: 'Fundada en 681, Bulgaria dio al mundo eslavo el alfabeto cirílico en las escuelas de Preslav y Ohrid.',
    ecoDeed: 'Sus puertos del Mar Negro y rutas hacia los Balcanes y Anatolia reactivan el comercio.',
    milDeed: 'El zar Simeón el Grande llevó al Imperio Búlgaro a ser la gran potencia de Europa sudoriental.',
    restoreFact: 'Restaura el esplendor medieval del Imperio Búlgaro sobre los Balcanes.',
    targets: ['MK', 'RO', 'GR', 'RS'],
  },
  LT: {
    ancestors: ['Gran Ducado de Lituania (1253)', 'Mancomunidad (1569)', 'Lituania'],
    restoredName: 'Gran Ducado de Lituania',
    era: '1253–1795',
    rootDeed: 'El Gran Ducado de Lituania llegó a ser el Estado más extenso de Europa en el siglo XV.',
    ecoDeed: 'Vilna y el puerto de Klaipėda lideran las finanzas digitales y el comercio báltico.',
    milDeed: 'La victoria en la Batalla de Grunwald (1410) marcó la historia de Europa oriental.',
    restoreFact: 'Devuelve a Vilna el título histórico del Gran Ducado de Lituania.',
    targets: ['PL', 'LV', 'BY'],
  },
  HR: {
    ancestors: ['Reino de Croacia (925)', 'República de Ragusa', 'Croacia'],
    restoredName: 'Reino de Iliria y Croacia',
    era: '925',
    rootDeed: 'El rey Tomislav fundó el Reino de Croacia en 925 y Dubrovnik brilló como república diplomática.',
    ecoDeed: 'La costa dálmata, los astilleros del Adriático y el comercio marítimo fortalecen las arcas.',
    milDeed: 'La tenaz defensa costera y balcánica aseguró la independencia moderna en la década de 1990.',
    restoreFact: 'Consolida el litoral adriático y los Balcanes occidentales en el Reino de Iliria.',
    targets: ['SI', 'BA', 'ME', 'RS'],
  },
  BY: {
    ancestors: ['Principado de Pólotsk', 'Gran Ducado de Lituania', 'Bielorrusia'],
    restoredName: 'Gran Ducado de Rutenia',
    era: '1991',
    rootDeed: 'Cuna del Principado de Pólotsk y de los primeros libros impresos en eslavo oriental por Francysk Skaryna.',
    ecoDeed: 'La industria mecánica, los fertilizantes de potasa y las rutas hacia el Báltico impulsan los ingresos.',
    milDeed: 'Los bosques y llanuras centrales sirvieron históricamente como formidable línea de resistencia.',
    restoreFact: 'Proclama la unión de las tierras rutenas bajo el Gran Ducado de Rutenia.',
    targets: ['LT', 'UA', 'PL', 'RU'],
  },
  EE: {
    ancestors: ['Liga Hanseática de Tallin', 'República de Estonia (1918)', 'Estonia'],
    restoredName: 'Mancomunidad Báltica',
    era: '1918',
    rootDeed: 'La Revolución Cantada de 1988–1991 recuperó pacíficamente la libertad y convirtió a Estonia en pionera digital.',
    ecoDeed: 'El puerto hanseático de Tallin y el gobierno 100% digital multiplican la eficiencia económica.',
    milDeed: 'La Guerra de Independencia de 1918–1920 consolidó la soberanía sobre el golfo de Finlandia.',
    restoreFact: 'Unifica a las repúblicas del Báltico oriental bajo la Mancomunidad Báltica.',
    targets: ['LV', 'LT', 'FI'],
  },
  LV: {
    ancestors: ['Confederación de Livonia', 'República de Letonia (1918)', 'Letonia'],
    restoredName: 'Confederación de Livonia',
    era: '1435–1561',
    rootDeed: 'Riga fue joya de la Liga Hanseática y capital comercial del Báltico durante ocho siglos.',
    ecoDeed: 'Los puertos libres de hielo, la madera y la logística báltica impulsan el tesoro.',
    milDeed: 'Los fusileros letones de 1919 defendieron la recién nacida república contra enemigos superiores.',
    restoreFact: 'Restaura el nombre histórico de la Confederación de Livonia en el Báltico.',
    targets: ['EE', 'LT'],
  },

  // Asia extra
  PK: {
    ancestors: ['Civilización del Valle del Indo', 'Imperio Mogol', 'Pakistán'],
    restoredName: 'Imperio del Indo',
    era: '1947',
    rootDeed: 'Cuna de Mohenjo-Daro y Harappa, una de las primeras civilizaciones urbanas de la humanidad.',
    ecoDeed: 'La gran red de irrigación del río Indo y los puertos de Karachi y Gwadar impulsan el comercio.',
    milDeed: 'La defensa de los pasos del Karakórum y el paso de Jáiber forjó un ejército numeroso y entrenado.',
    restoreFact: 'Reclama el legado milenario de las tierras del río Indo bajo el Imperio del Indo.',
    targets: ['AF', 'IN', 'IR'],
  },
  BD: {
    ancestors: ['Sultanato de Bengala (1352)', 'Subah de Bengala', 'Bangladés'],
    restoredName: 'Sultanato de Bengala',
    era: '1352–1576',
    rootDeed: 'En 1971 Bangladés ganó su independencia defendiendo su idioma y la cultura del gran delta bengalí.',
    ecoDeed: 'Histórico centro mundial de muselinas y hoy gigante textil y portuario del golfo de Bengala.',
    milDeed: 'La movilización fluvial de 1971 aseguró la liberación total del delta del Ganges.',
    restoreFact: 'Revive la prosperidad histórica del Sultanato de Bengala sobre el golfo oriental.',
    targets: ['IN', 'MM', 'NP'],
  },
  PH: {
    ancestors: ['Rajanato de Cebú y Tondo', 'Primera República Filipina (1898)', 'Filipinas'],
    restoredName: 'Mancomunidad de Filipinas y el Pacífico',
    era: '1898',
    rootDeed: 'En 1898 Filipinas fundó la primera república constitucional de Asia tras la revolución de Rizal y Bonifacio.',
    ecoDeed: 'El Galeón de Manila conectó Asia con América durante 250 años, forjando una vocación marítima única.',
    milDeed: 'Desde la resistencia de Lapu-Lapu en Mactán hasta la defensa del archipiélago en el siglo XX.',
    restoreFact: 'Proyecta el poder del archipiélago formando la Mancomunidad del Pacífico Occidental.',
    targets: ['ID', 'MY', 'VN'],
  },
  MY: {
    ancestors: ['Sultanato de Malaca (1400)', 'Federación de Malasia (1963)', 'Malasia'],
    restoredName: 'Sultanato de Malaca',
    era: '1400–1511',
    rootDeed: 'El Sultanato de Malaca fue el emporio comercial más rico entre la India y China.',
    ecoDeed: 'Las Torres Petronas, la electrónica y el control del Estrecho de Malaca impulsan el desarrollo.',
    milDeed: 'Las armadas del estrecho protegieron durante siglos el paso entre el Índico y el Pacífico.',
    restoreFact: 'Restaura el prestigioso nombre del Sultanato de Malaca dominando la península y Borneo.',
    targets: ['SG', 'BN', 'ID', 'TH'],
  },
  SG: {
    ancestors: ['Reino de Singapura (1299)', 'Establecimientos de los Estrechos', 'Singapur'],
    restoredName: 'Talasocracia de Singapura',
    era: '1965',
    rootDeed: 'Desde 1965 Singapur se transformó en una ciudad-Estado modelo en finanzas, educación y logística.',
    ecoDeed: 'Uno de los puertos de contenedores y centros financieros más activos del planeta.',
    milDeed: 'La doctrina del "puercoespín" dotó a la isla de una defensa tecnológica muy superior a su tamaño.',
    restoreFact: 'Expande el modelo marítimo y financiero de la Ciudad del León en el Sudeste Asiático.',
    targets: ['MY', 'ID', 'BN'],
  },
  KH: {
    ancestors: ['Reino de Funan', 'Imperio Jemer (802–1431)', 'Camboya'],
    restoredName: 'Imperio Jemer',
    era: '802–1431',
    rootDeed: 'Los constructores de Angkor Wat crearon el mayor complejo monumental y sistema hidráulico del mundo antiguo.',
    ecoDeed: 'Los canales agrícolas de Angkor y el comercio del Mekong sostuvieron grandes ciudades.',
    milDeed: 'El rey Suryavarman II expandió el Imperio Jemer por toda la península indochina.',
    restoreFact: 'Restaura la majestad de Angkor proclamando nuevamente el Imperio Jemer.',
    targets: ['TH', 'LA', 'VN'],
  },
  MM: {
    ancestors: ['Reino de Pagan (849)', 'Dinastía Toungoo', 'Birmania'],
    restoredName: 'Imperio de Toungoo',
    era: '1510–1752',
    rootDeed: 'Pagan levantó miles de templos dorados y la dinastía Toungoo forjó el mayor imperio del sudeste asiático.',
    ecoDeed: 'El río Irawadi, el jade y las rutas entre la India y China impulsan la economía.',
    milDeed: 'El rey Bayinnaung consolidó un ejército formidable que unificó valles y montañas.',
    restoreFact: 'Recupera la grandeza histórica proclamando el Imperio de Toungoo.',
    targets: ['TH', 'LA', 'BD'],
  },
  AF: {
    ancestors: ['Bactriana y Gandhara', 'Imperio Durrani (1747)', 'Afganistán'],
    restoredName: 'Imperio Durrani',
    era: '1747–1823',
    rootDeed: 'Ahmad Shah Durrani fundó en 1747 el Estado afgano moderno en la encrucijada de Asia.',
    ecoDeed: 'Sus minerales de lapislázuli y las antiguas caravanas de la Ruta de la Seda enriquecen la región.',
    milDeed: 'Las montañas del Hindu Kush otorgaron al país una reputación histórica de resistencia invencible.',
    restoreFact: 'Restaura el histórico Imperio Durrani en la encrucijada de Asia Central y del Sur.',
    targets: ['PK', 'TJ', 'UZ', 'IR'],
  },
  KZ: {
    ancestors: ['Kanato Kazajo (1465)', 'Estepa Euroasiática', 'Kazajistán'],
    restoredName: 'Gran Kanato Kazajo',
    era: '1465–1847',
    rootDeed: 'Fundado en 1465 en las estepas centrales, Kazajistán es hoy la mayor potencia de Asia Central y sede de Baikonur.',
    ecoDeed: 'Energía, uranio, trigo y el gran corredor terrestre entre China y Europa impulsan las finanzas.',
    milDeed: 'La caballería de las Tres Hordas defendió la estepa durante casi cuatro siglos.',
    restoreFact: 'Reunifica el espíritu de la estepa central bajo el Gran Kanato Kazajo.',
    targets: ['UZ', 'KG', 'TM', 'RU'],
  },
  UZ: {
    ancestors: ['Transoxiana y Samarcanda', 'Imperio Timúrida (1370)', 'Uzbekistán'],
    restoredName: 'Imperio Timúrida',
    era: '1370–1507',
    rootDeed: 'Samarcanda y Bujará fueron las joyas arquitectónicas, astronómicas y comerciales de la Ruta de la Seda.',
    ecoDeed: 'El observatorio de Ulugh Beg y los bazares históricos inspiraron el florecimiento científico centroasiático.',
    milDeed: 'Tamerlán forjó desde Samarcanda uno de los ejércitos más poderosos de Eurasia.',
    restoreFact: 'Desde Samarcanda, restaura el esplendor del Imperio Timúrida en Asia Central.',
    targets: ['KZ', 'TJ', 'KG', 'TM'],
  },
  IL: {
    ancestors: ['Antiguo Reino de Israel', 'Independencia de 1948', 'Israel'],
    restoredName: 'Reino Unido de Israel',
    era: '1020 a. C.–1948',
    rootDeed: 'El renacimiento del idioma hebreo y la independencia de 1948 crearon una nación de gran dinamismo.',
    ecoDeed: 'El riego por goteo, la desalinización y el ecosistema tecnológico consolidan una economía avanzada.',
    milDeed: 'La defensa tecnológica y la movilidad táctica han definido su doctrina militar moderna.',
    restoreFact: 'Proclama la histórica denominación del Reino Unido de Israel en el Levante.',
    targets: ['JO', 'LB', 'SY', 'EG'],
  },
  SY: {
    ancestors: ['Reino de Palmira', 'Califato Omeya de Damasco', 'Siria'],
    restoredName: 'Imperio de Palmira y el Levante',
    era: '270–750',
    rootDeed: 'Damasco y Alepo se cuentan entre las ciudades continuamente habitadas más antiguas del planeta.',
    ecoDeed: 'La reina Zenobia convirtió a Palmira en epicentro comercial entre el Mediterráneo y Persia.',
    milDeed: 'La historia levantina forjó ciudadelas estratégicas como el Crac de los Caballeros.',
    restoreFact: 'Recobra el esplendor histórico de Damasco y Palmira liderando el Levante.',
    targets: ['LB', 'JO', 'IQ', 'TR'],
  },
  AE: {
    ancestors: ['Estados de la Tregua', 'Federación de los Siete Emiratos (1971)', 'Emiratos Árabes Unidos'],
    restoredName: 'Federación del Golfo Arábigo',
    era: '1971',
    rootDeed: 'En 1971 siete emiratos se unieron pacíficamente para construir uno de los polos más modernos del mundo.',
    ecoDeed: 'Dubái y Abu Dabi lideran la aviación, el comercio marítimo, el espacio (Sonda Hope) y las finanzas.',
    milDeed: 'Consolida una fuerza moderna y defensas costeras que protegen el Estrecho de Ormuz.',
    restoreFact: 'Expande el exitoso modelo federal a toda la ribera del Golfo Arábigo.',
    targets: ['OM', 'QA', 'BH', 'SA'],
  },
  OM: {
    ancestors: ['Imanato de Omán', 'Imperio Marítimo de Omán (1696)', 'Omán'],
    restoredName: 'Imperio de Omán',
    era: '1696–1856',
    rootDeed: 'Omán construyó un imperio marítimo que se extendía desde el Golfo Pérsico hasta Zanzíbar en África.',
    ecoDeed: 'El incienso, los puertos de Mascate y la diplomacia neutral dieron estabilidad y riqueza al sultanato.',
    milDeed: 'La flota omaní del siglo XVII expulsó potencias extranjeras y dominó el Océano Índico occidental.',
    restoreFact: 'Restaura la talasocracia histórica proclamando el Imperio de Omán.',
    targets: ['AE', 'YE', 'SA', 'TZ'],
  },
  AM: {
    ancestors: ['Reino de Urartu', 'Gran Armenia de Tigranes II', 'Armenia'],
    restoredName: 'Reino de la Gran Armenia',
    era: '95–55 a. C.',
    rootDeed: 'En el año 301 fue el primer Estado cristiano de la historia y creó su propio alfabeto en el 405.',
    ecoDeed: 'Las rutas del Cáucaso y el desarrollo tecnológico de Ereván impulsan la economía.',
    milDeed: 'Las fortificaciones de montaña del Cáucaso preservaron la identidad armenia durante milenios.',
    restoreFact: 'Revive la era de Tigranes el Grande restaurando el Reino de la Gran Armenia.',
    targets: ['GE', 'AZ', 'TR'],
  },
  GE: {
    ancestors: ['Reinos de Cólquida e Iberia', 'Edad de Oro de la Reina Tamar', 'Georgia'],
    restoredName: 'Reino Unido de Georgia',
    era: '1008–1223',
    rootDeed: 'Cuna de la viticultura hace 8.000 años, Georgia vivió su Edad de Oro bajo el rey David IV y la reina Tamar.',
    ecoDeed: 'El corredor entre el Mar Negro y el Caspio convierte a Tiflis en puente comercial euroasiático.',
    milDeed: 'La victoria en Didgori (1121) consolidó la primacía georgiana en todo el Cáucaso.',
    restoreFact: 'Restaura el esplendor medieval del Reino Unido de Georgia en el Cáucaso.',
    targets: ['AM', 'AZ', 'TR'],
  },
  AZ: {
    ancestors: ['Albania Caucásica', 'Imperio Safávida y República de 1918', 'Azerbaiyán'],
    restoredName: 'Confederación del Caspio',
    era: '1918',
    rootDeed: 'En 1918 fundó la primera república parlamentaria secular del mundo musulmán y otorgó el voto femenino.',
    ecoDeed: 'Bakú fue pionero mundial de la industria petrolera moderna y hoy lidera corredores energéticos.',
    milDeed: 'Combina control del Mar Caspio con brigadas de montaña altamente equipadas.',
    restoreFact: 'Unifica la ribera occidental del Caspio en la Confederación del Caspio.',
    targets: ['GE', 'AM', 'IR'],
  },

  // África extra
  DZ: {
    ancestors: ['Reino de Numidia (202 a. C.)', 'Regencia de Argel', 'Argelia'],
    restoredName: 'Reino de Numidia',
    era: '202 a. C.–1962',
    rootDeed: 'Tierra de Masinisa y Yugurta, Argelia conquistó su independencia en 1962 tras una gesta histórica.',
    ecoDeed: 'Sus vastas reservas de gas del Sáhara y puertos mediterráneos financian el desarrollo.',
    milDeed: 'La famosa caballería númida y la resistencia del Atlas forjaron una sólida tradición militar.',
    restoreFact: 'Recobra el nombre clásico de los reinos del Magreb proclamando el Reino de Numidia.',
    targets: ['TN', 'MA', 'LY'],
  },
  GH: {
    ancestors: ['Imperio Ashanti (1670)', 'Costa de Oro', 'Ghana'],
    restoredName: 'Imperio Ashanti',
    era: '1670–1957',
    rootDeed: 'En 1957 Ghana fue la primera nación del África subsahariana en lograr su independencia moderna.',
    ecoDeed: 'El oro de Kumasi, el cacao y los puertos de Acra y Tema impulsan la economía atlántica.',
    milDeed: 'La confederación Ashanti mantuvo un ejército disciplinado y un Estado altamente organizado.',
    restoreFact: 'Restaura el prestigio del Trono Dorado proclamando el Imperio Ashanti.',
    targets: ['CI', 'TG', 'BF', 'NG'],
  },
  KE: {
    ancestors: ['Ciudades-Estado Swahili', 'Independencia de 1963', 'Kenia'],
    restoredName: 'Federación de África Oriental',
    era: '1963',
    rootDeed: 'Cuna de la humanidad en el Valle del Rift y pionera mundial de la banca móvil y conservación.',
    ecoDeed: 'El puerto de Mombasa, el ferrocarril hacia Nairobi y la energía geotérmica lideran el este africano.',
    milDeed: 'La fuerza regional keniana protege las rutas del Índico y la frontera del Cuerno de África.',
    restoreFact: 'Desde Nairobi, concreta la histórica unión regional en la Federación de África Oriental.',
    targets: ['TZ', 'UG', 'RW', 'SO'],
  },
  TZ: {
    ancestors: ['Kilwa y Zanzíbar Swahili', 'Unión de Tanganica y Zanzíbar (1964)', 'Tanzania'],
    restoredName: 'Federación Swahili de África Oriental',
    era: '1964',
    rootDeed: 'La unión pacífica de Tanganica y Zanzíbar en 1964 creó un modelo de unidad nacional en África.',
    ecoDeed: 'El comercio histórico de Kilwa, el puerto de Dar es-Salam y el Serengueti sostienen la tesorería.',
    milDeed: 'Tanzania respaldó los movimientos de liberación de toda África austral y oriental.',
    restoreFact: 'Unifica las costas swahilis y los Grandes Lagos en la Federación de África Oriental.',
    targets: ['KE', 'UG', 'RW', 'BI', 'MZ'],
  },
  CD: {
    ancestors: ['Reino del Kongo (1390)', 'Imperios Luba y Lunda', 'R. D. del Congo'],
    restoredName: 'Gran Reino del Kongo',
    era: '1390–1960',
    rootDeed: 'Corazón de la gran cuenca del río Congo, heredero de los poderosos reinos del Kongo, Luba y Lunda.',
    ecoDeed: 'Sus inmensas reservas de cobalto, cobre e hidroelectricidad del río Congo son vitales para el planeta.',
    milDeed: 'La vasta selva ecuatorial y los ríos navegables otorgan enorme profundidad estratégica.',
    restoreFact: 'Unifica la cuenca centroafricana bajo el nombre histórico del Gran Reino del Kongo.',
    targets: ['CG', 'AO', 'RW', 'UG'],
  },
  AO: {
    ancestors: ['Reinos de Ndongo y Matamba', 'Reino del Kongo', 'Angola'],
    restoredName: 'Reino de Ndongo y Kongo',
    era: '1556–1975',
    rootDeed: 'La reina Nzinga de Ndongo y Matamba lideró durante décadas una brillante resistencia diplomática y militar.',
    ecoDeed: 'El petróleo atlántico, los diamantes y el corredor ferroviario de Lobito impulsan la economía.',
    milDeed: 'Tras consolidar su independencia en 1975, Angola forjó una de las fuerzas más curtidas de África austral.',
    restoreFact: 'Honra el legado de la reina Nzinga proclamando el Reino de Ndongo y Kongo.',
    targets: ['CD', 'CG', 'NA', 'ZM'],
  },
  SD: {
    ancestors: ['Reino de Kush (1070 a. C.)', 'Pirámides de Meroe', 'Sudán'],
    restoredName: 'Imperio de Kush',
    era: '1070 a. C.–350 d. C.',
    rootDeed: 'Sudán alberga más pirámides que cualquier otro país y fue sede de los faraones negros de Kush.',
    ecoDeed: 'La confluencia del Nilo Azul y el Nilo Blanco en Jartum sostiene la agricultura y el comercio del Mar Rojo.',
    milDeed: 'Los arqueros nubios de Kush fueron célebres en todo el mundo antiguo por su puntería y valor.',
    restoreFact: 'Restaura la gloria antigua del Alto Nilo proclamando el Imperio de Kush.',
    targets: ['SS', 'EG', 'ET', 'ER'],
  },
  SN: {
    ancestors: ['Imperio Wolof (1350)', 'Federación de Malí (1959)', 'Senegal'],
    restoredName: 'Imperio Wolof de Senegambia',
    era: '1350–1960',
    rootDeed: 'Dakar se convirtió en faro cultural, literario y democrático de África Occidental tras 1960.',
    ecoDeed: 'El gran puerto atlántico de Dakar y las nuevas reservas energéticas impulsan el crecimiento.',
    milDeed: 'Los tiradores senegaleses y las misiones de paz forjaron un sólido prestigio militar.',
    restoreFact: 'Reúne la costa atlántica occidental bajo el histórico Imperio Wolof de Senegambia.',
    targets: ['GM', 'ML', 'MR', 'GN'],
  },
  MG: {
    ancestors: ['Reino de Imerina (1540)', 'Reino de Madagascar', 'Madagascar'],
    restoredName: 'Reino de Imerina',
    era: '1787–1897',
    rootDeed: 'Andrianampoinimerina unificó las tierras altas y el rey Radama I modernizó el Reino de Madagascar.',
    ecoDeed: 'La vainilla, los minerales y su posición estratégica en el canal de Mozambique sostienen la isla.',
    milDeed: 'Las tierras altas de Antananarivo conforman una fortaleza natural sobre el Océano Índico.',
    restoreFact: 'Recupera la histórica soberanía malgache proclamando el Reino de Imerina.',
    targets: ['KM', 'MU', 'MZ'],
  },
  SO: {
    ancestors: ['Tierra de Punt', 'Sultanato de Ajuran (1200)', 'Somalia'],
    restoredName: 'Sultanato de Ajuran',
    era: '1200–1700',
    rootDeed: 'El Sultanato de Ajuran levantó castillos costeros y conectó el Cuerno de África con Arabia, India y China.',
    ecoDeed: 'Con la costa más extensa de África continental, sus puertos dominan la entrada al Mar Rojo.',
    milDeed: 'Los marinos y defensores costeros somalíes rechazaron invasiones marítimas en los siglos XVI y XVII.',
    restoreFact: 'Revive la época dorada marítima proclamando el Sultanato de Ajuran.',
    targets: ['DJ', 'ET', 'KE'],
  },
};

function getNearestNeighborIso2s(seed: CountrySeed, count = 3): string[] {
  const sameContinent = COUNTRIES_195.filter(
    (other) => other.iso2 !== seed.iso2 && other.continent === seed.continent
  );
  const pool = sameContinent.length >= count ? sameContinent : COUNTRIES_195.filter((o) => o.iso2 !== seed.iso2);
  const scored = pool.map((other) => {
    const dLat = other.lat - seed.lat;
    const dLon = other.lon - seed.lon;
    return { iso2: other.iso2, distSq: dLat * dLat + dLon * dLon };
  });
  scored.sort((a, b) => a.distSq - b.distSq);
  return scored.slice(0, count).map((s) => s.iso2);
}

function resolveEmpireTargetIso2s(seed: CountrySeed, rawTargets?: string[]): string[] {
  const validSet = new Set(COUNTRIES_195.map((c) => c.iso2));
  const cleaned: string[] = [];
  if (rawTargets) {
    for (const iso of rawTargets) {
      if (iso !== seed.iso2 && validSet.has(iso) && !cleaned.includes(iso)) {
        cleaned.push(iso);
      }
    }
  }
  if (cleaned.length > 0) return cleaned;
  return getNearestNeighborIso2s(seed, 3);
}

function buildNodesFromSpec(seed: CountrySeed, spec: BespokeTreeSpec): FocusNode[] {
  const empireTargets = resolveEmpireTargetIso2s(seed, spec.restore.targets);
  return [
    {
      id: 'root',
      tier: 0,
      lane: 'center',
      parents: [],
      category: 'origin',
      era: spec.root.era,
      title: spec.root.title,
      historicalFact: spec.root.fact,
      requirements: {
        moneyCost: 110,
      },
      effects: {
        incomeBonus: 2,
        armyBonus: 60,
      },
    },
    {
      id: 'eco1',
      tier: 1,
      lane: 'left',
      parents: ['root'],
      category: 'economy',
      era: spec.eco1.era,
      title: spec.eco1.title,
      historicalFact: spec.eco1.fact,
      requirements: {
        moneyCost: 220,
        minGoldMines: 2,
      },
      effects: {
        incomeBonus: 3,
        moneyBonus: 160,
      },
    },
    {
      id: 'mil1',
      tier: 1,
      lane: 'right',
      parents: ['root'],
      category: 'military',
      era: spec.mil1.era,
      title: spec.mil1.title,
      historicalFact: spec.mil1.fact,
      requirements: {
        moneyCost: 220,
        minArmy: 500,
      },
      effects: {
        armyBonus: 110,
        armyCapBonus: 180,
      },
    },
    {
      id: 'eco2',
      tier: 2,
      lane: 'left',
      parents: ['eco1'],
      category: 'diplomacy',
      era: spec.eco2.era,
      title: spec.eco2.title,
      historicalFact: spec.eco2.fact,
      requirements: {
        moneyCost: 390,
        minCities: 3,
      },
      effects: {
        incomeBonus: 4,
        relationsContinentDelta: 10,
      },
    },
    {
      id: 'mil2',
      tier: 2,
      lane: 'right',
      parents: ['mil1'],
      category: 'military',
      era: spec.mil2.era,
      title: spec.mil2.title,
      historicalFact: spec.mil2.fact,
      requirements: {
        moneyCost: 390,
        minArmy: 750,
      },
      effects: {
        armyBonus: 160,
        armyCapBonus: 260,
        defenseBonusPct: 10,
      },
    },
    {
      id: 'restore',
      tier: 3,
      lane: 'center',
      parents: [],
      category: 'restoration',
      era: spec.restore.era,
      title: spec.restore.title,
      historicalFact: spec.restore.fact,
      requirements: {
        moneyCost: 0,
        historicalTargetIso2: empireTargets,
      },
      effects: {
        incomeBonus: 4,
        armyBonus: 200,
        armyCapBonus: 360,
        defenseBonusPct: 10,
        newName: spec.restore.newName,
      },
    },
  ];
}

function getSubregionFallback(seed: CountrySeed): {
  ancestors: string[];
  restoredName: string;
  era: string;
  rootTitle: string;
  rootFact: string;
  ecoTitle: string;
  ecoFact: string;
  milTitle: string;
  milFact: string;
  eco2Title: string;
  eco2Fact: string;
  mil2Title: string;
  mil2Fact: string;
  restoreFact: string;
  targets: string[];
} {
  const { name, capital, continent, iso2 } = seed;

  // Caribbean islands
  const caribbean = ['AG', 'BS', 'BB', 'DM', 'GD', 'KN', 'VC', 'LC'];
  if (caribbean.includes(iso2)) {
    return {
      ancestors: ['Pueblos Arahuacos y Caribes', 'Indias Occidentales', name],
      restoredName: `Federación Caribeña de ${name}`,
      era: '1958–1981',
      rootTitle: `Soberanía de ${capital}`,
      rootFact: `${name} consolidó su independencia en el arco antillano y fortaleció la integración de la comunidad caribeña.`,
      ecoTitle: `Puertos y Comercio de ${capital}`,
      ecoFact: `Las rutas marítimas del Caribe y el turismo internacional transformaron a ${capital} en un centro comercial insular.`,
      milTitle: 'Guardia Marítima de las Antillas',
      milFact: `Protege las islas y estrechos estratégicos de ${name} con patrullaje y defensa costera coordinada.`,
      eco2Title: 'Unión Comercial del Caribe',
      eco2Fact: `Impulsa tratados comerciales y cooperación diplomática entre todas las naciones de las Antillas.`,
      mil2Title: 'Flota Defensiva Insular',
      mil2Fact: `Prepara a las fuerzas de ${name} para proyectar presencia naval por todo el mar Caribe.`,
      restoreFact: `Desde ${capital}, lidera la integración de las islas proclamando la Federación Caribeña de ${name}.`,
      targets: ['CU', 'DO', 'JM', 'TT'],
    };
  }

  // European microstates & Balkans
  const microEurope = ['AD', 'LI', 'MC', 'SM', 'MT', 'LU', 'IS', 'CY'];
  if (microEurope.includes(iso2)) {
    const customUnion: Record<string, string> = {
      AD: 'Principado de los Pirineos',
      LI: 'Principado Alpino del Rin',
      MC: 'Principado Marítimo de Liguria',
      SM: 'Serenísima República de San Marino',
      MT: 'Orden Soberana del Mediterráneo',
      LU: 'Gran Ducado del Benelux',
      IS: 'Mancomunidad del Atlántico Norte',
      CY: 'Reino Unido de Chipre',
    };
    return {
      ancestors: ['Señoríos Históricos Europeos', `Carta de ${capital}`, name],
      restoredName: customUnion[iso2] ?? `Mancomunidad de ${name}`,
      era: '1278–1964',
      rootTitle: `Carta Fundacional de ${capital}`,
      rootFact: `${name} preservó su autonomía durante siglos gracias a una diplomacia hábil y a sus instituciones propias.`,
      ecoTitle: `Centro Financiero y Comercial de ${capital}`,
      ecoFact: `El comercio especializado, la banca y la innovación elevaron la prosperidad de ${name} en Europa.`,
      milTitle: `Fortalezas Históricas de ${name}`,
      milFact: `Las murallas y pasos estratégicos alrededor de ${capital} defendieron su independencia frente a grandes imperios.`,
      eco2Title: 'Pacto Diplomático Europeo',
      eco2Fact: `Teje acuerdos económicos de alto valor que consolidan el prestigio continental de ${name}.`,
      mil2Title: 'Guardia Soberana Profesional',
      mil2Fact: `Organiza un cuerpo compacto, tecnificado y de gran capacidad defensiva.`,
      restoreFact: `Eleva la trayectoria histórica de ${name} proclamando ${customUnion[iso2] ?? `la Mancomunidad de ${name}`}.`,
      targets: iso2 === 'AD' ? ['ES', 'FR'] : iso2 === 'IS' ? ['NO', 'DK', 'GB'] : ['IT', 'FR', 'DE'],
    };
  }

  const balkans = ['AL', 'BA', 'ME', 'MK', 'SI', 'MD'];
  if (balkans.includes(iso2)) {
    const balkanNames: Record<string, string> = {
      AL: 'Liga de Lezhë (Iliria)',
      BA: 'Reino de Bosnia',
      ME: 'Principado de Zeta y Montenegro',
      MK: 'Imperio de Macedonia',
      SI: 'Ducado de Carantania',
      MD: 'Gran Principado de Moldavia',
    };
    return {
      ancestors: ['Reinos Balcánicos Medievales', `Legado de ${capital}`, name],
      restoredName: balkanNames[iso2] ?? `Federación de ${name}`,
      era: '1377–1991',
      rootTitle: `Raíces Soberanas de ${name}`,
      rootFact: `Desde los reinos medievales hasta su independencia contemporánea, ${name} defendió su identidad en Europa suroriental.`,
      ecoTitle: `Rutas Comerciales de ${capital}`,
      ecoFact: `Conecta los corredores entre el Mediterráneo, los Balcanes y Europa Central.`,
      milTitle: 'Defensores de las Montañas',
      milFact: `Aprovecha el relieve montañoso y la tenacidad histórica para forjar una sólida defensa.`,
      eco2Title: 'Integración Económica Regional',
      eco2Fact: `Moderniza las ciudades e infraestructuras alrededor de ${capital} para sostener el crecimiento.`,
      mil2Title: 'Doctrina de Seguridad Balcánica',
      mil2Fact: `Fortalece el ejército profesional y la capacidad de respuesta fronteriza.`,
      restoreFact: `Recobra la gloria histórica de la región proclamando ${balkanNames[iso2] ?? `la Federación de ${name}`}.`,
      targets: iso2 === 'MD' ? ['RO', 'UA'] : ['RS', 'HR', 'GR', 'BG'],
    };
  }

  // Arab Gulf & Levant
  const middleEast = ['QA', 'KW', 'BH', 'YE', 'JO', 'LB', 'PS'];
  if (middleEast.includes(iso2)) {
    const meNames: Record<string, string> = {
      QA: 'Emirato Unido del Golfo',
      KW: 'Federación del Golfo Norte',
      BH: 'Reino de Dilmún',
      YE: 'Reino de Saba y Himyar',
      JO: 'Reino Hachemita del Levante',
      LB: 'República de Fenicia',
      PS: 'Unión de Canaán y el Levante',
    };
    return {
      ancestors: ['Antiguas Rutas de Oriente Medio', `Historia de ${capital}`, name],
      restoredName: meNames[iso2] ?? `Federación de ${name}`,
      era: '1946–1971',
      rootTitle: `Legado Histórico de ${capital}`,
      rootFact: `${name} hereda milenios de comercio, ciencia y arquitectura en el corazón de Oriente Medio.`,
      ecoTitle: `Rutas Comerciales y Recursos de ${name}`,
      ecoFact: `El intercambio marítimo y energético desde ${capital} fortalece las arcas públicas.`,
      milTitle: `Guardia Estratégica de ${name}`,
      milFact: `Prepara unidades móviles y defensas modernas adaptadas a los pasos clave de la región.`,
      eco2Title: 'Alianza Económica Regional',
      eco2Fact: `Impulsa inversiones portuarias, tecnológicas y diplomáticas en toda Asia Occidental.`,
      mil2Title: 'Escudo de Seguridad Regional',
      mil2Fact: `Incrementa las reservas militares y fortificaciones de defensa nacional.`,
      restoreFact: `Revive el esplendor histórico regional proclamando ${meNames[iso2] ?? `la Federación de ${name}`}.`,
      targets: ['SA', 'AE', 'IQ', 'EG'],
    };
  }

  // Central Asia & Himalayas & South/SE Asia
  const centralSouthAsia = ['KG', 'TJ', 'TM', 'NP', 'BT', 'LK', 'MV', 'LA', 'BN', 'TL'];
  if (centralSouthAsia.includes(iso2)) {
    const asiaNames: Record<string, string> = {
      KG: 'Kaganato Kirguís',
      TJ: 'Imperio Samánida',
      TM: 'Imperio Selyúcida de Merv',
      NP: 'Reino del Himalaya (Gorkha)',
      BT: 'Reino del Dragón del Trueno',
      LK: 'Reino de Ceilán (Anuradhapura)',
      MV: 'Sultanato del Océano Índico',
      LA: 'Reino de Lan Xang',
      BN: 'Imperio Talasocrático de Brunéi',
      TL: 'República de Timor y las Molucas',
    };
    return {
      ancestors: ['Rutas Históricas de Asia', `Legado de ${capital}`, name],
      restoredName: asiaNames[iso2] ?? `Unión de ${name}`,
      era: '1353–1991',
      rootTitle: `Fundación Histórica de ${name}`,
      rootFact: `${name} forjó su historia en las rutas milenarias de la seda, el Himalaya o el Índico desde ${capital}.`,
      ecoTitle: `Comercio y Riqueza de ${capital}`,
      ecoFact: `Aprovecha las rutas estratégicas y recursos naturales para modernizar la economía nacional.`,
      milTitle: `Tradición Defensiva de ${name}`,
      milFact: `Organiza tropas especializadas en el terreno geográfico único de ${name}.`,
      eco2Title: 'Corredor Económico Asiático',
      eco2Fact: `Amplía la cooperación comercial y diplomática con las potencias vecinas de Asia.`,
      mil2Title: 'Bastión Nacional Renovado',
      mil2Fact: `Eleva la capacidad militar y las defensas estratégicas de todo el territorio.`,
      restoreFact: `Recupera el legado histórico proclamando ${asiaNames[iso2] ?? `la Unión de ${name}`}.`,
      targets: ['CN', 'IN', 'TH', 'KZ', 'ID'],
    };
  }

  // Pacific Islands (Oceania)
  if (continent === 'Oceanía') {
    const pacNames: Record<string, string> = {
      PG: 'Federación de Melanesia',
      FJ: 'Confederación de Fiyi y el Pacífico',
      WS: 'Confederación de Polinesia',
      SB: 'Unión de Melanesia',
      VU: 'Mancomunidad de las Nuevas Hébridas',
      FM: 'Federación de Micronesia Unida',
      MH: 'Mancomunidad del Pacífico Central',
      KI: 'Unión Ecuatorial del Pacífico',
      PW: 'República del Pacífico Occidental',
      NR: 'Mancomunidad de Nauru y Micronesia',
      TV: 'Confederación Polinesia',
    };
    return {
      ancestors: ['Grandes Navegantes del Pacífico', `Archipiélago de ${name}`, name],
      restoredName: pacNames[iso2] ?? `Federación Oceánica de ${name}`,
      era: '1962–1994',
      rootTitle: `Navegantes de ${name}`,
      rootFact: `Los ancestros de ${name} surcaron miles de kilómetros del Pacífico guiándose por las estrellas y corrientes.`,
      ecoTitle: `Economía Azul de ${capital}`,
      ecoFact: `La pesca sostenible, las rutas marítimas y la cooperación oceánica nutren la tesorería.`,
      milTitle: 'Guardia del Archipiélago',
      milFact: `Asegura las aguas territoriales y refuerza la capacidad anfibia en el Pacífico.`,
      eco2Title: 'Foro Comercial de Oceanía',
      eco2Fact: `Teje lazos diplomáticos y comerciales con las naciones insulares y continentales de Oceanía.`,
      mil2Title: 'Flota Expedicionaria del Pacífico',
      mil2Fact: `Incrementa la fuerza militar y las defensas portuarias alrededor de ${capital}.`,
      restoreFact: `Unifica las rutas oceánicas proclamando ${pacNames[iso2] ?? `la Federación Oceánica de ${name}`}.`,
      targets: ['AU', 'NZ', 'FJ', 'PG'],
    };
  }

  // Africa (all remaining African nations with tailored historical unions)
  const africaNames: Record<string, string> = {
    LY: 'Confederación de Tripolitania y Cirenaica',
    MR: 'Imperio Almorávide del Sáhara',
    NE: 'Imperio Songhai del Níger',
    TD: 'Imperio Kanem-Bornu',
    BF: 'Imperio Mossi del Sahel',
    CI: 'Federación de Eburnea y África Occidental',
    CM: 'Confederación del Golfo de Guinea',
    GA: 'Unión Ecuatorial Atlántica',
    CG: 'Reino de Loango y Congo',
    CF: 'Unión de África Central',
    UG: 'Reino de Buganda y Grandes Lagos',
    RW: 'Reino de Ruanda y los Grandes Lagos',
    BI: 'Reino de Burundi y los Grandes Lagos',
    ER: 'Confederación del Mar Rojo',
    DJ: 'Sultanato del Estrecho de Bab el-Mandeb',
    SS: 'Confederación del Nilo Blanco',
    ZM: 'Federación de Zambezia',
    MW: 'Imperio Maravi',
    MZ: 'Federación del Canal de Mozambique',
    BW: 'Mancomunidad del Kalahari',
    NA: 'Unión Atlántica del Sur Africano',
    LS: 'Reino de la Montaña (Basutolandia)',
    SZ: 'Reino de Esuatini Austral',
    BJ: 'Reino de Dahomey',
    TG: 'Unión de la Costa de Guinea',
    GN: 'Imperio de Futa Yalon',
    GW: 'Reino de Kaabu',
    SL: 'Mancomunidad de África Atlántica',
    LR: 'República Pionera de África Occidental',
    GM: 'Confederación de Senegambia',
    CV: 'Mancomunidad Atlántica de Cabo Verde',
    ST: 'Confederación del Golfo de Guinea',
    GQ: 'Unión Ecuatorial del Golfo',
    KM: 'Sultanato de las Islas de la Luna',
    MU: 'Mancomunidad del Océano Índico',
    SC: 'Confederación Marítima de Seychelles',
  };

  if (continent === 'África') {
    const unionName = africaNames[iso2] ?? `Unión Africana de ${name}`;
    return {
      ancestors: ['Reinos Históricos Africanos', `Independencia de ${capital}`, name],
      restoredName: unionName,
      era: '1957–1975',
      rootTitle: `Soberanía e Historia de ${name}`,
      rootFact: `Heredero de reinos históricos y de la ola emancipadora africana, ${name} construyó su república desde ${capital}.`,
      ecoTitle: `Riqueza Natural y Rutas de ${capital}`,
      ecoFact: `El desarrollo minero, agrícola y comercial alrededor de ${capital} impulsa la economía nacional.`,
      milTitle: `Fuerzas de Defensa de ${name}`,
      milFact: `Consolida un ejército nacional disciplinado para proteger las fronteras y la soberanía.`,
      eco2Title: 'Integración Económica Panafricana',
      eco2Fact: `Fomenta el comercio continental y las alianzas diplomáticas en toda África.`,
      mil2Title: 'Doctrina de Proyección Regional',
      mil2Fact: `Amplía el límite militar y las fortificaciones estratégicas del país.`,
      restoreFact: `Culmina la trayectoria histórica de ${name} proclamando ${unionName}.`,
      targets: getNearestNeighborIso2s(seed, 3),
    };
  }

  // Final safety fallback (should not be reached given coverage above)
  return {
    ancestors: ['Orígenes Históricos', `Fundación de ${capital}`, name],
    restoredName: `Gran Unión de ${name}`,
    era: '1800–2026',
    rootTitle: `Fundación Nacional de ${name}`,
    rootFact: `${name} forjó su identidad soberana alrededor de ${capital} a través de hitos históricos decisivos.`,
    ecoTitle: `Desarrollo Económico de ${capital}`,
    ecoFact: `La inversión en infraestructura, comercio y ciudades eleva los ingresos sostenidos del país.`,
    milTitle: `Tradición Militar de ${name}`,
    milFact: `Profesionaliza el mando militar para defender el territorio y sostener campañas estratégicas.`,
    eco2Title: 'Pacto Comercial Regional',
    eco2Fact: `Amplía la influencia diplomática y económica en todo el continente.`,
    mil2Title: 'Doctrina Estratégica Nacional',
    mil2Fact: `Fortalece las líneas defensivas y la capacidad de movilización del ejército.`,
    restoreFact: `Eleva a ${name} a una nueva etapa histórica proclamando la Gran Unión de ${name}.`,
    targets: [],
  };
}

function buildCountryTree(seed: CountrySeed): CountryGenealogyTree {
  const bespoke = BESPOKE_TREES[seed.iso2];
  if (bespoke) {
    return {
      iso2: seed.iso2,
      subtitle: bespoke.subtitle,
      ancestors: bespoke.ancestors,
      restoredName: bespoke.restore.newName,
      nodes: buildNodesFromSpec(seed, bespoke),
    };
  }

  const quick = COUNTRY_QUICK_SPECS[seed.iso2];
  if (quick) {
    const spec: BespokeTreeSpec = {
      subtitle: `De ${quick.ancestors[0]} a ${quick.restoredName}`,
      ancestors: quick.ancestors,
      root: {
        era: quick.era.split('–')[0],
        title: `Raíz Histórica de ${seed.name}`,
        fact: quick.rootDeed,
      },
      eco1: {
        era: 'Desarrollo',
        title: `Motor Económico de ${seed.capital}`,
        fact: quick.ecoDeed,
      },
      mil1: {
        era: 'Legado Militar',
        title: `Tradición Guerrera de ${seed.name}`,
        fact: quick.milDeed,
      },
      eco2: {
        era: 'Diplomacia',
        title: `Pacto Regional de ${seed.continent}`,
        fact: `${seed.name} consolida alianzas comerciales y diplomáticas desde ${seed.capital} en todo ${seed.continent}.`,
      },
      mil2: {
        era: 'Defensa',
        title: `Bastión Estratégico de ${seed.name}`,
        fact: `Refuerza la doctrina militar, las defensas territoriales y la movilización nacional.`,
      },
      restore: {
        era: quick.era,
        title: `Restaurar ${quick.restoredName}`,
        fact: quick.restoreFact,
        newName: quick.restoredName,
        targets: quick.targets,
      },
    };
    return {
      iso2: seed.iso2,
      subtitle: spec.subtitle,
      ancestors: spec.ancestors,
      restoredName: spec.restore.newName,
      nodes: buildNodesFromSpec(seed, spec),
    };
  }

  const fb = getSubregionFallback(seed);
  const spec: BespokeTreeSpec = {
    subtitle: `Legado de ${seed.name} hacia ${fb.restoredName}`,
    ancestors: fb.ancestors,
    root: { era: fb.era.split('–')[0], title: fb.rootTitle, fact: fb.rootFact },
    eco1: { era: 'Economía', title: fb.ecoTitle, fact: fb.ecoFact },
    mil1: { era: 'Ejército', title: fb.milTitle, fact: fb.milFact },
    eco2: { era: 'Diplomacia', title: fb.eco2Title, fact: fb.eco2Fact },
    mil2: { era: 'Estrategia', title: fb.mil2Title, fact: fb.mil2Fact },
    restore: {
      era: fb.era,
      title: `Proclamar ${fb.restoredName}`,
      fact: fb.restoreFact,
      newName: fb.restoredName,
      targets: fb.targets,
    },
  };

  return {
    iso2: seed.iso2,
    subtitle: spec.subtitle,
    ancestors: spec.ancestors,
    restoredName: spec.restore.newName,
    nodes: buildNodesFromSpec(seed, spec),
  };
}

const TREE_CACHE = new Map<string, CountryGenealogyTree>();

export function getCountryGenealogyTree(seed: CountrySeed): CountryGenealogyTree {
  let tree = TREE_CACHE.get(seed.iso2);
  if (!tree) {
    tree = buildCountryTree(seed);
    TREE_CACHE.set(seed.iso2, tree);
  }
  return tree;
}

export function getCountryNameByIso2(iso2: string): string {
  const found = COUNTRIES_195.find((c) => c.iso2 === iso2);
  return found ? found.name : iso2;
}
