import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Cpu,
  Eye,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Globe,
  GraduationCap,
  Hourglass,
  KeyRound,
  Link2,
  List,
  Lock,
  Maximize2,
  Minus,
  Palette,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  SendHorizontal,
  Settings,
  Shield,
  ShieldCheck,
  SquarePen,
  SquareTerminal,
  Terminal,
  TriangleAlert,
  User,
  Wrench,
  X,
  type LucideIcon
} from 'lucide-react';

/**
 * Sistema de ícones (pedido do fundador: "remove os emojis onde tem para
 * abrir um browser e um terminal e coloque ícones em tudo para ficar mais
 * profissional e elegante") — camada ÚNICA sobre o `lucide-react`, para que
 * nenhum componente importe o pacote direto e cada um escolha seu próprio
 * tamanho/espessura. Emoji tem duas falhas fatais numa UI de cockpit: o
 * desenho muda por SO/fonte (o mesmo botão vira outra coisa em outra máquina)
 * e ele NÃO herda a cor do tema vivo (15.2) — o ícone SVG herda via
 * `currentColor`, então acompanha preset/destaque sem nenhum mapa de cor.
 *
 * Regras aplicadas AQUI (não repetidas em cada uso):
 * - `strokeWidth` uniforme — desenhos de espessuras diferentes na mesma faixa
 *   leem como ícones de bibliotecas diferentes;
 * - `color: currentColor` — herda o tema/estado do elemento que o contém;
 * - acessibilidade: com `label`, vira `role="img"` nomeado; sem `label`, é
 *   `aria-hidden` (decorativo ao lado de texto que já diz a mesma coisa).
 *   Botão SÓ com ícone é mudo para leitor de tela sem isso.
 */

/** Escala de tamanho (px) — casada com `theme.font.size` para alinhar à linha de texto. */
export const ICON_SIZE = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20 } as const;

/** Espessura única de todo o sistema — Lucide desenha em 24px/2, 1.75 pesa certo em 13-16px. */
export const ICON_STROKE = 1.75;

export interface IconProps {
  /** Componente Lucide (ex.: `Icons.terminal`). */
  glyph: LucideIcon;
  /** Tamanho em px — prefira os tokens de `ICON_SIZE`. */
  size?: number;
  /**
   * Nome acessível. Obrigatório na prática quando o ícone é o ÚNICO conteúdo
   * de um botão; omitido quando há texto visível ao lado (evita leitura dupla).
   */
  label?: string;
  /** Cor explícita — por padrão herda do container (`currentColor`). */
  color?: string;
  style?: React.CSSProperties;
}

export function Icon({ glyph: Glyph, size = ICON_SIZE.md, label, color, style }: IconProps): JSX.Element {
  return (
    <Glyph
      size={size}
      strokeWidth={ICON_STROKE}
      color={color ?? 'currentColor'}
      // `flexShrink: 0` porque quase todo uso vive num flex ao lado de texto
      // que pode truncar — o ícone nunca deve ser o que encolhe.
      style={{ flexShrink: 0, display: 'block', ...style }}
      {...(label !== undefined ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
    />
  );
}

/**
 * Vocabulário nomeado por INTENÇÃO, não pelo desenho — trocar o ícone de
 * "novo terminal" depois é um pontinho aqui, não uma varredura no app.
 */
export const Icons = {
  terminal: Terminal,
  terminalNew: SquareTerminal,
  browser: Globe,
  add: Plus,
  remove: Minus,
  close: X,
  rename: Pencil,
  folder: Folder,
  folderOpen: FolderOpen,
  file: FileText,
  fileMarkdown: FileCode,
  timeline: Activity,
  list: List,
  learnings: GraduationCap,
  agents: Bot,
  settings: Settings,
  tools: Wrench,
  privacy: ShieldCheck,
  shield: Shield,
  lock: Lock,
  key: KeyRound,
  appearance: Palette,
  panelLeft: PanelLeft,
  panelRight: PanelRight,
  panelBottom: PanelBottom,
  zoomReset: Scan,
  maximize: Maximize2,
  back: ArrowLeft,
  forward: ArrowRight,
  reload: RotateCw,
  reset: RotateCcw,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  approve: Check,
  reject: Ban,
  threeBrain: Brain,
  link: Link2,
  send: SendHorizontal,
  goTo: ArrowRight,
  external: ArrowUpRight,
  warning: TriangleAlert,
  waiting: Hourglass,
  note: SquarePen,
  writer: PenLine,
  reviewer: Eye,
  branch: GitBranch,
  status: CircleDot,
  originSystem: Cpu,
  originAgent: Bot,
  originHuman: User
} as const;

export type { LucideIcon };
