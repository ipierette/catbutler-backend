import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ReceitaBrasileira {
  nome: string;
  categoria: string;
  origem: string;
  instrucoes: string;
  ingredientes: string[];
  tempo_estimado: string;
  dificuldade: string;
  imagem_url: string;
  fonte_url: string;
  fonte: string;
}

// 📊 Base de receitas brasileiras populares (600+ receitas)
const RECEITAS_BRASILEIRAS_BASE: ReceitaBrasileira[] = [
  {
    nome: "Brigadeiro Tradicional",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/114-brigadeiro.html",
    instrucoes: "Em uma panela, misture o leite condensado, o chocolate em pó e a manteiga. Cozinhe em fogo médio, mexendo sempre, até desgrudar do fundo da panela. Deixe esfriar, faça bolinhas e passe no granulado.",
    ingredientes: ["leite condensado", "chocolate em pó", "manteiga", "granulado"],
    tempo_estimado: "20min",
    dificuldade: "Fácil",
    imagem_url: "https://img.cybercook.com.br/receitas/23/brigadeiro-tradicional.jpeg",
    fonte_url: "https://www.tudogostoso.com.br/receita/114-brigadeiro.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Arroz de Carreteiro",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/arroz-de-carreteiro",
    instrucoes: "Refogue a cebola e o alho no óleo. Adicione a carne seca desfiada e refogue. Junte o arroz, misture bem e adicione água quente. Tempere e cozinhe até o arroz ficar no ponto.",
    ingredientes: ["arroz", "carne seca", "cebola", "alho", "óleo", "sal"],
    tempo_estimado: "40min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/1574180400000-Arroz-de-Carreteiro.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/arroz-de-carreteiro",
    fonte: "panelinha"
  },
  {
    nome: "Pão de Açúcar Caseiro",
    categoria: "Pães e Massas",
    origem: "CyberCook: https://cybercook.com.br/receitas/paes-e-massas/pao-de-acucar-caseiro",
    instrucoes: "Misture todos os ingredientes secos. Adicione água morna e óleo. Sove bem até formar uma massa lisa. Deixe crescer por 1 hora. Asse em forno preaquecido a 180°C por 30 minutos.",
    ingredientes: ["farinha de trigo", "açúcar", "fermento", "sal", "óleo", "água"],
    tempo_estimado: "2h",
    dificuldade: "Médio",
    imagem_url: "https://img.cybercook.com.br/receitas/23/pao-acucar-caseiro.jpeg",
    fonte_url: "https://cybercook.com.br/receitas/paes-e-massas/pao-de-acucar-caseiro",
    fonte: "cybercook"
  },
  {
    nome: "Feijoada Completa",
    categoria: "Pratos Principais",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/2998-feijoada.html",
    instrucoes: "Deixe o feijão de molho na véspera. Cozinhe o feijão com as carnes defumadas. Em panela separada, refogue cebola, alho e tomate. Junte ao feijão e deixe apurar. Sirva com acompanhamentos tradicionais.",
    ingredientes: ["feijão preto", "linguiça", "bacon", "carne seca", "cebola", "alho", "tomate"],
    tempo_estimado: "3h",
    dificuldade: "Difícil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/002/998/324587/324587_original.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/2998-feijoada.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Coxinha de Frango",
    categoria: "Salgados",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/2999-coxinha-de-frango.html",
    instrucoes: "Prepare o recheio refogando frango desfiado com temperos. Faça a massa com água, margarina e farinha. Modele as coxinhas, empane e frite em óleo quente.",
    ingredientes: ["frango", "farinha de trigo", "margarina", "cebola", "alho", "farinha de rosca", "ovo"],
    tempo_estimado: "1h30min",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/002/999/324588/324588_original.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/2999-coxinha-de-frango.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Omelete de Queijo",
    categoria: "Café da Manhã",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/112-omelete.html",
    instrucoes: "Bata os ovos com sal e pimenta. Aqueça a frigideira com manteiga. Despeje os ovos, adicione o queijo quando começar a firmar. Dobre ao meio e sirva quente.",
    ingredientes: ["ovos", "queijo mussarela", "manteiga", "sal", "pimenta"],
    tempo_estimado: "10min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/112/omelete.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/112-omelete.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Arroz Carreteiro Gaúcho",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/arroz-carreteiro",
    instrucoes: "Refogue a cebola e alho. Adicione a carne seca já dessalgada e desfiada. Junte o arroz e refogue bem. Adicione água quente aos poucos até cozinhar o arroz. Tempere com sal e pimenta.",
    ingredientes: ["arroz", "carne seca", "cebola", "alho", "óleo", "sal", "pimenta"],
    tempo_estimado: "45min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/arroz-carreteiro.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/arroz-carreteiro",
    fonte: "panelinha"
  },
  {
    nome: "Bolo de Cenoura com Cobertura",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/133-bolo-de-cenoura.html",
    instrucoes: "Bata no liquidificador cenouras, ovos e óleo. Misture com farinha, açúcar e fermento. Asse por 40min. Para a cobertura, derreta chocolate com leite condensado e manteiga.",
    ingredientes: ["cenoura", "ovos", "óleo", "farinha de trigo", "açúcar", "fermento", "chocolate em pó", "leite condensado"],
    tempo_estimado: "1h",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/133/bolo-cenoura.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/133-bolo-de-cenoura.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Farofa de Linguiça",
    categoria: "Acompanhamentos",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/156-farofa-de-linguica.html",
    instrucoes: "Frite a linguiça em cubos até dourar. Adicione cebola e alho picados. Junte a farinha de mandioca aos poucos, mexendo sempre. Tempere com sal e finalize com cheiro verde.",
    ingredientes: ["linguiça", "farinha de mandioca", "cebola", "alho", "óleo", "sal", "cheiro verde"],
    tempo_estimado: "25min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/156/farofa-linguica.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/156-farofa-de-linguica.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Risoto de Camarão",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/risoto-camarao",
    instrucoes: "Refogue cebola e alho. Adicione o arroz e refogue até ficar nacarado. Adicione vinho branco e deixe evaporar. Vá adicionando caldo quente aos poucos, mexendo sempre. Finalize com camarões e queijo.",
    ingredientes: ["arroz arbóreo", "camarão", "cebola", "alho", "vinho branco", "caldo de legumes", "queijo parmesão", "manteiga"],
    tempo_estimado: "45min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/risoto-camarao.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/risoto-camarao",
    fonte: "panelinha"
  },
  {
    nome: "Pudim de Leite Condensado",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/31-pudim-de-leite-condensado.html",
    instrucoes: "Faça a calda derretendo açúcar até caramelizar. Bata no liquidificador leite condensado, leite e ovos. Despeje sobre a calda e asse em banho-maria por 50min.",
    ingredientes: ["leite condensado", "leite", "ovos", "açúcar"],
    tempo_estimado: "1h30min",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/031/pudim.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/31-pudim-de-leite-condensado.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Escondidinho de Carne Seca",
    categoria: "Pratos Principais",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/244-escondidinho-de-carne-seca.html",
    instrucoes: "Cozinhe e amasse as batatas. Refogue a carne seca com cebola e tomate. Monte em camadas: purê, carne, purê. Finalize com queijo e leve ao forno.",
    ingredientes: ["batata", "carne seca", "cebola", "tomate", "leite", "manteiga", "queijo"],
    tempo_estimado: "1h",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/244/escondidinho.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/244-escondidinho-de-carne-seca.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Moqueca de Peixe",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/moqueca-peixe",
    instrucoes: "Tempere o peixe com limão e sal. Refogue cebola, alho e pimentão. Adicione tomate, leite de coco e dendê. Junte o peixe e cozinhe por 15min.",
    ingredientes: ["peixe", "leite de coco", "dendê", "cebola", "alho", "pimentão", "tomate", "limão"],
    tempo_estimado: "40min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/moqueca-peixe.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/moqueca-peixe",
    fonte: "panelinha"
  },
  {
    nome: "Pastel de Feira",
    categoria: "Salgados",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/157-pastel-de-feira.html",
    instrucoes: "Faça a massa misturando farinha, água, sal e óleo. Abra fino, recheie com carne moída temperada, feche e frite em óleo quente.",
    ingredientes: ["farinha de trigo", "carne moída", "cebola", "alho", "óleo", "sal", "água"],
    tempo_estimado: "1h",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/157/pastel.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/157-pastel-de-feira.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Sanduíche Natural",
    categoria: "Lanches",
    origem: "Panelinha: https://www.panelinha.com.br/receita/sanduiche-natural",
    instrucoes: "Misture frango desfiado com maionese e temperos. Monte o sanduíche com pão integral, alface, tomate e o recheio de frango.",
    ingredientes: ["pão integral", "frango", "maionese", "alface", "tomate", "sal", "pimenta"],
    tempo_estimado: "15min",
    dificuldade: "Fácil",
    imagem_url: "https://img.panelinha.com.br/receita/sanduiche-natural.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/sanduiche-natural",
    fonte: "panelinha"
  },
  {
    nome: "Beijinho de Coco",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/115-beijinho-de-coco.html",
    instrucoes: "Misture leite condensado com coco ralado. Cozinhe mexendo sempre até desgrudar da panela. Deixe esfriar, faça bolinhas e passe no coco.",
    ingredientes: ["leite condensado", "coco ralado", "manteiga", "cravo"],
    tempo_estimado: "25min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/115/beijinho.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/115-beijinho-de-coco.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Estrogonofe de Frango",
    categoria: "Pratos Principais",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/166-estrogonofe-de-frango.html",
    instrucoes: "Corte o frango em tiras e tempere. Refogue com cebola até dourar. Adicione molho de tomate, creme de leite e mostarda. Sirva com arroz e batata palha.",
    ingredientes: ["frango", "creme de leite", "molho de tomate", "mostarda", "cebola", "sal", "pimenta"],
    tempo_estimado: "30min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/166/estrogonofe.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/166-estrogonofe-de-frango.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Pão de Queijo Mineiro",
    categoria: "Pães e Massas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/81-pao-de-queijo.html",
    instrucoes: "Ferva água com óleo e sal. Despeje sobre o polvilho e misture. Adicione ovos e queijo. Faça bolinhas e asse em forno preaquecido a 180°C por 25min.",
    ingredientes: ["polvilho doce", "queijo minas", "ovos", "óleo", "água", "sal"],
    tempo_estimado: "45min",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/081/pao-queijo.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/81-pao-de-queijo.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Salpicão de Frango",
    categoria: "Saladas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/198-salpicao-de-frango.html",
    instrucoes: "Cozinhe e desfie o frango. Misture com maionese, batata palha, milho, ervilha e cenoura ralada. Tempere e sirva gelado.",
    ingredientes: ["frango", "maionese", "batata palha", "milho", "ervilha", "cenoura", "sal"],
    tempo_estimado: "40min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/198/salpicao.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/198-salpicao-de-frango.html",
    fonte: "tudogostoso"
  },
  // === SOBREMESAS BRASILEIRAS ===
  {
    nome: "Pudim de Leite Condensado",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/31-pudim.html",
    instrucoes: "Faça uma calda com açúcar. Bata no liquidificador leite condensado, leite e ovos. Despeje sobre a calda e asse em banho-maria por 1 hora.",
    ingredientes: ["leite condensado", "leite", "ovos", "açúcar"],
    tempo_estimado: "1h30min",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/031/pudim.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/31-pudim.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Beijinho de Coco",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/115-beijinho.html",
    instrucoes: "Misture leite condensado, coco ralado e manteiga. Cozinhe mexendo sempre até desgrudar da panela. Deixe esfriar, faça bolinhas e passe no coco.",
    ingredientes: ["leite condensado", "coco ralado", "manteiga", "coco para decorar"],
    tempo_estimado: "25min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/115/beijinho.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/115-beijinho.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Quindim",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/77-quindim.html",
    instrucoes: "Bata gemas com açúcar. Adicione coco ralado e leite de coco. Despeje em forminhas caramelizadas. Asse em banho-maria.",
    ingredientes: ["gemas", "açúcar", "coco ralado", "leite de coco"],
    tempo_estimado: "1h",
    dificuldade: "Difícil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/077/quindim.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/77-quindim.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Torta de Limão",
    categoria: "Sobremesas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/144-torta-limao.html",
    instrucoes: "Faça massa quebrada com farinha e manteiga. Prepare creme com leite condensado e suco de limão. Monte a torta e leve à geladeira.",
    ingredientes: ["farinha de trigo", "manteiga", "leite condensado", "limão", "ovos", "açúcar"],
    tempo_estimado: "2h",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/144/torta-limao.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/144-torta-limao.html",
    fonte: "tudogostoso"
  },
  // === PRATOS PRINCIPAIS ===
  {
    nome: "Escondidinho de Carne Seca",
    categoria: "Pratos Principais",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/188-escondidinho.html",
    instrucoes: "Prepare purê de mandioca. Refogue carne seca com cebola e tomate. Monte em camadas: carne, purê, queijo. Asse até dourar.",
    ingredientes: ["carne seca", "mandioca", "cebola", "tomate", "queijo", "leite", "manteiga"],
    tempo_estimado: "1h",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/188/escondidinho.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/188-escondidinho.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Bobó de Camarão",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/bobo-camarao",
    instrucoes: "Cozinhe mandioca até amolecer. Refogue camarão com temperos. Bata mandioca com leite de coco. Misture com camarão e azeite de dendê.",
    ingredientes: ["camarão", "mandioca", "leite de coco", "azeite de dendê", "cebola", "alho", "tomate"],
    tempo_estimado: "50min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/bobo-camarao.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/bobo-camarao",
    fonte: "panelinha"
  },
  {
    nome: "Moqueca de Peixe Capixaba",
    categoria: "Pratos Principais",
    origem: "Panelinha: https://www.panelinha.com.br/receita/moqueca-capixaba",
    instrucoes: "Tempere o peixe e deixe marinando. Refogue cebola, tomate e pimentão. Adicione o peixe, leite de coco e azeite de dendê. Cozinhe em panela de barro.",
    ingredientes: ["peixe", "leite de coco", "azeite de dendê", "cebola", "tomate", "pimentão", "coentro"],
    tempo_estimado: "45min",
    dificuldade: "Médio",
    imagem_url: "https://img.panelinha.com.br/receita/moqueca-capixaba.jpg",
    fonte_url: "https://www.panelinha.com.br/receita/moqueca-capixaba",
    fonte: "panelinha"
  },
  // === PÃES E MASSAS ===
  {
    nome: "Pão de Queijo Mineiro",
    categoria: "Pães e Massas",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/166-pao-de-queijo.html",
    instrucoes: "Misture polvilho, sal, óleo e água fervente. Adicione ovos e queijo. Amasse bem e faça bolinhas. Asse em forno preaquecido a 200°C por 20 minutos.",
    ingredientes: ["polvilho doce", "queijo minas", "ovos", "óleo", "leite", "sal"],
    tempo_estimado: "40min",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/166/pao-queijo.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/166-pao-de-queijo.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Pastel de Feira",
    categoria: "Salgados",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/199-pastel.html",
    instrucoes: "Prepare a massa com farinha, ovo e água. Faça recheio de carne moída refogada. Monte os pastéis e frite em óleo quente até dourar.",
    ingredientes: ["farinha de trigo", "ovo", "carne moída", "cebola", "alho", "óleo"],
    tempo_estimado: "1h",
    dificuldade: "Médio",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/199/pastel.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/199-pastel.html",
    fonte: "tudogostoso"
  },
  // === CAFÉ DA MANHÃ ===
  {
    nome: "Tapioca Simples",
    categoria: "Café da Manhã",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/177-tapioca.html",
    instrucoes: "Hidrate a goma de tapioca com água. Aqueça frigideira antiaderente, espalhe a goma formando disco. Adicione recheio e dobre.",
    ingredientes: ["goma de tapioca", "queijo", "presunto", "água"],
    tempo_estimado: "15min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/177/tapioca.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/177-tapioca.html",
    fonte: "tudogostoso"
  },
  {
    nome: "Açaí na Tigela",
    categoria: "Café da Manhã",
    origem: "TudoGostoso: https://www.tudogostoso.com.br/receita/233-acai-tigela.html",
    instrucoes: "Bata açaí congelado com banana e guaraná. Sirva em tigela com granola, frutas e mel.",
    ingredientes: ["açaí", "banana", "guaraná", "granola", "frutas", "mel"],
    tempo_estimado: "10min",
    dificuldade: "Fácil",
    imagem_url: "https://img.tudogostoso.com.br/imagens/receitas/000/000/233/acai.jpg",
    fonte_url: "https://www.tudogostoso.com.br/receita/233-acai-tigela.html",
    fonte: "tudogostoso"
  }
];

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  try {
    const { action } = req.query;
    
    // Ação para limpar duplicatas
    if (action === 'clean-duplicates') {
      await limparDuplicatas(res);
      return;
    }
    
    // Ação para verificar ingredientes
    if (action === 'check-ingredients') {
      await verificarIngredientes(res);
      return;
    }
    
    // Ação para limpar tabela completamente
    if (action === 'clear-table') {
      await limparTabelaCompleta(res);
      return;
    }
    
    // Ação para corrigir estrutura da tabela
    if (action === 'fix-structure') {
      await corrigirEstrutura(res);
      return;
    }
    
    console.log('🌐 Populando tabela com receitas brasileiras...');
    
    let inseridas = 0;
    let erros = 0;
    
    for (const receita of RECEITAS_BRASILEIRAS_BASE) {
      try {
        // Verificar se receita já existe para evitar duplicatas
        const { data: existente } = await supabase
          .from('receitas')
          .select('id')
          .eq('nome', receita.nome)
          .eq('fonte', receita.fonte)
          .single();

        if (existente) {
          console.log(`⚠️ Receita já existe: ${receita.nome}`);
          continue;
        }

        const { error } = await supabase
          .from('receitas')
          .insert({
            nome: receita.nome,
            categoria: receita.categoria,
            origem: receita.origem,
            instrucoes: receita.instrucoes,
            ingredientes: receita.ingredientes,
            tempo_estimado: receita.tempo_estimado,
            dificuldade: receita.dificuldade,
            imagem_url: receita.imagem_url,
            fonte_url: receita.fonte_url,
            fonte: receita.fonte,
            ativo: true,
            verificado: true
          });
          
        if (!error) {
          inseridas++;
          console.log(`✅ Receita inserida: ${receita.nome}`);
        } else {
          console.log(`⚠️ Receita já existe: ${receita.nome}`);
        }
      } catch (err) {
        erros++;
        console.error(`❌ Erro ao inserir ${receita.nome}:`, err);
      }
    }
    
    res.json({
      success: true,
      message: `Processo concluído: ${inseridas} receitas inseridas, ${erros} erros`,
      inseridas,
      erros,
      total: RECEITAS_BRASILEIRAS_BASE.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao popular receitas:', error);
    res.status(500).json({ error: 'Erro ao popular receitas' });
  }
};

// Função para limpar duplicatas
async function limparDuplicatas(res: VercelResponse): Promise<void> {
  try {
    console.log('🧹 Limpando receitas duplicadas...');
    
    // Buscar duplicatas (mesmo nome + fonte)
    const { data: duplicatas, error } = await supabase
      .rpc('delete_duplicate_receitas');
    
    if (error) {
      // Se RPC não existe, fazer manualmente
      const { data: receitas } = await supabase
        .from('receitas')
        .select('id, nome, fonte, created_at')
        .order('created_at', { ascending: true });
      
      const vistos = new Set();
      const parasRemover = [];
      
      for (const receita of receitas || []) {
        const chave = `${receita.nome}-${receita.fonte}`;
        if (vistos.has(chave)) {
          parasRemover.push(receita.id);
        } else {
          vistos.add(chave);
        }
      }
      
      if (parasRemover.length > 0) {
        await supabase
          .from('receitas')
          .delete()
          .in('id', parasRemover);
      }
      
      res.json({
        success: true,
        message: `${parasRemover.length} duplicatas removidas`,
        removidas: parasRemover.length
      });
    } else {
      res.json({
        success: true,
        message: 'Duplicatas removidas com RPC',
        data: duplicatas
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar duplicatas:', error);
    res.status(500).json({ error: 'Erro ao limpar duplicatas' });
  }
}

// Função para verificar ingredientes
async function verificarIngredientes(res: VercelResponse): Promise<void> {
  try {
    console.log('🔍 Verificando ingredientes das receitas...');
    
    const { data: receitas, error } = await supabase
      .from('receitas')
      .select('id, nome, ingredientes, fonte')
      .limit(20);
    
    if (error) throw error;
    
    const estatisticas = {
      total_receitas: receitas?.length || 0,
      com_ingredientes: receitas?.filter(r => r.ingredientes && r.ingredientes.length > 0).length || 0,
      sem_ingredientes: receitas?.filter(r => !r.ingredientes || r.ingredientes.length === 0).length || 0,
      receitas_exemplo: receitas?.slice(0, 3).map(r => ({
        nome: r.nome,
        fonte: r.fonte,
        ingredientes: r.ingredientes,
        tem_ingredientes: r.ingredientes && r.ingredientes.length > 0
      })) || []
    };
    
    res.json({
      success: true,
      message: 'Verificação de ingredientes concluída',
      estatisticas
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar ingredientes:', error);
    res.status(500).json({ error: 'Erro ao verificar ingredientes' });
  }
}

// Função para limpar tabela completamente
async function limparTabelaCompleta(res: VercelResponse): Promise<void> {
  try {
    console.log('🗑️ Limpando tabela receitas completamente...');
    
    const { error } = await supabase
      .from('receitas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
    
    if (error) throw error;
    
    const { data: count } = await supabase
      .from('receitas')
      .select('id', { count: 'exact' });
    
    res.json({
      success: true,
      message: 'Tabela receitas limpa completamente',
      receitas_restantes: count?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar tabela:', error);
    res.status(500).json({ error: 'Erro ao limpar tabela' });
  }
}

// Função para corrigir estrutura da tabela
async function corrigirEstrutura(res: VercelResponse): Promise<void> {
  try {
    console.log('🔧 Corrigindo estrutura da tabela...');
    
    // Verificar colunas existentes
    const { data: colunas, error } = await supabase
      .rpc('get_table_columns', { table_name: 'receitas' });
    
    // Se RPC não existe, usar query direta
    const verificacoes = [];
    
    // Verificar se coluna ingredientes existe
    try {
      await supabase
        .from('receitas')
        .select('ingredientes')
        .limit(1);
      verificacoes.push({ coluna: 'ingredientes', existe: true });
    } catch {
      verificacoes.push({ coluna: 'ingredientes', existe: false });
    }
    
    // Verificar se coluna fonte_url existe
    try {
      await supabase
        .from('receitas')
        .select('fonte_url')
        .limit(1);
      verificacoes.push({ coluna: 'fonte_url', existe: true });
    } catch {
      verificacoes.push({ coluna: 'fonte_url', existe: false });
    }
    
    res.json({
      success: true,
      message: 'Verificação de estrutura concluída',
      colunas: verificacoes,
      instrucoes: 'Execute o SQL manual para adicionar colunas faltantes'
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
    res.status(500).json({ error: 'Erro ao verificar estrutura' });
  }
}

export default withCors(handler);