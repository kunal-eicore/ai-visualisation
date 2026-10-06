import { ChatPanel } from '@/components/workspace/chat/ChatPanel'
import { CAPABILITIES, CONNECTORS, respondIntent, type IntentTurn } from './capabilities'

/**
 * Intent based: say what you want done. The box floats mid-screen with the
 * capabilities under it; a card puts its starter prompt in the box. After the
 * first message the page becomes the conversation. `ChatPanel` in its centre
 * layout, so it is the same chat as the docked ones.
 */
export function IntentScreen() {
  return (
    <ChatPanel<IntentTurn>
      ariaLabel="Intent"
      layout="centre"
      centreWidth={1200}
      conversation={{
        pendingLabel: 'Thinking',
        respond: (text) => respondIntent(text),
        empty: (fill) => <CapabilityGrid onPick={fill} />,
      }}
      composer={{
        placeholder: 'Describe what you want done',
        label: 'Describe what you want done',
        attach: true,
        connectors: CONNECTORS,
        voice: true,
      }}
      newChat={{
        label: 'New chat',
        confirm: {
          title: 'Start a new chat?',
          body: 'This conversation will be cleared.',
          action: 'Start new chat',
        },
      }}
    />
  )
}

function CapabilityGrid({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <ul aria-label="Capabilities" className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
      {CAPABILITIES.map(({ id, name, line, prompt, icon: Icon }) => (
        <li key={id} className="flex">
          <button
            type="button"
            onClick={() => onPick(prompt)}
            className="flex w-full flex-col items-start gap-3 rounded-lg border border-default bg-surface-card p-4 text-left shadow-card transition-shadow duration-base hover:shadow-classic focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 bg-brand-bg text-brand-fg">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-default">{name}</span>
              <span className="text-sm text-subtle">{line}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
