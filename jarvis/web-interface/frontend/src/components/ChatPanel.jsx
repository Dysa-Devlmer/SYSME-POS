// web-interface/frontend/src/components/ChatPanel.jsx
// Panel de Chat Mejorado con Markdown y Syntax Highlighting

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';

export default function ChatPanel({ socket, connected }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Mensaje de bienvenida
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        content: `**Buen día, Señor.**

Soy J.A.R.V.I.S. MARK VII, su asistente de inteligencia artificial. Todos los sistemas están operacionales.

Puede preguntarme lo que desee. Algunos ejemplos:
- "Explícame qué es React"
- "Muéstrame un ejemplo de código Python"
- "Dame consejos para programar mejor"

Como siempre, estoy a su disposición. ⚡`,
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now(),
      content: input,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Enviar al backend (Ollama)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      });

      const data = await response.json();

      const jarvisMessage = {
        id: Date.now() + 1,
        content: data.message || 'Lo siento, Señor. No pude procesar su solicitud.',
        isUser: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, jarvisMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        content: `**Error de conexión**

Lo siento, Señor. Hubo un problema al conectar con el sistema de IA:

\`\`\`
${error.message}
\`\`\`

Intente nuevamente o verifique que Ollama esté funcionando correctamente.`,
        isUser: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'cleared',
      content: 'Chat limpiado. Listo para nuevas consultas, Señor.',
      isUser: false,
      timestamp: new Date().toISOString()
    }]);
  };

  // Sugerencias rápidas
  const quickSuggestions = [
    '¿Qué es React?',
    'Ejemplo de código Python',
    'Explícame async/await',
    'Mejores prácticas de código'
  ];

  const useSuggestion = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-300px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Chat con J.A.R.V.I.S.
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            IA Local ilimitada • Modelo: Mistral 7B
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span className="hidden md:inline">Limpiar</span>
          </button>
          <div className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
            connected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            {connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
      </div>

      {/* Sugerencias rápidas */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Prueba preguntas rápidas:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => useSuggestion(suggestion)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors border border-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-900 rounded-lg p-6 border border-gray-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4 animate-bounce">🤖</div>
            <p className="text-lg font-semibold">J.A.R.V.I.S. está listo</p>
            <p className="text-sm">Escribe un mensaje para comenzar la conversación</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.content}
                isUser={msg.isUser}
                timestamp={msg.timestamp}
              />
            ))}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl animate-pulse">
                    🤖
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregúntale lo que quieras a J.A.R.V.I.S..."
            className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition-colors resize-none"
            rows="3"
            disabled={isProcessing}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              input.trim() && !isProcessing
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transform hover:scale-105'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden md:inline">Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>📤</span>
                <span className="hidden md:inline">Enviar</span>
              </div>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div>
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Enter</kbd> para enviar •{' '}
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Shift+Enter</kbd> para nueva línea
          </div>
          <div>{input.length} caracteres</div>
        </div>
      </div>
    </div>
  );
}
