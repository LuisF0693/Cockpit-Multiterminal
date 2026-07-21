'use strict'
/**
 * validate-lucide-icons.cjs — validates lucide-react icon names in .tsx files
 * Story: STORY-119.33
 */

const fs = require('fs'), path = require('path')

// Known lucide-react icons (subset — extended from package when available)
const KNOWN_ICONS = new Set([
  'Activity','AlertCircle','AlertTriangle','Archive','ArrowDown','ArrowLeft','ArrowRight',
  'ArrowUp','ArrowUpDown','Badge','Bell','BellOff','Bolt','Book','BookOpen','Bookmark',
  'Bot','Box','Calendar','CalendarDays','Check','CheckCircle','CheckSquare','ChevronDown',
  'ChevronLeft','ChevronRight','ChevronUp','Circle','CircleAlert','CircleCheck','Clock',
  'Code','Code2','Command','Copy','CornerDownLeft','CreditCard','Crown','Database',
  'Download','Edit','Edit2','Edit3','ExternalLink','Eye','EyeOff','File','FileCode',
  'FileText','Filter','Flag','Folder','FolderOpen','Gauge','Globe','Grid','Hash',
  'Heart','Help','HelpCircle','Home','Image','Info','Inbox','Key','Layers','Layout',
  'Link','Link2','List','Loader','Lock','LockOpen','LogIn','LogOut','Mail','Map',
  'MapPin','Maximize','Menu','MessageSquare','MessageCircle','Mic','Minus','Monitor',
  'Moon','MoreHorizontal','MoreVertical','Move','Music','Package','Pencil','Phone',
  'Play','Plus','PlusCircle','Power','Refresh','RefreshCw','RotateCcw','RotateCw',
  'Save','Search','Send','Settings','Settings2','Shield','ShieldCheck','ShoppingCart',
  'Sliders','Star','Sun','Tag','Terminal','Trash','Trash2','TrendingDown','TrendingUp',
  'Upload','User','UserCheck','UserPlus','Users','Video','Volume2','VolumeX','Wand2',
  'Wifi','X','XCircle','Zap','ZapOff',
])

function run(filePath) {
  const start = Date.now()
  if (!fs.existsSync(filePath)) {
    return { file: filePath, checks: [{ check: 'file-exists', pass: false, error: 'File not found' }], pass_all: false }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  // Find lucide-react imports: import { IconA, IconB } from 'lucide-react'
  const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)
  const checks = []

  if (!importMatch) {
    checks.push({ check: 'lucide-imports', pass: true, note: 'No lucide-react imports' })
  } else {
    for (const imp of importMatch) {
      const names = imp.match(/\{([^}]+)\}/)?.[1]?.split(',').map(n => n.trim()).filter(Boolean) ?? []
      for (const name of names) {
        const valid = KNOWN_ICONS.has(name)
        checks.push({ check: `icon:${name}`, pass: valid, error: valid ? undefined : `Unknown lucide icon: ${name}` })
      }
    }
  }

  const pass_all = checks.every(c => c.pass)
  const elapsed = Date.now() - start
  return { file: filePath, checks, pass_all, elapsed_ms: elapsed }
}

if (require.main === module) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node validate-lucide-icons.cjs <file.tsx>'); process.exit(1) }
  const result = run(file)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass_all ? 0 : 1)
}

module.exports = { run }
