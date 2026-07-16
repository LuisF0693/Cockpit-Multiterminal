# Epic 15 — Painéis Redimensionáveis & Configurações OmniRift

Iteração pós-validação do Épico 14 (feedback direto do fundador, 2026-07-16,
com 4 capturas da janela de Configurações do OmniRift como referência):
painéis com resize por arraste, mais alcance de zoom out, e uma janela de
Configurações em overlay com Aparência de TEMA VIVO e Central de API.

> **Formalização 2026-07-16 (@pm):** FR52-56. Triagem via `AskUserQuestion`
> (3 decisões do fundador): (1) **tema vivo completo** — CSS variables com
> preview imediato; (2) **Central de API já** — chave no keychain do SO
> (safeStorage), mesmo sem adapter consumidor ainda; (3) **i18n depois** —
> seletor mostra Português fixo, English "em breve".
>
> **Só dados reais (regra do Épico 14 mantida):** seções da referência sem
> lastro (Conta, Feature flags, Memória & Conexões, Dispositivos móveis)
> ficam FORA da janela de Configurações.

### Story 15.1 — Painéis redimensionáveis + zoom out maior

1. Alça de arraste na borda dos 3 painéis: sidebar (200-400px), telemetria (200-400px), preview (380-800px) — mesmo padrão de drag já usado nos tiles (FR52).
2. Larguras persistem nas settings (FR46) com defaults atuais (240/230/520).
3. Zoom mínimo do canvas vira 0.15 (pill do header e wheel) (FR53).

### Story 15.2 — Runtime de tema vivo (CSS variables)

1. Tokens de `theme.ts` viram CSS variables (`--ck-*`) injetadas no `:root` a partir de um REGISTRO de temas; o objeto `theme` mantém a MESMA forma (nenhum componente muda a leitura), com valores `var(--ck-*)` (FR55).
2. Temas prontos: Multerminal Escuro (default, valores atuais), Multerminal Claro, Meia-noite; cor de destaque selecionável (7 opções da referência); fontes texto/mono selecionáveis entre opções seguras do sistema.
3. Concatenações de alpha (`${theme.x}55`) migram pra tokens com alpha ou `color-mix()` — nada quebra com var().
4. xterm re-tematiza AO VIVO (xterm exige valores resolvidos, não var()): os dados crus do tema ativo ficam acessíveis e o TerminalView aplica `terminal.options.theme` na troca.
5. Persistência nas settings (FR46); reset ao padrão.

### Story 15.3 — Janela de Configurações OmniRift

1. Overlay modal (como a referência) com nav lateral: Geral, Privacidade, Aparência; substitui a view `settings` atual (FR54).
2. Geral: IDIOMA (Português ativo, English desabilitado "em breve") + preferências existentes do FR46 (modelo Ollama, intervalo do preview, zoom padrão) + atalho pra Aparência.
3. Privacidade: texto REAL dos compromissos do produto (NFR1 local-first, NFR6 credenciais nos CLIs, zero telemetria).
4. Aparência: MODO (escuro/claro), TEMAS PRONTOS, COR DE DESTAQUE, FONTE (TEXTO)/(MONO), TODAS AS CORES (lista token+hex do tema ativo) — preview ao vivo, salvo automático, reset (15.2 por baixo).

### Story 15.5 — Toolbar de ícones + canvas maior (colapsáveis)

1. Barra de 38px abaixo do header (estilo referência) com ícones de AÇÕES REAIS: novo terminal, novo browser, master, tarefas, board, timeline, learnings, agentes, zoom reset, configurações — tooltips em todos; NENHUM ícone morto (FR57).
2. Rodapé de sessões colapsável (vira uma linha fina com contagem); sidebar e telemetria colapsáveis (botão «/»), lembrando o estado nas settings — canvas ganha a tela quase inteira quando tudo colapsado (FR58).

### Story 15.6 — Sidebar com identidade visual da referência

1. NOVO AGENTE: ícone COLORIDO por adapter (glifo distinto na cor de identidade 12.4, como a referência) + nome + descrição (FR58).
2. PROJETOS: quadrado colorido maior + nome, item ativo com fundo `raised` ocupando a linha inteira (como a referência); ARQUIVOS com ícones de pasta/arquivo coloridos (FR58).

### Story 15.4 — Central de API (chaves no keychain do SO)

1. Seção "Central de API" na janela de Configurações: CHAVES CADASTRADAS (lista com tipo/apelido/base URL/modelo — a chave NUNCA é reexibida) + CADASTRAR PROVIDER (tipo, apelido, base URL, API key, modelo default) (FR56).
2. Chave criptografada com `safeStorage` do Electron (keychain/DPAPI do SO) — o ciphertext vai pro app_meta; sem safeStorage disponível, cadastro é RECUSADO com aviso (nunca texto plano).
3. Remover cadastro apaga o ciphertext; nenhum canal expõe a chave decriptada ao renderer (só o Main decripta, quando um consumidor futuro existir).
4. Documentado: nenhum adapter consome ainda (decisão consciente do fundador — preparação).
