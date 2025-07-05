// apps/md-chat/server/speech.js
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// --- Configuration ---
const WHISPER_API_URL = 'http://localhost:5752/inference';
// IMPORTANT: Corrected paths to point to the project's root directory
const PIPER_TTS_PATH = path.join(__dirname, '..', '..', '..', 'piper_tts', 'piper');
const PIPER_VOICE_PATH = path.join(__dirname, '..', '..', '..', 'piper_tts', 'en_US-ljspeech-high.onnx');
// --- End Configuration ---

// Converts WebM audio buffer to WAV format and sends to Whisper
async function transcribeAudio(webmAudioBuffer) {
    console.log(`[FFMPEG] Received ${webmAudioBuffer.length} bytes. Starting conversion to WAV...`);
    // This requires FFmpeg to be installed and in your system's PATH.
    const wavBuffer = await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0',      // Input from stdin
            '-ar', '16000',      // Audio rate 16k
            '-ac', '1',          // Mono channel
            '-f', 'wav',         // Output format WAV
            'pipe:1'             // Output to stdout
        ]);

        let outputChunks = [];
        ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk));
        ffmpeg.stderr.on('data', (data) => console.error(`[FFMPEG stderr]: ${data}`));
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('[FFMPEG] Conversion successful.');
                resolve(Buffer.concat(outputChunks));
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        ffmpeg.stdin.write(webmAudioBuffer);
        ffmpeg.stdin.end();
    });

    console.log(`[Whisper] Sending ${wavBuffer.length} bytes of WAV data...`);
    const form = new FormData();
    form.append('file', wavBuffer, { filename: 'audio.wav' }); 
    form.append('response_format', 'json');

    try {
        const response = await axios.post(WHISPER_API_URL, form, {
            headers: { ...form.getHeaders() }
        });
        const transcription = response.data.text;
        if (transcription === undefined) {
             throw new Error("Received an invalid response format from Whisper.");
        }
        console.log('[Whisper] Transcription result:', transcription);
        return transcription;
    } catch (error) {
        if (error.response) {
            console.error('Whisper API Error:', error.response.data);
            throw new Error(`Whisper server error: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

// Generates raw audio from text using Piper TTS
async function synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
        const piper = spawn(PIPER_TTS_PATH, ['-m', PIPER_VOICE_PATH, '--output-raw']);
        let audioChunks = [];
        piper.stdin.write(text);
        piper.stdin.end();
        piper.stdout.on('data', (chunk) => { audioChunks.push(chunk); });
        piper.stderr.on('data', (data) => { console.error(`[piper-tts-err]: ${data}`); });
        piper.on('close', (code) => {
            if (code !== 0) return reject(new Error(`Piper TTS exited with code ${code}`));
            const audioBuffer = Buffer.concat(audioChunks);
            const wavBuffer = createWavHeader(audioBuffer);
            const finalBuffer = Buffer.concat([wavBuffer, audioBuffer]);
            resolve(finalBuffer);
        });
    });
}

// Creates a WAV header for the raw audio data from Piper
function createWavHeader(data) {
    const header = Buffer.alloc(44); const sampleRate = 22050; const channels = 1; const bitDepth = 16;
    header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
    header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22); header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    header.writeUInt16LE(channels * (bitDepth / 8), 32); header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36); header.writeUInt32LE(data.length, 40);
    return header;
}

module.exports = { transcribeAudio, synthesizeSpeech };