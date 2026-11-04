import { prisma } from "@/lib/prisma";
import {
  CONTRATO_MODELO_PADRAO,
  normalizarQuebras,
  renderizarModelo,
} from "@/lib/contrato-modelo";
import {
  gerarTokenContrato,
  hashDadosPlano,
  hashSha256,
  montarVariaveisContrato,
  pendenciasContrato,
  type DadosContrato,
} from "@/lib/contrato-regras";

const SELECT_CONTRATADA = {
  id: true,
  name: true,
  razaoSocial: true,
  cpfCnpj: true,
  inscricaoMunicipal: true,
  endereco: true,
  telefone: true,
  email: true,
} as const;

/**
 * Modelo vigente: a última versão salva, ou o texto sugerido (versão 0) enquanto ninguém
 * salvou. Sem contratada escolhida, usa o primeiro usuário com CPF/CNPJ preenchido.
 */
export async function getModeloVigente() {
  const salvo = await prisma.contratoModelo.findFirst({
    orderBy: { versao: "desc" },
    include: { contratada: { select: SELECT_CONTRATADA } },
  });
  const contratada =
    salvo?.contratada ??
    (await prisma.user.findFirst({
      where: { cpfCnpj: { not: null }, NOT: { cpfCnpj: "" } },
      orderBy: { createdAt: "asc" },
      select: SELECT_CONTRATADA,
    }));
  return {
    versao: salvo?.versao ?? 0,
    conteudo: normalizarQuebras(salvo?.conteudo ?? CONTRATO_MODELO_PADRAO),
    contratada,
  };
}

type ModeloVigente = Awaited<ReturnType<typeof getModeloVigente>>;

export function buscarContratoComDados(where: { id: string } | { token: string }) {
  return prisma.contrato.findUnique({
    where,
    include: {
      paciente: true,
      planoAtribuicao: {
        include: {
          plano: { select: { tipos: true } },
          cobrancas: { orderBy: { vencimento: "asc" } },
        },
      },
    },
  });
}

type ContratoComDados = NonNullable<Awaited<ReturnType<typeof buscarContratoComDados>>>;

function dadosDoContrato(
  contrato: Pick<ContratoComDados, "numero" | "createdAt" | "paciente" | "planoAtribuicao">,
  contratada: ModeloVigente["contratada"],
): DadosContrato {
  const { paciente, planoAtribuicao: a } = contrato;
  return {
    numero: contrato.numero,
    emitidoEm: contrato.createdAt,
    paciente,
    contratada,
    plano: {
      nome: a.planoNome,
      tipos: a.plano?.tipos ?? [],
      atendimentos: a.atendimentos,
      periodicidade: a.periodicidade,
      formaPagamento: a.formaPagamento,
      numeroParcelas: a.numeroParcelas,
      valorOriginal: Number(a.valorOriginal),
      desconto: Number(a.desconto),
      valor: Number(a.valor),
      dataInicio: a.dataInicio,
      parcelas: a.cobrancas.map((c) => ({
        numero: c.numeroParcela,
        vencimento: c.vencimento,
        valor: Number(c.valor),
      })),
    },
  };
}

/** Texto atual de um contrato pendente, com o hash que a assinatura precisa confirmar. */
export async function renderizarContratoPendente(contrato: ContratoComDados) {
  const modelo = await getModeloVigente();
  const dados = dadosDoContrato(contrato, modelo.contratada);
  const variaveis = montarVariaveisContrato(dados);
  const conteudo = renderizarModelo(modelo.conteudo, variaveis);
  return {
    conteudo,
    conteudoHash: hashSha256(conteudo),
    dadosPlanoHash: hashDadosPlano(variaveis),
    modeloVersao: modelo.versao,
    pendencias: pendenciasContrato(dados),
  };
}

/**
 * Garante que um plano ativo tem contrato válido. Cria o primeiro; se o assinado não
 * corresponde mais ao plano (valor, parcelas, período), marca como substituído e abre um
 * novo para assinar. Pendente não precisa de nada, pois o texto é sempre o atual.
 */
export async function sincronizarContratoDoPlano(planoAtribuicaoId: string) {
  const atual = await prisma.contrato.findFirst({
    where: { planoAtribuicaoId, status: { in: ["PENDENTE", "ASSINADO"] } },
    orderBy: { numero: "desc" },
  });
  if (atual?.status === "PENDENTE") return;

  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id: planoAtribuicaoId },
    include: {
      paciente: true,
      plano: { select: { tipos: true } },
      cobrancas: { orderBy: { vencimento: "asc" } },
    },
  });
  if (!atribuicao || atribuicao.status !== "ATIVO") return;

  if (atual) {
    const { paciente, ...planoAtribuicao } = atribuicao;
    const variaveis = montarVariaveisContrato(
      dadosDoContrato(
        { numero: atual.numero, createdAt: atual.createdAt, paciente, planoAtribuicao },
        null,
      ),
    );
    if (hashDadosPlano(variaveis) === atual.dadosPlanoHash) return;
    await prisma.contrato.update({
      where: { id: atual.id },
      data: { status: "SUBSTITUIDO" },
    });
  }

  await prisma.contrato.create({
    data: {
      token: gerarTokenContrato(),
      pacienteId: atribuicao.pacienteId,
      planoAtribuicaoId,
    },
  });
}
