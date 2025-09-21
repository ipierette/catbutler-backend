// 🌐 Tradutor para CozinhaIA - TheMealDB para PT-BR
// Traduz automaticamente receitas da API externa para português

interface TraducaoMap {
  [key: string]: string;
}

// Mapeamentos de tradução
export const CATEGORIAS: TraducaoMap = {
  'Beef': 'Carne Bovina',
  'Chicken': 'Frango',
  'Dessert': 'Sobremesa',
  'Lamb': 'Cordeiro',
  'Miscellaneous': 'Diversos',
  'Pasta': 'Massa',
  'Pork': 'Porco',
  'Seafood': 'Frutos do Mar',
  'Side': 'Acompanhamento',
  'Starter': 'Entrada',
  'Vegan': 'Vegano',
  'Vegetarian': 'Vegetariano',
  'Breakfast': 'Café da Manhã',
  'Goat': 'Cabra'
};

export const PAISES: TraducaoMap = {
  'American': 'Americana',
  'British': 'Britânica',
  'Canadian': 'Canadense',
  'Chinese': 'Chinesa',
  'Croatian': 'Croata',
  'Dutch': 'Holandesa',
  'Egyptian': 'Egípcia',
  'French': 'Francesa',
  'Greek': 'Grega',
  'Indian': 'Indiana',
  'Irish': 'Irlandesa',
  'Italian': 'Italiana',
  'Jamaican': 'Jamaicana',
  'Japanese': 'Japonesa',
  'Kenyan': 'Queniana',
  'Malaysian': 'Malaia',
  'Mexican': 'Mexicana',
  'Moroccan': 'Marroquina',
  'Polish': 'Polonesa',
  'Portuguese': 'Portuguesa',
  'Russian': 'Russa',
  'Spanish': 'Espanhola',
  'Thai': 'Tailandesa',
  'Tunisian': 'Tunisiana',
  'Turkish': 'Turca',
  'Unknown': 'Desconhecida',
  'Vietnamese': 'Vietnamita'
};

export const INGREDIENTES: TraducaoMap = {
  // Carnes
  'Chicken': 'Frango',
  'Beef': 'Carne Bovina',
  'Pork': 'Porco',
  'Lamb': 'Cordeiro',
  'Turkey': 'Peru',
  'Fish': 'Peixe',
  'Salmon': 'Salmão',
  'Tuna': 'Atum',
  'Shrimp': 'Camarão',
  'Prawns': 'Camarões',
  'Crab': 'Caranguejo',
  'Lobster': 'Lagosta',
  'Mussels': 'Mexilhões',
  
  // Vegetais
  'Onion': 'Cebola',
  'Garlic': 'Alho',
  'Tomato': 'Tomate',
  'Potato': 'Batata',
  'Carrot': 'Cenoura',
  'Bell Pepper': 'Pimentão',
  'Pepper': 'Pimenta',
  'Mushroom': 'Cogumelo',
  'Broccoli': 'Brócolis',
  'Spinach': 'Espinafre',
  'Lettuce': 'Alface',
  'Cabbage': 'Repolho',
  'Corn': 'Milho',
  'Cucumber': 'Pepino',
  'Zucchini': 'Abobrinha',
  'Eggplant': 'Berinjela',
  'Green Beans': 'Vagem',
  'Peas': 'Ervilhas',
  'Avocado': 'Abacate',
  
  // Frutas
  'Apple': 'Maçã',
  'Banana': 'Banana',
  'Orange': 'Laranja',
  'Lemon': 'Limão',
  'Lime': 'Lima',
  'Strawberry': 'Morango',
  'Blueberry': 'Mirtilo',
  'Grape': 'Uva',
  'Pineapple': 'Abacaxi',
  'Mango': 'Manga',
  'Peach': 'Pêssego',
  'Cherry': 'Cereja',
  
  // Grãos e Cereais
  'Rice': 'Arroz',
  'Pasta': 'Massa',
  'Bread': 'Pão',
  'Flour': 'Farinha',
  'Oats': 'Aveia',
  'Quinoa': 'Quinoa',
  'Barley': 'Cevada',
  
  // Laticínios
  'Milk': 'Leite',
  'Cheese': 'Queijo',
  'Butter': 'Manteiga',
  'Cream': 'Creme',
  'Yogurt': 'Iogurte',
  'Eggs': 'Ovos',
  'Egg': 'Ovo',
  
  // Temperos e Ervas
  'Salt': 'Sal',
  'Black Pepper': 'Pimenta Preta',
  'Basil': 'Manjericão',
  'Oregano': 'Orégano',
  'Thyme': 'Tomilho',
  'Rosemary': 'Alecrim',
  'Parsley': 'Salsa',
  'Cilantro': 'Coentro',
  'Bay Leaves': 'Folhas de Louro',
  'Cumin': 'Cominho',
  'Paprika': 'Páprica',
  'Cinnamon': 'Canela',
  'Ginger': 'Gengibre',
  'Turmeric': 'Açafrão',
  
  // Óleos e Vinagres
  'Olive Oil': 'Azeite de Oliva',
  'Vegetable Oil': 'Óleo Vegetal',
  'Coconut Oil': 'Óleo de Coco',
  'Vinegar': 'Vinagre',
  'Balsamic Vinegar': 'Vinagre Balsâmico',
  
  // Outros
  'Sugar': 'Açúcar',
  'Brown Sugar': 'Açúcar Mascavo',
  'Honey': 'Mel',
  'Soy Sauce': 'Molho de Soja',
  'Tomato Paste': 'Extrato de Tomate',
  'Coconut Milk': 'Leite de Coco',
  'Wine': 'Vinho',
  'Beer': 'Cerveja',
  'Stock': 'Caldo',
  'Broth': 'Caldo'
};

export const MEDIDAS: TraducaoMap = {
  'cup': 'xícara',
  'cups': 'xícaras',
  'tbsp': 'colher de sopa',
  'tsp': 'colher de chá',
  'tablespoon': 'colher de sopa',
  'tablespoons': 'colheres de sopa',
  'teaspoon': 'colher de chá',
  'teaspoons': 'colheres de chá',
  'oz': 'oz',
  'lb': 'libra',
  'lbs': 'libras',
  'g': 'g',
  'kg': 'kg',
  'ml': 'ml',
  'l': 'litro',
  'litre': 'litro',
  'litres': 'litros',
  'pint': 'pint',
  'pints': 'pints',
  'quart': 'quarto',
  'quarts': 'quartos',
  'gallon': 'galão',
  'gallons': 'galões',
  'slice': 'fatia',
  'slices': 'fatias',
  'piece': 'pedaço',
  'pieces': 'pedaços',
  'clove': 'dente',
  'cloves': 'dentes',
  'bunch': 'maço',
  'pinch': 'pitada',
  'handful': 'punhado',
  'can': 'lata',
  'cans': 'latas',
  'jar': 'pote',
  'jars': 'potes',
  'packet': 'pacote',
  'packets': 'pacotes',
  'bottle': 'garrafa',
  'bottles': 'garrafas'
};

export const INSTRUCOES_PALAVRAS: TraducaoMap = {
  // Verbos de cozinha
  'Heat': 'Aqueça',
  'Cook': 'Cozinhe',
  'Boil': 'Ferva',
  'Simmer': 'Deixe ferver em fogo baixo',
  'Fry': 'Frite',
  'Sauté': 'Refogue',
  'Bake': 'Asse',
  'Roast': 'Asse',
  'Grill': 'Grelhe',
  'Steam': 'Cozinhe no vapor',
  'Mix': 'Misture',
  'Stir': 'Mexa',
  'Whisk': 'Bata',
  'Blend': 'Bata no liquidificador',
  'Chop': 'Pique',
  'Dice': 'Corte em cubos',
  'Slice': 'Fatie',
  'Mince': 'Pique fino',
  'Season': 'Tempere',
  'Add': 'Adicione',
  'Serve': 'Sirva',
  'Garnish': 'Decore',
  'Drain': 'Escorra',
  'Rinse': 'Enxágue',
  'Peel': 'Descasque',
  'Wash': 'Lave',
  'Cut': 'Corte',
  'Remove': 'Retire',
  'Place': 'Coloque',
  'Put': 'Ponha',
  'Pour': 'Despeje',
  'Sprinkle': 'Polvilhe',
  'Cover': 'Cubra',
  'Uncover': 'Descubra',
  'Let': 'Deixe',
  'Allow': 'Permita',
  'Cool': 'Esfrie',
  'Chill': 'Gelere',
  'Marinate': 'Marine',
  
  // Tempos e temperaturas
  'minutes': 'minutos',
  'minute': 'minuto',
  'hours': 'horas',
  'hour': 'hora',
  'seconds': 'segundos',
  'second': 'segundo',
  'degrees': 'graus',
  'hot': 'quente',
  'warm': 'morno',
  'cold': 'frio',
  'medium-heat': 'fogo médio',
  'high': 'alto',
  'low': 'baixo',
  'until': 'até',
  'for': 'por',
  'about': 'cerca de',
  'approximately': 'aproximadamente',
  
  // Outras palavras comuns
  'and': 'e',
  'or': 'ou',
  'with': 'com',
  'without': 'sem',
  'in': 'em',
  'on': 'sobre',
  'over': 'sobre',
  'under': 'sob',
  'into': 'dentro',
  'onto': 'sobre',
  'from': 'de',
  'to': 'para',
  'the': 'o/a',
  'a': 'um/uma',
  'an': 'um/uma',
  'salt': 'sal',
  'pepper': 'pimenta',
  'taste': 'gosto',
  'fresh': 'fresco',
  'dried': 'seco',
  'frozen': 'congelado',
  'canned': 'enlatado',
  'large': 'grande',
  'small': 'pequeno',
  'medium': 'médio'
};

// Função para traduzir categoria
export function traduzirCategoria(categoria: string): string {
  return CATEGORIAS[categoria] || categoria;
}

// Função para traduzir país/origem
export function traduzirPais(pais: string): string {
  return PAISES[pais] || pais;
}

// Função para traduzir ingrediente com medida
export function traduzirIngrediente(ingredienteCompleto: string): string {
  let texto = ingredienteCompleto;
  
  // Traduzir medidas primeiro
  Object.entries(MEDIDAS).forEach(([en, pt]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    texto = texto.replace(regex, pt);
  });
  
  // Traduzir ingredientes
  Object.entries(INGREDIENTES).forEach(([en, pt]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    texto = texto.replace(regex, pt);
  });
  
  return texto.trim();
}

// Função para traduzir instruções
export function traduzirInstrucoes(instrucoes: string): string {
  let texto = instrucoes;
  
  // Traduzir palavras das instruções
  Object.entries(INSTRUCOES_PALAVRAS).forEach(([en, pt]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    texto = texto.replace(regex, pt);
  });
  
  // Traduzir ingredientes nas instruções
  Object.entries(INGREDIENTES).forEach(([en, pt]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    texto = texto.replace(regex, pt);
  });
  
  return texto;
}

// Função para traduzir nome da receita (apenas palavras conhecidas)
export function traduzirNomeReceita(nome: string): string {
  let nomeTrauzido = nome;
  
  // Traduzir apenas ingredientes principais no nome
  const ingredientesPrincipais = ['Chicken', 'Beef', 'Pork', 'Fish', 'Salmon', 'Rice', 'Pasta'];
  
  ingredientesPrincipais.forEach(ingrediente => {
    if (INGREDIENTES[ingrediente]) {
      const regex = new RegExp(`\\b${ingrediente}\\b`, 'gi');
      nomeTrauzido = nomeTrauzido.replace(regex, INGREDIENTES[ingrediente]);
    }
  });
  
  return nomeTrauzido;
}

// Função principal para traduzir receita completa
export function traduzirReceita(receita: any) {
  return {
    ...receita,
    nome: traduzirNomeReceita(receita.nome),
    categoria: traduzirCategoria(receita.categoria),
    origem: traduzirPais(receita.origem),
    ingredientes: receita.ingredientes.map(traduzirIngrediente),
    instrucoes: traduzirInstrucoes(receita.instrucoes)
  };
}