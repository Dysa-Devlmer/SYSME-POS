/**
 * ============================================
 * VOICE INTERFACE ADVANCED - 24/7 LISTENING
 * ============================================
 * Reconocimiento de voz continuo con wake word detection
 * Compatible: Windows (PowerShell Speech), Linux (espeak), Mac (say)
 *
 * Autor: J.A.R.V.I.S. para Ulmer Solier
 * Fecha: 2025-11-06
 */

import { spawn } from 'child_process';
import EventEmitter from 'events';

class VoiceInterfaceAdvanced extends EventEmitter {
  constructor(options = {}) {
    super();

    this.isListening = false;
    this.isSpeaking = false;
    this.language = options.language || 'es-ES';
    this.wakeWords = options.wakeWords || ['jarvis', 'oye jarvis', 'hey jarvis'];
    this.platform = process.platform;
    this.sensitivity = options.sensitivity || 0.7; // 0-1
    this.continuousMode = options.continuousMode !== false; // true por defecto

    // Estado
    this.isAwake = false;
    this.lastCommandTime = null;
    this.recognitionProcess = null;
    this.commandBuffer = [];

    // Estadísticas
    this.stats = {
      totalCommands: 0,
      wakeWordDetections: 0,
      successfulRecognitions: 0,
      errors: 0,
      startTime: Date.now()
    };

    console.log('🎤 [VoiceAdvanced] Inicializando...');
    console.log(`   Plataforma: ${this.platform}`);
    console.log(`   Wake words: ${this.wakeWords.join(', ')}`);
    console.log(`   Idioma: ${this.language}`);
  }

  /**
   * Inicia el reconocimiento continuo 24/7
   */
  async start() {
    if (this.isListening) {
      console.log('⚠️  [VoiceAdvanced] Ya está escuchando');
      return;
    }

    console.log('\n🎤 [VoiceAdvanced] Iniciando escucha 24/7...');
    this.isListening = true;
    this.emit('listening-started');

    // Iniciar loop de reconocimiento
    if (this.platform === 'win32') {
      await this.startWindowsRecognition();
    } else if (this.platform === 'darwin') {
      await this.startMacRecognition();
    } else {
      await this.startLinuxRecognition();
    }

    console.log('✅ [VoiceAdvanced] Escucha 24/7 activa');
    console.log('💡 Di alguna de las wake words para activar JARVIS\n');
  }

  /**
   * Detiene el reconocimiento
   */
  stop() {
    if (!this.isListening) return;

    console.log('🛑 [VoiceAdvanced] Deteniendo escucha...');
    this.isListening = false;

    if (this.recognitionProcess) {
      this.recognitionProcess.kill();
      this.recognitionProcess = null;
    }

    this.emit('listening-stopped');
    console.log('✅ [VoiceAdvanced] Escucha detenida');
  }

  /**
   * ============================================
   * WINDOWS: PowerShell Speech Recognition
   * ============================================
   */
  async startWindowsRecognition() {
    const psScript = `
      Add-Type -AssemblyName System.Speech

      $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
      $recognizer.SetInputToDefaultAudioDevice()

      # Cargar gramática de dictado libre
      $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))

      Write-Host "JARVIS_READY"

      while ($true) {
        try {
          $result = $recognizer.Recognize([TimeSpan]::FromSeconds(10))

          if ($result -and $result.Text) {
            $confidence = $result.Confidence
            $text = $result.Text

            Write-Host "JARVIS_COMMAND:$text|CONFIDENCE:$confidence"
          }
        } catch {
          Write-Host "JARVIS_ERROR:$($_.Exception.Message)"
        }
      }
    `;

    this.recognitionProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psScript
    ]);

    this.recognitionProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      this.processWindowsOutput(output);
    });

    this.recognitionProcess.stderr.on('data', (data) => {
      console.error(`❌ [VoiceAdvanced] Error: ${data.toString()}`);
      this.stats.errors++;
    });

    this.recognitionProcess.on('close', (code) => {
      if (this.isListening) {
        console.log('⚠️  [VoiceAdvanced] Proceso cerrado. Reiniciando...');
        setTimeout(() => this.startWindowsRecognition(), 2000);
      }
    });
  }

  /**
   * Procesa la salida de PowerShell
   */
  processWindowsOutput(output) {
    if (output.includes('JARVIS_READY')) {
      console.log('✅ [VoiceAdvanced] Motor de reconocimiento listo');
      this.emit('ready');
      return;
    }

    if (output.includes('JARVIS_COMMAND:')) {
      const match = output.match(/JARVIS_COMMAND:(.+)\|CONFIDENCE:([\d.]+)/);
      if (match) {
        const text = match[1].trim();
        const confidence = parseFloat(match[2]);

        this.handleRecognizedText(text, confidence);
      }
    }

    if (output.includes('JARVIS_ERROR:')) {
      const error = output.replace('JARVIS_ERROR:', '');
      console.error(`❌ [VoiceAdvanced] ${error}`);
      this.stats.errors++;
    }
  }

  /**
   * ============================================
   * MAC: Apple Speech Recognition
   * ============================================
   */
  async startMacRecognition() {
    // Para Mac, usar SpeechRecognition de macOS
    const script = `
      osascript -e 'tell application "SpeechRecognitionServer" to listen continuously'
    `;

    console.log('🍎 [VoiceAdvanced] Usando Speech Recognition de macOS');
    console.log('⚠️  Nota: Requiere activar "Dictado" en Preferencias del Sistema');

    // Implementación simplificada para Mac
    // En producción, usar librería nativa o API de Speech
    this.startFallbackRecognition();
  }

  /**
   * ============================================
   * LINUX: espeak / pocketsphinx
   * ============================================
   */
  async startLinuxRecognition() {
    console.log('🐧 [VoiceAdvanced] Usando reconocimiento de voz Linux');
    console.log('⚠️  Nota: Requiere pocketsphinx o similar instalado');

    // Implementación simplificada para Linux
    this.startFallbackRecognition();
  }

  /**
   * Reconocimiento fallback (manual input simulado)
   */
  startFallbackRecognition() {
    console.log('⚠️  [VoiceAdvanced] Usando modo fallback (simulado)');
    console.log('💡 Para reconocimiento real, instala las dependencias del sistema');

    // Simular reconocimiento cada 5 segundos
    const simulateRecognition = () => {
      if (!this.isListening) return;

      // En producción, aquí iría la captura real de audio
      setTimeout(simulateRecognition, 5000);
    };

    simulateRecognition();
  }

  /**
   * ============================================
   * PROCESAMIENTO DE COMANDOS
   * ============================================
   */
  handleRecognizedText(text, confidence) {
    const textLower = text.toLowerCase();

    console.log(`\n🎤 [VoiceAdvanced] Detectado: "${text}" (confianza: ${(confidence * 100).toFixed(0)}%)`);

    // Verificar si contiene wake word
    const hasWakeWord = this.wakeWords.some(word => textLower.includes(word));

    if (hasWakeWord) {
      this.stats.wakeWordDetections++;
      console.log('✨ [VoiceAdvanced] Wake word detectada! JARVIS activado');
      this.isAwake = true;
      this.lastCommandTime = Date.now();

      // Extraer comando (quitar wake word)
      let command = text;
      this.wakeWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        command = command.replace(regex, '').trim();
      });

      if (command.length > 0) {
        this.executeCommand(command, confidence);
      } else {
        this.emit('wake-word-only');
        this.speak('Sí, señor. ¿En qué puedo ayudarle?');
      }
    } else if (this.isAwake) {
      // Si JARVIS está despierto, procesar cualquier texto como comando
      const timeSinceLastCommand = Date.now() - this.lastCommandTime;

      if (timeSinceLastCommand < 30000) { // 30 segundos
        this.executeCommand(text, confidence);
      } else {
        console.log('💤 [VoiceAdvanced] JARVIS volviendo a modo sleep (sin comandos por 30s)');
        this.isAwake = false;
      }
    } else {
      // Ignorar texto sin wake word
      console.log('   (ignorado - sin wake word)');
    }

    this.stats.successfulRecognitions++;
  }

  /**
   * Ejecuta un comando reconocido
   */
  executeCommand(command, confidence) {
    console.log(`⚡ [VoiceAdvanced] Ejecutando: "${command}"`);

    this.stats.totalCommands++;
    this.lastCommandTime = Date.now();

    // Guardar en buffer
    this.commandBuffer.push({
      command,
      confidence,
      timestamp: Date.now()
    });

    // Mantener solo últimos 10 comandos
    if (this.commandBuffer.length > 10) {
      this.commandBuffer.shift();
    }

    // Emitir evento de comando
    this.emit('command', {
      text: command,
      confidence,
      timestamp: Date.now()
    });
  }

  /**
   * ============================================
   * TEXT-TO-SPEECH (Respuestas de voz)
   * ============================================
   */
  async speak(text) {
    if (this.isSpeaking) {
      console.log('⚠️  Ya estoy hablando...');
      return;
    }

    this.isSpeaking = true;
    console.log(`\n🔊 [VoiceAdvanced] Hablando: "${text}"`);

    try {
      if (this.platform === 'win32') {
        await this.speakWindows(text);
      } else if (this.platform === 'darwin') {
        await this.speakMac(text);
      } else {
        await this.speakLinux(text);
      }
    } catch (error) {
      console.error(`❌ Error al hablar: ${error.message}`);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * TTS para Windows
   */
  speakWindows(text) {
    return new Promise((resolve) => {
      const psScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Male, [System.Speech.Synthesis.VoiceAge]::Adult)
        $synth.Rate = 0
        $synth.Volume = 100
        $synth.Speak("${text.replace(/"/g, '`"')}")
      `;

      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-Command', psScript
      ]);

      ps.on('close', () => {
        console.log('✅ Voz completada');
        resolve();
      });
    });
  }

  /**
   * TTS para Mac
   */
  speakMac(text) {
    return new Promise((resolve) => {
      const say = spawn('say', ['-v', 'Jorge', text]); // Voz en español
      say.on('close', () => {
        console.log('✅ Voz completada');
        resolve();
      });
    });
  }

  /**
   * TTS para Linux
   */
  speakLinux(text) {
    return new Promise((resolve) => {
      const espeak = spawn('espeak', ['-v', 'es', text]);
      espeak.on('close', () => {
        console.log('✅ Voz completada');
        resolve();
      });
    });
  }

  /**
   * ============================================
   * UTILIDADES
   * ============================================
   */

  /**
   * Obtiene estadísticas de uso
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);

    return {
      ...this.stats,
      uptime: uptimeMinutes,
      isListening: this.isListening,
      isAwake: this.isAwake,
      commandsPerMinute: this.stats.totalCommands / Math.max(uptimeMinutes, 1),
      successRate: this.stats.successfulRecognitions / Math.max(this.stats.totalCommands, 1) * 100
    };
  }

  /**
   * Reinicia estadísticas
   */
  resetStats() {
    this.stats = {
      totalCommands: 0,
      wakeWordDetections: 0,
      successfulRecognitions: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Limpia el buffer de comandos
   */
  clearBuffer() {
    this.commandBuffer = [];
  }
}

export default VoiceInterfaceAdvanced;
