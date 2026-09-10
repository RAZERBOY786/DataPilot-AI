import { useState, useEffect, useRef } from 'react'
import { listConversations, createConversation, getMessages, sendMessage as sendCopilotMessage, deleteConversation as removeConversation } from '../api/copilot'
import { useSettings } from '../context/SettingsContext'

function MessageContent({ content }) {
  const parts = content.split(/```(?:sql|python|bash)?\n?/)
  if (parts.length === 1) return <div className="whitespace-pre-wrap">{parts[0]}</div>
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 0 && part ? (
          <div key={i}>{part}</div>
        ) : i % 2 === 1 ? (
          <pre key={i} className="my-2 p-3 rounded-lg bg-inverse-surface/90 text-inverse-on-surface text-[12px] overflow-x-auto font-mono leading-relaxed">{part.trim()}</pre>
        ) : null
      )}
    </div>
  )
}

export default function Copilot() {
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [backendOff, setBackendOff] = useState(false)
  const messagesEnd = useRef(null)
  const { settings, loaded } = useSettings()

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    listConversations()
      .then((c) => { setConversations(c || []); setBackendOff(false) })
      .catch(() => setBackendOff(true))
  }, [])

  const loadConversation = async (id) => {
    setActiveConv(id)
    const r = await getMessages(id)
    if (r) setMessages(r)
  }

  const newConversation = async () => {
    const c = await createConversation('New Analysis')
    if (c) {
      setConversations((prev) => [c, ...prev])
      setActiveConv(c.id)
      setMessages([])
    }
    return c
  }

  const ask = async (convId, content) => {
    if (!content.trim() || sending) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: content.trim() }])
    setInput('')
    setSending(true)
    try {
      const r = await sendCopilotMessage(convId, content.trim())
      if (r) setMessages(r)
    } catch {
      setMessages((prev) => [...prev, { id: Date.now(), role: 'assistant', content: 'Failed to send message. Ensure the backend is reachable.' }])
    }
    setSending(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeConv) return
    const content = input
    setInput('')
    await ask(activeConv, content)
  }

  const sendSuggestion = async (s) => {
    if (sending) return
    if (activeConv) {
      await ask(activeConv, s)
    } else {
      const c = await newConversation()
      if (c) await ask(c.id, s)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const deleteConversation = async (id) => {
    await removeConversation(id).catch(() => {})
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConv === id) { setActiveConv(null); setMessages([]) }
  }

  const suggestions = [
    'Describe the data',
    'Show the first 10 rows',
    'Correlation between columns',
    'Draft a SQL query for data quality checks',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-on-surface tracking-tight">DataPilot AI</h1>
          <p className="text-[14px] text-on-surface-variant">Ask questions about your data, generate SQL, or explore insights.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 gap-3">
          <button
            onClick={newConversation}
            disabled={backendOff}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container shadow-sm transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Conversation
          </button>
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-on-surface-variant">No conversations yet.</div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    activeConv === c.id ? 'bg-surface-container-low text-on-surface shadow-sm' : 'hover:bg-surface-subtle text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] shrink-0">chat_bubble</span>
                    <span className="text-[13px] font-medium truncate">{c.title}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col bg-surface-card rounded-xl shadow-sm min-h-0">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
              </div>
              <span className="font-display font-bold text-[20px] text-on-surface">How can I help with your data?</span>
              <p className="text-[14px] text-on-surface-variant max-w-md">
                {backendOff
                  ? 'The backend is not reachable. Start it with: python -m uvicorn app.main:app --port 8000'
                  : 'Start a new conversation to ask questions, write SQL, or explore dataset insights.'}
              </p>
              {!backendOff && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-lg w-full">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendSuggestion(s)}
                    className="text-left p-3 rounded-lg bg-surface-subtle hover:bg-surface-container-low hover:text-primary transition-all text-[13px] text-on-surface-variant flex items-center justify-between group"
                  >
                    <span className="line-clamp-1">{s}</span>
                    <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">arrow_outward</span>
                  </button>
                ))}
              </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                    <span className="material-symbols-outlined text-[24px] text-outline">forum</span>
                    <span className="text-[14px] text-on-surface-variant">Ask your first question below.</span>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-[14px] leading-relaxed ${
                      m.role === 'user' ? 'bg-primary text-on-primary rounded-br-md' : 'bg-surface-subtle text-on-surface rounded-bl-md'
                    }`}>
                      <MessageContent content={m.content} />
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="p-3.5 rounded-2xl rounded-bl-md bg-surface-subtle text-on-surface-variant text-[14px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
              <div className="p-4 border-t border-border-subtle/50">
                <div className="flex items-end gap-3">
                  <textarea
                    className="flex-1 p-3 rounded-xl bg-surface-subtle text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none shadow-inner"
                    placeholder="Ask about your data, request SQL, charts, or insights..."
                    rows="2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="h-12 px-6 rounded-xl bg-primary text-on-primary text-[14px] font-semibold flex items-center gap-2 shadow-md hover:bg-primary-container transition-all disabled:opacity-50 self-end"
                  >
                    <span>Send</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-on-surface-variant">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    {loaded && `Sandbox ${settings.pyodide_sandbox ? 'enabled' : 'disabled'} · temp ${Number(settings.temperature || 0).toFixed(2)} · ${settings.zdr_mode ? 'ZDR on' : 'ZDR off'}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${backendOff ? 'bg-error' : 'bg-status-success'}`}></span>
                    {backendOff ? 'Offline' : 'Connected'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
