import { PrismaClient } from '@prisma/client';

/**
 * Popula o banco com dados realistas de campus.
 *
 * Rode com: npm run db:seed --workspace @circula/api
 *
 * Por que dados realistas importam aqui: a vitrine da landing page e as
 * estatísticas são alimentadas por consultas de verdade. Com três registros
 * genéricos ("Item 1", "Item 2") a tela fica pobre na gravação do vídeo e os
 * filtros por categoria não têm o que filtrar. Com este conjunto, a demo mostra
 * paginação, categorias variadas e a distinção entre venda e doação.
 *
 * O seed é IDEMPOTENTE: pode rodar quantas vezes quiser. Ele limpa os anúncios
 * e usuários de exemplo antes de recriar, então nunca duplica.
 */
const prisma = new PrismaClient();

/**
 * Hash placeholder da Sprint 1.
 *
 * A coluna `passwordHash` é obrigatória no schema, mas o login só existe na
 * Sprint 2. Este valor NÃO é uma senha válida e não autentica ninguém — na
 * Sprint 2 o seed passa a gerar hashes reais com bcrypt.
 */
const PLACEHOLDER_HASH = '$2a$10$sprint2.placeholder.nao.autentica.ninguem.ainda';

const users = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Ana Beatriz Lima',
    email: 'ana.lima@edu.unifor.br',
    course: 'Engenharia Civil',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=45',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Carlos Eduardo Souza',
    email: 'carlos.souza@edu.unifor.br',
    course: 'Ciência da Computação',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Mariana Costa',
    email: 'mariana.costa@edu.unifor.br',
    course: 'Medicina',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=32',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'João Pedro Alves',
    email: 'joao.alves@edu.unifor.br',
    course: 'Análise e Desenvolvimento de Sistemas',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=68',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Larissa Menezes',
    email: 'larissa.menezes@edu.unifor.br',
    course: 'Arquitetura e Urbanismo',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=20',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Rafael Nogueira',
    email: 'rafael.nogueira@edu.unifor.br',
    course: 'Engenharia Elétrica',
    campus: 'Fortaleza — Sede',
    avatarUrl: 'https://i.pravatar.cc/150?img=59',
  },
] as const;

type SeedAnnouncement = {
  title: string;
  description: string;
  category:
    | 'LIVROS'
    | 'ENGENHARIA'
    | 'COMPUTACAO'
    | 'ELETRONICOS'
    | 'VESTUARIO'
    | 'MOVEIS'
    | 'PAPELARIA'
    | 'OUTROS';
  condition: 'NOVO' | 'SEMINOVO' | 'USADO';
  type: 'VENDA' | 'DOACAO' | 'TROCA';
  priceCents: number | null;
  imageUrl: string;
  status?: 'ATIVO' | 'RESERVADO' | 'CONCLUIDO';
  authorIndex: number;
  /** Há quantos dias o anúncio foi publicado (para a ordenação fazer sentido). */
  daysAgo: number;
};

const announcements: SeedAnnouncement[] = [
  {
    title: 'Cálculo Volume 1 — James Stewart (7ª edição)',
    description:
      'Livro usado em Cálculo I e II. Capa com desgaste leve nas quinas, miolo íntegro e sem rasuras. Acompanha o caderno de exercícios resolvidos que eu mesma fiz durante o semestre.',
    category: 'LIVROS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 8900,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    authorIndex: 0,
    daysAgo: 1,
  },
  {
    title: 'Calculadora HP 12C Platinum',
    description:
      'Calculadora financeira original, usada em Matemática Financeira. Funcionando perfeitamente, com capa protetora e manual. Troquei por uma científica, não uso mais.',
    category: 'ELETRONICOS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800',
    authorIndex: 1,
    daysAgo: 2,
  },
  {
    title: 'Jaleco branco manga longa — tamanho M',
    description:
      'Jaleco de laboratório em gabardine, tamanho M. Usei durante dois semestres em aulas práticas. Lavado e higienizado, sem manchas. Doando para quem está entrando agora.',
    category: 'VESTUARIO',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800',
    authorIndex: 2,
    daysAgo: 1,
  },
  {
    title: 'Kit de desenho técnico completo',
    description:
      'Prancheta A3, régua paralela, jogo de esquadros, compasso de precisão e escalímetro. Tudo que precisei em Desenho Técnico I. Ideal para quem está começando Engenharia ou Arquitetura.',
    category: 'ENGENHARIA',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
    authorIndex: 4,
    daysAgo: 3,
  },
  {
    title: 'Arduino Uno R3 + kit de sensores',
    description:
      'Placa Arduino Uno original com protoboard, jumpers, LEDs, resistores, sensor de temperatura DHT11 e ultrassônico HC-SR04. Usado em um projeto de Sistemas Embarcados que já terminou.',
    category: 'COMPUTACAO',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 12500,
    imageUrl: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800',
    authorIndex: 5,
    daysAgo: 4,
  },
  {
    title: 'Anatomia Orientada para a Clínica — Moore',
    description:
      'Referência obrigatória de Anatomia. Edição em português, capa dura. Algumas marcações a lápis nos capítulos de membro superior, todas apagáveis. Sem páginas soltas.',
    category: 'LIVROS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 18000,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    authorIndex: 2,
    daysAgo: 5,
  },
  {
    title: 'Cadeira de escritório com regulagem de altura',
    description:
      'Cadeira giratória com encosto em tela, apoio de braço e pistão a gás funcionando. Estou me mudando do apartamento e não tenho como levar. Retirada no bairro Edson Queiroz.',
    category: 'MOVEIS',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800',
    authorIndex: 3,
    daysAgo: 2,
  },
  {
    title: 'Apostilas de Estruturas de Concreto Armado',
    description:
      'Três apostilas encadernadas com todo o conteúdo de Concreto Armado I e II, incluindo exercícios resolvidos e tabelas de dimensionamento. Doando para quem vai cursar agora.',
    category: 'PAPELARIA',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
    authorIndex: 0,
    daysAgo: 6,
  },
  {
    title: 'Monitor Dell 24" Full HD',
    description:
      'Monitor IPS de 24 polegadas, 1920x1080, entradas HDMI e VGA. Sem pixel morto. Comprei um ultrawide e este ficou sobrando. Acompanha cabo HDMI e fonte original.',
    category: 'ELETRONICOS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800',
    authorIndex: 1,
    daysAgo: 7,
  },
  {
    title: 'Algoritmos: Teoria e Prática — Cormen',
    description:
      'O "CLRS", bíblia de algoritmos e estruturas de dados. Edição em português, capa dura, praticamente novo — comprei e acabei estudando pela versão da biblioteca.',
    category: 'LIVROS',
    condition: 'NOVO',
    type: 'VENDA',
    priceCents: 21000,
    imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800',
    authorIndex: 3,
    daysAgo: 3,
  },
  {
    title: 'Multímetro digital com ponteiras',
    description:
      'Multímetro para medição de tensão, corrente e resistência. Usado nas práticas de Circuitos Elétricos. Calibrado, com bateria nova e estojo.',
    category: 'ENGENHARIA',
    condition: 'SEMINOVO',
    type: 'TROCA',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    authorIndex: 5,
    daysAgo: 8,
  },
  {
    title: 'Mochila para notebook 15,6"',
    description:
      'Mochila com compartimento acolchoado para notebook até 15,6 polegadas, bolso frontal organizador e alças reforçadas. Impermeável. Usei por um ano, sem rasgos.',
    category: 'OUTROS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 6500,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    authorIndex: 4,
    daysAgo: 9,
  },
  {
    title: 'Maquete de arquitetura — materiais avulsos',
    description:
      'Sobras de papel paraná, isopor de alta densidade, cola branca, estilete e base de corte A3. Suficiente para uma maquete de médio porte. Doando para não jogar fora.',
    category: 'PAPELARIA',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800',
    authorIndex: 4,
    daysAgo: 4,
  },
  {
    title: 'Estante de livros 5 prateleiras',
    description:
      'Estante em MDF branco, 180cm de altura. Dois pequenos furos na lateral de uma montagem anterior, nada que comprometa. Precisa ser desmontada para transporte.',
    category: 'MOVEIS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800',
    status: 'RESERVADO',
    authorIndex: 0,
    daysAgo: 10,
  },
  {
    title: 'Teclado mecânico switch red',
    description:
      'Teclado mecânico ABNT2 com switches lineares, iluminação RGB e cabo removível. Ótimo para programar. Trocando por um teclado 60% ou mouse gamer.',
    category: 'COMPUTACAO',
    condition: 'SEMINOVO',
    type: 'TROCA',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800',
    authorIndex: 1,
    daysAgo: 5,
  },
  {
    title: 'Estetoscópio Littmann Classic III',
    description:
      'Estetoscópio original, cor preta, com olivas sobressalentes. Usado durante o ciclo básico. Higienizado e revisado. Vendo porque ganhei um cardiológico.',
    category: 'OUTROS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800',
    authorIndex: 2,
    daysAgo: 11,
  },
  {
    title: 'Física Básica — Moysés Nussenzveig (4 volumes)',
    description:
      'Coleção completa dos quatro volumes. Volumes 1 e 2 com uso moderado, 3 e 4 praticamente intocados. Vendo o conjunto inteiro, não separo.',
    category: 'LIVROS',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 26000,
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    authorIndex: 5,
    daysAgo: 12,
  },
  {
    title: 'Luminária de mesa LED articulada',
    description:
      'Luminária com braço articulado, três níveis de intensidade e luz branca fria. Ideal para noites de estudo. Funcionando perfeitamente, doando porque comprei outra.',
    category: 'ELETRONICOS',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
    authorIndex: 3,
    daysAgo: 6,
  },
  {
    title: 'Capacete de obra + colete refletivo',
    description:
      'EPI usado nas visitas técnicas de canteiro de obras. Capacete classe B branco com jugular e colete refletivo tamanho único. Ambos em bom estado.',
    category: 'VESTUARIO',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
    authorIndex: 0,
    daysAgo: 13,
  },
  {
    title: 'Notebook Acer Aspire 5 — i5 8GB SSD 256GB',
    description:
      'Notebook usado durante a graduação. Core i5 de 10ª geração, 8GB de RAM, SSD de 256GB. Bateria segura cerca de 3 horas. Formatado, com Windows 11 limpo. Pequeno arranhão na tampa.',
    category: 'COMPUTACAO',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 180000,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
    authorIndex: 3,
    daysAgo: 14,
  },
  {
    title: 'Escalímetro triangular 30cm',
    description:
      'Escalímetro profissional em alumínio com seis escalas. Usado em Desenho Arquitetônico. Sem amassados, marcações totalmente legíveis.',
    category: 'ENGENHARIA',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?w=800',
    authorIndex: 4,
    daysAgo: 15,
  },
  {
    title: 'Cadernos universitários seminovos (lote com 5)',
    description:
      'Cinco cadernos de 96 folhas com menos de um terço usado. Arranquei as folhas escritas. Perfeitos para quem quer economizar no início do semestre.',
    category: 'PAPELARIA',
    condition: 'SEMINOVO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800',
    authorIndex: 1,
    daysAgo: 7,
  },
  {
    title: 'Mesa de estudos dobrável',
    description:
      'Mesa compacta dobrável, 90x60cm, tampo em MDF e estrutura metálica. Ocupa pouco espaço quando guardada. Ideal para quarto de república.',
    category: 'MOVEIS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 9000,
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800',
    authorIndex: 2,
    daysAgo: 16,
  },
  {
    title: 'Livro Clean Code — Robert C. Martin',
    description:
      'Clássico sobre boas práticas de programação. Edição em português. Li uma vez e cuidei bem — lombada intacta, sem dobras nas páginas.',
    category: 'LIVROS',
    condition: 'SEMINOVO',
    type: 'TROCA',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800',
    authorIndex: 1,
    daysAgo: 8,
  },
  {
    title: 'Kit de pincéis e tintas para maquete',
    description:
      'Conjunto de pincéis de diversos tamanhos e tintas acrílicas em cores neutras. Sobrou do meu trabalho final de Projeto Arquitetônico.',
    category: 'OUTROS',
    condition: 'USADO',
    type: 'DOACAO',
    priceCents: null,
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800',
    authorIndex: 4,
    daysAgo: 17,
  },
  {
    title: 'Fone de ouvido com cancelamento de ruído',
    description:
      'Headphone over-ear bluetooth com cancelamento ativo. Bateria dura cerca de 20 horas. Espuma da almofada esquerda com desgaste leve. Salvou meus estudos na biblioteca.',
    category: 'ELETRONICOS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    authorIndex: 5,
    daysAgo: 18,
  },
  {
    title: 'Resistência dos Materiais — Hibbeler',
    description:
      'Livro-texto de Resistência dos Materiais, 7ª edição. Bastante usado, algumas páginas com marca-texto amarelo, mas completo e legível. Preço camarada.',
    category: 'LIVROS',
    condition: 'USADO',
    type: 'VENDA',
    priceCents: 7000,
    imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
    status: 'CONCLUIDO',
    authorIndex: 0,
    daysAgo: 20,
  },
  {
    title: 'Suporte ergonômico para notebook',
    description:
      'Suporte em alumínio com regulagem de altura e inclinação. Melhora muito a postura em longas sessões de estudo. Sem riscos.',
    category: 'COMPUTACAO',
    condition: 'SEMINOVO',
    type: 'VENDA',
    priceCents: 8000,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
    authorIndex: 3,
    daysAgo: 9,
  },
];

/** Converte "há N dias" numa data concreta. */
function daysAgoToDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log('🌱 Populando o banco do Circula...\n');

  const seedUserIds = users.map((user) => user.id);

  // Idempotência: apaga o que este seed criou antes de recriar.
  // Os anúncios saem junto por causa do `onDelete: Cascade` no schema.
  const removed = await prisma.user.deleteMany({ where: { id: { in: seedUserIds } } });
  if (removed.count > 0) {
    console.log(`   Limpou ${removed.count} usuário(s) de seed anteriores.`);
  }

  await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash: PLACEHOLDER_HASH })),
  });
  console.log(`   ✓ ${users.length} usuários criados`);

  await prisma.announcement.createMany({
    data: announcements.map((item) => {
      const author = users[item.authorIndex];
      if (!author) {
        throw new Error(`authorIndex inválido (${item.authorIndex}) em "${item.title}"`);
      }

      const createdAt = daysAgoToDate(item.daysAgo);

      return {
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        type: item.type,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        status: item.status ?? 'ATIVO',
        authorId: author.id,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
  console.log(`   ✓ ${announcements.length} anúncios criados`);

  const donations = announcements.filter((item) => item.type === 'DOACAO').length;
  const sales = announcements.filter((item) => item.type === 'VENDA').length;
  const trades = announcements.filter((item) => item.type === 'TROCA').length;

  console.log(`\n   Distribuição: ${sales} vendas · ${donations} doações · ${trades} trocas`);
  console.log('\n✅ Seed concluído.\n');
  console.log('   Para testar as rotas protegidas, use um destes ids no cabeçalho X-User-Id:');
  users.slice(0, 3).forEach((user) => {
    console.log(`     ${user.id}  (${user.name})`);
  });
  console.log('');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Falha no seed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
