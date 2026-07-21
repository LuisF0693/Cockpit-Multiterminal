# n8n-white-ops Squad - Source Tree

```
n8n-white-ops/
├── squad.yaml                     # Manifest do squad
├── README.md                      # Documentação e quick start
├── config/
│   ├── instance.yaml              # Whitelabel: owners, sistemas, prefixos, integrações
│   ├── coding-standards.md        # Padrões de nomenclatura e documentação
│   ├── tech-stack.md              # Stack técnica, API endpoints e gotchas
│   └── source-tree.md             # Este arquivo
├── agents/
│   ├── n8n-chief.md               # Tier 0: Orchestrator
│   ├── n8n-builder.md             # Tier 1: Construtor de workflows
│   ├── n8n-documenter.md          # Tier 1: Gerador de sticky notes
│   ├── n8n-auditor.md             # Tier 1: Auditor de saúde
│   ├── n8n-security.md            # Tier 1: Análise de segurança
│   ├── n8n-ideator.md             # Tier 1: Sugestões e melhorias
│   └── n8n-compliance.md          # Tier 1: Conformidade de nomenclatura
├── tasks/
│   ├── build-workflow.md          # Cria ou edita workflows via API
│   ├── document-workflow.md       # Gera sticky notes JSON
│   ├── audit-workflow.md          # Audita saúde do workflow
│   ├── security-scan.md           # Scan de segurança
│   ├── suggest-improvements.md    # Sugere melhorias
│   ├── check-compliance.md        # Verifica conformidade
│   ├── batch-document.md          # Documentação em lote
│   └── inventory-report.md        # Relatório de inventário
├── data/
│   ├── n8n-node-types-reference.json  # Referência de tipos de nodes
│   └── n8n-api.yaml                   # OpenAPI spec v1.1.1 da API n8n
├── workflows/
├── checklists/
├── templates/
└── scripts/
```
