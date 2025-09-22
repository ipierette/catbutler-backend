import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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

// 📊 Base de receitas brasileiras populares (para começar)
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
  }
];

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log('🌐 Populando tabela com receitas brasileiras...');
    
    let inseridas = 0;
    let erros = 0;
    
    for (const receita of RECEITAS_BRASILEIRAS_BASE) {
      try {
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
    
    return res.json({
      success: true,
      message: `Processo concluído: ${inseridas} receitas inseridas, ${erros} erros`,
      inseridas,
      erros,
      total: RECEITAS_BRASILEIRAS_BASE.length
    });
    
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao popular receitas' });
  }
};

export default withCors(handler);