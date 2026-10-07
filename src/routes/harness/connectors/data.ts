import {
  Cloud,
  CreditCard,
  FileCheck,
  FileStack,
  FolderOpen,
  HardDrive,
  Mail,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  Webhook,
  Server,
  type LucideIcon,
} from 'lucide-react'
import type { Tone } from '@/components/ui/Badge'

/**
 * Fixtures for the Connectors screen.
 *
 * The six connectors are the ones the intent composer's plug menu lists
 * (`autonomous/intent/capabilities.ts`), with the same icons and tones. The
 * two lists are not linked: switching one off here does not change the menu.
 *
 * Nothing connects. Tests, sign-ins and tool discovery are simulated with a
 * delay, and anything added lasts for the session.
 */

export type ConnectorKind = 'api' | 'mcp'
export type ConnectorStatus = 'connected' | 'error' | 'unconfigured'
export type AuthMethod = 'API key' | 'OAuth' | 'Bearer token' | 'None'

export const KIND_LABEL: Record<ConnectorKind, string> = { api: 'API', mcp: 'MCP' }

export const STATUS: Record<ConnectorStatus, { label: string; tone: Tone }> = {
  connected: { label: 'Connected', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
  unconfigured: { label: 'Not set up', tone: 'neutral' },
}

/** Auth each kind accepts on a custom connector. */
export const AUTH_FOR: Record<ConnectorKind, AuthMethod[]> = {
  api: ['API key', 'OAuth', 'None'],
  mcp: ['None', 'Bearer token', 'OAuth'],
}

export type Tool = { name: string; description: string; enabled: boolean }

export type Connector = {
  id: string
  label: string
  icon: LucideIcon
  tone: Tone
  kind: ConnectorKind
  status: ConnectorStatus
  /** Base URL for an API, server URL for MCP. */
  url: string
  auth: AuthMethod
  /** Who an OAuth connection is signed in as. */
  account?: string
  /** Masked. A secret is never rendered back. */
  secret?: string
  lastCheck: string
  /** Why it is failing. */
  error?: string
  /** What an MCP server exposes. */
  tools?: Tool[]
}

const masked = (tail: string) => '•'.repeat(20) + tail

const tools = (list: [string, string][], off: string[] = []): Tool[] =>
  list.map(([name, description]) => ({ name, description, enabled: !off.includes(name) }))

export const CONNECTORS: Connector[] = [
  {
    id: 'policy-admin',
    label: 'Policy admin',
    icon: FileStack,
    tone: 'brand',
    kind: 'mcp',
    status: 'connected',
    url: 'https://policy-admin.eicore.internal/mcp',
    auth: 'OAuth',
    account: 'uw-agents@eicore.in',
    lastCheck: '4 min ago',
    tools: tools(
      [
        ['get_policy', 'Read a policy by number'],
        ['search_policies', 'Find policies by holder, plan or status'],
        ['create_endorsement', 'Raise a mid-term change on a policy'],
        ['issue_policy', 'Issue a policy from an accepted quote'],
      ],
      ['issue_policy'],
    ),
  },
  {
    id: 'claims',
    label: 'Claims system',
    icon: ReceiptText,
    tone: 'info',
    kind: 'mcp',
    status: 'connected',
    url: 'https://claims.eicore.internal/mcp',
    auth: 'Bearer token',
    secret: masked('9c1e'),
    lastCheck: '12 min ago',
    tools: tools([
      ['get_claim', 'Read a claim and its documents'],
      ['list_open_claims', 'List claims waiting on a decision'],
      ['update_claim_status', 'Settle, reject or hold a claim'],
    ]),
  },
  {
    id: 'documents',
    label: 'Document store',
    icon: FolderOpen,
    tone: 'warning',
    kind: 'mcp',
    status: 'error',
    url: 'https://docs.eicore.internal/mcp',
    auth: 'OAuth',
    account: 'uw-agents@eicore.in',
    lastCheck: '2 h ago',
    error: 'The sign-in expired 2 hours ago. Sign in again to restore access.',
    tools: tools([
      ['fetch_document', 'Read a document by id'],
      ['search_documents', 'Find documents on a case'],
      ['upload_document', 'Attach a document to a case'],
    ]),
  },
  {
    id: 'email',
    label: 'Email inbox',
    icon: Mail,
    tone: 'success',
    kind: 'api',
    status: 'connected',
    url: 'https://graph.microsoft.com/v1.0',
    auth: 'OAuth',
    account: 'uw-desk@eicore.in',
    lastCheck: '1 min ago',
  },
  {
    id: 'ckyc',
    label: 'CKYC',
    icon: UserCheck,
    tone: 'alert',
    kind: 'api',
    status: 'connected',
    url: 'https://api.ckycindia.in/v2',
    auth: 'API key',
    secret: masked('41af'),
    lastCheck: '6 min ago',
  },
  {
    id: 'surepass',
    label: 'Surepass',
    icon: ShieldCheck,
    tone: 'neutral',
    kind: 'api',
    status: 'unconfigured',
    url: 'https://kyc-api.surepass.io/api/v1',
    auth: 'API key',
    lastCheck: 'Never',
  },
]

/** A prebuilt connector: the URL and auth are known, so adding one is a
 *  sign-in or a key. */
export type CatalogItem = {
  id: string
  label: string
  icon: LucideIcon
  tone: Tone
  kind: ConnectorKind
  url: string
  auth: AuthMethod
  /** What an MCP server turns out to expose once connected. */
  tools?: [string, string][]
}

export const CATALOG: CatalogItem[] = [
  { id: 'salesforce', label: 'Salesforce', icon: Cloud, tone: 'info', kind: 'api', url: 'https://login.salesforce.com/services/data/v61.0', auth: 'OAuth' },
  { id: 'gmail', label: 'Gmail', icon: Mail, tone: 'danger', kind: 'api', url: 'https://gmail.googleapis.com/gmail/v1', auth: 'OAuth' },
  { id: 'outlook', label: 'Outlook', icon: Mail, tone: 'info', kind: 'api', url: 'https://graph.microsoft.com/v1.0', auth: 'OAuth' },
  {
    id: 'google-drive',
    label: 'Google Drive',
    icon: HardDrive,
    tone: 'success',
    kind: 'mcp',
    url: 'https://drive.mcp.google.com/mcp',
    auth: 'OAuth',
    tools: [
      ['search_files', 'Find files by name or content'],
      ['read_file', 'Read a file'],
      ['list_folder', 'List what a folder holds'],
    ],
  },
  {
    id: 'sharepoint',
    label: 'SharePoint',
    icon: FolderOpen,
    tone: 'brand',
    kind: 'mcp',
    url: 'https://sharepoint.mcp.microsoft.com/mcp',
    auth: 'OAuth',
    tools: [
      ['search_sites', 'Find sites and libraries'],
      ['read_document', 'Read a document'],
      ['list_library', 'List a document library'],
    ],
  },
  { id: 'digilocker', label: 'DigiLocker', icon: FileCheck, tone: 'brand', kind: 'api', url: 'https://api.digitallocker.gov.in/public/oauth2/1', auth: 'OAuth' },
  {
    id: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    tone: 'alert',
    kind: 'mcp',
    url: 'https://mcp.slack.com/mcp',
    auth: 'OAuth',
    tools: [
      ['post_message', 'Post a message to a channel'],
      ['search_messages', 'Search messages'],
      ['list_channels', 'List channels'],
    ],
  },
  { id: 'razorpay', label: 'Razorpay', icon: CreditCard, tone: 'info', kind: 'api', url: 'https://api.razorpay.com/v1', auth: 'API key' },
]

/** The two catalog entries for anything not in it. */
export const CUSTOM: Record<ConnectorKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  api: { label: 'Custom API', icon: Webhook, tone: 'neutral' },
  mcp: { label: 'Custom MCP server', icon: Server, tone: 'neutral' },
}

/** What a custom MCP server is found to expose. */
const CUSTOM_TOOLS: [string, string][] = [
  ['list_resources', 'List the resources the server holds'],
  ['read_resource', 'Read a resource'],
  ['search', 'Search the server'],
]

export type TestResult = { ok: true; detail: string; tools?: Tool[] } | { ok: false; reason: string }

export const TEST_MS = 900

/**
 * The simulated connection test. It fails only on what can be checked
 * without a network: a URL that is not https.
 */
export function testConnection(kind: ConnectorKind, url: string, found?: [string, string][]): TestResult {
  const u = url.trim()
  if (!/^https:\/\/[^\s/]+\.[^\s]+/.test(u)) {
    return { ok: false, reason: 'The URL must start with https:// and include a host.' }
  }
  if (kind === 'api') return { ok: true, detail: `Reached ${new URL(u).host} in 184 ms` }
  const list = found ?? CUSTOM_TOOLS
  return {
    ok: true,
    detail: `Server answered with ${list.length} tools`,
    tools: tools(list),
  }
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
