// Cardápio do Barzinho CPN, digitado a partir do cardápio físico do bar.
// Itens sem preço no cardápio impresso entram como indisponíveis (preço 0); preços informados pelo dono depois
// para o administrador completar pelo painel.

const img = (name) => `/seed-images/${name}.svg`;

export const categories = [
  { slug: 'cervejas', name: 'Cervejas' },
  { slug: 'porcoes', name: 'Porções' },
  { slug: 'pratos-individuais', name: 'Pratos Individuais' },
  { slug: 'lanches', name: 'Lanches' },
  { slug: 'refrigerantes-e-aguas', name: 'Refrigerantes e Águas' },
  { slug: 'sucos', name: 'Sucos' },
  { slug: 'drinks', name: 'Drinks' },
];

// ---------- Cervejas: um item por marca, com o tamanho como opção ----------

const SIZE_LABELS = { g600: 'Garrafa 600 ml', lata: 'Lata', longNeck: 'Long neck' };

function beer(name, prices, extra = {}) {
  const sizes = Object.entries(prices).filter(([, price]) => price != null);
  const base = Math.min(...sizes.map(([, price]) => price));
  const labels = sizes.map(([key]) => SIZE_LABELS[key].toLowerCase());
  const sizesText = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}` : labels[0];

  return {
    category: 'cervejas',
    name,
    shortDescription: `Disponível em ${sizesText}.`,
    description: `Cerveja ${name} bem gelada. Escolha o tamanho na hora de pedir.`,
    price: base,
    image: img('cerveja'),
    options: [
      {
        id: 'tamanho',
        name: 'Tamanho',
        type: 'single',
        required: true,
        choices: sizes.map(([key, price]) => ({
          id: key,
          name: SIZE_LABELS[key],
          priceDelta: Number((price - base).toFixed(2)),
        })),
      },
    ],
    ...extra,
  };
}

const beers = [
  beer('Corona', { g600: 18, lata: 9, longNeck: 11 }),
  beer('Corona Cero', { longNeck: 11 }, { description: 'Corona sem álcool, bem gelada.' }),
  beer('Stella Artois', { g600: 14, lata: 8, longNeck: 10 }),
  beer('Stella Pure Gold', { g600: 18, longNeck: 10 }),
  beer('Spaten', { g600: 19, lata: 7 }),
  beer('Original', { g600: 13, lata: 7 }),
  beer('Budweiser', { g600: 12, lata: 7, longNeck: 10 }),
  beer('Budweiser Zero', { longNeck: 10 }, { description: 'Budweiser sem álcool, bem gelada.' }),
  beer('Serramalte', { g600: 14 }),
  beer('Duplo Malte', { g600: 12, lata: 7 }),
  beer('Antarctica', { g600: 10, lata: 6 }),
  beer('Brahma', { g600: 10, lata: 6 }),
  beer('Brahma Zero', { lata: 7 }, { description: 'Brahma sem álcool, bem gelada.' }),
  beer('Skol', { g600: 10, lata: 6 }),
  beer('Caracu', { lata: 7 }),
  beer('Malzbier', { lata: 7, longNeck: 10 }),
];

// ---------- Porções ----------

const porcoes = [
  {
    name: 'Tilápia Recheada',
    shortDescription: 'Recheada com palmito, mussarela e catupiri.',
    ingredients: 'Tilápia, palmito, mussarela, catupiri',
    price: 80,
    image: img('peixe'),
  },
  {
    name: 'Filé Mignon',
    shortDescription: 'Acompanha batata frita e palmito.',
    ingredients: 'Filé mignon, batata frita, palmito',
    price: 120,
    image: img('porcao'),
  },
  {
    name: 'Tábua de Frios',
    shortDescription: 'Mussarela, salaminho, palmito, azeitona, tomate seco e castanha.',
    ingredients: 'Alface, tomate, azeitona, mussarela, tomate seco, castanha, palmito, salaminho',
    price: 90,
    image: img('tabua'),
  },
  {
    name: 'Trio Mineiro',
    shortDescription: 'Peixe, torresmo e mandioca.',
    ingredients: 'Peixe, torresmo, mandioca',
    price: 75,
    image: img('porcao'),
  },
  {
    name: 'Carne de Panela com Mandioca',
    shortDescription: 'Porção de carne de panela acompanhada de mandioca.',
    ingredients: 'Carne de panela, mandioca',
    price: 65,
    image: img('porcao'),
  },
  { name: 'Filé de Tilápia', shortDescription: 'Porção de filé de tilápia.', ingredients: 'Filé de tilápia', price: 68, image: img('peixe') },
  { name: 'Torresmo', shortDescription: 'Porção de torresmo.', ingredients: 'Torresmo', price: 68, image: img('porcao') },
  {
    name: 'Torresmo com Mandioca',
    shortDescription: 'Porção de torresmo acompanhada de mandioca.',
    ingredients: 'Torresmo, mandioca',
    price: 58,
    image: img('porcao'),
  },
  { name: 'Batata Chips', shortDescription: 'Porção de batata chips.', ingredients: 'Batata', price: 25, image: img('batata') },
  { name: 'Batata Simples', shortDescription: 'Porção de batata frita.', ingredients: 'Batata frita', price: 30, image: img('batata') },
  {
    name: 'Batata com Queijo',
    shortDescription: 'Batata frita coberta com queijo.',
    ingredients: 'Batata frita, queijo',
    price: 37,
    image: img('batata'),
  },
  {
    name: 'Batata Completa',
    shortDescription: 'Batata frita com bacon, queijo e cheddar.',
    ingredients: 'Batata frita, bacon, queijo, cheddar',
    price: 50,
    image: img('batata'),
  },
  {
    name: 'Camarão',
    shortDescription: 'Camarão empanado com catupiri.',
    ingredients: 'Camarão empanado, catupiri',
    price: 45,
    image: img('porcao'),
  },
  {
    name: 'Bolinho',
    shortDescription: 'Escolha o sabor: carne seca, costela, queijo ou bacalhau.',
    price: 45,
    image: img('porcao'),
    options: [
      {
        id: 'sabor',
        name: 'Sabor',
        type: 'single',
        required: true,
        choices: [
          { id: 'carne-seca', name: 'Carne seca', priceDelta: 0 },
          { id: 'costela', name: 'Costela', priceDelta: 0 },
          { id: 'queijo', name: 'Queijo', priceDelta: 0 },
          { id: 'bacalhau', name: 'Bacalhau', priceDelta: 0 },
        ],
      },
    ],
  },
  { name: 'Frango Acebolado', shortDescription: 'Porção de frango acebolado.', ingredients: 'Frango, cebola', price: 45, image: img('porcao') },
  { name: 'Lombo Acebolado', shortDescription: 'Porção de lombo acebolado.', ingredients: 'Lombo, cebola', price: 45, image: img('porcao') },
  { name: 'Frango à Passarinho', shortDescription: 'Porção de frango à passarinho.', ingredients: 'Frango', price: 45, image: img('porcao') },
  {
    name: 'Pastelzinho',
    shortDescription: 'Porção de pastelzinho de carne ou queijo.',
    price: 35,
    image: img('pastel'),
    options: [
      {
        id: 'sabor',
        name: 'Sabor',
        type: 'single',
        required: true,
        choices: [
          { id: 'carne', name: 'Carne', priceDelta: 0 },
          { id: 'queijo', name: 'Queijo', priceDelta: 0 },
        ],
      },
    ],
  },
  { name: 'Joelho de Porco', shortDescription: 'Porção de joelho de porco.', price: 40, image: img('porcao') },
  { name: 'Tropeiro', shortDescription: 'Porção de feijão tropeiro.', price: 32, image: img('porcao') },
  { name: 'Moela', shortDescription: 'Porção de moela.', ingredients: 'Moela de frango', price: 32, image: img('porcao') },
  {
    name: 'Calabresa Acebolada',
    shortDescription: 'Porção de calabresa acebolada.',
    ingredients: 'Calabresa, cebola',
    price: 32,
    image: img('porcao'),
  },
  { name: 'Pé de Porco', shortDescription: 'Porção de pé de porco.', price: 30, image: img('porcao') },
  { name: 'Mandioca Frita', shortDescription: 'Porção de mandioca frita.', ingredients: 'Mandioca', price: 25, image: img('batata') },
].map((item) => ({ category: 'porcoes', ...item }));

// ---------- Pratos individuais ----------

const pratos = [
  { name: 'Almôndegas', shortDescription: 'Prato individual de almôndegas.', price: 17 },
  { name: 'Charuto', shortDescription: 'Prato individual de charuto.', price: 14 },
  { name: 'Torresmo', shortDescription: 'Prato individual de torresmo.', ingredients: 'Torresmo', price: 18 },
  {
    name: 'Omelete',
    shortDescription: 'Mussarela, presunto, cebola e tomate.',
    ingredients: 'Ovos, mussarela, presunto, cebola, tomate',
    price: 32,
  },
  { name: 'Tilápia', shortDescription: 'Prato individual de tilápia.', ingredients: 'Tilápia', price: 22, image: img('peixe') },
  { name: 'Abobrinha', shortDescription: 'Prato individual de abobrinha.', ingredients: 'Abobrinha', price: 20 },
  {
    name: 'Pastel',
    shortDescription: 'Sabores carne, queijo ou pizza.',
    price: 12,
    image: img('pastel'),
    options: [
      {
        id: 'sabor',
        name: 'Sabor',
        type: 'single',
        required: true,
        choices: [
          { id: 'carne', name: 'Carne', priceDelta: 0 },
          { id: 'queijo', name: 'Queijo', priceDelta: 0 },
          { id: 'pizza', name: 'Pizza', priceDelta: 0 },
        ],
      },
    ],
  },
  { name: 'Prato Executivo', shortDescription: 'Prato executivo do dia.', price: 0, available: false },
].map((item) => ({ category: 'pratos-individuais', image: img('prato'), ...item }));

// ---------- Lanches: mesmo lanche com a carne como opção ----------
// Preços do cardápio físico: hambúrguer / frango / lombo / filé

function lanche(name, extras, [hamburguer, frango, lombo, file]) {
  const ingredients = ['Pão', 'carne', 'queijo', ...extras, 'tomate', 'alface', 'cebola'].join(', ');
  return {
    category: 'lanches',
    name: `Lanche ${name}`,
    shortDescription: `${['Carne', 'queijo', ...extras].join(', ')}, tomate, alface e cebola.`,
    description: 'Escolha a carne do lanche: hambúrguer, frango, lombo ou filé.',
    ingredients,
    price: hamburguer,
    image: img('lanche'),
    options: [
      {
        id: 'carne',
        name: 'Carne',
        type: 'single',
        required: true,
        choices: [
          { id: 'hamburguer', name: 'Hambúrguer', priceDelta: 0 },
          { id: 'frango', name: 'Frango', priceDelta: frango - hamburguer },
          { id: 'lombo', name: 'Lombo', priceDelta: lombo - hamburguer },
          { id: 'file', name: 'Filé', priceDelta: file - hamburguer },
        ],
      },
    ],
  };
}

const lanches = [
  lanche('Tradicional', [], [27, 29, 29, 38]),
  lanche('Egg', ['ovo'], [29, 31, 31, 40]),
  lanche('Presunto', ['presunto'], [29, 31, 31, 40]),
  lanche('Bacon e Presunto', ['bacon', 'presunto'], [32, 35, 35, 44]),
  lanche('Egg Presunto', ['ovo', 'presunto'], [31, 33, 33, 42]),
  lanche('Egg Bacon', ['ovo', 'bacon'], [33, 35, 35, 44]),
  lanche('Tudo', ['ovo', 'presunto', 'bacon'], [36, 38, 38, 48]),
  {
    category: 'lanches',
    name: 'Maneirinho',
    shortDescription: 'Queijo, tomate, ovo e alface.',
    ingredients: 'Pão, queijo, tomate, ovo, alface',
    price: 20,
    image: img('sanduiche'),
  },
  {
    category: 'lanches',
    name: 'Pão com Ovo',
    shortDescription: 'Sanduíche de pão com ovo.',
    ingredients: 'Pão, ovo',
    price: 13,
    image: img('sanduiche'),
  },
];

// ---------- Refrigerantes e águas ----------

const refrigerantes = [
  {
    name: 'Refrigerante Lata 350 ml',
    shortDescription: 'Coca-Cola, Fanta, Fanta Uva, Schweppes ou Sprite.',
    price: 6,
    options: [
      {
        id: 'sabor',
        name: 'Sabor',
        type: 'single',
        required: true,
        choices: ['Coca-Cola', 'Fanta', 'Fanta Uva', 'Schweppes', 'Sprite'].map((name) => ({
          id: name === 'Fanta Uva' ? 'uva' : name.toLowerCase().replace(/[^a-z]/g, ''),
          name,
          priceDelta: 0,
        })),
      },
    ],
  },
  {
    name: 'Pepsi Black ou Guaraná Antarctica Lata 350 ml',
    shortDescription: 'Lata de 350 ml.',
    price: 6,
    options: [
      {
        id: 'sabor',
        name: 'Sabor',
        type: 'single',
        required: true,
        choices: [
          { id: 'pepsi-black', name: 'Pepsi Black', priceDelta: 0 },
          { id: 'guarana', name: 'Guaraná Antarctica', priceDelta: 0 },
        ],
      },
    ],
  },
  { name: 'Caçulinha', shortDescription: 'Refrigerante caçulinha.', price: 3 },
  { name: 'Mini Coca', shortDescription: 'Coca-Cola mini.', price: 4 },
  { name: 'Refrigerante 600 ml', shortDescription: 'Garrafa de 600 ml.', price: 8 },
  { name: 'Refrigerante 1 L', shortDescription: 'Garrafa de 1 litro.', price: 10 },
  { name: 'Pepsi 2 L', shortDescription: 'Garrafa de 2 litros.', price: 12 },
  { name: 'Guaraná 2 L', shortDescription: 'Garrafa de 2 litros.', price: 13 },
  { name: 'Coca-Cola 2 L', shortDescription: 'Garrafa de 2 litros.', price: 15 },
  { name: 'H2O 500 ml', shortDescription: 'Garrafa de 500 ml.', price: 8, image: img('agua') },
  { name: 'Gatorade', shortDescription: 'Isotônico.', price: 9, image: img('agua') },
  { name: 'Água com Gás', shortDescription: 'Água mineral com gás.', price: 4, image: img('agua') },
  { name: 'Água sem Gás', shortDescription: 'Água mineral sem gás.', price: 3.5, image: img('agua') },
  { name: 'Água Tônica', shortDescription: 'Lata de água tônica.', price: 6 },
  { name: 'Energético Red Bull', shortDescription: 'Lata.', price: 13, image: img('lata') },
  { name: 'Energético Monster', shortDescription: 'Lata.', price: 15, image: img('lata') },
].map((item) => ({ category: 'refrigerantes-e-aguas', image: img('refrigerante'), ...item }));

// ---------- Sucos ----------

const sucos = [
  { name: 'Suco Kapo', shortDescription: 'Suco de caixinha.', price: 4 },
  { name: 'Suco Del Valle Lata', shortDescription: 'Lata.', price: 8, image: img('lata') },
  { name: 'Suco Natural', shortDescription: 'Copo de suco natural.', price: 10 },
  { name: 'Suco de Laranja Naturel', shortDescription: 'Copo.', price: 10 },
  { name: 'Suco de Uva Naturel', shortDescription: 'Copo.', price: 12 },
  { name: 'Suco de Caju Naturel', shortDescription: 'Copo.', price: 8 },
  { name: 'Suco Naturel 900 ml', shortDescription: 'Jarra de 900 ml.', price: 25 },
  { name: 'Suco Naturel 1,5 L', shortDescription: 'Jarra de 1,5 litro.', price: 35 },
].map((item) => ({ category: 'sucos', image: img('suco'), ...item }));

// ---------- Drinks ----------

const drinks = [
  { name: 'Caipirinha', shortDescription: 'Caipirinha da casa.', price: 20, image: img('drink') },
  { name: 'Caipivodka', shortDescription: 'Caipirinha feita com vodka.', price: 20, image: img('drink') },
  { name: 'Skol Beats Lata', shortDescription: 'Lata.', price: 10 },
  { name: 'Skol Beats Long Neck', shortDescription: 'Long neck.', price: 12 },
  { name: 'Skol Beats GT Lata', shortDescription: 'Lata.', price: 10 },
  { name: 'Skol Beats GT Long Neck', shortDescription: 'Long neck.', price: 12 },
].map((item) => ({ category: 'drinks', image: img('lata'), ...item }));

export const items = [...beers, ...porcoes, ...pratos, ...lanches, ...refrigerantes, ...sucos, ...drinks];
