import { useCallback, useEffect, useRef, useState } from 'react'
import type { Output } from '../../contracts/ipc'

export function useDiscussion() {
  const api = window.nextCode
  const [models, setModels] = useState<Output<'models.list'>>([])
  const [model, setModel] = useState('')
  const [project, setProject] = useState<Output<'projects.choose'>>(null)
  const [projects, setProjects] = useState<Output<'projects.listRecent'>>([])
  const [history, setHistory] = useState<Output<'conversations.list'>['conversations']>([])
  const [conversation, setConversation] = useState<Output<'conversations.read'> | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const accepting = useRef(false),
    navigation = useRef(0),
    mutation = useRef<{ signature: string; id: string } | null>(null),
    current = useRef(conversationId)
  current.current = conversationId
  const ready =
    !!model &&
    models.some((choice) => choice.modelId === model && choice.availability === 'available')
  const loadHistory = useCallback(async () => {
    if (!api || !project) return
    const result = await api.conversations.list(project.projectId, undefined, 100)
    if (result.ok) setHistory(result.data.conversations)
  }, [api, project])
  const read = useCallback(
    async (id: string) => {
      if (!api) return
      let cursor: string | undefined
      // Keep only a bounded page in memory while seeking the latest page. Older
      // source messages remain intact in SQLite; no history is sent wholesale.
      for (let pages = 0; pages < 100; pages++) {
        const result = await api.conversations.read(id, cursor, 100)
        if (current.current !== id) return
        if (!result.ok) {
          setError(result.error.message)
          return
        }
        if (!result.data.nextCursor) {
          setConversation(result.data)
          return
        }
        cursor = result.data.nextCursor
      }
      setError('Conversation exceeds the current display paging budget.')
    },
    [api]
  )
  useEffect(() => {
    if (!api) return
    let disposed = false
    const refresh = async () => {
      const choices = await api.models.list()
      if (!disposed && choices.ok) setModels(choices.data)
    }
    void api.app.bootstrap().then((result) => {
      if (!disposed && result.ok) {
        setProject(result.data.selectedProject)
        setModel(result.data.discussionModelId ?? '')
      }
    })
    void api.projects.listRecent().then((result) => {
      if (!disposed && result.ok) setProjects(result.data)
    })
    void refresh()
    const timer = setInterval(() => {
      void refresh()
    }, 1500)
    return () => {
      disposed = true
      clearInterval(timer)
    }
  }, [api])
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])
  useEffect(() => {
    if (!api || !conversationId) {
      setConversation(null)
      return
    }
    void read(conversationId)
    const unsubscribe = api.conversations.subscribeConversation(conversationId, () => {
      void read(conversationId)
      void loadHistory()
    })
    // Durable snapshots also recover a lost/coalesced subscription hint. This
    // never invokes a model or retries the accepted turn.
    const timer = setInterval(() => {
      void read(conversationId)
    }, 1000)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [api, conversationId, read, loadHistory])
  const chooseProject = async (id?: string) => {
    if (!api) return
    const result = id ? await api.projects.select(id) : await api.projects.choose()
    if (result.ok && result.data) {
      navigation.current++
      setProject(result.data)
      setConversationId(null)
      setConversation(null)
      setError('')
      const recent = await api.projects.listRecent()
      if (recent.ok) setProjects(recent.data)
    } else if (!result.ok) setError(result.error.message)
  }
  const chooseModel = async (id: string) => {
    if (!api) return
    const result = await api.models.setDiscussionPreference(id)
    if (result.ok) {
      setModel(result.data.modelId)
      setError('')
    } else setError(result.error.message)
  }
  const send = async (
    text: string,
    draftId: number,
    onAccepted: (conversationId: string) => void
  ) => {
    if (!api || accepting.current || !ready || !project || !text.trim()) return
    const signature = JSON.stringify([conversationId, draftId, text, model, project.projectId])
    if (mutation.current?.signature !== signature)
      mutation.current = { signature, id: crypto.randomUUID() }
    accepting.current = true
    const sentFrom = navigation.current
    setSending(true)
    setError('')
    try {
      const result = await api.conversations.sendMessage({
        ...(conversationId ? { conversationId } : { draftId: `draft_${draftId}` }),
        text,
        modelId: model,
        clientMutationId: mutation.current.id
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      onAccepted(result.data.conversationId)
      mutation.current = null
      if (navigation.current === sentFrom) {
        current.current = result.data.conversationId
        setConversationId(result.data.conversationId)
        await read(result.data.conversationId)
      }
      await loadHistory()
    } catch {
      setError('Message acceptance is uncertain. The current draft has been retained.')
    } finally {
      accepting.current = false
      setSending(false)
    }
  }
  const reset = () => {
    navigation.current++
    current.current = null
    setConversationId(null)
    setConversation(null)
    setError('')
  }
  const open = (id: string) => {
    navigation.current++
    current.current = id
    setConversationId(id)
    setConversation(null)
    setError('')
  }
  return {
    models,
    model,
    project,
    projects,
    history,
    conversation,
    conversationId,
    error,
    sending,
    ready,
    chooseProject,
    chooseModel,
    send,
    reset,
    open
  }
}
