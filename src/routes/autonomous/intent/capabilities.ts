import {
  ClipboardCheck,
  Contact,
  FilePen,
  FileSignature,
  FileStack,
  FolderOpen,
  Handshake,
  Mail,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ConnectorItem } from '@/components/workspace/ConnectorsMenu'
import { TAT_MATCH, TAT_PROMPT, TAT_REPLY } from '../queue/chat'

/** The eight capabilities on the intent screen, as approved. A card puts its
 *  `prompt` in the box. */
export type Capability = { id: string; name: string; line: string; prompt: string; icon: LucideIcon }

export const CAPABILITIES: Capability[] = [
  { id: 'underwrite', name: 'Underwrite cases', line: 'Review and decide proposals waiting in the queue', prompt: TAT_PROMPT, icon: ClipboardCheck },
  { id: 'claims', name: 'Resolve claims', line: 'Check, settle or reject open claims', prompt: 'Which claims are waiting on documents?', icon: ReceiptText },
  { id: 'issue', name: 'Issue policies', line: 'Turn accepted quotes into policies', prompt: 'Issue policies for the accepted quotes', icon: FileSignature },
  { id: 'renew', name: 'Renew policies', line: 'Prepare the renewals that are due', prompt: 'Which policies are due for renewal this month?', icon: RefreshCw },
  { id: 'endorse', name: 'Endorse policies', line: 'Make mid-term changes to a policy', prompt: 'Add a member to a group policy', icon: FilePen },
  { id: 'group-health', name: 'Quote group health', line: 'Build a quote from a census and RFQ', prompt: 'Start a group health quote from a census file', icon: Users },
  { id: 'intermediaries', name: 'Onboard intermediaries', line: 'Verify and connect agents, brokers and partners', prompt: 'Onboard a new broker', icon: Handshake },
  { id: 'contacts', name: 'Manage contacts', line: 'Find, merge and update customer records', prompt: 'Find duplicate contacts', icon: Contact },
]

export const CONNECTORS: ConnectorItem[] = [
  { id: 'policy-admin', label: 'Policy admin', icon: FileStack, tone: 'brand' },
  { id: 'claims', label: 'Claims system', icon: ReceiptText, tone: 'info' },
  { id: 'documents', label: 'Document store', icon: FolderOpen, tone: 'warning' },
  { id: 'email', label: 'Email inbox', icon: Mail, tone: 'success' },
  { id: 'ckyc', label: 'CKYC', icon: UserCheck, tone: 'alert' },
  { id: 'surepass', label: 'Surepass', icon: ShieldCheck, tone: 'neutral' },
]

export type IntentTurn = { text: string }

const NOT_CONNECTED: IntentTurn = { text: "That capability isn't connected yet." }

/**
 * Only underwriting has data behind it — the queue fixture — so only it
 * answers, with the same reply the queue assistant gives. Everything else
 * says so rather than inventing an answer.
 */
export function respondIntent(text: string): IntentTurn {
  const q = text.toLowerCase()
  return TAT_MATCH.some((re) => re.test(q)) ? { text: TAT_REPLY.text } : NOT_CONNECTED
}
