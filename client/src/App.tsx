import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing-page'
import AuthSuccess from './components/auth-success'
import './styles/landing.css'
import './index.css'

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string
  rows?: Record<string, unknown>[]
  rowCount?: number
  error?: string
}

interface TerminalResult {
  sql: string
  rows: Record<string, unknown>[]
  rowCount: number
  error?: string
}

interface User {
  id: number
  email: string
  username?: string
  avatar?: string
}



function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Speech-to-Text state
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Query Terminal state
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalSql, setTerminalSql] = useState('')
  const [terminalResults, setTerminalResults] = useState<TerminalResult | null>(null)
  const [terminalLoading, setTerminalLoading] = useState(false)

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setAuthToken(token)
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
      } catch (e) {
        console.error('Failed to parse saved user:', e)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
  }, [])

  // Load messages from localStorage on mount
  useEffect(() => {
    if (isAuthenticated) {
      const saved = localStorage.getItem('chatMessages')
      if (saved) {
        try {
          setMessages(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse saved messages:', e)
        }
      }
    }
  }, [isAuthenticated])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput((prev) => prev + (prev ? ' ' : '') + transcript)
        setIsListening(false)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const handleAuthSuccess = (token: string, userData: User) => {
    setAuthToken(token)
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    // Clear all stored auth data
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('chatMessages')

    // Clear session storage as well
    sessionStorage.clear()

    // Reset state
    setAuthToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setMessages([])

    // Redirect to landing page (forces fresh GitHub OAuth on next login)
    window.location.href = '/'
  }

  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.error('Failed to start speech recognition:', e)
      }
    }
  }

  const handleStopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    localStorage.removeItem('chatMessages')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              parts: [{ type: 'text', text: m.content }],
            })),
            { role: 'user', parts: [{ type: 'text', text: input }] },
          ],
        }),
      })

      const data = await response.json()

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.error
          ? `Error: ${data.error}`
          : `Found ${data.rowCount} result(s)`,
        sql: data.sql,
        rows: data.rows,
        rowCount: data.rowCount,
        error: data.error,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Failed to connect to the server',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenTerminal = (sql: string) => {
    setTerminalSql(sql)
    setTerminalResults(null)
    setTerminalOpen(true)
  }

  const handleExecuteTerminalQuery = async () => {
    if (!terminalSql.trim() || terminalLoading) return

    setTerminalLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/query/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ sql: terminalSql }),
      })

      const data = await response.json()
      setTerminalResults({
        sql: terminalSql,
        rows: data.rows || [],
        rowCount: data.rowCount || 0,
        error: data.error,
      })
    } catch (error) {
      console.error('Terminal query error:', error)
      setTerminalResults({
        sql: terminalSql,
        rows: [],
        rowCount: 0,
        error: 'Failed to execute query',
      })
    } finally {
      setTerminalLoading(false)
    }
  }

  // Show landing page if not authenticated (with routing for auth-success)
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/auth-success" element={<AuthSuccess onAuthSuccess={handleAuthSuccess} />} />
          <Route path="*" element={<LandingPage onAuthSuccess={handleAuthSuccess} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Show main app if authenticated
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Header with User info and Logout */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 mt-4">
        <h1 className="text-2xl font-bold">AI SQL Architect</h1>
        <div className="flex items-center gap-4">
          {/* GitHub Avatar and Username */}
          <div className="flex items-center gap-2">
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.username || 'User avatar'}
                className="w-8 h-8 rounded-full border-2 border-green-500"
              />
            )}
            <span className="text-gray-300 text-sm font-medium">
              {user?.username || user?.email}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors text-sm"
            >
              Clear Chat
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat History Area */}
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg p-6 mb-24 min-h-[300px] shadow-xl">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            Ask a question like: "Show me all sales in India"
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-6">
              <div
                className={`text-xs font-bold mb-1 ${m.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}
              >
                {m.role === 'user' ? 'YOU' : 'AI'}
              </div>

              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>

              {/* Show SQL query with Edit & Run button */}
              {m.sql && (
                <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-gray-400">Generated SQL:</div>
                    <button
                      onClick={() => handleOpenTerminal(m.sql!)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-md transition-colors"
                    >
                      Edit & Run
                    </button>
                  </div>
                  <code className="text-green-300 text-sm">{m.sql}</code>
                </div>
              )}

              {/* Show results table */}
              {m.rows && m.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-600">
                        {Object.keys(m.rows[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((row, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}
                        >
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2 text-sm text-gray-200">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="text-gray-400 animate-pulse">Thinking...</div>
        )}
      </div>

      {/* Input Area (Fixed at bottom) */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 w-full max-w-4xl bg-gray-900 p-4 border-t border-gray-800"
      >
        <div className="relative flex gap-2">
          {/* Microphone Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`p-4 rounded-xl transition-colors ${isListening
                ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                : 'bg-gray-700 hover:bg-gray-600'
                }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          )}

          <div className="relative flex-1">
            <input
              className="w-full p-4 pr-24 bg-gray-800 border border-gray-700 rounded-xl focus:border-green-500 focus:outline-none text-white shadow-lg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Describe your query...'}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 bottom-2 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </form>

      {/* Query Terminal Modal */}
      {terminalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Terminal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-purple-400">Query Terminal</h2>
              <button
                onClick={() => setTerminalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* SQL Editor */}
            <div className="p-4">
              <textarea
                value={terminalSql}
                onChange={(e) => setTerminalSql(e.target.value)}
                className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-green-300 font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Enter SQL query..."
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleExecuteTerminalQuery}
                  disabled={terminalLoading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {terminalLoading ? 'Executing...' : 'Execute Query'}
                </button>
              </div>
            </div>

            {/* Terminal Results */}
            <div className="flex-1 overflow-auto p-4 border-t border-gray-700">
              {terminalResults && (
                <>
                  {terminalResults.error ? (
                    <div className="text-red-400 bg-red-900/20 p-3 rounded-lg">
                      Error: {terminalResults.error}
                    </div>
                  ) : (
                    <>
                      <div className="text-gray-400 text-sm mb-3">
                        Results: {terminalResults.rowCount} row(s)
                      </div>
                      {terminalResults.rows.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-gray-600">
                                {Object.keys(terminalResults.rows[0]).map((key) => (
                                  <th
                                    key={key}
                                    className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {terminalResults.rows.map((row, i) => (
                                <tr
                                  key={i}
                                  className={i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}
                                >
                                  {Object.values(row).map((val, j) => (
                                    <td key={j} className="px-4 py-2 text-sm text-gray-200">
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {!terminalResults && !terminalLoading && (
                <div className="text-gray-500 text-center py-8">
                  Modify the query above and click "Execute Query" to see results
                </div>
              )}
              {terminalLoading && (
                <div className="text-gray-400 text-center py-8 animate-pulse">
                  Executing...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
