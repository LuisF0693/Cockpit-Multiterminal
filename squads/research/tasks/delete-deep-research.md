# Delete Deep Research Squad

**Task ID:** `dr-delete-squad`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0
**Last Updated:** 2026-03-06

## Contrato SINKRA

Domain: `Tactical`
task: deleteDeepResearch()
responsavel: dr-orchestrator
responsavel_type: Agent
atomic_layer: Atom
Inputs: ver seções `Input` e `Task Anatomy`
Outputs: ver seção `Output`
Pre-conditions: pedido explícito de remoção e impacto analisado
Post-conditions: dependências documentadas e decisão de remoção preparada com segurança
Performance: falhar alto, não remover sem mapear impactos
Error Handling: "on_fail: HALT task, preserve dependency audit, log blocker"
Completion Criteria: ver checklist `Acceptance Criteria` abaixo

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Delete Deep Research Squad |
| **status** | `pending` |
| **responsible_executor** | dr-orchestrator |
| **execution_type** | `Agent` |
| **input** | Deletion confirmation from user |
| **output** | Deletion report with archive status |
| **action_items** | 4 steps |
| **acceptance_criteria** | 5 criteria |

## Overview
Lifecycle task for safely removing the Deep Research squad from the AIOX workspace. This is a destructive operation that requires explicit user confirmation. Before deletion, the task inventories all squad artifacts, checks for dependencies from other squads or systems, optionally archives the squad for future restoration, and then removes all files. The workspace registry is updated to reflect the squad's removal.

## Input
- **confirmation** (object) - Contains `confirmed` (boolean, must be true to proceed), `archive_before_delete` (boolean, whether to create a backup archive), `reason` (string, why the squad is being deleted)

## Output
- **deletion_report** (object) - Contains `files_removed` (array of deleted file paths), `files_archived` (array of archived file paths, if archiving was requested), `registry_updated` (boolean), `dependencies_cleared` (array of external references that were resolved), `deletion_timestamp` (ISO datetime)

## Action Items
### Step 1: Confirm Deletion Intent
Verify that the confirmation object has `confirmed: true`. If not, abort immediately and return a message indicating that explicit confirmation is required. Log the stated reason for deletion. This is a safeguard against accidental squad removal.

### Step 2: Inventory and Check Dependencies
List all absorbed deep-research files within the `squads/research/` directory tree. Check for external dependencies: other squad configurations that reference deep-research capabilities, shared task files, cross-squad pipeline integrations, and any active research sessions. Report all found dependencies and warn that deletion will break them.

### Step 3: Archive If Requested
If `archive_before_delete` is true, create a compressed archive of the absorbed deep-research slice under `squads/research/`. Store the archive in a designated backup location (e.g., `.aiox/archives/deep-research-{timestamp}.tar.gz`). Verify archive integrity by checking that the file count matches the inventory.

### Step 4: Remove Files and Update Registry
Delete all absorbed deep-research files and directories under `squads/research/` that are explicitly marked for removal. Update any workspace-level registry files (e.g., `squads/registry.yaml` or equivalent) to remove obsolete deep-research references. Verify that no orphaned references remain in workspace configuration files.

## Acceptance Criteria
- [ ] Deletion only proceeds when confirmation.confirmed is explicitly true
- [ ] All squad files are inventoried before any deletion occurs
- [ ] Dependencies from other squads are identified and reported before deletion
- [ ] Archive is created and verified when archive_before_delete is true
- [ ] Workspace registry is updated to remove obsolete deep-research references

---
_Task Version: 1.0_
_Pattern: HO-TP-001_

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "dr-orchestrator"
  consulted: [research-chief]
  informed: [research-operator]
