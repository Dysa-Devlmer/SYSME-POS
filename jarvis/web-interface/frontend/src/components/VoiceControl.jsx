/**
 * ¡ JARVIS Voice Control Component
 *
 * "Just ask, sir. I'm always listening."
 * - JARVIS
 *
 * Control JARVIS with your voice, Tony Stark style
 */

import React, { useState, useEffect, useRef } from 'react';

const VoiceControl = ({ onCommand, enabled = true }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES'; // Spanish

      recognition.onstart = () => {
        setIsListening(true);
        console.log('<¤ Voice recognition started');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('<¤ Voice recognition ended');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcriptPart + ' ';
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += transcriptPart;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          processCommand(finalTranscript.trim(), event.results[event.resultIndex][0].confidence);
        }
      };

      recognition.onerror = (event) => {
        console.error('<¤ Voice recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('<¤ Speech Recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processCommand = (text, conf) => {
    const lowerText = text.toLowerCase();

    // JARVIS wake word detection
    if (lowerText.includes('jarvis') || lowerText.includes('jarbi')) {
      setLastCommand(text);

      // Extract command after "JARVIS"
      const commandMatch = lowerText.match(/jarvis,?\s*(.+)/i) || lowerText.match(/jarbi,?\s*(.+)/i);
      const command = commandMatch ? commandMatch[1] : text;

      // Detect command type
      let commandType = 'unknown';
      let action = null;

      if (command.match(/test|prueba|probar/i)) {
        commandType = 'test_ai';
        action = 'test';
      } else if (command.match(/predict|predic|anticipa/i)) {
        commandType = 'predict';
        action = 'predict';
      } else if (command.match(/save|guarda|salva/i)) {
        commandType = 'save';
        action = 'save';
      } else if (command.match(/status|estado/i)) {
        commandType = 'status';
        action = 'status';
      } else if (command.match(/learn|aprend/i)) {
        commandType = 'learn';
        action = 'learn';
      } else if (command.match(/stats|estadísticas/i)) {
        commandType = 'statistics';
        action = 'stats';
      }

      // Call parent callback with command
      if (onCommand && action) {
        onCommand({
          type: commandType,
          action: action,
          text: command,
          confidence: conf,
          timestamp: Date.now()
        });
      }

      // Visual feedback
      speakResponse(commandType);
    }
  };

  const speakResponse = (commandType) => {
    const responses = {
      test_ai: 'Ejecutando prueba de IA, sir.',
      predict: 'Generando predicciones, sir.',
      save: 'Guardando estado del sistema, sir.',
      status: 'Mostrando estado del sistema, sir.',
      learn: 'Iniciando proceso de aprendizaje, sir.',
      statistics: 'Mostrando estadísticas, sir.',
      unknown: 'Comando no reconocido, sir.'
    };

    const response = responses[commandType] || responses.unknown;

    // Text-to-Speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  if (!supported) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl"> </span>
          <div>
            <h3 className="font-bold text-red-400">Voice Control No Disponible</h3>
            <p className="text-sm text-red-300">
              Tu navegador no soporta reconocimiento de voz.
              Prueba con Chrome, Edge o Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-3xl ${isListening ? 'animate-pulse' : ''}`}>
            {isListening ? '<¤' : '='}
          </div>
          <div>
            <h3 className="font-bold text-purple-300">JARVIS Voice Control</h3>
            <p className="text-xs text-gray-400">
              Di "JARVIS" seguido de tu comando
            </p>
          </div>
        </div>

        <button
          onClick={toggleListening}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isListening ? '=Ñ Detener' : '<¤ Escuchar'}
        </button>
      </div>

      {/* Live Transcript */}
      {isListening && transcript && (
        <div className="bg-black/30 rounded p-3 mb-3 border border-purple-500/30">
          <div className="text-xs text-gray-400 mb-1">Escuchando...</div>
          <div className="text-purple-300 font-mono">{transcript}</div>
          {confidence > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Confianza:</span>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-purple-400">{Math.round(confidence * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Last Command */}
      {lastCommand && (
        <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Último comando ejecutado:</div>
          <div className="text-green-300 font-semibold">{lastCommand}</div>
        </div>
      )}

      {/* Voice Commands Help */}
      <div className="mt-4 pt-4 border-t border-purple-500/30">
        <div className="text-xs text-gray-400 mb-2">Comandos disponibles:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/20 rounded p-2">
            <span className="text-purple-400 font-semibold">JARVIS, test</span>
            <p className="text-gray-500">Prueba el sistema de IA</p>
          </div>
          <div className="bg-black/20 rounded p-2">
            <span className="text-purple-400 font-semibold">JARVIS, predict</span>
            <p className="text-gray-500">Genera predicciones</p>
          </div>
          <div className="bg-black/20 rounded p-2">
            <span className="text-purple-400 font-semibold">JARVIS, save</span>
            <p className="text-gray-500">Guarda el estado</p>
          </div>
          <div className="bg-black/20 rounded p-2">
            <span className="text-purple-400 font-semibold">JARVIS, status</span>
            <p className="text-gray-500">Muestra el estado</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControl;
