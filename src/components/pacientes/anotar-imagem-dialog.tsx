"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Loader2,
  Maximize2,
  Minus,
  Move,
  Pencil,
  Redo2,
  Ruler,
  Scale,
  Sparkles,
  Trash2,
  X,
  Triangle,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormaHit, FormaSvg } from "@/components/pacientes/anotacoes-camada";
import { salvarAnotacoesImagem, type ImagemSerie } from "@/actions/exame-imagens";
import { analisarPosturaImagem } from "@/actions/analise-postural";
import {
  VISTA_LABEL,
  respostaParaFormas,
  substituirFormasIa,
  type VistaPostural,
} from "@/lib/analise-postural";
import {
  CORES_ANOTACAO,
  alinharReto,
  anotacoesVazias,
  limitarPonto,
  moverPonto,
  pontoAncora,
  pontosDaForma,
  transladar,
  type Anotacoes,
  type Forma,
  type Ponto,
} from "@/lib/anotacoes-imagem";
import {
  VISTA_INICIAL,
  ancorar,
  encaixar,
  limitarVista,
  paraLocal,
  zoomEm,
  type Quadro,
  type Vista,
} from "@/lib/visor-zoom";

type Ferramenta =
  | "mover"
  | "linha"
  | "seta"
  | "medida"
  | "inclinacao"
  | "circulo"
  | "livre"
  | "texto"
  | "calibrar"
  | "borracha";

/** Alinhamento de linhas: livre, ímã nos eixos (8°) ou sempre reta (H/V). */
type ModoReta = "livre" | "ima" | "travar";

type Gesto =
  | { tipo: "desenho"; inicio: Ponto }
  | { tipo: "corpo"; id: string; ultimo: Ponto; antes: Anotacoes; movido: boolean }
  | { tipo: "alca"; id: string; indice: number; antes: Anotacoes; movido: boolean }
  | { tipo: "pan"; x: number; y: number; vista: Vista };

const FERRAMENTAS: {
  id: Ferramenta;
  label: string;
  icone: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "mover", label: "Mover", icone: Move },
  { id: "linha", label: "Linha", icone: Minus },
  { id: "seta", label: "Seta", icone: ArrowUpRight },
  { id: "medida", label: "Medida", icone: Ruler },
  { id: "inclinacao", label: "Ângulo", icone: Triangle },
  { id: "circulo", label: "Círculo", icone: Circle },
  { id: "livre", label: "Livre", icone: Pencil },
  { id: "texto", label: "Texto", icone: Type },
  { id: "calibrar", label: "Calibrar", icone: Scale },
  { id: "borracha", label: "Borracha", icone: Eraser },
];

const MODOS_RETA: { id: ModoReta; label: string; titulo: string }[] = [
  { id: "livre", label: "Livre", titulo: "Linhas em qualquer direção" },
  { id: "ima", label: "Ímã", titulo: "Quase retas travam na horizontal/vertical" },
  { id: "travar", label: "Reta", titulo: "Sempre horizontal ou vertical" },
];

/** Ampliação da lupa em relação ao que está na tela. */
const LUPA_ZOOM = 2.5;
const LUPA_TAM = 128;

/** "Não mostrar de novo nesta sessão" do aviso de envio à IA (só em memória). */
let consentimentoIaNaSessao = false;

type AvisoIa = { vista: VistaPostural; ausentes: string[] };

let contador = 0;
const novoId = () => `f${Date.now().toString(36)}${(contador++).toString(36)}`;

function dica(ferramenta: Ferramenta): string {
  switch (ferramenta) {
    case "mover":
      return "Toque numa marcação e arraste para movê-la; arraste as bolinhas para ajustar. Com zoom, arraste o fundo para navegar.";
    case "inclinacao":
      return "Arraste de um ponto a outro: o ângulo é medido em relação à horizontal (linha tracejada).";
    case "texto":
      return "Toque na imagem onde o texto deve ficar e digite.";
    case "borracha":
      return "Toque numa marcação para apagá-la (Desfazer recupera).";
    case "calibrar":
      return "Arraste sobre algo de tamanho conhecido (ex.: uma régua) e informe o comprimento real.";
    case "circulo":
      return "Arraste do centro até a borda.";
    case "livre":
      return "Arraste para desenhar à mão livre.";
    default:
      return "Arraste sobre a imagem. Depois ajuste as pontas pelas bolinhas.";
  }
}

/**
 * Editor de anotações sobre uma imagem, pensado para toque: tela cheia no
 * celular, lupa sob o dedo, pinça para zoom, alças grandes, desfazer/refazer
 * e alinhamento reto. Salva no banco normalizado (0..1).
 */
export function AnotarImagemDialog({
  imagem,
  open,
  onOpenChange,
  onSalvo,
  iaDisponivel = false,
}: {
  imagem: ImagemSerie;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo: (anotacoes: Anotacoes | null) => void;
  /** Mostra "Analisar com IA" (chave do Gemini configurada no servidor). */
  iaDisponivel?: boolean;
}) {
  const [anot, setAnot] = useState<Anotacoes | null>(imagem.anotacoes);
  const [passado, setPassado] = useState<Anotacoes[]>([]);
  const [futuro, setFuturo] = useState<Anotacoes[]>([]);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("linha");
  const [cor, setCor] = useState<string>(CORES_ANOTACAO[0]);
  const [modoReta, setModoReta] = useState<ModoReta>("ima");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Forma | null>(null);
  const [pendenteCalib, setPendenteCalib] = useState<{ a: Ponto; b: Ponto } | null>(null);
  const [cmReal, setCmReal] = useState("");
  const [lupa, setLupa] = useState<Ponto | null>(null);
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const [palco, setPalco] = useState<{ w: number; h: number } | null>(null);
  const [palcoEl, setPalcoEl] = useState<HTMLDivElement | null>(null);
  const [sujo, setSujo] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [salvando, iniciarSalvar] = useTransition();
  const [analisando, setAnalisando] = useState(false);
  const [confirmarIa, setConfirmarIa] = useState(false);
  const [lembrarConsentimento, setLembrarConsentimento] = useState(false);
  const [avisoIa, setAvisoIa] = useState<AvisoIa | null>(null);
  /** Estado mais recente, lido quando a resposta da IA chega (o closure pode estar velho). */
  const anotRef = useRef(anot);
  useEffect(() => {
    anotRef.current = anot;
  }, [anot]);

  const svgRef = useRef<SVGSVGElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const toques = useRef(new Map<number, { x: number; y: number }>());
  const pinca = useRef<{ d0: number; z0: number; local: { x: number; y: number } } | null>(
    null,
  );

  const quadro: Quadro | null =
    anot && palco ? encaixar(anot.largura, anot.altura, palco.w, palco.h) : null;
  /** Unidades do viewBox por pixel de tela (para alças com tamanho fixo na tela). */
  const k = anot && quadro ? anot.largura / (quadro.w * vista.z) : 1;
  const formaSel = anot?.formas.find((f) => f.id === selecionada) ?? null;

  // Tamanho do palco (muda com rotação do celular/teclado virtual).
  useEffect(() => {
    if (!palcoEl) return;
    const ro = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setPalco({ w: width, h: height });
    });
    ro.observe(palcoEl);
    return () => ro.disconnect();
  }, [palcoEl]);

  // Roda do mouse = zoom no ponto do cursor (listener não passivo p/ evitar rolar a página).
  useEffect(() => {
    if (!palcoEl || !quadro) return;
    const q = quadro;
    function aoRolar(e: WheelEvent) {
      e.preventDefault();
      const r = palcoEl!.getBoundingClientRect();
      const fator = Math.exp(-e.deltaY * 0.0015);
      setVista((v) => zoomEm(v, v.z * fator, e.clientX - r.left, e.clientY - r.top, q));
    }
    palcoEl.addEventListener("wheel", aoRolar, { passive: false });
    return () => palcoEl.removeEventListener("wheel", aoRolar);
  });

  // Atalhos: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Delete.
  useEffect(() => {
    if (!open) return;
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      const tecla = e.key.toLowerCase();
      if (mod && tecla === "z") {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if (mod && tecla === "y") {
        e.preventDefault();
        refazer();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selecionada) {
        e.preventDefault();
        excluirSelecionada();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  function aoCarregar(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setAnot((atual) => atual ?? anotacoesVazias(w, h));
  }

  // ---------- histórico ----------

  function empilhar(estado: Anotacoes) {
    setPassado((p) => [...p.slice(-49), estado]);
    setFuturo([]);
  }

  function atualizar(proximo: Anotacoes) {
    if (anot) empilhar(anot);
    setAnot(proximo);
    setSujo(true);
  }

  function desfazer() {
    if (!anot || passado.length === 0) return;
    const anterior = passado[passado.length - 1];
    setPassado((p) => p.slice(0, -1));
    setFuturo((f) => [...f, anot]);
    setAnot(anterior);
    setSujo(true);
  }

  function refazer() {
    if (!anot || futuro.length === 0) return;
    const proximo = futuro[futuro.length - 1];
    setFuturo((f) => f.slice(0, -1));
    setPassado((p) => [...p, anot]);
    setAnot(proximo);
    setSujo(true);
  }

  function adicionar(forma: Forma) {
    if (!anot) return;
    atualizar({ ...anot, formas: [...anot.formas, forma] });
    setSelecionada(forma.id);
  }

  function apagarForma(id: string) {
    if (!anot) return;
    atualizar({ ...anot, formas: anot.formas.filter((f) => f.id !== id) });
    if (selecionada === id) setSelecionada(null);
  }

  function excluirSelecionada() {
    if (!anot || !selecionada) return;
    atualizar({ ...anot, formas: anot.formas.filter((f) => f.id !== selecionada) });
    setSelecionada(null);
  }

  function escolherCor(c: string) {
    setCor(c);
    if (anot && formaSel && formaSel.cor !== c) {
      atualizar({
        ...anot,
        formas: anot.formas.map((f) => (f.id === formaSel.id ? { ...f, cor: c } : f)),
      });
    }
  }

  // ---------- coordenadas ----------

  function ponto(e: React.PointerEvent): Ponto {
    const r = svgRef.current!.getBoundingClientRect();
    return limitarPonto({
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    });
  }

  /** Alinha na horizontal/vertical conforme o modo; Shift força reta. */
  function ajustar(e: React.PointerEvent, origem: Ponto | null, p: Ponto): Ponto {
    if (!anot || !origem) return p;
    const forcar = e.shiftKey || modoReta === "travar";
    if (!forcar && modoReta === "livre") return p;
    return limitarPonto(alinharReto(origem, p, anot.largura, anot.altura, forcar));
  }

  /** Lupa só para toque/caneta: o dedo cobre o ponto que está sendo posicionado. */
  function mostrarLupa(e: React.PointerEvent, p: Ponto) {
    if (e.pointerType !== "mouse") setLupa(p);
  }

  function trocarFerramenta(f: Ferramenta) {
    setFerramenta(f);
    setRascunho(null);
    setPendenteCalib(null);
    gesto.current = null;
  }

  /** Cancela o gesto em andamento (ex.: entrou o segundo dedo para dar zoom). */
  function cancelarGesto() {
    const g = gesto.current;
    gesto.current = null;
    setRascunho(null);
    setLupa(null);
    if (g && (g.tipo === "corpo" || g.tipo === "alca") && g.movido) {
      setAnot(g.antes);
      setPassado((p) => p.slice(0, -1));
    }
  }

  // ---------- pinça (dois dedos) — fase de captura, antes do SVG ----------

  function posPalco(e: React.PointerEvent) {
    const r = palcoEl!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function toqueInicio(e: React.PointerEvent) {
    if (e.pointerType !== "touch" || !palcoEl) return;
    toques.current.set(e.pointerId, posPalco(e));
    if (toques.current.size === 2 && quadro) {
      cancelarGesto();
      const [a, b] = [...toques.current.values()];
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pinca.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z0: vista.z,
        local: paraLocal(vista, meio.x, meio.y, quadro),
      };
    }
  }

  function toqueMove(e: React.PointerEvent) {
    if (!toques.current.has(e.pointerId) || !palcoEl) return;
    toques.current.set(e.pointerId, posPalco(e));
    const p = pinca.current;
    if (!p || toques.current.size < 2 || !quadro) return;
    const [a, b] = [...toques.current.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    setVista(ancorar(p.local, p.z0 * (d / p.d0), meio.x, meio.y, quadro));
  }

  function toqueFim(e: React.PointerEvent) {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
  }

  // ---------- desenho / arrasto ----------

  function iniciarArrasto(
    e: React.PointerEvent,
    id: string,
    modo: { tipo: "corpo" } | { tipo: "alca"; indice: number },
  ) {
    if (!anot || toques.current.size > 1) return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    setSelecionada(id);
    gesto.current =
      modo.tipo === "corpo"
        ? { tipo: "corpo", id, ultimo: ponto(e), antes: anot, movido: false }
        : { tipo: "alca", id, indice: modo.indice, antes: anot, movido: false };
  }

  function aoPressionar(e: React.PointerEvent) {
    if (!anot || toques.current.size > 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = ponto(e);

    if (ferramenta === "mover") {
      setSelecionada(null); // toque no fundo (as marcações param a propagação)
      if (vista.z > 1) gesto.current = { tipo: "pan", x: e.clientX, y: e.clientY, vista };
      return;
    }

    if (ferramenta === "borracha") {
      // Toque no fundo não apaga nada (as marcações param a propagação).
      if (vista.z > 1) gesto.current = { tipo: "pan", x: e.clientX, y: e.clientY, vista };
      return;
    }

    if (ferramenta === "texto") {
      adicionar({ id: novoId(), cor, tipo: "texto", pos: p, texto: "Texto" });
      return;
    }

    gesto.current = { tipo: "desenho", inicio: p };
    if (ferramenta === "livre") {
      setRascunho({ id: "rascunho", cor, tipo: "livre", pontos: [p, p] });
    }
    mostrarLupa(e, p);
  }

  function aoMover(e: React.PointerEvent) {
    if (!anot || toques.current.size > 1) return;
    const g = gesto.current;
    const p = ponto(e);

    if (!g) return;

    switch (g.tipo) {
      case "pan":
        if (quadro) {
          setVista(
            limitarVista(
              {
                z: g.vista.z,
                tx: g.vista.tx + e.clientX - g.x,
                ty: g.vista.ty + e.clientY - g.y,
              },
              quadro,
            ),
          );
        }
        return;

      case "alca": {
        const f = anot.formas.find((x) => x.id === g.id);
        if (!f) return;
        if (!g.movido) {
          empilhar(g.antes);
          g.movido = true;
        }
        const alvo = ajustar(e, pontoAncora(f, g.indice), p);
        setAnot((a) =>
          a && {
            ...a,
            formas: a.formas.map((x) => (x.id === g.id ? moverPonto(x, g.indice, alvo) : x)),
          },
        );
        setSujo(true);
        mostrarLupa(e, alvo);
        return;
      }

      case "corpo": {
        if (!g.movido) {
          empilhar(g.antes);
          g.movido = true;
        }
        const dx = p.x - g.ultimo.x;
        const dy = p.y - g.ultimo.y;
        g.ultimo = p;
        setAnot((a) =>
          a && {
            ...a,
            formas: a.formas.map((x) => (x.id === g.id ? transladar(x, dx, dy) : x)),
          },
        );
        setSujo(true);
        return;
      }

      case "desenho": {
        const a = g.inicio;
        switch (ferramenta) {
          case "linha":
          case "seta":
          case "medida":
          case "inclinacao":
          case "calibrar": {
            const b = ajustar(e, a, p);
            setRascunho(
              ferramenta === "calibrar"
                ? { id: "rascunho", cor: "#f59e0b", tipo: "linha", a, b }
                : { id: "rascunho", cor, tipo: ferramenta, a, b },
            );
            mostrarLupa(e, b);
            break;
          }
          case "circulo":
            setRascunho({ id: "rascunho", cor, tipo: "circulo", centro: a, borda: p });
            mostrarLupa(e, p);
            break;
          case "livre":
            setRascunho((r) =>
              r?.tipo === "livre" && r.pontos.length < 600
                ? { ...r, pontos: [...r.pontos, p] }
                : r,
            );
            mostrarLupa(e, p);
            break;
        }
      }
    }
  }

  function aoSoltar() {
    const g = gesto.current;
    gesto.current = null;
    setLupa(null);
    if (!g || g.tipo !== "desenho" || !anot) return;

    const r = rascunho;
    setRascunho(null);
    if (!r) return;

    if (r.tipo === "livre") {
      if (r.pontos.length > 3) adicionar({ ...r, id: novoId() });
      return;
    }
    // Ignora toques sem arrasto.
    const [a, b] =
      r.tipo === "circulo" ? [r.centro, r.borda] : "a" in r && "b" in r ? [r.a, r.b] : [];
    if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 0.01) return;

    if (ferramenta === "calibrar") {
      setPendenteCalib({ a, b });
      return;
    }
    adicionar({ ...r, id: novoId() });
  }

  // ---------- calibração, texto, salvar, fechar ----------

  function aplicarCalibracao() {
    const cm = Number(cmReal.replace(",", "."));
    if (!anot || !pendenteCalib || !(cm > 0)) {
      toast.error("Informe o comprimento real em centímetros.");
      return;
    }
    atualizar({ ...anot, calibracao: { ...pendenteCalib, cm } });
    setPendenteCalib(null);
    setCmReal("");
  }

  function editarTexto(id: string, texto: string) {
    setAnot((a) =>
      a && {
        ...a,
        formas: a.formas.map((f) =>
          f.id === id && f.tipo === "texto" ? { ...f, texto: texto.slice(0, 80) } : f,
        ),
      },
    );
    setSujo(true);
  }

  function finalizarTexto(id: string) {
    // Texto apagado por completo some (o schema não aceita texto vazio).
    setAnot((a) =>
      a && {
        ...a,
        formas: a.formas.filter((f) => !(f.id === id && f.tipo === "texto" && !f.texto.trim())),
      },
    );
  }

  function salvar() {
    if (!anot) return;
    const limpo: Anotacoes = {
      ...anot,
      formas: anot.formas.filter((f) => f.tipo !== "texto" || f.texto.trim()),
    };
    iniciarSalvar(async () => {
      const r = await salvarAnotacoesImagem(imagem.id, limpo);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Anotações salvas.");
      onSalvo(limpo.formas.length > 0 ? limpo : null);
      onOpenChange(false);
    });
  }

  // ---------- análise por IA ----------

  function pedirAnaliseIa() {
    if (consentimentoIaNaSessao) analisarComIa();
    else setConfirmarIa(true);
  }

  async function analisarComIa() {
    if (lembrarConsentimento) consentimentoIaNaSessao = true;
    setConfirmarIa(false);
    setAvisoIa(null);
    const corUsada = cor;
    setAnalisando(true);
    try {
      const r = await analisarPosturaImagem(imagem.id);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      const atual = anotRef.current;
      if (!atual) return;
      const { formas, ausentes } = respostaParaFormas(r.resultado, { ...atual, cor: corUsada });
      setAvisoIa({ vista: r.resultado.vista, ausentes });
      if (formas.length === 0) return;
      // Um único passo de histórico: Desfazer remove a análise inteira.
      empilhar(atual);
      setAnot({ ...atual, formas: substituirFormasIa(atual.formas, formas) });
      setSujo(true);
      setSelecionada(null);
      trocarFerramenta("mover");
    } catch {
      toast.error("Não foi possível analisar a imagem agora. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  function tentarFechar() {
    if (sujo) setConfirmarSaida(true);
    else onOpenChange(false);
  }

  function zoomBotao(fator: number) {
    if (!quadro || !palco) return;
    setVista((v) => zoomEm(v, v.z * fator, palco.w / 2, palco.h / 2, quadro));
  }

  // ---------- renderização ----------

  /** Marcações + pré-visualizações; reaproveitado na lupa. */
  function camadas(zoom: number) {
    if (!anot) return null;
    return (
      <>
        {anot.calibracao && (
          <FormaSvg
            forma={{ id: "calib", cor: "#f59e0b", tipo: "linha", ...anot.calibracao }}
            anotacoes={anot}
            zoom={zoom}
          />
        )}
        {anot.formas.map((f) => (
          <FormaSvg key={f.id} forma={f} anotacoes={anot} zoom={zoom} />
        ))}
        {pendenteCalib && (
          <FormaSvg
            forma={{ id: "pc", cor: "#f59e0b", tipo: "linha", ...pendenteCalib }}
            anotacoes={anot}
            zoom={zoom}
          />
        )}
        {rascunho && <FormaSvg forma={rascunho} anotacoes={anot} zoom={zoom} />}
      </>
    );
  }

  const desenhando = rascunho !== null;
  const lupaNaDireita =
    lupa && quadro && palco
      ? quadro.left + vista.tx + lupa.x * quadro.w * vista.z < palco.w / 2
      : false;

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && tentarFechar()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // Esc desfaz o passo em andamento antes de pensar em fechar.
          if (pendenteCalib || selecionada || confirmarSaida || confirmarIa) {
            e.preventDefault();
            setConfirmarIa(false);
            setPendenteCalib(null);
            setSelecionada(null);
            setConfirmarSaida(false);
          } else if (sujo) {
            e.preventDefault();
            setConfirmarSaida(true);
          }
        }}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[94vh] sm:max-h-[94vh] sm:w-[96vw] sm:max-w-6xl sm:rounded-xl"
      >
        {/* Cabeçalho: cancelar à esquerda, salvar à direita */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm sm:text-base">Anotar imagem</DialogTitle>
            <DialogDescription className="truncate text-xs">{imagem.rotulo}</DialogDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={tentarFechar}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={salvar} disabled={salvando || !anot || !sujo}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </div>

        {/* Palco: imagem com zoom/pan e camada de desenho */}
        <div
          ref={setPalcoEl}
          className="relative min-h-0 flex-1 touch-none overflow-hidden bg-neutral-900 select-none"
          onPointerDownCapture={toqueInicio}
          onPointerMoveCapture={toqueMove}
          onPointerUpCapture={toqueFim}
          onPointerCancelCapture={toqueFim}
          onContextMenu={(e) => e.preventDefault()}
        >
          {!anot && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagem.url} alt="" onLoad={aoCarregar} className="absolute opacity-0" />
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Carregando imagem…
              </p>
            </>
          )}

          {anot && quadro && (
            <div
              className="absolute"
              style={{
                left: quadro.left,
                top: quadro.top,
                width: quadro.w,
                height: quadro.h,
                transform: `translate(${vista.tx}px, ${vista.ty}px) scale(${vista.z})`,
                transformOrigin: "0 0",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagem.url}
                alt={imagem.rotulo}
                draggable={false}
                className="block size-full [-webkit-touch-callout:none]"
              />
              <svg
                ref={svgRef}
                viewBox={`0 0 ${anot.largura} ${anot.altura}`}
                preserveAspectRatio="none"
                className={`absolute inset-0 size-full ${
                  ferramenta === "mover"
                    ? vista.z > 1
                      ? "cursor-grab"
                      : "cursor-default"
                    : "cursor-crosshair"
                }`}
                onPointerDown={aoPressionar}
                onPointerMove={aoMover}
                onPointerUp={aoSoltar}
                onPointerCancel={cancelarGesto}
              >
                {camadas(vista.z)}

                {/* Áreas de toque largas para selecionar/arrastar marcações */}
                {ferramenta === "mover" &&
                  anot.formas.map((f) => (
                    <FormaHit
                      key={f.id}
                      forma={f}
                      anotacoes={anot}
                      zoom={vista.z}
                      espessura={28 * k}
                      onPointerDown={(e) => iniciarArrasto(e, f.id, { tipo: "corpo" })}
                    />
                  ))}

                {/* Borracha: toque numa marcação apaga só ela */}
                {ferramenta === "borracha" &&
                  anot.formas.map((f) => (
                    <FormaHit
                      key={f.id}
                      forma={f}
                      anotacoes={anot}
                      zoom={vista.z}
                      espessura={28 * k}
                      cursor="pointer"
                      rotulo="Apagar marcação"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        apagarForma(f.id);
                      }}
                    />
                  ))}

                {/* Alças da marcação selecionada (tamanho fixo na tela) */}
                {formaSel &&
                  !desenhando &&
                  ferramenta !== "borracha" &&
                  pontosDaForma(formaSel).map((pt, indice) => (
                    <g
                      key={`${formaSel.id}-${indice}`}
                      style={{ cursor: "grab" }}
                      onPointerDown={(e) =>
                        iniciarArrasto(e, formaSel.id, { tipo: "alca", indice })
                      }
                    >
                      <circle
                        cx={pt.x * anot.largura}
                        cy={pt.y * anot.altura}
                        r={22 * k}
                        fill="transparent"
                      />
                      <circle
                        cx={pt.x * anot.largura}
                        cy={pt.y * anot.altura}
                        r={8 * k}
                        fill="#fff"
                        stroke="#2563eb"
                        strokeWidth={3 * k}
                      />
                    </g>
                  ))}
              </svg>
            </div>
          )}

          {/* Lupa: mostra ampliado o ponto sob o dedo */}
          {lupa && anot && quadro && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-3 overflow-hidden rounded-full border-2 border-white bg-black shadow-xl ring-1 ring-black/50"
              style={{
                width: LUPA_TAM,
                height: LUPA_TAM,
                ...(lupaNaDireita ? { right: 12 } : { left: 12 }),
              }}
            >
              {(() => {
                const w = quadro.w * vista.z * LUPA_ZOOM;
                const h = quadro.h * vista.z * LUPA_ZOOM;
                return (
                  <div
                    className="absolute"
                    style={{
                      width: w,
                      height: h,
                      left: LUPA_TAM / 2 - lupa.x * w,
                      top: LUPA_TAM / 2 - lupa.y * h,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagem.url} alt="" className="block size-full" />
                    <svg
                      viewBox={`0 0 ${anot.largura} ${anot.altura}`}
                      preserveAspectRatio="none"
                      className="absolute inset-0 size-full"
                    >
                      {camadas(vista.z * LUPA_ZOOM)}
                    </svg>
                  </div>
                );
              })()}
              <svg viewBox="0 0 128 128" className="absolute inset-0 size-full">
                {[0, 1].map((c) => (
                  <g
                    key={c}
                    stroke={c === 0 ? "#000" : "#fff"}
                    strokeWidth={c === 0 ? 3 : 1.2}
                  >
                    <line x1={64} y1={50} x2={64} y2={58} />
                    <line x1={64} y1={70} x2={64} y2={78} />
                    <line x1={50} y1={64} x2={58} y2={64} />
                    <line x1={70} y1={64} x2={78} y2={64} />
                  </g>
                ))}
              </svg>
            </div>
          )}

          {/* Zoom */}
          <div className="absolute right-2 bottom-2 flex flex-col items-center gap-1 rounded-lg bg-background/90 p-1 shadow-lg ring-1 ring-foreground/10">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Aumentar zoom"
              title="Aumentar zoom (ou pinça com dois dedos / roda do mouse)"
              onClick={() => zoomBotao(1.5)}
            >
              <ZoomIn />
            </Button>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(vista.z * 100)}%
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Diminuir zoom"
              onClick={() => zoomBotao(1 / 1.5)}
            >
              <ZoomOut />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Ajustar à tela"
              onClick={() => setVista(VISTA_INICIAL)}
              disabled={vista.z === 1}
            >
              <Maximize2 />
            </Button>
          </div>
        </div>

        {/* Painel inferior */}
        <div className="flex flex-col gap-2 border-t bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {confirmarSaida ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-destructive/10 p-2">
              <p className="flex-1 text-sm">Descartar as alterações não salvas?</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmarSaida(false)}>
                Continuar editando
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => onOpenChange(false)}>
                Descartar
              </Button>
            </div>
          ) : confirmarIa ? (
            <div className="flex flex-col gap-2 rounded-lg bg-primary/5 p-2 ring-1 ring-primary/20">
              <p className="text-sm">
                A foto será enviada ao <strong>Google Gemini</strong> para análise. Use apenas com
                consentimento do paciente. As marcações geradas são estimativas para você revisar.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anot-ia-lembrar"
                    checked={lembrarConsentimento}
                    onCheckedChange={(v) => setLembrarConsentimento(v === true)}
                  />
                  <Label htmlFor="anot-ia-lembrar" className="text-xs font-normal">
                    Não mostrar de novo nesta sessão
                  </Label>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmarIa(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={analisarComIa}>
                    Enviar para análise
                  </Button>
                </div>
              </div>
            </div>
          ) : pendenteCalib ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/60 p-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="anot-cm">Comprimento real da linha (cm)</Label>
                <Input
                  id="anot-cm"
                  inputMode="decimal"
                  autoFocus
                  value={cmReal}
                  onChange={(e) => setCmReal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCalibracao()}
                  className="w-32"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => setPendenteCalib(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={aplicarCalibracao}>
                Aplicar
              </Button>
            </div>
          ) : formaSel?.tipo === "texto" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="anot-texto">Texto da anotação</Label>
              <Input
                key={formaSel.id}
                id="anot-texto"
                autoFocus
                maxLength={80}
                value={formaSel.texto}
                onFocus={(e) => {
                  e.currentTarget.select();
                  if (anot) empilhar(anot);
                }}
                onChange={(e) => editarTexto(formaSel.id, e.target.value)}
                onBlur={() => finalizarTexto(formaSel.id)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            </div>
          ) : avisoIa ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg bg-primary/5 p-2 text-sm ring-1 ring-primary/20"
            >
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                {avisoIa.vista === "nao_postural" ? (
                  <p>
                    A IA não identificou uma foto de avaliação postural (vista frontal, posterior
                    ou lateral).
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>{VISTA_LABEL[avisoIa.vista]} detectada</strong> — revise as
                      marcações geradas por IA antes de salvar.
                    </p>
                    {avisoIa.ausentes.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Não foi possível marcar: {avisoIa.ausentes.join(", ")}.
                      </p>
                    )}
                  </>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Fechar aviso da IA"
                onClick={() => setAvisoIa(null)}
              >
                <X />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                {dica(ferramenta)}
              </p>
              {ferramenta === "calibrar" && anot?.calibracao && (
                <>
                  <span className="text-xs font-medium">
                    Escala: {anot.calibracao.cm.toString().replace(".", ",")} cm
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => atualizar({ ...anot, calibracao: null })}
                  >
                    Remover calibração
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Ferramentas: grade (sem rolagem horizontal) */}
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10" role="group" aria-label="Ferramentas">
            {FERRAMENTAS.map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                type="button"
                aria-pressed={ferramenta === id}
                onClick={() => trocarFerramenta(id)}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors sm:h-11 ${
                  ferramenta === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <Icone className="size-5 sm:size-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Cor, alinhamento e ações */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div role="group" aria-label="Cor" className="flex gap-1.5">
              {CORES_ANOTACAO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={cor === c}
                  title={formaSel ? "Muda a cor da marcação selecionada" : undefined}
                  onClick={() => escolherCor(c)}
                  className={`size-8 rounded-full ring-2 ring-offset-2 ring-offset-background sm:size-7 ${
                    cor === c ? "ring-primary" : "ring-foreground/15"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div
              role="radiogroup"
              aria-label="Alinhamento das linhas"
              className="flex rounded-lg bg-muted/60 p-0.5"
            >
              {MODOS_RETA.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={modoReta === m.id}
                  title={m.titulo}
                  onClick={() => setModoReta(m.id)}
                  className={`h-8 rounded-md px-2.5 text-xs font-medium ${
                    modoReta === m.id ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-1">
              {iaDisponivel && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Analisar com IA"
                  title="Detecta a vista da foto e desenha ombros, pelve, tronco e coluna"
                  onClick={pedirAnaliseIa}
                  disabled={!anot || analisando || confirmarIa}
                  className="h-9"
                >
                  {analisando ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  <span className="sm:hidden">{analisando ? "…" : "IA"}</span>
                  <span className="hidden sm:inline">
                    {analisando ? "Analisando…" : "Analisar com IA"}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Desfazer"
                title="Desfazer (Ctrl+Z)"
                onClick={desfazer}
                disabled={passado.length === 0}
              >
                <Undo2 />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Refazer"
                title="Refazer (Ctrl+Shift+Z)"
                onClick={refazer}
                disabled={futuro.length === 0}
              >
                <Redo2 />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Excluir marcação selecionada"
                title="Excluir selecionada (Delete)"
                onClick={excluirSelecionada}
                disabled={!formaSel}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
