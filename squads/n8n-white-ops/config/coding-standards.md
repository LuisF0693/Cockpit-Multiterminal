# n8n-ops Squad - Coding Standards

## Padronização de Nomenclatura

### Estrutura Padrão
`[TIPO][SISTEMA_ORIGEM][SISTEMA_DESTINO] - Ação Específica`

### Prefixos por Tipo de Gatilho

> **Fonte canônica:** `config/instance.yaml` → `type_prefixes`

Exemplo de uso: `[WH][SISTEMA_ORIGEM][SISTEMA_DESTINO] - Ação Específica`

### Sistemas Comuns (abreviações)

> **Fonte canônica:** `config/instance.yaml` → `systems`
>
> Adicionar novos sistemas editando `instance.yaml`, não este arquivo.

### Exemplos de Nomenclatura Correta
- `[WH][HOTMART][SUPABASE] - Processar Vendas`
- `[SCH][ANALYTICS][NOTION] - Relatório Diário`
- `[MANUAL][CLICKUP][EMAIL] - Enviar Notificação`
- `[WB][PAGTRUST][DL] - Guardar Transações Raw`
- `[ERRO][SISTEMA][SLACK] - Notificação de Falhas em Workflows`
- `[WKL][WB][CIRCLE] - Adicionar Acesso a Comunidade`
- `[ACTIVE][COMUNICACAO][WHATSAPP] - Envia comunicado D5 do onboarding`

### Exemplos de Nomenclatura INCORRETA
- `My workflow 3` - sem prefixo, sem descrição
- `teste wb arsenal1` - sem padrão de brackets
- `Fluxo buxa` - nome sem sentido
- `arsneal hub` - typo, sem prefixo

### Nome dos Nodes
- Usar nomes descritivos em snake_case ou camelCase
- NUNCA deixar nomes default: "Set", "IF", "HTTP Request"
- Exemplos bons: `puxa_fluxo`, `extrai_tags`, `roteia`, `notifica_slack`
- Exemplos ruins: "Set1", "IF2", "My workflow 3"

### Tags Obrigatórias
Cada workflow DEVE ter no mínimo:
1. **Owner**: Uma das tags listadas em `config/instance.yaml` → `owners`
2. **Criticidade**: Uma das tags de `config/instance.yaml` → `criticality_tags`
3. **Tipo**: Webhook, Schedule, Manual, WKL, etc.

## Padrão de Sticky Notes

```markdown
## nome_do_node
Tipo: OPERAÇÃO
- Descrição funcional do que o node faz
```

### Cores por Categoria
| Categoria | Color ID | Cor Visual |
|-----------|----------|------------|
| Trigger | 2 | Verde |
| Action | 4 | Azul |
| Logic | 6 | Amarelo |
| Transform | 3 | Roxo |
| Utility | 1 | Cinza |

## Output de Agents
- Relatórios em Markdown
- Sticky notes em JSON clipboard-ready
- Sempre incluir timestamp e workflow ID
