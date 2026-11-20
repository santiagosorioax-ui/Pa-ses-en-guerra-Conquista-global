import { COUNTRIES_195, type CountrySeed } from './countries195';

export interface TreeNodeRequirements {
  minCities?: number;
  minGoldMines?: number;
  minPorts?: number;
  minDefenses?: number;
  minArmy?: number;
  minMoney?: number;
  minAllies?: number;
  minAnnexations?: number;
  minTerritoryPctIncrease?: number; // e.g. 25 means +25% over initialPixels
  controlCountriesIso2?: string[]; // must control capital/homeland or have annexed these ISO2 nations
}

export interface TreeNodeReward {
  moneyDelta?: number;
  armyDelta?: number;
  permanentIncomeBonus?: number; // capped in simulation for balance
  permanentArmyCapBonus?: number; // capped in simulation for balance
  renameTo?: string; // changes official country name across map & HUD
  proclamationText?: string;
}

export interface CountryTreeNode {
  id: string;
  tier: 1 | 2 | 3;
  branch: 'root' | 'economy' | 'military' | 'restoration' | 'legacy';
  era: string;
  title: string;
  subtitle: string;
  history: string;
  parentId: string | null;
  requiresAnyParent?: string[];
  costMoney: number;
  requirements: TreeNodeRequirements;
  reward: TreeNodeReward;
}

export interface CountryGenealogyTree {
  iso2: string;
  heritageTitle: string;
  heritageSummary: string;
  nodes: CountryTreeNode[];
}

interface CuratedTreeSpec {
  heritageTitle: string;
  heritageSummary: string;
  root: {
    era: string;
    title: string;
    subtitle: string;
    history: string;
  };
  economy: {
    era: string;
    title: string;
    subtitle: string;
    history: string;
    minPorts?: number;
  };
  military: {
    era: string;
    title: string;
    subtitle: string;
    history: string;
    minAllies?: number;
    minAnnexations?: number;
  };
  restoration: {
    era: string;
    title: string;
    subtitle: string;
    history: string;
    newName: string;
    controlIso2: string[];
    proclamationText?: string;
  };
  secondaryRestoration?: {
    era: string;
    title: string;
    subtitle: string;
    history: string;
    newName: string;
    controlIso2: string[];
    proclamationText?: string;
  };
}

const CURATED_SPECS: Record<string, CuratedTreeSpec> = {
  // === AMÉRICA ===
  CO: {
    heritageTitle: 'Linaje Neogranadino y Bolivariano',
    heritageSummary:
      'Desde la independencia de la Nueva Granada hasta el sueño integrador de la Gran Colombia y los Andes.',
    root: {
      era: '1810 – 1819',
      title: 'Campaña Libertadora de Nueva Granada',
      subtitle: 'Batalla de Boyacá y fundación republicana',
      history:
        'Consolida el legado fundacional de Bogotá tras la independencia de 1819 y organiza el aparato estatal moderno.',
    },
    economy: {
      era: 'Siglos XIX – XX',
      title: 'Puente Bioceánico y Café Andino',
      subtitle: 'Comercio entre el Caribe y el Pacífico',
      history:
        'Impulsa la infraestructura cafetera, minera y portuaria conectando las costas del Caribe y el Pacífico.',
      minPorts: 1,
    },
    military: {
      era: '1819 – 1824',
      title: 'Ejército Libertador del Norte',
      subtitle: 'Proyección estratégica sobre los Andes',
      history:
        'Reorganiza el alto mando heredero de las campañas de Carabobo y Pichincha para proyectar fuerza regional.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1819 – 1831',
      title: 'Restaurar la Gran Colombia',
      subtitle: 'Reunificación bolivariana del norte sudamericano',
      history:
        'Restaura la histórica República de Colombia (Gran Colombia) uniendo los territorios de Colombia, Venezuela, Ecuador y Panamá bajo un mismo estandarte.',
      newName: 'Gran Colombia',
      controlIso2: ['VE', 'EC', 'PA'],
      proclamationText: '¡Bogotá proclama la restauración histórica de la Gran Colombia!',
    },
    secondaryRestoration: {
      era: 'Proyecto Andino',
      title: 'Confederación de los Andes',
      subtitle: 'Unión desde el Caribe hasta el Altiplano',
      history:
        'Expande el proyecto bolivariano hacia el sur integrando a Perú y Bolivia en una gran potencia andina.',
      newName: 'Confederación Andina',
      controlIso2: ['EC', 'PE', 'BO'],
      proclamationText: '¡Se proclama la Confederación Andina a lo largo de toda la cordillera!',
    },
  },
  VE: {
    heritageTitle: 'Linaje de la Capitanía y Bolívar',
    heritageSummary: 'Cuna de la emancipación sudamericana y potencia energética del Caribe.',
    root: {
      era: '1811 – 1821',
      title: 'Espíritu de Carabobo',
      subtitle: 'Independencia venezolana',
      history: 'Reafirma la herencia libertadora de Caracas y fortalece el tesoro nacional.',
    },
    economy: {
      era: 'Siglo XX',
      title: 'Faja Petrolera del Orinoco',
      subtitle: 'Riqueza energética y puertos caribeños',
      history: 'Capitaliza los recursos energéticos y el comercio marítimo del Caribe.',
      minPorts: 1,
    },
    military: {
      era: '1813 – 1821',
      title: 'Llaneros del Orinoco',
      subtitle: 'Doctrina ofensiva de caballería moderna',
      history: 'Entrena divisiones rápidas inspiradas en las campañas del Llano.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1819 – 1830',
      title: 'Restaurar la Gran Colombia',
      subtitle: 'Unión bolivariana desde Caracas',
      history: 'Reunifica Venezuela, Colombia, Ecuador y Panamá en la histórica Gran Colombia.',
      newName: 'Gran Colombia',
      controlIso2: ['CO', 'EC', 'PA'],
      proclamationText: '¡Caracas proclama la restauración de la Gran Colombia!',
    },
  },
  EC: {
    heritageTitle: 'Linaje Quiteño y Andino',
    heritageSummary: 'De la Real Audiencia de Quito y Pichincha a la integración bolivariana.',
    root: {
      era: '1809 – 1822',
      title: 'Luz de América y Pichincha',
      subtitle: 'Primer grito libertario en Quito',
      history: 'Honra la gesta de Quito y moderniza la administración territorial.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Ruta del Pacífico y Guayaquil',
      subtitle: 'Astillero y comercio marítimo',
      history: 'Convierte la costa ecuatoriana en un centro comercial del Pacífico sur.',
      minPorts: 1,
    },
    military: {
      era: '1822',
      title: 'Guardia de los Volcanes',
      subtitle: 'Defensa de alta montaña',
      history: 'Fortalece las tropas andinas con entrenamiento especializado.',
    },
    restoration: {
      era: '1822 – 1830',
      title: 'Restaurar la Gran Colombia',
      subtitle: 'Distrito del Sur unido al norte',
      history: 'Reconstruye la Gran Colombia reuniendo Ecuador, Colombia, Venezuela y Panamá.',
      newName: 'Gran Colombia',
      controlIso2: ['CO', 'VE', 'PA'],
    },
  },
  PA: {
    heritageTitle: 'Linaje del Istmo Interoceánico',
    heritageSummary: 'Encrucijada comercial del mundo entre dos océanos.',
    root: {
      era: '1821 – 1903',
      title: 'Soberanía del Istmo',
      subtitle: 'Puente estratégico de las Américas',
      history: 'Consolida el control soberano del paso interoceánico y sus ingresos.',
    },
    economy: {
      era: '1914 – Presente',
      title: 'Expansión del Canal de Panamá',
      subtitle: 'Peajes globales y marina mercante',
      history: 'Multiplica la recaudación comercial del canal y los puertos.',
      minPorts: 1,
    },
    military: {
      era: 'Siglo XXI',
      title: 'Escudo del Darién y el Canal',
      subtitle: 'Defensa estratégica del paso marítimo',
      history: 'Refuerza la guarnición nacional y las fortificaciones clave.',
    },
    restoration: {
      era: '1821 – 1831',
      title: 'Restaurar la Gran Colombia',
      subtitle: 'Reintegración histórica bolivariana',
      history: 'Une el Istmo con Colombia, Venezuela y Ecuador bajo la Gran Colombia.',
      newName: 'Gran Colombia',
      controlIso2: ['CO', 'VE', 'EC'],
    },
  },
  PE: {
    heritageTitle: 'Linaje Incaico y Virreinal',
    heritageSummary: 'Heredero del Tahuantinsuyo, del Virreinato del Perú y de la Confederación Andina.',
    root: {
      era: '1438 – 1821',
      title: 'Herencia del Cusco y Lima',
      subtitle: 'Raíces imperiales y república',
      history: 'Integra la memoria del Cusco y la independencia de 1821 para impulsar el país.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Riqueza Minera de los Andes',
      subtitle: 'Cobre, oro y rutas del Pacífico',
      history: 'Explota los grandes yacimientos andinos financiando el crecimiento urbano.',
    },
    military: {
      era: '1824 – 1879',
      title: 'Legión de los Andes y del Callao',
      subtitle: 'Tradición militar y naval',
      history: 'Forja un ejército disciplinado y defensas costeras sólidas.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1438 – 1533',
      title: 'Restaurar el Imperio Inca',
      subtitle: 'Renacimiento del Tahuantinsuyo',
      history: 'Reunifica los cuatro suyos históricos sobre Perú, Bolivia, Ecuador y Chile.',
      newName: 'Imperio Inca',
      controlIso2: ['BO', 'EC', 'CL'],
      proclamationText: '¡El sol de los Incas vuelve a brillar: renace el Tahuantinsuyo!',
    },
    secondaryRestoration: {
      era: '1836 – 1839',
      title: 'Confederación Perú-Boliviana',
      subtitle: 'Unión del Alto y Bajo Perú',
      history: 'Restablece la confederación histórica entre Lima y La Paz.',
      newName: 'Confederación Perú-Boliviana',
      controlIso2: ['BO'],
    },
  },
  BO: {
    heritageTitle: 'Linaje del Altiplano y Charcas',
    heritageSummary: 'Corazón mineral de Sudamérica, heredero de Tiahuanaco y la Confederación.',
    root: {
      era: '1825',
      title: 'Acta de Independencia de Charcas',
      subtitle: 'Fundación de la República de Bolívar',
      history: 'Consolida el Estado plurinacional del Altiplano y sus recursos.',
    },
    economy: {
      era: 'Siglos XVI – XXI',
      title: 'Cerro Rico y Salar de Uyuni',
      subtitle: 'Plata, estaño y litio estratégico',
      history: 'Transforma los recursos minerales del Altiplano en motores económicos sostenibles.',
    },
    military: {
      era: '1836 – 1879',
      title: 'Colorados de Bolivia',
      subtitle: 'Infantería de élite de altura',
      history: 'Adiestra tropas resistentes para campañas en los Andes y el Chaco.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1836 – 1839',
      title: 'Confederación Perú-Boliviana',
      subtitle: 'Legado del Mariscal Santa Cruz',
      history: 'Reunifica Bolivia y Perú en una potencia andina con salida plena al Pacífico.',
      newName: 'Confederación Perú-Boliviana',
      controlIso2: ['PE'],
      proclamationText: '¡La Paz proclama el retorno de la Confederación Perú-Boliviana!',
    },
    secondaryRestoration: {
      era: 'Herencia Imperial',
      title: 'Gran Tahuantinsuyo',
      subtitle: 'Hegemonía andina total',
      history: 'Reúne el antiguo territorio incaico desde Bolivia hasta Ecuador y Chile.',
      newName: 'Imperio Inca',
      controlIso2: ['PE', 'EC', 'CL'],
    },
  },
  AR: {
    heritageTitle: 'Linaje Rioplatense y Sanmartiniano',
    heritageSummary: 'De la Revolución de Mayo y el Cruce de los Andes a la unión del Cono Sur.',
    root: {
      era: '1810 – 1816',
      title: 'Revolución de Mayo y Tucumán',
      subtitle: 'Nacimiento de la Nación Argentina',
      history: 'Reaviva el impulso fundacional de 1816 fortaleciendo la cohesión nacional.',
    },
    economy: {
      era: 'Siglos XIX – XX',
      title: 'Granero del Mundo',
      subtitle: 'Pampa húmeda y puertos del Atlántico',
      history: 'Potencia la producción agroindustrial y la red portuaria del Río de la Plata.',
      minPorts: 1,
    },
    military: {
      era: '1817',
      title: 'Ejército de los Andes',
      subtitle: 'Doctrina libertadora sanmartiniana',
      history: 'Moderniza las fuerzas armadas con espíritu expedicionario continental.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1810 – 1831',
      title: 'Provincias Unidas del Río de la Plata',
      subtitle: 'Reunificación histórica del Virreinato',
      history: 'Une Argentina, Uruguay, Paraguay y Bolivia en las históricas Provincias Unidas.',
      newName: 'Provincias Unidas del Sur',
      controlIso2: ['UY', 'PY', 'BO'],
      proclamationText: '¡Buenos Aires proclama las Provincias Unidas del Río de la Plata!',
    },
  },
  UY: {
    heritageTitle: 'Linaje Artiguista y Oriental',
    heritageSummary: 'Cuna del federalismo rioplatense y bastión diplomático del Atlántico Sur.',
    root: {
      era: '1811 – 1830',
      title: 'Éxodo del Pueblo Oriental',
      subtitle: 'Legado de José Gervasio Artigas',
      history: 'Afianza la identidad institucional y estabilidad económica de Montevideo.',
    },
    economy: {
      era: 'Siglo XX',
      title: 'Puerto de Montevideo y Banca Austral',
      subtitle: 'Centro logístico del Atlántico Sur',
      history: 'Convierte la costa oriental en plataforma comercial y financiera.',
      minPorts: 1,
    },
    military: {
      era: '1825',
      title: 'Treinta y Tres Orientales',
      subtitle: 'Cuerpo táctico de defensa rápida',
      history: 'Organiza divisiones ágiles y defensas fronterizas eficientes.',
    },
    restoration: {
      era: '1815 – 1820',
      title: 'Restaurar la Liga Federal',
      subtitle: 'Proyecto federal artiguista',
      history: 'Reúne la cuenca del Plata bajo la Liga Federal liderada desde Montevideo.',
      newName: 'Liga Federal Rioplatense',
      controlIso2: ['AR', 'PY'],
    },
  },
  PY: {
    heritageTitle: 'Linaje Guaraní y del Chaco',
    heritageSummary: 'Resiliencia histórica en el corazón fluvial de Sudamérica.',
    root: {
      era: '1811',
      title: 'Independencia de Asunción',
      subtitle: 'Soberanía fluvial del Paraguay',
      history: 'Consolida la autonomía productiva y la identidad guaraní.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Potencia Hidroeléctrica y Fundiciones',
      subtitle: 'Energía e industria nacional',
      history: 'Aprovecha las grandes represas y la industria pesada para acelerar ingresos.',
    },
    military: {
      era: '1865 – 1935',
      title: 'Guardia del Chaco',
      subtitle: 'Resistencia militar legendaria',
      history: 'Entrena regimientos de hierro capaces de resistir grandes coaliciones.',
      minAnnexations: 1,
    },
    restoration: {
      era: 'Proyecto Platense',
      title: 'Proclamar el Gran Paraguay',
      subtitle: 'Salida al mar y dominio del Chaco',
      history: 'Expande el dominio paraguayo sobre la cuenca interior integrando Bolivia y Uruguay.',
      newName: 'Gran Paraguay',
      controlIso2: ['BO', 'UY'],
    },
  },
  CL: {
    heritageTitle: 'Linaje del Pacífico Austral',
    heritageSummary: 'De la independencia en Maipú al dominio marítimo del Pacífico Sur.',
    root: {
      era: '1818',
      title: 'Victoria de Maipú',
      subtitle: 'Consolidación de la República de Chile',
      history: 'Organiza el Estado chileno con disciplina administrativa y estabilidad fiscal.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Cobre, Litio y Valparaíso',
      subtitle: 'Exportación minera y dominio portuario',
      history: 'Desarrolla la gran minería y los puertos del Pacífico sur.',
      minPorts: 1,
    },
    military: {
      era: '1879 – 1884',
      title: 'Escuadra del Pacífico',
      subtitle: 'Doctrina naval y de infantería',
      history: 'Moderniza la armada y el ejército para proyectar poder en la costa occidental.',
      minAnnexations: 1,
    },
    restoration: {
      era: 'Hegemonía Austral',
      title: 'República del Pacífico Sur',
      subtitle: 'Dominio integral del litoral andino',
      history: 'Unifica Chile, Perú y Bolivia en una gran potencia del Pacífico Sur.',
      newName: 'República del Pacífico Sur',
      controlIso2: ['PE', 'BO'],
    },
  },
  BR: {
    heritageTitle: 'Linaje Imperial Lusobrasileño',
    heritageSummary: 'Del Imperio del Brasil a la supremacía continental de Sudamérica.',
    root: {
      era: '1822',
      title: 'Grito de Ipiranga',
      subtitle: 'Independencia del Brasil',
      history: 'Consolida la inmensa integridad territorial brasileña desde la Amazonía al sur.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Gigante Industrial y Agrícola',
      subtitle: 'Polo económico del Atlántico Sur',
      history: 'Desarrolla polos industriales, mineros y portuarios a escala continental.',
      minPorts: 1,
    },
    military: {
      era: '1865 – 1945',
      title: 'Fuerza Expedicionaria Brasileña',
      subtitle: 'Proyección militar transatlántica',
      history: 'Organiza el mayor aparato militar sudamericano con doctrina moderna.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1822 – 1889',
      title: 'Restaurar el Imperio del Brasil',
      subtitle: 'Corona de Pedro II y la Cisplatina',
      history: 'Restaura el histórico Imperio del Brasil incorporando la Banda Oriental y el Paraguay.',
      newName: 'Imperio del Brasil',
      controlIso2: ['UY', 'PY'],
      proclamationText: '¡Brasilia proclama el retorno del Imperio del Brasil!',
    },
    secondaryRestoration: {
      era: 'Unión Continental',
      title: 'Unión Sudamericana',
      subtitle: 'Integración de las potencias del sur',
      history: 'Consolida la hegemonía continental uniendo Argentina, Colombia y Perú.',
      newName: 'Unión Sudamericana',
      controlIso2: ['AR', 'CO', 'PE'],
    },
  },
  MX: {
    heritageTitle: 'Linaje Mexica y Novohipano',
    heritageSummary: 'Desde Tenochtitlán y la independencia de 1821 hasta el Primer Imperio Mexicano.',
    root: {
      era: '1810 – 1821',
      title: 'Consumación de la Independencia',
      subtitle: 'Herencia de Tenochtitlán y la República',
      history: 'Reafirma la fuerza cultural y administrativa del corazón de Mesoamérica.',
    },
    economy: {
      era: 'Siglos XVI – XXI',
      title: 'Rutas de Plata e Industria del Golfo',
      subtitle: 'Puente entre el Pacífico y el Atlántico',
      history: 'Impulsa la minería histórica y las grandes metrópolis industriales.',
      minPorts: 1,
    },
    military: {
      era: '1862',
      title: 'Ejército de Oriente',
      subtitle: 'Espíritu de la Batalla de Puebla',
      history: 'Refuerza la defensa nacional y la capacidad expedicionaria hacia el sur.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1821 – 1823',
      title: 'Restaurar el Imperio Mexicano',
      subtitle: 'De México a Centroamérica',
      history: 'Restaura las fronteras del Primer Imperio Mexicano integrando Guatemala, Honduras y El Salvador.',
      newName: 'Imperio Mexicano',
      controlIso2: ['GT', 'HN', 'SV'],
      proclamationText: '¡Ciudad de México proclama la restauración del Imperio Mexicano!',
    },
  },
  US: {
    heritageTitle: 'Linaje de las Trece Colonias',
    heritageSummary: 'De la Declaración de 1776 al liderazgo industrial y continental de Norteamérica.',
    root: {
      era: '1776 – 1787',
      title: 'Constitución de Filadelfia',
      subtitle: 'Fundación federal estadounidense',
      history: 'Afianza el federalismo y la capacidad financiera de la república.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Arsenal Industrial y Tecnológico',
      subtitle: 'Ferrocarriles, industria y comercio global',
      history: 'Acelera la productividad urbana y la proyección naval en ambos océanos.',
      minPorts: 1,
    },
    military: {
      era: '1941 – Presente',
      title: 'Comando Conjunto Global',
      subtitle: 'Proyección estratégica y alianzas',
      history: 'Moderniza la doctrina militar conjunta y la logística de combate.',
      minAllies: 2,
    },
    restoration: {
      era: 'Proyecto Continental',
      title: 'Unión Norteamericana',
      subtitle: 'Integración total de Norteamérica',
      history: 'Unifica Estados Unidos, Canadá y México en una superpotencia continental.',
      newName: 'Unión Norteamericana',
      controlIso2: ['CA', 'MX'],
      proclamationText: '¡Washington proclama la Unión Norteamericana de océano a océano!',
    },
  },
  CA: {
    heritageTitle: 'Linaje de la Confederación Canadiense',
    heritageSummary: 'Del Dominio de 1867 a la unión del continente norteamericano.',
    root: {
      era: '1867',
      title: 'Acta de la Confederación',
      subtitle: 'Unión del Atlántico al Pacífico',
      history: 'Consolida las provincias canadienses y su infraestructura ferroviaria.',
    },
    economy: {
      era: 'Siglos XX – XXI',
      title: 'Recursos del Escudo Canadiense',
      subtitle: 'Energía, minerales y rutas árticas',
      history: 'Multiplica los ingresos extractivos y marítimos del norte.',
      minPorts: 1,
    },
    military: {
      era: '1917 – 1945',
      title: 'Cuerpo Expedicionario de Vimy',
      subtitle: 'Disciplina y defensa del norte',
      history: 'Entrena cuerpos de élite con experiencia internacional.',
      minAllies: 1,
    },
    restoration: {
      era: 'Hegemonía Boreal',
      title: 'Dominio de Norteamérica',
      subtitle: 'Liderazgo continental desde Ottawa',
      history: 'Integra los territorios norteamericanos bajo la corona y federación de Ottawa.',
      newName: 'Dominio de Norteamérica',
      controlIso2: ['US'],
    },
  },
  GT: {
    heritageTitle: 'Linaje Maya y Centroamericano',
    heritageSummary: 'Sede de la antigua Capitanía General de Guatemala y cuna centroamericana.',
    root: {
      era: '1821',
      title: 'Acta de Independencia de Centroamérica',
      subtitle: 'Liderazgo histórico en la región',
      history: 'Consolida la administración central y la riqueza cultural maya.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Corredor del Café y Comercio Istmeño',
      subtitle: 'Rutas del Caribe y el Pacífico',
      history: 'Expande el comercio agrícola e infraestructura urbana.',
    },
    military: {
      era: '1823 – 1840',
      title: 'Ejército Unionista',
      subtitle: 'Fuerza de integración istmeña',
      history: 'Prepara las fuerzas para reunificar el istmo centroamericano.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1823 – 1839',
      title: 'República Federal de Centroamérica',
      subtitle: 'Reunificación de las cinco naciones',
      history: 'Restaura la histórica Federación Centroamericana uniendo Guatemala, Honduras, El Salvador, Nicaragua y Costa Rica.',
      newName: 'Federación Centroamericana',
      controlIso2: ['HN', 'SV', 'NI', 'CR'],
      proclamationText: '¡Renace la República Federal de Centroamérica!',
    },
  },
  CU: {
    heritageTitle: 'Linaje Antillano',
    heritageSummary: 'La Perla de las Antillas y eje estratégico del mar Caribe.',
    root: {
      era: '1868 – 1898',
      title: 'Gesta de Yara y Martí',
      subtitle: 'Identidad soberana de las Antillas',
      history: 'Reafirma la independencia insular y la cohesión social.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Puertos de La Habana y Comercio Antillano',
      subtitle: 'Llave del Golfo de México',
      history: 'Convierte la isla en potencia marítima y comercial del Caribe.',
      minPorts: 1,
    },
    military: {
      era: 'Siglo XX',
      title: 'Bastión Naval del Caribe',
      subtitle: 'Defensa insular y proyección anfibia',
      history: 'Refuerza la capacidad de desembarco y defensa costera.',
    },
    restoration: {
      era: 'Proyecto Antillano',
      title: 'Confederación Antillana',
      subtitle: 'Sueño integrador del Caribe',
      history: 'Une Cuba, República Dominicana y Haití en una sola nación antillana.',
      newName: 'Confederación Antillana',
      controlIso2: ['DO', 'HT'],
    },
  },

  // === EUROPA ===
  ES: {
    heritageTitle: 'Linaje Hispánico e Ibérico',
    heritageSummary: 'De los Reyes Católicos y el Siglo de Oro a la Unión Ibérica y el renacer hispánico.',
    root: {
      era: '1492 – 1516',
      title: 'Unión de Coronas y Siglo de Oro',
      subtitle: 'Nacimiento de la monarquía hispánica',
      history: 'Consolida la unidad peninsular y el impulso cultural y administrativo de Madrid.',
    },
    economy: {
      era: 'Siglos XVI – XXI',
      title: 'Flota de Indias y Puertos Atlánticos',
      subtitle: 'Comercio entre Europa y América',
      history: 'Desarrolla puertos atlánticos y mediterráneos para dominar las rutas comerciales.',
      minPorts: 1,
    },
    military: {
      era: '1534 – 1704',
      title: 'Tercios Modernos',
      subtitle: 'Infantería disciplinada de élite',
      history: 'Adapta la disciplina histórica de los Tercios al combate moderno.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1580 – 1640',
      title: 'Restaurar la Unión Ibérica',
      subtitle: 'Unificación de la Península Ibérica',
      history: 'Une España y Portugal en una sola potencia ibérica y atlántica.',
      newName: 'Unión Ibérica',
      controlIso2: ['PT'],
      proclamationText: '¡Madrid proclama la histórica Unión Ibérica!',
    },
    secondaryRestoration: {
      era: '1492 – 1824',
      title: 'Imperio Hispánico',
      subtitle: 'Puente soberano entre Europa y el Norte de África',
      history: 'Extiende el dominio ibérico sobre Portugal, Marruecos e Italia del sur.',
      newName: 'Imperio Español',
      controlIso2: ['PT', 'MA'],
    },
  },
  PT: {
    heritageTitle: 'Linaje de los Navegantes Lusos',
    heritageSummary: 'De Enrique el Navegante y los Descubrimientos a la Unión Ibérica.',
    root: {
      era: '1143 – 1415',
      title: 'Era de los Descubrimientos',
      subtitle: 'Escuela de Sagres y expansión atlántica',
      history: 'Reaviva la tradición marítima y comercial portuguesa.',
    },
    economy: {
      era: 'Siglos XV – XVI',
      title: 'Ruta de las Especias y Lisboa',
      subtitle: 'Puertos oceánicos y comercio global',
      history: 'Convierte Lisboa en gran centro financiero y portuario.',
      minPorts: 1,
    },
    military: {
      era: '1385',
      title: 'Guardia de Aljubarrota',
      subtitle: 'Defensa peninsular y marina oceánica',
      history: 'Fortalece el ejército portugués y su proyección anfibia.',
    },
    restoration: {
      era: '1580 – 1640',
      title: 'Unión Ibérica Lusitana',
      subtitle: 'Península unida desde Lisboa',
      history: 'Reúne Portugal y España bajo liderazgo portugués.',
      newName: 'Unión Ibérica',
      controlIso2: ['ES'],
    },
  },
  FR: {
    heritageTitle: 'Linaje Galo y Napoleónico',
    heritageSummary: 'De la Revolución Francesa y el Código Civil al Primer Imperio Francés.',
    root: {
      era: '1789 – 1804',
      title: 'Revolución y Código Napoleónico',
      subtitle: 'Modernización estatal francesa',
      history: 'Reforma las instituciones nacionales y dinamiza la recaudación en París.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Belle Époque e Industria Europea',
      subtitle: 'Ciencia, ferrocarriles y comercio marítimo',
      history: 'Expande las grandes ciudades y la industria aeroespacial y naval.',
      minPorts: 1,
    },
    military: {
      era: '1805 – 1815',
      title: 'La Grande Armée',
      subtitle: 'Artillería móvil y maniobra estratégica',
      history: 'Reorganiza los cuerpos de ejército con doctrina ofensiva de maniobra.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1804 – 1815',
      title: 'Primer Imperio Francés',
      subtitle: 'Águilas imperiales sobre Europa Occidental',
      history: 'Restaura la hegemonía continental francesa sobre Bélgica, Países Bajos y Suiza.',
      newName: 'Imperio Francés',
      controlIso2: ['BE', 'NL', 'CH'],
      proclamationText: '¡París proclama el renacimiento del Imperio Francés!',
    },
  },
  DE: {
    heritageTitle: 'Linaje Germánico y Prusiano',
    heritageSummary: 'De la Unificación de 1871 y el Milagro Económico al Sacro Imperio.',
    root: {
      era: '1871',
      title: 'Unificación de Bismarck',
      subtitle: 'Consolidación industrial de Berlín',
      history: 'Unifica las capacidades productivas alemanas con disciplina administrativa.',
    },
    economy: {
      era: '1950 – Presente',
      title: 'Wirtschaftswunder (Milagro Económico)',
      subtitle: 'Potencia manufacturera del Ruhr',
      history: 'Eleva la eficiencia de ciudades e industria pesada alemana.',
    },
    military: {
      era: 'Siglos XIX – XX',
      title: 'Estado Mayor General',
      subtitle: 'Logística y coordinación blindada',
      history: 'Profesionaliza la cadena de mando y la capacidad de movilización.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1871 – 1918',
      title: 'Restaurar el Imperio Alemán',
      subtitle: 'Gran federación de Europa Central',
      history: 'Integra Alemania, Austria y Chequia en una gran potencia centroeuropea.',
      newName: 'Imperio Alemán',
      controlIso2: ['AT', 'CZ'],
      proclamationText: '¡Berlín proclama la restauración del Imperio Alemán!',
    },
    secondaryRestoration: {
      era: '962 – 1806',
      title: 'Sacro Imperio Romano Germánico',
      subtitle: 'Corona imperial de Europa Central',
      history: 'Reúne Alemania, Austria, Suiza, Chequia y Países Bajos bajo el Sacro Imperio.',
      newName: 'Sacro Imperio Germánico',
      controlIso2: ['AT', 'CH', 'CZ', 'NL'],
    },
  },
  IT: {
    heritageTitle: 'Linaje Romano y del Risorgimento',
    heritageSummary: 'De la antigua Roma y el Renacimiento al dominio del Mare Nostrum.',
    root: {
      era: '1861',
      title: 'Risorgimento Italiano',
      subtitle: 'Unificación de la península',
      history: 'Consolida el legado cultural y estatal desde Roma hasta los Alpes.',
    },
    economy: {
      era: 'Siglos XV – XXI',
      title: 'Renacimiento y Repúblicas Marítimas',
      subtitle: 'Venecia, Génova y comercio mediterráneo',
      history: 'Impulsa el comercio naval y el desarrollo de ciudades prósperas.',
      minPorts: 1,
    },
    military: {
      era: 'Antigüedad – Modernidad',
      title: 'Legiones del Mediterráneo',
      subtitle: 'Proyección naval y terrestre',
      history: 'Refuerza las fuerzas armadas para proyectar influencia en el Mediterráneo.',
      minAnnexations: 1,
    },
    restoration: {
      era: '27 a. C. – 476 d. C.',
      title: 'Restaurar el Imperio Romano',
      subtitle: 'SPQR · Dominio del Mare Nostrum',
      history: 'Restaura la gloria del Imperio Romano controlando Francia, España y Grecia.',
      newName: 'Imperio Romano',
      controlIso2: ['FR', 'ES', 'GR'],
      proclamationText: '¡SPQR! ¡Roma proclama la restauración del Imperio Romano!',
    },
  },
  GB: {
    heritageTitle: 'Linaje Británico y Marítimo',
    heritageSummary: 'De la Revolución Industrial y la Royal Navy a la Mancomunidad Imperial.',
    root: {
      era: '1707 – 1801',
      title: 'Acta de Unión y Revolución Industrial',
      subtitle: 'Motor industrial de Londres',
      history: 'Aprovecha la herencia financiera e industrial británica.',
    },
    economy: {
      era: 'Siglos XVIII – XXI',
      title: 'Centro Financiero de la City',
      subtitle: 'Banca global y comercio oceánico',
      history: 'Impulsa la recaudación comercial y la red de puertos británicos.',
      minPorts: 1,
    },
    military: {
      era: '1805 – 1945',
      title: 'Rule Britannia · Royal Navy',
      subtitle: 'Supremacía naval mundial',
      history: 'Consolida la capacidad de invasión anfibia y defensa insular.',
      minAllies: 2,
    },
    restoration: {
      era: '1583 – 1947',
      title: 'Restaurar el Imperio Británico',
      subtitle: 'Corona de los Mares y Mancomunidad',
      history: 'Unifica las Islas Británicas y proyecta la corona sobre Irlanda y Canadá.',
      newName: 'Imperio Británico',
      controlIso2: ['IE', 'CA'],
      proclamationText: '¡Londres proclama la restauración del Imperio Británico!',
    },
  },
  RU: {
    heritageTitle: 'Linaje Imperial Ruso y Euroasiático',
    heritageSummary: 'De Pedro el Grande a la vasta integración del espacio euroasiático.',
    root: {
      era: '1721',
      title: 'Reformas de Pedro el Grande',
      subtitle: 'Modernización de Moscú y San Petersburgo',
      history: 'Impulsa la modernización administrativa y el aprovechamiento del vasto territorio.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Ferrocarril Transiberiano y Recursos',
      subtitle: 'Energía y minería continental',
      history: 'Conecta y explota las reservas minerales desde Europa hasta el Pacífico.',
    },
    military: {
      era: '1812 – 1945',
      title: 'Doctrina de Profundidad Estratégica',
      subtitle: 'Ejército continental masivo',
      history: 'Fortalece la capacidad militar y las defensas en profundidad.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1721 – 1917',
      title: 'Restaurar el Imperio Ruso',
      subtitle: 'Unión de las estepas y Europa Oriental',
      history: 'Reunifica Rusia, Bielorrusia, Ucrania y Kazajistán en el Imperio Ruso.',
      newName: 'Imperio Ruso',
      controlIso2: ['BY', 'UA', 'KZ'],
      proclamationText: '¡Moscú proclama la restauración del Imperio Ruso!',
    },
  },
  PL: {
    heritageTitle: 'Linaje de la Mancomunidad Polaca',
    heritageSummary: 'De los Húsares Alados a la unión histórica con Lituania.',
    root: {
      era: '1569',
      title: 'Unión de Lublin',
      subtitle: 'Herencia parlamentaria y soberana',
      history: 'Reafirma el papel central de Varsovia en Europa del Este.',
    },
    economy: {
      era: 'Siglo XXI',
      title: 'Corredor del Báltico y Vístula',
      subtitle: 'Crecimiento industrial europeo',
      history: 'Desarrolla las ciudades polacas y su salida marítima al Báltico.',
    },
    military: {
      era: '1683',
      title: 'Húsares Alados Modernos',
      subtitle: 'Fuerza acorazada y defensiva',
      history: 'Forja un ejército ágil capaz de defender las llanuras europeas.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1569 – 1795',
      title: 'Mancomunidad Polaco-Lituana',
      subtitle: 'República de las Dos Naciones',
      history: 'Restaura la Mancomunidad integrando Polonia, Lituania y Bielorrusia.',
      newName: 'Mancomunidad Polaco-Lituana',
      controlIso2: ['LT', 'BY'],
      proclamationText: '¡Varsovia restaura la histórica Mancomunidad Polaco-Lituana!',
    },
  },
  AT: {
    heritageTitle: 'Linaje de los Habsburgo',
    heritageSummary: 'De la corte imperial de Viena a la monarquía dual del Danubio.',
    root: {
      era: '1804',
      title: 'Herencia Imperial de Viena',
      subtitle: 'Diplomacia y cultura centroeuropea',
      history: 'Consolida el prestigio diplomático y urbano de Austria.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Comercio del Danubio y los Alpes',
      subtitle: 'Banca e industria de precisión',
      history: 'Convierte Viena en núcleo financiero del centro de Europa.',
    },
    military: {
      era: '1867 – 1918',
      title: 'Ejército Imperial y Real',
      subtitle: 'Fortificaciones alpinas y movilización',
      history: 'Refuerza las divisiones centroeuropeas y sus fortificaciones.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1867 – 1918',
      title: 'Imperio Austrohúngaro',
      subtitle: 'Monarquía Dual del Danubio',
      history: 'Reunifica Austria, Hungría, Chequia y Eslovaquia bajo la corona imperial.',
      newName: 'Imperio Austrohúngaro',
      controlIso2: ['HU', 'CZ', 'SK'],
      proclamationText: '¡Viena proclama la restauración del Imperio Austrohúngaro!',
    },
  },
  HU: {
    heritageTitle: 'Linaje de la Corona de San Esteban',
    heritageSummary: 'De los magiares y Budapest a la restauración de la Monarquía del Danubio.',
    root: {
      era: '1000',
      title: 'Corona de San Esteban',
      subtitle: 'Mil años de historia en el Danubio',
      history: 'Afianza la identidad histórica de Budapest y su administración.',
    },
    economy: {
      era: 'Siglo XIX',
      title: 'Granero de la Cuenca Carpática',
      subtitle: 'Puentes y comercio fluvial',
      history: 'Impulsa la economía urbana y agrícola de Hungría.',
    },
    military: {
      era: '1458 – 1848',
      title: 'Ejército Negro y Húsares',
      subtitle: 'Tradición militar húngara',
      history: 'Moderniza las tropas rápidas de defensa y ataque.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1867 – 1918',
      title: 'Imperio Austrohúngaro',
      subtitle: 'Unión del Danubio liderada por Budapest',
      history: 'Une Hungría, Austria, Eslovaquia y Croacia en la Monarquía Dual.',
      newName: 'Imperio Austrohúngaro',
      controlIso2: ['AT', 'SK', 'HR'],
    },
  },
  GR: {
    heritageTitle: 'Linaje Helénico y Bizantino',
    heritageSummary: 'De la Grecia Clásica y Alejandro Magno al Imperio Bizantino.',
    root: {
      era: 'Antigüedad – 1821',
      title: 'Herencia de Atenas e Independencia',
      subtitle: 'Cuna de la civilización mediterránea',
      history: 'Consolida el legado helénico y la estabilidad estatal.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Flota Mercante del Egeo',
      subtitle: 'Supremacía marítima comercial',
      history: 'Potencia los puertos griegos y el comercio del Mediterráneo oriental.',
      minPorts: 1,
    },
    military: {
      era: '334 a. C. – 1453',
      title: 'Falange y Guardia Varega',
      subtitle: 'Estrategia defensiva y ofensiva',
      history: 'Entrena fuerzas combinadas terrestres y navales.',
      minAnnexations: 1,
    },
    restoration: {
      era: '330 – 1453',
      title: 'Restaurar el Imperio Bizantino',
      subtitle: 'Retorno de Constantinopla y el Egeo',
      history: 'Restaura el Imperio Romano de Oriente integrando Turquía y Bulgaria.',
      newName: 'Imperio Bizantino',
      controlIso2: ['TR', 'BG'],
      proclamationText: '¡Atenas proclama el renacimiento del Imperio Bizantino!',
    },
  },
  SE: {
    heritageTitle: 'Linaje Nórdico y de Kalmar',
    heritageSummary: 'Del Imperio Sueco y el Báltico a la gran unión escandinava.',
    root: {
      era: '1523',
      title: 'Legado de Gustavo Vasa',
      subtitle: 'Estado moderno sueco',
      history: 'Fortalece las instituciones y recursos minerales del norte.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Hierro de Kiruna e Innovación Nórdica',
      subtitle: 'Industria avanzada del Báltico',
      history: 'Impulsa minería, tecnología y puertos escandinavos.',
      minPorts: 1,
    },
    military: {
      era: '1611 – 1721',
      title: 'Caroleans Modernos',
      subtitle: 'Ejército profesional nórdico',
      history: 'Entrena tropas disciplinadas para operar en clima frío.',
    },
    restoration: {
      era: '1397 – 1523',
      title: 'Restaurar la Unión de Kalmar',
      subtitle: 'Unificación de Escandinavia',
      history: 'Reúne Suecia, Noruega y Dinamarca en la gran Unión de Kalmar.',
      newName: 'Unión de Kalmar',
      controlIso2: ['NO', 'DK'],
      proclamationText: '¡Estocolmo proclama la restauración de la Unión de Kalmar!',
    },
  },
  NO: {
    heritageTitle: 'Linaje Vikingo y del Mar del Norte',
    heritageSummary: 'De los navegantes nórdicos a la prosperidad energética y la Unión de Kalmar.',
    root: {
      era: '1814 – 1905',
      title: 'Constitución de Eidsvoll',
      subtitle: 'Soberanía e identidad noruega',
      history: 'Afianza el Estado noruego y la administración de sus fiordos.',
    },
    economy: {
      era: '1969 – Presente',
      title: 'Fondo Soberano del Mar del Norte',
      subtitle: 'Energía marítima y finanzas',
      history: 'Maximiza el ingreso sostenible de recursos marinos y mineros.',
      minPorts: 1,
    },
    military: {
      era: 'Siglos IX – XXI',
      title: 'Guardia de los Fiordos',
      subtitle: 'Defensa costera y comandos árticos',
      history: 'Fortalece la capacidad defensiva y expedicionaria naval.',
    },
    restoration: {
      era: '1397 – 1523',
      title: 'Unión de Kalmar',
      subtitle: 'Escandinavia unida desde Oslo',
      history: 'Une Noruega, Suecia y Dinamarca en la Unión de Kalmar.',
      newName: 'Unión de Kalmar',
      controlIso2: ['SE', 'DK'],
    },
  },
  DK: {
    heritageTitle: 'Linaje Danés y del Estrecho',
    heritageSummary: 'Fundador histórico de la Unión de Kalmar y guardián del Báltico.',
    root: {
      era: '965 – 1397',
      title: 'Corona de Margarita I',
      subtitle: 'Raíces de la diplomacia escandinava',
      history: 'Reivindica la tradición fundacional danesa en el norte de Europa.',
    },
    economy: {
      era: 'Siglos XVII – XXI',
      title: 'Peajes del Sund y Navieras Globales',
      subtitle: 'Comercio marítimo del Báltico',
      history: 'Convierte Copenhague en eje marítimo del norte.',
      minPorts: 1,
    },
    military: {
      era: 'Siglo XXI',
      title: 'Flota del Báltico y Groenlandia',
      subtitle: 'Proyección ártica y naval',
      history: 'Amplía la preparación militar y defensa costera.',
    },
    restoration: {
      era: '1397 – 1523',
      title: 'Restaurar la Unión de Kalmar',
      subtitle: 'Reunificación nórdica desde Copenhague',
      history: 'Reconstruye la Unión de Kalmar junto a Suecia y Noruega.',
      newName: 'Unión de Kalmar',
      controlIso2: ['SE', 'NO'],
    },
  },
  NL: {
    heritageTitle: 'Linaje de las Provincias Unidas',
    heritageSummary: 'De la Edad de Oro Neerlandesa a la unión histórica del Benelux.',
    root: {
      era: '1581 – 1648',
      title: 'República de las Provincias Unidas',
      subtitle: 'Independencia y república comercial',
      history: 'Consolida la ingeniería hidráulica y la eficiencia estatal.',
    },
    economy: {
      era: 'Siglo XVII',
      title: 'Edad de Oro y Puerto de Róterdam',
      subtitle: 'Compañías marítimas y finanzas',
      history: 'Dispara el comercio marítimo y los ingresos portuarios.',
      minPorts: 1,
    },
    military: {
      era: '1667',
      title: 'Armada de De Ruyter',
      subtitle: 'Defensa de diques y poder naval',
      history: 'Moderniza la defensa territorial y la proyección marítima.',
    },
    restoration: {
      era: '1815 – 1830',
      title: 'Reino Unido de los Países Bajos',
      subtitle: 'Unificación histórica del Benelux',
      history: 'Reúne Países Bajos, Bélgica y Luxemburgo en un solo Estado.',
      newName: 'Unión del Benelux',
      controlIso2: ['BE', 'LU'],
    },
  },
  RS: {
    heritageTitle: 'Linaje Balcánico y Eslavo del Sur',
    heritageSummary: 'Del Imperio Serbio medieval a la reunificación de los Balcanes.',
    root: {
      era: '1346 – 1878',
      title: 'Herencia de Belgrado y el Danubio',
      subtitle: 'Soberanía en la encrucijada balcánica',
      history: 'Consolida el corazón industrial y militar serbio.',
    },
    economy: {
      era: 'Siglo XX',
      title: 'Corredor Balcánico',
      subtitle: 'Industria y rutas del Danubio',
      history: 'Expande las ciudades y rutas comerciales regionales.',
    },
    military: {
      era: '1914 – 1945',
      title: 'Resistencia de los Balcanes',
      subtitle: 'Defensa territorial y movilización',
      history: 'Prepara divisiones curtidas para campañas regionales.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1918 – 1992',
      title: 'Restaurar Yugoslavia',
      subtitle: 'Unión de los Eslavos del Sur',
      history: 'Reúne Serbia, Croacia, Bosnia y Herzegovina y Montenegro.',
      newName: 'Yugoslavia',
      controlIso2: ['HR', 'BA', 'ME'],
      proclamationText: '¡Belgrado proclama la restauración de Yugoslavia!',
    },
  },
  UA: {
    heritageTitle: 'Linaje de la Rus de Kiev',
    heritageSummary: 'De los príncipes de Kiev y los cosacos a la integración de Europa Oriental.',
    root: {
      era: '882 – 1991',
      title: 'Legado de la Rus de Kiev',
      subtitle: 'Raíces históricas a orillas del Dniéper',
      history: 'Afianza la soberanía y la capacidad productiva de Kiev.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Tierras Negras y Puertos del Mar Negro',
      subtitle: 'Granero de Europa e industria pesada',
      history: 'Potencia los ingresos agrícolas, mineros y portuarios.',
    },
    military: {
      era: '1648 – Presente',
      title: 'Espíritu Cosaco de Zaporiyia',
      subtitle: 'Defensa tenaz y guerra moderna',
      history: 'Refuerza el ejército con alta disciplina defensiva.',
    },
    restoration: {
      era: '882 – 1240',
      title: 'Restaurar la Rus de Kiev',
      subtitle: 'Reunificación histórica eslava oriental',
      history: 'Reconstruye el antiguo dominio de Kiev uniendo Ucrania y Bielorrusia.',
      newName: 'Rus de Kiev',
      controlIso2: ['BY'],
    },
  },
  RO: {
    heritageTitle: 'Linaje Dacio y del Danubio',
    heritageSummary: 'De la unión de Valaquia y Moldavia a la Gran Rumania.',
    root: {
      era: '1859 – 1918',
      title: 'Gran Unión de Alba Iulia',
      subtitle: 'Consolidación nacional rumana',
      history: 'Fortalece el Estado y las infraestructuras de los Cárpatos.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Refinerías de Ploiești y Constanza',
      subtitle: 'Energía y comercio del Mar Negro',
      history: 'Aumenta los ingresos energéticos y marítimos.',
    },
    military: {
      era: '1877 – 1918',
      title: 'Guardia de los Cárpatos',
      subtitle: 'Fortificación montañosa y ofensiva',
      history: 'Mejora la capacidad de combate y defensa territorial.',
    },
    restoration: {
      era: '1918 – 1940',
      title: 'Restaurar la Gran Rumania',
      subtitle: 'Reunificación con Moldavia',
      history: 'Reúne Rumania y Moldavia bajo una misma bandera.',
      newName: 'Gran Rumania',
      controlIso2: ['MD'],
    },
  },
  CZ: {
    heritageTitle: 'Linaje de Bohemia y Moravia',
    heritageSummary: 'De la Corona de Bohemia y Praga a la unión checoslovaca.',
    root: {
      era: '1348 – 1918',
      title: 'Legado de Carlos IV y Praga',
      subtitle: 'Corazón cultural e industrial de Europa',
      history: 'Impulsa el desarrollo urbano y técnico de Bohemia.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Taller Industrial de Europa Central',
      subtitle: 'Ingeniería, acero y manufactura',
      history: 'Eleva la recaudación de las ciudades checas.',
    },
    military: {
      era: '1420 – 1938',
      title: 'Fortalezas de los Sudetes',
      subtitle: 'Defensa blindada e ingenieril',
      history: 'Consolida un ejército bien equipado y defensivo.',
    },
    restoration: {
      era: '1918 – 1992',
      title: 'Restaurar Checoslovaquia',
      subtitle: 'Reunión histórica de checos y eslovacos',
      history: 'Reunifica Chequia y Eslovaquia en la República de Checoslovaquia.',
      newName: 'Checoslovaquia',
      controlIso2: ['SK'],
    },
  },

  // === ASIA ===
  TR: {
    heritageTitle: 'Linaje de Anatolia y el Bósforo',
    heritageSummary: 'De la Sublime Puerta y Atatürk a la encrucijada de dos continentes.',
    root: {
      era: '1923',
      title: 'República de Ankara y Modernización',
      subtitle: 'Reformas de Atatürk',
      history: 'Consolida un Estado moderno y una economía dinámica en Anatolia.',
    },
    economy: {
      era: 'Siglos XV – XXI',
      title: 'Dominio de los Estrechos',
      subtitle: 'Bósforo, Dardanelos y comercio',
      history: 'Capitaliza el tránsito marítimo entre el Mar Negro y el Mediterráneo.',
      minPorts: 1,
    },
    military: {
      era: '1453 – 1915',
      title: 'Defensores de Galípoli',
      subtitle: 'Fuerza terrestre y proyección regional',
      history: 'Forja un ejército formidable capaz de operar en varios frentes.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1299 – 1922',
      title: 'Restaurar el Imperio Otomano',
      subtitle: 'Soberanía sobre Anatolia, Balcanes y Levante',
      history: 'Restaura el Imperio Otomano controlando Grecia, Siria e Irak.',
      newName: 'Imperio Otomano',
      controlIso2: ['GR', 'SY', 'IQ'],
      proclamationText: '¡Ankara proclama la restauración del Imperio Otomano!',
    },
  },
  CN: {
    heritageTitle: 'Linaje del Imperio del Centro',
    heritageSummary: 'Cinco milenios de dinastías, la Ruta de la Seda y la supremacía asiática.',
    root: {
      era: '221 a. C. – 1949',
      title: 'Unificación de las Dinastías',
      subtitle: 'Continuidad imperial y modernización',
      history: 'Reafirma la unidad continental y la escala administrativa de Pekín.',
    },
    economy: {
      era: '130 a. C. – Presente',
      title: 'Nueva Ruta de la Seda',
      subtitle: 'Comercio terrestre y marítimo global',
      history: 'Multiplica los ingresos de ciudades, minas y rutas portuarias.',
      minPorts: 1,
    },
    military: {
      era: 'Siglo V a. C. – Presente',
      title: 'El Arte de la Guerra',
      subtitle: 'Doctrina estratégica y gran movilización',
      history: 'Aplica principios clásicos y tecnología moderna al ejército.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1644 – 1912',
      title: 'Gran Imperio de China',
      subtitle: 'Esplendor de la Dinastía Qing',
      history: 'Consolida el dominio histórico sobre Mongolia y la península coreana.',
      newName: 'Gran Imperio Chino',
      controlIso2: ['MN', 'KP'],
      proclamationText: '¡Pekín proclama el Gran Imperio de China!',
    },
  },
  MN: {
    heritageTitle: 'Linaje de Gengis Kan',
    heritageSummary: 'De la estepa mongola al mayor imperio terrestre de la historia.',
    root: {
      era: '1206',
      title: 'Kurultái de la Estepa',
      subtitle: 'Unificación de las tribus mongolas',
      history: 'Despierta la unidad estratégica de Ulán Bator.',
    },
    economy: {
      era: 'Siglos XIII – XXI',
      title: 'Pax Mongolica y Minería del Gobi',
      subtitle: 'Rutas de caravanas y minerales',
      history: 'Desarrolla las reservas mineras del desierto de Gobi.',
    },
    military: {
      era: '1206 – 1294',
      title: 'Horda de Caballería Blindada',
      subtitle: 'Velocidad y cerco en la estepa',
      history: 'Entrena regimientos veloces de alto impacto.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1206 – 1368',
      title: 'Restaurar el Imperio Mongol',
      subtitle: 'El retorno del Gran Kan',
      history: 'Restaura el legendario Imperio Mongol sometiendo Kazajistán y China.',
      newName: 'Imperio Mongol',
      controlIso2: ['KZ', 'CN'],
      proclamationText: '¡La estepa ruge: renace el Imperio Mongol!',
    },
  },
  JP: {
    heritageTitle: 'Linaje del Sol Naciente',
    heritageSummary: 'De la Restauración Meiji a la supremacía tecnológica y marítima del Pacífico.',
    root: {
      era: '1868',
      title: 'Restauración Meiji',
      subtitle: 'Industrialización acelerada de Tokio',
      history: 'Transforma la economía y la organización estatal con precisión nipona.',
    },
    economy: {
      era: '1955 – Presente',
      title: 'Milagro Tecnológico del Pacífico',
      subtitle: 'Astilleros, robótica y comercio naval',
      history: 'Eleva la eficiencia económica de las metrópolis y puertos japoneses.',
      minPorts: 1,
    },
    military: {
      era: '1905',
      title: 'Flota Combinada del Pacífico',
      subtitle: 'Doctrina anfibia y defensa insular',
      history: 'Refuerza la proyección naval en el Mar de Japón.',
    },
    restoration: {
      era: '1868 – 1945',
      title: 'Imperio del Sol Naciente',
      subtitle: 'Hegemonía del Asia Oriental Marítima',
      history: 'Extiende el dominio imperial sobre la península de Corea.',
      newName: 'Imperio del Sol Naciente',
      controlIso2: ['KR', 'KP'],
      proclamationText: '¡Tokio proclama el Imperio del Sol Naciente!',
    },
  },
  KR: {
    heritageTitle: 'Linaje de Joseon y el Río Han',
    heritageSummary: 'Del Milagro del Río Han a la reunificación de la península coreana.',
    root: {
      era: '1392 – 1948',
      title: 'Herencia de Joseon y Seúl',
      subtitle: 'Identidad cultural y soberanía',
      history: 'Consolida las bases institucionales de la república.',
    },
    economy: {
      era: '1962 – Presente',
      title: 'Milagro del Río Han',
      subtitle: 'Alta tecnología y astilleros',
      history: 'Dispara el desarrollo urbano y los ingresos comerciales.',
      minPorts: 1,
    },
    military: {
      era: '1592 – Presente',
      title: 'Barcos Tortuga y Escudo Moderno',
      subtitle: 'Almirante Yi Sun-sin y defensa activa',
      history: 'Moderniza la defensa y la capacidad ofensiva peninsular.',
    },
    restoration: {
      era: '1897 – 1910',
      title: 'Gran Corea Unificada',
      subtitle: 'Reunificación histórica de la península',
      history: 'Une toda la península coreana bajo la bandera de Seúl.',
      newName: 'Gran Corea Unificada',
      controlIso2: ['KP'],
      proclamationText: '¡La península se reúne: nace la Gran Corea Unificada!',
    },
  },
  KP: {
    heritageTitle: 'Linaje de Goguryeo y Pionyang',
    heritageSummary: 'De los antiguos reinos del norte a la unificación peninsular.',
    root: {
      era: '37 a. C. – 1948',
      title: 'Herencia de Goguryeo',
      subtitle: 'Fortaleza histórica del norte',
      history: 'Afianza el control estatal y la movilización territorial.',
    },
    economy: {
      era: 'Siglo XX',
      title: 'Industria Pesada del Norte',
      subtitle: 'Minería y siderurgia estatal',
      history: 'Aumenta la producción minera y urbana.',
    },
    military: {
      era: 'Siglos XX – XXI',
      title: 'Movilización Permanente',
      subtitle: 'Doctrina de ejército numeroso',
      history: 'Refuerza los regimientos fronterizos y fortificaciones.',
    },
    restoration: {
      era: 'Proyecto Peninsular',
      title: 'Gran Corea Unificada',
      subtitle: 'Unificación desde Pionyang',
      history: 'Unifica el norte y el sur de Corea en un solo Estado.',
      newName: 'Gran Corea Unificada',
      controlIso2: ['KR'],
    },
  },
  IN: {
    heritageTitle: 'Linaje Maurya y del Subcontinente',
    heritageSummary: 'Del Imperio Maurya de Ashoka a la gran unión del subcontinente indio.',
    root: {
      era: '322 a. C. – 1947',
      title: 'Legado de Ashoka e Independencia',
      subtitle: 'Unidad del subcontinente',
      history: 'Reafirma la fuerza demográfica y cultural de Nueva Delhi.',
    },
    economy: {
      era: 'Siglos XVI – XXI',
      title: 'Rutas del Índico y Polos Tecnológicos',
      subtitle: 'Comercio marítimo y metrópolis',
      history: 'Impulsa el crecimiento de grandes ciudades y puertos del Índico.',
      minPorts: 1,
    },
    military: {
      era: '1947 – Presente',
      title: 'Guardia del Himalaya y el Índico',
      subtitle: 'Ejército continental de gran escala',
      history: 'Incrementa la capacidad de movilización y defensa nacional.',
      minAnnexations: 1,
    },
    restoration: {
      era: '322 – 185 a. C.',
      title: 'Restaurar el Imperio Maurya',
      subtitle: 'Reunificación del Gran Subcontinente',
      history: 'Integra India, Pakistán, Bangladés y Nepal bajo el histórico Imperio Maurya.',
      newName: 'Imperio Maurya',
      controlIso2: ['PK', 'BD', 'NP'],
      proclamationText: '¡Nueva Delhi proclama el renacimiento del Imperio Maurya!',
    },
  },
  IR: {
    heritageTitle: 'Linaje Aqueménida y Persa',
    heritageSummary: 'De Ciro el Grande y Persépolis al retorno del Imperio Persa.',
    root: {
      era: '550 a. C.',
      title: 'Legado de Ciro el Grande',
      subtitle: 'Raíces milenarias de Persia',
      history: 'Consolida la administración imperial y la meseta iraní.',
    },
    economy: {
      era: 'Siglos XVI – XXI',
      title: 'Camino Real y Golfo Pérsico',
      subtitle: 'Energía y rutas entre Asia y Occidente',
      history: 'Desarrolla puertos del Golfo y polos mineros e industriales.',
      minPorts: 1,
    },
    military: {
      era: '550 a. C. – Presente',
      title: 'Los Inmortales Modernos',
      subtitle: 'Fuerza de élite y defensa en montaña',
      history: 'Refuerza la capacidad ofensiva y defensiva de Teherán.',
      minAnnexations: 1,
    },
    restoration: {
      era: '550 a. C. – 651 d. C.',
      title: 'Restaurar el Imperio Persa',
      subtitle: 'Soberanía de Mesopotamia al Indo',
      history: 'Restaura el Imperio Persa integrando Irak, Afganistán y Azerbaiyán.',
      newName: 'Imperio Persa',
      controlIso2: ['IQ', 'AF', 'AZ'],
      proclamationText: '¡Teherán proclama el retorno del Imperio Persa!',
    },
  },
  SA: {
    heritageTitle: 'Linaje de la Península Arábiga',
    heritageSummary: 'De las rutas caravaneras y la unificación saudí al Gran Califato Árabe.',
    root: {
      era: '1932',
      title: 'Unificación de Arabia',
      subtitle: 'Consolidación del Reino en Riad',
      history: 'Afianza la unidad territorial del desierto y sus recursos.',
    },
    economy: {
      era: '1938 – Presente',
      title: 'Reserva Energética Mundial',
      subtitle: 'Metrópolis modernas y puertos del Mar Rojo',
      history: 'Transforma los recursos energéticos en tesorería y ciudades prósperas.',
      minPorts: 1,
    },
    military: {
      era: 'Siglo VII – Presente',
      title: 'Escudo del Desierto',
      subtitle: 'Ejército mecanizado y alianzas regionales',
      history: 'Moderniza la fuerza militar y las defensas estratégicas.',
      minAnnexations: 1,
    },
    restoration: {
      era: '632 – 750',
      title: 'Gran Unión Árabe',
      subtitle: 'Unificación de la Península Arábiga y Mesopotamia',
      history: 'Reúne Arabia Saudita, Emiratos, Omán, Yemen e Irak bajo una sola corona.',
      newName: 'Gran Unión Árabe',
      controlIso2: ['AE', 'OM', 'YE', 'IQ'],
      proclamationText: '¡Riad proclama la Gran Unión Árabe!',
    },
  },
  ID: {
    heritageTitle: 'Linaje del Archipiélago Majapahit',
    heritageSummary: 'Del gran imperio marítimo de Java a la unión del Sudeste Asiático.',
    root: {
      era: '1293 – 1945',
      title: 'Juramento de Gajah Mada',
      subtitle: 'Unidad del archipiélago indonesio',
      history: 'Consolida la cohesión marítima desde Sumatra hasta Papúa.',
    },
    economy: {
      era: 'Siglos XIV – XXI',
      title: 'Estrecho de Malaca y Especias',
      subtitle: 'Rutas comerciales del Sudeste Asiático',
      history: 'Maximiza los ingresos portuarios y urbanos del archipiélago.',
      minPorts: 1,
    },
    military: {
      era: '1293 – 1527',
      title: 'Armada de Nusantara',
      subtitle: 'Proyección anfibia insular',
      history: 'Fortalece las operaciones navales en todo el sudeste asiático.',
    },
    restoration: {
      era: '1293 – 1527',
      title: 'Restaurar el Imperio Majapahit',
      subtitle: 'Unión marítima de Nusantara',
      history: 'Restaura el Imperio Majapahit integrando Malasia, Brunéi y Timor Oriental.',
      newName: 'Imperio Majapahit',
      controlIso2: ['MY', 'BN', 'TL'],
      proclamationText: '¡Yakarta proclama la restauración del Imperio Majapahit!',
    },
  },
  TH: {
    heritageTitle: 'Linaje del Reino de Siam',
    heritageSummary: 'La nación nunca colonizada del Sudeste Asiático y heredera de Ayutthaya.',
    root: {
      era: '1351 – 1782',
      title: 'Herencia de Ayutthaya y Bangkok',
      subtitle: 'Soberanía ininterrumpida',
      history: 'Consolida la diplomacia y administración del valle del Chao Phraya.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Puertos del Golfo de Siam',
      subtitle: 'Comercio arrocero e industria',
      history: 'Impulsa el crecimiento urbano y marítimo de Tailandia.',
    },
    military: {
      era: '1593',
      title: 'Guardia Real de Siam',
      subtitle: 'Ejército disciplinado del Sudeste Asiático',
      history: 'Refuerza las fronteras y capacidad ofensiva regional.',
    },
    restoration: {
      era: '1782 – 1939',
      title: 'Gran Reino de Siam',
      subtitle: 'Hegemonía histórica del Mekong',
      history: 'Unifica Tailandia, Laos y Camboya bajo el Gran Reino de Siam.',
      newName: 'Reino de Siam',
      controlIso2: ['LA', 'KH'],
    },
  },
  VN: {
    heritageTitle: 'Linaje de Dai Viet',
    heritageSummary: 'Siglos de resistencia soberana y unificación en el Sudeste Asiático.',
    root: {
      era: '938 – 1975',
      title: 'Independencia de Dai Viet',
      subtitle: 'Resiliencia milenaria de Hanói',
      history: 'Consolida el vigor económico y social de Vietnam.',
    },
    economy: {
      era: '1986 – Presente',
      title: 'Reformas Doi Moi y Delta del Mekong',
      subtitle: 'Manufactura y comercio marítimo',
      history: 'Acelera el crecimiento industrial y portuario.',
    },
    military: {
      era: '1288 – 1954',
      title: 'Estrategia de Dien Bien Phu',
      subtitle: 'Guerra asimétrica y defensas',
      history: 'Entrena fuerzas sumamente eficaces en combate prolongado.',
    },
    restoration: {
      era: 'Proyecto del Mekong',
      title: 'Federación de Indochina',
      subtitle: 'Integración de la cuenca del Mekong',
      history: 'Reúne Vietnam, Laos y Camboya en la Federación de Indochina.',
      newName: 'Federación de Indochina',
      controlIso2: ['LA', 'KH'],
    },
  },
  KZ: {
    heritageTitle: 'Linaje del Kanato Kazajo',
    heritageSummary: 'Corazón de la estepa euroasiática y heredero de la Ruta de la Seda.',
    root: {
      era: '1465',
      title: 'Fundación del Kanato Kazajo',
      subtitle: 'Soberanía en la gran estepa',
      history: 'Consolida los recursos y la unidad territorial desde Astaná.',
    },
    economy: {
      era: 'Siglos XX – XXI',
      title: 'Corredor Euroasiático y Minería',
      subtitle: 'Uranio, petróleo y tránsito continental',
      history: 'Eleva los ingresos mineros y el desarrollo urbano.',
    },
    military: {
      era: '1729',
      title: 'Jinetes de la Estepa',
      subtitle: 'Movilidad en grandes llanuras',
      history: 'Fortalece el ejército continental kazajo.',
    },
    restoration: {
      era: 'Unión de Asia Central',
      title: 'Proclamar el Gran Turquestán',
      subtitle: 'Unión de los pueblos de Asia Central',
      history: 'Reúne Kazajistán, Uzbekistán y Kirguistán en el Gran Turquestán.',
      newName: 'Gran Turquestán',
      controlIso2: ['UZ', 'KG'],
    },
  },

  // === ÁFRICA ===
  EG: {
    heritageTitle: 'Linaje de los Faraones y el Nilo',
    heritageSummary: 'Cinco mil años de historia desde las pirámides hasta el Canal de Suez.',
    root: {
      era: '3100 a. C. – 1952',
      title: 'Unificación del Alto y Bajo Egipto',
      subtitle: 'Civilización eterna del Nilo',
      history: 'Consolida el poder del valle del Nilo y El Cairo.',
    },
    economy: {
      era: '1869 – Presente',
      title: 'Control del Canal de Suez',
      subtitle: 'Arteria vital del comercio mundial',
      history: 'Convierte los puertos egipcios en una fuente constante de ingresos.',
      minPorts: 1,
    },
    military: {
      era: '1274 a. C. – 1973',
      title: 'Ejército del Nilo',
      subtitle: 'Tradición militar desde Qadesh',
      history: 'Moderniza la fuerza terrestre y defensiva del norte de África.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1958 – 1961 / Imperio Nuevo',
      title: 'Imperio del Nilo y el Levante',
      subtitle: 'De Sudán a Siria y Libia',
      history: 'Restaura la proyección histórica egipcia integrando Sudán y Libia.',
      newName: 'Imperio Egipcio',
      controlIso2: ['SD', 'LY'],
      proclamationText: '¡El Cairo proclama el renacimiento del Imperio Egipcio!',
    },
  },
  MA: {
    heritageTitle: 'Linaje Almorávide y Almohade',
    heritageSummary: 'Reino milenario del Estrecho de Gibraltar y del Magreb.',
    root: {
      era: '788 – 1147',
      title: 'Dinastías del Atlas y Marrakech',
      subtitle: 'Continuidad histórica marroquí',
      history: 'Afianza el control del Estrecho y el desarrollo urbano.',
    },
    economy: {
      era: 'Siglos XII – XXI',
      title: 'Rutas del Atlántico y el Sáhara',
      subtitle: 'Comercio marítimo y fosfatos',
      history: 'Potencia los puertos atlánticos y la minería estratégica.',
      minPorts: 1,
    },
    military: {
      era: '1086 – 1578',
      title: 'Guardia del Atlas',
      subtitle: 'Ejército disciplinado del Magreb',
      history: 'Fortalece las tropas para proyectarse por el norte de África.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1121 – 1269',
      title: 'Imperio Almohade del Magreb',
      subtitle: 'Unificación del Norte de África Occidental',
      history: 'Reúne Marruecos, Argelia y Túnez bajo el histórico Imperio del Magreb.',
      newName: 'Imperio Almohade',
      controlIso2: ['DZ', 'TN'],
      proclamationText: '¡Rabat proclama la restauración del Imperio Almohade!',
    },
  },
  ET: {
    heritageTitle: 'Linaje de Aksum y Abisinia',
    heritageSummary: 'Bastión soberano de África y heredero del antiguo Imperio Etíope.',
    root: {
      era: '100 d. C. – 1896',
      title: 'Victoria de Adua',
      subtitle: 'Símbolo de independencia africana',
      history: 'Honra la defensa histórica de la soberanía etíope.',
    },
    economy: {
      era: 'Siglos XX – XXI',
      title: 'Presa del Renacimiento y Tierras Altas',
      subtitle: 'Energía y desarrollo agrícola',
      history: 'Expande las ciudades y recursos del Cuerno de África.',
    },
    military: {
      era: '1896',
      title: 'Ejército Imperial de Abisinia',
      subtitle: 'Infantería de montaña invicta',
      history: 'Refuerza la movilización en el Cuerno de África.',
      minAnnexations: 1,
    },
    restoration: {
      era: '1270 – 1974',
      title: 'Imperio de Abisinia',
      subtitle: 'Unificación del Cuerno de África',
      history: 'Integra Etiopía, Eritrea y Somalia recuperando salida al Mar Rojo.',
      newName: 'Imperio de Abisinia',
      controlIso2: ['ER', 'SO'],
      proclamationText: '¡Adís Abeba proclama la restauración del Imperio de Abisinia!',
    },
  },
  ML: {
    heritageTitle: 'Linaje de Mansa Musa y Tombuctú',
    heritageSummary: 'Heredero del legendario y riquísimo Imperio de Malí.',
    root: {
      era: '1235',
      title: 'Carta de Mandén y Sundiata Keita',
      subtitle: 'Fundación del antiguo Malí',
      history: 'Recupera la herencia organizativa y cultural del río Níger.',
    },
    economy: {
      era: '1324',
      title: 'Oro de Mansa Musa y Tombuctú',
      subtitle: 'Riqueza aurífera y saber ancestral',
      history: 'Impulsa la extracción de oro y el crecimiento comercial.',
    },
    military: {
      era: 'Siglos XIII – XV',
      title: 'Guardia del Níger',
      subtitle: 'Control de las rutas del Sahel',
      history: 'Fortalece las fuerzas terrestres para unificar África Occidental.',
    },
    restoration: {
      era: '1235 – 1600',
      title: 'Restaurar el Imperio de Malí',
      subtitle: 'El retorno del Imperio Dorado',
      history: 'Reunifica Malí, Senegal y Guinea en el histórico Imperio de Malí.',
      newName: 'Imperio de Malí',
      controlIso2: ['SN', 'GN'],
      proclamationText: '¡Bamako proclama el renacimiento del Imperio de Malí!',
    },
  },
  NG: {
    heritageTitle: 'Linaje de Benín, Sokoto y el Níger',
    heritageSummary: 'Gigante demográfico y económico de África Occidental.',
    root: {
      era: '1960',
      title: 'Federación del Níger',
      subtitle: 'Potencia emergente africana',
      history: 'Consolida las grandes urbes y la administración federal de Abuya.',
    },
    economy: {
      era: '1956 – Presente',
      title: 'Delta del Níger y Lagos',
      subtitle: 'Energía y comercio del Golfo de Guinea',
      history: 'Eleva los ingresos portuarios y urbanos a escala regional.',
      minPorts: 1,
    },
    military: {
      era: '1990 – Presente',
      title: 'Fuerza de Estabilización Occidental',
      subtitle: 'Liderazgo militar regional',
      history: 'Refuerza el mayor ejército de África Occidental.',
    },
    restoration: {
      era: 'Unión Regional',
      title: 'Federación de África Occidental',
      subtitle: 'Integración del Golfo de Guinea',
      history: 'Une Nigeria, Benín y Ghana en una gran federación africana.',
      newName: 'Federación de África Occidental',
      controlIso2: ['BJ', 'GH'],
    },
  },
  ZA: {
    heritageTitle: 'Linaje del Cabo y África Austral',
    heritageSummary: 'Puerta entre el Atlántico y el Índico y motor industrial del sur de África.',
    root: {
      era: '1910 – 1994',
      title: 'Nación del Arcoíris y Unión del Cabo',
      subtitle: 'Estabilidad institucional en Pretoria',
      history: 'Consolida la cohesión nacional y el peso diplomático.',
    },
    economy: {
      era: '1886 – Presente',
      title: 'Oro de Witwatersrand y Cabo de Buena Esperanza',
      subtitle: 'Gran minería y rutas oceánicas',
      history: 'Potencia minas de oro y puertos interoceánicos.',
      minPorts: 1,
    },
    military: {
      era: 'Siglos XIX – XXI',
      title: 'Ejército Austral Moderno',
      subtitle: 'Proyección sobre el sur de África',
      history: 'Organiza divisiones mecanizadas de alta movilidad.',
    },
    restoration: {
      era: 'Integración Austral',
      title: 'Unión de África Austral',
      subtitle: 'Del Cabo hasta el Zambeze',
      history: 'Integra Sudáfrica, Namibia y Botsuana en una sola potencia austral.',
      newName: 'Unión de África Austral',
      controlIso2: ['NA', 'BW'],
    },
  },
  KE: {
    heritageTitle: 'Linaje del Valle del Rift y Suajili',
    heritageSummary: 'Eje comercial, portuario y diplomático de África Oriental.',
    root: {
      era: '1963',
      title: 'Harambee · Independencia de Kenia',
      subtitle: 'Impulso comunitario y estatal',
      history: 'Consolida Nairobi como capital económica del este africano.',
    },
    economy: {
      era: 'Siglo XXI',
      title: 'Puerto de Mombasa y Silicon Savannah',
      subtitle: 'Innovación y comercio del Índico',
      history: 'Acelera los ingresos urbanos y marítimos.',
      minPorts: 1,
    },
    military: {
      era: '1963 – Presente',
      title: 'Guardia del Rift',
      subtitle: 'Seguridad y proyección regional',
      history: 'Prepara tropas disciplinadas para liderar África Oriental.',
    },
    restoration: {
      era: 'Proyecto Comunitario',
      title: 'Federación de África Oriental',
      subtitle: 'Unión del Lago Victoria al Índico',
      history: 'Une Kenia, Tanzania y Uganda en la Federación de África Oriental.',
      newName: 'Federación de África Oriental',
      controlIso2: ['TZ', 'UG'],
    },
  },

  // === OCEANÍA ===
  AU: {
    heritageTitle: 'Linaje de la Mancomunidad Australiana',
    heritageSummary: 'De la Federación de 1901 al liderazgo marítimo del Pacífico Sur.',
    root: {
      era: '1901',
      title: 'Federación de Australia',
      subtitle: 'Unión continental en Canberra',
      history: 'Consolida la administración de todo el continente australiano.',
    },
    economy: {
      era: '1851 – Presente',
      title: 'Fiebre del Oro y Recursos del Outback',
      subtitle: 'Minería y puertos del Pacífico',
      history: 'Impulsa la explotación mineral y el comercio marítimo.',
      minPorts: 1,
    },
    military: {
      era: '1915 – Presente',
      title: 'Espíritu ANZAC',
      subtitle: 'Fuerza expedicionaria del Pacífico',
      history: 'Entrena tropas de élite y proyección naval.',
      minAllies: 1,
    },
    restoration: {
      era: 'Unión Oceánica',
      title: 'Federación de Australasia',
      subtitle: 'Unión de Oceanía y el Mar de Tasmania',
      history: 'Integra Australia, Nueva Zelanda y Papúa Nueva Guinea en Australasia.',
      newName: 'Federación de Australasia',
      controlIso2: ['NZ', 'PG'],
      proclamationText: '¡Canberra proclama la Federación de Australasia!',
    },
  },
  NZ: {
    heritageTitle: 'Linaje Maorí y de Aotearoa',
    heritageSummary: 'Del Tratado de Waitangi a la federación del Pacífico Sur.',
    root: {
      era: '1840',
      title: 'Tratado de Waitangi',
      subtitle: 'Fundación moderna de Aotearoa',
      history: 'Consolida la identidad insular y la cohesión institucional.',
    },
    economy: {
      era: 'Siglos XIX – XXI',
      title: 'Rutas Marítimas del Pacífico Sur',
      subtitle: 'Exportación y puertos oceánicos',
      history: 'Potencia los puertos y ciudades costeras neozelandesas.',
      minPorts: 1,
    },
    military: {
      era: '1915 – 1945',
      title: 'Batallón ANZAC',
      subtitle: 'Disciplina anfibia y expedicionaria',
      history: 'Refuerza la proyección militar marítima.',
    },
    restoration: {
      era: 'Unión Oceánica',
      title: 'Federación de Australasia',
      subtitle: 'Liderazgo del Pacífico desde Wellington',
      history: 'Reúne Nueva Zelanda y Australia bajo la Federación de Australasia.',
      newName: 'Federación de Australasia',
      controlIso2: ['AU'],
    },
  },
};

// Regional historical formables for additional countries not listed individually above
interface RegionalFormableGroup {
  members: string[];
  era: string;
  title: string;
  newName: string;
  subtitle: string;
  history: string;
  requiredPartners: string[]; // members excluding self (up to 3)
}

const REGIONAL_FORMABLES: RegionalFormableGroup[] = [
  {
    members: ['HN', 'SV', 'NI', 'CR'],
    era: '1823 – 1839',
    title: 'República Federal de Centroamérica',
    newName: 'Federación Centroamericana',
    subtitle: 'Reunificación histórica de las provincias del Istmo',
    history: 'Restaura la histórica República Federal uniendo las naciones hermanas de Centroamérica.',
    requiredPartners: ['GT', 'HN', 'SV', 'NI', 'CR'],
  },
  {
    members: ['DO', 'HT', 'JM', 'BS', 'TT', 'BB', 'LC', 'GD', 'VC', 'AG', 'DM', 'KN'],
    era: 'Proyecto Antillano',
    title: 'Federación del Caribe',
    newName: 'Federación del Caribe',
    subtitle: 'Unidad soberana de las islas caribeñas',
    history: 'Reúne las Grandes y Pequeñas Antillas en una potencia marítima del Caribe.',
    requiredPartners: ['CU', 'DO', 'HT'],
  },
  {
    members: ['GY', 'SR', 'BZ'],
    era: 'Unión Atlántica',
    title: 'Mancomunidad de las Guayanas',
    newName: 'Federación de las Guayanas',
    subtitle: 'Integración costera y amazónica',
    history: 'Unifica las costas del Escudo Guayanés en un Estado soberano próspero.',
    requiredPartners: ['GY', 'SR'],
  },
  {
    members: ['BE', 'LU'],
    era: '1815 – 1944',
    title: 'Unión del Benelux',
    newName: 'Unión del Benelux',
    subtitle: 'Integración de los Países Bajos históricos',
    history: 'Une Bélgica, Países Bajos y Luxemburgo en el corazón comercial de Europa.',
    requiredPartners: ['NL', 'BE', 'LU'],
  },
  {
    members: ['FI', 'IS'],
    era: 'Herencia Nórdica',
    title: 'Unión Nórdica',
    newName: 'Unión Nórdica',
    subtitle: 'Hermandad escandinava y báltica',
    history: 'Integra el norte europeo en una potencia nórdica unificada.',
    requiredPartners: ['SE', 'NO'],
  },
  {
    members: ['EE', 'LV', 'LT'],
    era: '1989 · Cadena Báltica',
    title: 'Federación del Báltico',
    newName: 'Federación Báltica',
    subtitle: 'Unión soberana de las tres repúblicas bálticas',
    history: 'Consolida Estonia, Letonia y Lituania en un frente unido del Mar Báltico.',
    requiredPartners: ['EE', 'LV', 'LT'],
  },
  {
    members: ['HR', 'BA', 'SI', 'ME', 'MK'],
    era: '1918 – 1991',
    title: 'Federación Balcánica (Yugoslavia)',
    newName: 'Federación Balcánica',
    subtitle: 'Reunificación de los Balcanes Occidentales',
    history: 'Integra el Adriático y los Balcanes en una sola federación.',
    requiredPartners: ['RS', 'HR', 'BA'],
  },
  {
    members: ['SK'],
    era: '1918 – 1992',
    title: 'Restaurar Checoslovaquia',
    newName: 'Checoslovaquia',
    subtitle: 'Unión histórica centroeuropea',
    history: 'Reunifica Eslovaquia y Chequia en la República de Checoslovaquia.',
    requiredPartners: ['CZ'],
  },
  {
    members: ['MD'],
    era: '1918 – 1940',
    title: 'Restaurar la Gran Rumania',
    newName: 'Gran Rumania',
    subtitle: 'Reunificación del Prut al Danubio',
    history: 'Reúne Moldavia y Rumania en un solo Estado histórico.',
    requiredPartners: ['RO'],
  },
  {
    members: ['BG', 'AL'],
    era: 'Siglos IX – XIV',
    title: 'Imperio de los Balcanes',
    newName: 'Imperio Balcánico',
    subtitle: 'Hegemonía desde el Adriático al Mar Negro',
    history: 'Restaura los antiguos imperios balcánicos uniendo sus vecinos históricos.',
    requiredPartners: ['BG', 'MK', 'AL'],
  },
  {
    members: ['CH', 'LI'],
    era: '1291',
    title: 'Confederación Alpina',
    newName: 'Confederación Alpina',
    subtitle: 'Fortaleza soberana de los Alpes',
    history: 'Expande la histórica Confederación Helvética sobre los pasos alpinos.',
    requiredPartners: ['CH', 'AT'],
  },
  {
    members: ['IE'],
    era: 'Herencia Celta',
    title: 'Unión Celta',
    newName: 'Unión Celta',
    subtitle: 'Soberanía de las islas atlánticas',
    history: 'Reúne el archipiélago atlántico bajo el estandarte celta de Dublín.',
    requiredPartners: ['GB'],
  },
  {
    members: ['BY'],
    era: '1253 – 1569',
    title: 'Gran Ducado Histórico',
    newName: 'Gran Ducado Oriental',
    subtitle: 'Herencia de Minsk y Vilna',
    history: 'Reconstruye el histórico espacio del Gran Ducado junto a Lituania y Ucrania.',
    requiredPartners: ['LT', 'UA'],
  },
  {
    members: ['GE', 'AM', 'AZ'],
    era: '1918',
    title: 'Federación Transcaucásica',
    newName: 'Federación del Cáucaso',
    subtitle: 'Unión del Mar Negro al Mar Caspio',
    history: 'Reúne Georgia, Armenia y Azerbaiyán en la histórica federación del Cáucaso.',
    requiredPartners: ['GE', 'AM', 'AZ'],
  },
  {
    members: ['UZ', 'KG', 'TJ', 'TM'],
    era: 'Ruta de la Seda',
    title: 'Gran Turquestán',
    newName: 'Gran Turquestán',
    subtitle: 'Renacimiento de Samarcanda y Asia Central',
    history: 'Reunifica las antiguas ciudades de la Ruta de la Seda en Asia Central.',
    requiredPartners: ['KZ', 'UZ', 'KG'],
  },
  {
    members: ['IQ', 'SY', 'JO', 'LB', 'PS', 'IL'],
    era: 'Creciente Fértil',
    title: 'Unión del Levante y Mesopotamia',
    newName: 'Gran Levante',
    subtitle: 'Cuna milenaria de civilizaciones',
    history: 'Integra las históricas tierras del Levante mediterráneo y los ríos Éufrates y Tigris.',
    requiredPartners: ['SY', 'JO', 'LB'],
  },
  {
    members: ['AE', 'QA', 'KW', 'BH', 'OM', 'YE'],
    era: 'Unión del Golfo',
    title: 'Federación Arábiga',
    newName: 'Federación Arábiga',
    subtitle: 'Unión energética y marítima de la Península',
    history: 'Consolida los Estados del Golfo y el Mar Arábigo en una sola federación.',
    requiredPartners: ['SA', 'AE', 'OM'],
  },
  {
    members: ['PK', 'AF', 'BD', 'NP', 'BT', 'LK', 'MV'],
    era: '1526 – 1857',
    title: 'Unión del Sur de Asia',
    newName: 'Imperio del Indo',
    subtitle: 'Herencia del valle del Indo y el Himalaya',
    history: 'Integra las potencias históricas del sur de Asia en un gran imperio regional.',
    requiredPartners: ['PK', 'AF'],
  },
  {
    members: ['MY', 'SG', 'BN', 'PH', 'TL', 'MM', 'KH', 'LA'],
    era: 'Comunidad del Sudeste',
    title: 'Federación de Nusantara',
    newName: 'Federación de Nusantara',
    subtitle: 'Puente marítimo entre el Índico y el Pacífico',
    history: 'Une los mares y rutas comerciales del Sudeste Asiático.',
    requiredPartners: ['MY', 'ID'],
  },
  {
    members: ['DZ', 'TN', 'LY', 'MR'],
    era: 'Unión Magrebí',
    title: 'Gran Unión del Magreb',
    newName: 'Unión del Magreb',
    subtitle: 'Del Atlántico hasta el Mediterráneo Central',
    history: 'Reúne los pueblos del norte de África en la Unión del Magreb.',
    requiredPartners: ['DZ', 'MA', 'TN'],
  },
  {
    members: ['TZ', 'UG', 'RW', 'BI', 'SS'],
    era: 'Integración Oriental',
    title: 'Federación de África Oriental',
    newName: 'Federación de África Oriental',
    subtitle: 'Unión de los Grandes Lagos',
    history: 'Consolida la histórica integración de África Oriental.',
    requiredPartners: ['KE', 'TZ', 'UG'],
  },
  {
    members: ['SN', 'GH', 'CI', 'BF', 'NE', 'GN', 'BJ', 'TG', 'SL', 'LR', 'GM', 'GW', 'CV'],
    era: 'Herencia del Sahel y Guinea',
    title: 'Federación de África Occidental',
    newName: 'África Occidental Unida',
    subtitle: 'Heredera de Malí, Songhai y Ashanti',
    history: 'Reúne las naciones de África Occidental en un bloque soberano.',
    requiredPartners: ['ML', 'SN', 'GH'],
  },
  {
    members: ['CD', 'CG', 'AO', 'CM', 'GA', 'GQ', 'CF', 'TD', 'ST'],
    era: '1390 – 1914',
    title: 'Gran Imperio del Congo',
    newName: 'Imperio del Congo',
    subtitle: 'Corazón fluvial de África Central',
    history: 'Restaura la histórica influencia del Reino del Congo en África Central.',
    requiredPartners: ['CD', 'CG', 'AO'],
  },
  {
    members: ['NA', 'BW', 'ZW', 'ZM', 'MZ', 'MW', 'LS', 'SZ', 'MG', 'MU', 'KM', 'SC'],
    era: 'Unión Austral',
    title: 'Unión de África Austral',
    newName: 'Unión de África Austral',
    subtitle: 'Integración del sur africano',
    history: 'Unifica las economías y territorios de África Austral.',
    requiredPartners: ['ZA', 'NA', 'BW'],
  },
  {
    members: ['SD', 'ER', 'SO', 'DJ'],
    era: 'Reinos de Nubia y el Mar Rojo',
    title: 'Unión del Mar Rojo y Nubia',
    newName: 'Federación del Mar Rojo',
    subtitle: 'Dominio del paso entre África y Arabia',
    history: 'Integra el Cuerno de África y el valle alto del Nilo.',
    requiredPartners: ['ET', 'ER'],
  },
  {
    members: ['PG', 'FJ', 'SB', 'VU', 'WS', 'TO', 'KI', 'FM', 'MH', 'PW', 'NR', 'TV'],
    era: 'Navegantes del Pacífico',
    title: 'Confederación del Pacífico',
    newName: 'Confederación del Pacífico',
    subtitle: 'Unión oceánica de navegantes',
    history: 'Reúne las islas del Pacífico Sur en una gran confederación marítima.',
    requiredPartners: ['FJ', 'PG'],
  },
];

const REGIONAL_BY_ISO = new Map<string, RegionalFormableGroup>();
for (const group of REGIONAL_FORMABLES) {
  for (const iso of group.members) {
    REGIONAL_BY_ISO.set(iso, group);
  }
}

function buildNodesFromSpec(iso2: string, seed: CountrySeed, spec: CuratedTreeSpec): CountryTreeNode[] {
  const nodes: CountryTreeNode[] = [
    {
      id: `${iso2}_root`,
      tier: 1,
      branch: 'root',
      era: spec.root.era,
      title: spec.root.title,
      subtitle: spec.root.subtitle,
      history: spec.root.history,
      parentId: null,
      costMoney: 160,
      requirements: {
        minCities: Math.max(2, Math.min(4, Math.round(Math.sqrt(seed.popM) / 5) + 2)),
      },
      reward: {
        moneyDelta: 120,
        permanentIncomeBonus: 1,
        proclamationText: `${seed.name} consolida su legado histórico: «${spec.root.title}».`,
      },
    },
    {
      id: `${iso2}_econ`,
      tier: 2,
      branch: 'economy',
      era: spec.economy.era,
      title: spec.economy.title,
      subtitle: spec.economy.subtitle,
      history: spec.economy.history,
      parentId: `${iso2}_root`,
      costMoney: 260,
      requirements: {
        minGoldMines: 3,
        minCities: 4,
        ...(spec.economy.minPorts ? { minPorts: spec.economy.minPorts } : {}),
      },
      reward: {
        moneyDelta: 200,
        permanentIncomeBonus: 2,
        proclamationText: `${seed.name} completa el hito económico «${spec.economy.title}».`,
      },
    },
    {
      id: `${iso2}_mil`,
      tier: 2,
      branch: 'military',
      era: spec.military.era,
      title: spec.military.title,
      subtitle: spec.military.subtitle,
      history: spec.military.history,
      parentId: `${iso2}_root`,
      costMoney: 260,
      requirements: {
        minArmy: 520,
        ...(spec.military.minAllies ? { minAllies: spec.military.minAllies } : {}),
        ...(spec.military.minAnnexations ? { minAnnexations: spec.military.minAnnexations } : {}),
      },
      reward: {
        armyDelta: 80,
        permanentArmyCapBonus: 150,
        proclamationText: `${seed.name} fortalece su doctrina militar: «${spec.military.title}».`,
      },
    },
    {
      id: `${iso2}_restore`,
      tier: 3,
      branch: 'restoration',
      era: spec.restoration.era,
      title: spec.restoration.title,
      subtitle: spec.restoration.subtitle,
      history: spec.restoration.history,
      parentId: null,
      requiresAnyParent: [`${iso2}_econ`, `${iso2}_mil`],
      costMoney: 380,
      requirements: {
        controlCountriesIso2: spec.restoration.controlIso2.filter((code) => code !== iso2),
      },
      reward: {
        moneyDelta: 300,
        armyDelta: 120,
        permanentIncomeBonus: 3,
        permanentArmyCapBonus: 250,
        renameTo: spec.restoration.newName,
        proclamationText:
          spec.restoration.proclamationText ??
          `¡${seed.name} proclama la formación histórica de ${spec.restoration.newName}!`,
      },
    },
  ];

  if (spec.secondaryRestoration) {
    nodes.push({
      id: `${iso2}_legacy`,
      tier: 3,
      branch: 'legacy',
      era: spec.secondaryRestoration.era,
      title: spec.secondaryRestoration.title,
      subtitle: spec.secondaryRestoration.subtitle,
      history: spec.secondaryRestoration.history,
      parentId: null,
      requiresAnyParent: [`${iso2}_econ`, `${iso2}_mil`],
      costMoney: 420,
      requirements: {
        controlCountriesIso2: spec.secondaryRestoration.controlIso2.filter((code) => code !== iso2),
      },
      reward: {
        moneyDelta: 350,
        armyDelta: 140,
        permanentIncomeBonus: 3,
        permanentArmyCapBonus: 300,
        renameTo: spec.secondaryRestoration.newName,
        proclamationText:
          spec.secondaryRestoration.proclamationText ??
          `¡${seed.name} proclama el surgimiento de ${spec.secondaryRestoration.newName}!`,
      },
    });
  }

  return nodes;
}

function buildFallbackTree(seed: CountrySeed): CountryGenealogyTree {
  const iso2 = seed.iso2;
  const regional = REGIONAL_BY_ISO.get(iso2);

  const continentEra: Record<CountrySeed['continent'], string> = {
    América: 'Siglo XIX – Presente',
    Europa: 'Edad Moderna – Presente',
    Asia: 'Antigüedad – Presente',
    África: 'Siglo XX – Presente',
    Oceanía: 'Era Oceánica – Presente',
  };

  const controlTargets = regional
    ? regional.requiredPartners.filter((c) => c !== iso2).slice(0, 3)
    : [];

  const restorationTitle = regional ? regional.title : `Proclamar el Gran Imperio de ${seed.name}`;
  const restorationName = regional ? regional.newName : `Gran Imperio de ${seed.name}`;
  const restorationSubtitle = regional
    ? regional.subtitle
    : `Consolidación soberana y expansión en ${seed.continent}`;
  const restorationHistory = regional
    ? regional.history
    : `Tras expandir su influencia desde ${seed.capital}, ${seed.name} se proclama potencia hegemónica regional.`;

  const nodes: CountryTreeNode[] = [
    {
      id: `${iso2}_root`,
      tier: 1,
      branch: 'root',
      era: continentEra[seed.continent],
      title: `Fundación y Legado de ${seed.name}`,
      subtitle: `Consolidación estatal desde ${seed.capital}`,
      history: `Organiza la historia institucional de ${seed.name} con sede en ${seed.capital}, preparando el desarrollo del país.`,
      parentId: null,
      costMoney: 160,
      requirements: {
        minCities: 2,
      },
      reward: {
        moneyDelta: 120,
        permanentIncomeBonus: 1,
        proclamationText: `${seed.name} consolida sus raíces históricas en ${seed.capital}.`,
      },
    },
    {
      id: `${iso2}_econ`,
      tier: 2,
      branch: 'economy',
      era: 'Desarrollo Nacional',
      title: `Prosperidad de ${seed.capital}`,
      subtitle: `Infraestructura, comercio y minería en ${seed.continent}`,
      history: `Transforma ${seed.capital} en un centro comercial próspero que sostiene la economía nacional.`,
      parentId: `${iso2}_root`,
      costMoney: 260,
      requirements: {
        minGoldMines: 3,
        minCities: 4,
      },
      reward: {
        moneyDelta: 200,
        permanentIncomeBonus: 2,
        proclamationText: `${seed.name} alcanza una nueva era económica desde ${seed.capital}.`,
      },
    },
    {
      id: `${iso2}_mil`,
      tier: 2,
      branch: 'military',
      era: 'Doctrina Nacional',
      title: `Guardia Soberana de ${seed.name}`,
      subtitle: 'Profesionalización del ejército y defensa',
      history: `Fortalece el aparato defensivo y ofensivo de ${seed.name} para proteger sus fronteras e impulsar campañas.`,
      parentId: `${iso2}_root`,
      costMoney: 260,
      requirements: {
        minArmy: 500,
        minDefenses: 1,
      },
      reward: {
        armyDelta: 80,
        permanentArmyCapBonus: 150,
        proclamationText: `${seed.name} reforma su alto mando con la Guardia Soberana.`,
      },
    },
    {
      id: `${iso2}_restore`,
      tier: 3,
      branch: 'restoration',
      era: regional ? regional.era : 'Hegemonía Regional',
      title: restorationTitle,
      subtitle: restorationSubtitle,
      history: restorationHistory,
      parentId: null,
      requiresAnyParent: [`${iso2}_econ`, `${iso2}_mil`],
      costMoney: 380,
      requirements:
        controlTargets.length > 0
          ? { controlCountriesIso2: controlTargets }
          : { minAnnexations: 2, minArmy: 700 },
      reward: {
        moneyDelta: 300,
        armyDelta: 120,
        permanentIncomeBonus: 3,
        permanentArmyCapBonus: 250,
        renameTo: restorationName,
        proclamationText: `¡${seed.name} se proclama oficialmente como ${restorationName}!`,
      },
    },
  ];

  return {
    iso2,
    heritageTitle: `Linaje Histórico de ${seed.name}`,
    heritageSummary: `Árbol genealógico e hitos estratégicos de ${seed.name} (${seed.continent}) con proyección regional.`,
    nodes,
  };
}

const TREE_CACHE = new Map<string, CountryGenealogyTree>();

for (const seed of COUNTRIES_195) {
  const curated = CURATED_SPECS[seed.iso2];
  if (curated) {
    TREE_CACHE.set(seed.iso2, {
      iso2: seed.iso2,
      heritageTitle: curated.heritageTitle,
      heritageSummary: curated.heritageSummary,
      nodes: buildNodesFromSpec(seed.iso2, seed, curated),
    });
  } else {
    TREE_CACHE.set(seed.iso2, buildFallbackTree(seed));
  }
}

export function getCountryGenealogyTree(iso2: string): CountryGenealogyTree {
  const found = TREE_CACHE.get(iso2);
  if (found) return found;
  const fallbackSeed = COUNTRIES_195[0];
  return buildFallbackTree(fallbackSeed);
}

export const ISO2_TO_COUNTRY_ID: Record<string, number> = Object.fromEntries(
  COUNTRIES_195.map((c) => [c.iso2, c.id])
);
