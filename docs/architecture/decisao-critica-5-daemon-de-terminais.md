# Decisão Crítica 5: Daemon de terminais + túnel de transcript ✅ (spike validado)

> Origem: visão do fundador (docs/prd/visao-do-fundador-cockpit-aiox.md, ponto 3)
> — "os terminais reais rodam fora do app; o Cockpit embeda essas sessões".

**Decisão:** evoluir o PTY Host para um **daemon standalone** (processo próprio,
fora da árvore do Electron) servindo sessões por **named pipe** (`\\.\pipe\...`),
com **túnel de transcript**: buffer por sessão no daemon + replay no attach.
O app (GUI) vira um CLIENTE que anexa/desanexa — fechar o Cockpit NÃO mata os
agentes; reabrir reconecta com histórico.

**🧪 Spike executado (2026-07-14, `apps/desktop/spike/daemon-spike.ts` + relatório JSON):**

| Critério eliminatório | Resultado |
|----------------------|-----------|
| (a) Daemon sobrevive ao exit do cliente (PTY vivo) | ✅ PASS |
| (b) Reattach de OUTRO processo: replay de transcript + stream vivo | ✅ PASS |
| (c) Latência de echo através do pipe | ✅ 63ms (orçamento 500ms) |
| (d) Shutdown do daemon sem órfãos | ✅ 0 órfãos |

**Implicações de design (épico futuro — pós E3):**
1. O AdapterRegistry e os adapters (E2) MIGRAM para o daemon — o contrato não muda (NFR7 protege exatamente isso).
2. O canal binário MessagePort renderer↔host é substituído por pipe framing no trecho daemon↔app; o renderer não percebe (mesma MessagePort entregue pelo Main, que vira proxy do pipe).
3. Persistência (E4/1.4): scrollback já é arquivo — o transcript do daemon O REUSA; o SQLite continua no Main (estado estrutural) com o daemon reportando eventos.
4. Ciclo de vida: daemon com lease/heartbeat + `cockpit-daemon --stop`; upgrade do app não derruba sessões (rolling attach).
5. Segurança: pipe com ACL do usuário atual (named pipes herdam DACL — validar na story de produtização).

**Rejeitada:** TCP localhost (superfície de rede desnecessária; pipe tem ACL nativa).

**🔒 Segurança do pipe (Story 6.4):** o node/libuv cria o named pipe com o
security descriptor default do token do processo — GENERIC_ALL para o usuário
criador, Administrators e SYSTEM; **Everyone NÃO recebe GENERIC_WRITE**, e uma
conexão duplex exige read+write ⇒ outros usuários não-admin não conseguem
conectar. Defesa em profundidade: handshake `hello` versionado é obrigatório
antes de qualquer comando (conexões sem hello válido são encerradas — 6.1).
Hardening adicional (SDDL explícito por CreateNamedPipe) exigiria native addon
— registrado como debt consciente. Validação manual: sessão de outro usuário
Windows não deve conseguir `connect` no pipe.

**Roadmap:** E3 (sessão master) pode iniciar sobre o host atual; a migração
para daemon é um épico próprio (E-daemon) planejado antes do E4 pleno.
