import { useState } from 'react'
import { Toast } from '@/components/ui/Toast'
import { CHAT_WIDTH, ChatDockHost } from '@/components/workspace/chat/ChatDockHost'
import { QueueChat } from './QueueChat'
import { UnderwritingQueue } from './UnderwritingQueue'
import { useQueue } from './state'

/**
 * Manual mode: the queue, with the assistant docked on the right.
 *
 * The dock starts closed behind the edge tab. Opened, it takes room from the
 * queue rather than covering it, so a row it points at stays in view.
 */
export function QueueScreen() {
  const q = useQueue()
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <UnderwritingQueue q={q} />
      </div>

      <ChatDockHost open={chatOpen} onOpen={() => setChatOpen(true)} tab={{ label: 'Assistant', className: 'bottom-6' }}>
        <QueueChat q={q} width={CHAT_WIDTH} onClose={() => setChatOpen(false)} />
      </ChatDockHost>

      {q.toast && <Toast title={q.toast.title} onDismiss={q.dismissToast} />}
    </div>
  )
}
