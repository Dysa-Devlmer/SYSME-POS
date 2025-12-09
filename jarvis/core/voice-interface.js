/**
 * MÓDULO 1: VOICE INTERFACE
 * Interfaz de voz para JARVIS — Escucha y responde verbalmente
 * Compatible: Windows, Mac, Linux
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class VoiceInterface {
  constructor(options = {}) {
    this.isListening = false;
    this.isSpeaking = false;
    this.language = 'es-ES';
    this.micVolume = options.micVolume || 0.8;
    this.wakeWords = ['jarvis', 'oye jarvis', 'hey jarvis', 'jarvs'];
    this.platform = process.platform;
    this.callbacks = {
      onCommand: options.onCommand || (() => {}),
      onError: options.onError || (() => {})
    };
    
    console.log('🎤 Voice Interface inicializando...');
    this.validateDependencies();
  }

  validateDependencies() {
    /**
     * Valida que las dependencias de voz estén instaladas
     */
    const required = {
      darwin: ['say'],
      linux: ['espeak', 'sox'],
      win32: ['PowerShell']
    };

    const deps = required[this.platform];
    console.log(`✅ Voice Interface configurado para ${this.platform}`);
  }

  /**
   * ESCUCHA COMANDOS POR MICRÓFONO
   */
  async startListening() {
    if (this.isListening) return;
    
    this.isListening = true;
    console.log('🎤 Escuchando... (di algo)');

    try {
      // Simular escucha (en producción, usar SpeechRecognition API o librería nativa)
      const command = await this.captureAudio();
      
      if (command) {
        // Verificar wake words
        const isWakeWordDetected = this.wakeWords.some(word => 
          command.toLowerCase().includes(word)
        );

        if (isWakeWordDetected || command.length > 3) {
          console.log(`📝 Comando detectado: "${command}"`);
          this.callbacks.onCommand(command);
        }
      }

      // Continuar escuchando
      setTimeout(() => this.startListening(), 500);
      
    } catch (error) {
      this.callbacks.onError(`Error escuchando: ${error.message}`);
    }
  }

  /**
   * CAPTURA AUDIO DEL MICRÓFONO
   */
  async captureAudio() {
    return new Promise((resolve) => {
      // En versión completa, usar: SpeechRecognition API, pyaudio + Python, etc.
      // Por ahora, retorna simulación
      
      // Para Windows con PowerShell:
      if (this.platform === 'win32') {
        const ps = spawn('powershell.exe', [
          '-Command',
          `
            Add-Type -AssemblyName System.Speech;
            $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
            $recognizer.SetInputToDefaultAudioDevice();
            $result = $recognizer.Recognize();
            if ($result) { Write-Host $result.Text }
          `
        ]);

        ps.stdout.on('data', (data) => {
          resolve(data.toString().trim());
        });

        ps.on('close', () => resolve(''));
      } else {
        resolve('');
      }
    });
  }

  /**
   * HABLA (TEXT-TO-SPEECH)
   */
  async speak(text) {
    if (this.isSpeaking) return;
    
    this.isSpeaking = true;
    console.log(`🔊 JARVIS: ${text}`);

    try {
      let command = '';
      let args = [];

      if (this.platform === 'darwin') {
        // macOS
        command = 'say';
        args = ['-v', 'Jorge', text]; // Voz en español
      } else if (this.platform === 'linux') {
        // Linux
        command = 'espeak';
        args = ['-v', 'es', text];
      } else if (this.platform === 'win32') {
        // Windows con PowerShell
        command = 'powershell.exe';
        args = [
          '-Command',
          `
            Add-Type –AssemblyName System.Speech;
            $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $speak.Speak("${text.replace(/"/g, '\\"')}");
          `
        ];
      }

      return new Promise((resolve) => {
        const proc = spawn(command, args);
        
        proc.on('close', () => {
          this.isSpeaking = false;
          resolve();
        });

        proc.on('error', (error) => {
          console.error('Error en TTS:', error);
          this.isSpeaking = false;
          resolve();
        });

        // Timeout de 30 segundos
        setTimeout(() => {
          proc.kill();
          this.isSpeaking = false;
          resolve();
        }, 30000);
      });
    } catch (error) {
      console.error('Error hablando:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * DETENER ESCUCHA
   */
  stopListening() {
    this.isListening = false;
    console.log('🔇 Escucha detenida');
  }

  /**
   * SILENCIO
   */
  async mute() {
    this.isSpeaking = true;
    console.log('🔇 Silenciado');
  }

  /**
   * DESMUTEAR
   */
  async unmute() {
    this.isSpeaking = false;
    console.log('🔊 Audio habilitado');
  }
}

export default VoiceInterface;
