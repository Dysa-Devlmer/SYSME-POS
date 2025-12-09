// web-interface/frontend/src/components/ChatMessage.jsx
// Componente de mensaje mejorado con Markdown y Syntax Highlighting

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ChatMessage({ message, isUser, timestamp, role, content }) {
  const [copied, setCopied] = useState(false);

  // Support both interfaces: object {role, content, timestamp} or direct props {message, isUser, timestamp}
  const messageRole = role || (message?.role);
  const messageContent = content || message?.content || message;
  const messageTimestamp = timestamp || message?.timestamp;
  const isUserMessage = isUser !== undefined ? isUser : messageRole === 'user';

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUserMessage ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {!isUserMessage && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl animate-pulse-slow">
            🤖
          </div>
        </div>
      )}

      <div className={`max-w-3xl ${isUserMessage ? 'order-first' : ''}`}>
        <div
          className={`rounded-lg p-4 shadow-lg ${
            isUserMessage
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
              : 'bg-gray-800 border border-gray-700'
          }`}
        >
          {isUserMessage ? (
            <p className="text-white whitespace-pre-wrap">{messageContent}</p>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    return !inline && match ? (
                      <div className="relative group">
                        <button
                          onClick={() => copyToClipboard(codeString)}
                          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copied ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-md"
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code
                        className="bg-gray-900 text-blue-300 px-1.5 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-3 text-gray-200 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc list-inside mb-3 text-gray-200">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal list-inside mb-3 text-gray-200">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="mb-1">{children}</li>;
                  },
                  h1({ children }) {
                    return <h1 className="text-2xl font-bold mb-3 text-blue-400">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-xl font-bold mb-2 text-blue-400">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-lg font-bold mb-2 text-blue-400">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 mb-3">
                        {children}
                      </blockquote>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {messageContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {messageTimestamp && (
          <div className={`text-xs text-gray-500 mt-1 ${isUserMessage ? 'text-right' : 'text-left'}`}>
            {new Date(messageTimestamp).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>

      {isUserMessage && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-xl">
            👤
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
