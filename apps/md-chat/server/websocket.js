// apps/md-chat/server/websocket.js
const WebSocket = require('ws');
const { transcribeAudio, synthesizeSpeech } = require('./speech');

let wss;

function initializeWebSocket(server) {
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        console.log('[WebSocket] Client connected.');
        // Store configuration for the current connection
        ws.currentConfig = {};

        ws.on('message', async (message) => {
            // Try to parse the message as JSON.
            // If it succeeds, it's a control message (config or TTS).
            // If it fails, it's binary audio data.
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log('[WebSocket] Received JSON message:', parsedMessage);

                switch (parsedMessage.type) {
                    case 'audio_config':
                        // Store the purpose of the upcoming audio stream
                        ws.currentConfig.purpose = parsedMessage.purpose;
                        break;
                    case 'request_tts':
                        // Handle Text-to-Speech requests
                        console.log(`[TTS] Received request for text: "${parsedMessage.text.substring(0, 50)}..."`);
                        try {
                            const audioBuffer = await synthesizeSpeech(parsedMessage.text);
                            ws.send(audioBuffer, { binary: true });
                        } catch (error) {
                            console.error('[TTS] Error:', error);
                            ws.send(JSON.stringify({ type: 'error', data: 'Failed to synthesize speech.' }));
                        }
                        break;
                    default:
                        console.warn('[WebSocket] Received unknown JSON message type:', parsedMessage.type);
                }
            } catch (error) {
                // If JSON.parse fails, assume it's an audio buffer.
                if (Buffer.isBuffer(message)) {
                    console.log(`[STT] Received audio buffer for purpose: ${ws.currentConfig.purpose}`);
                    try {
                        const transcription = await transcribeAudio(message);
                        
                        // Send the transcription back to the client,
                        // with a different 'type' based on the original purpose.
                        if (ws.currentConfig.purpose === 'llm') {
                            ws.send(JSON.stringify({ type: 'llm_transcription_result', text: transcription }));
                        } else if (ws.currentConfig.purpose === 'modal') {
                            ws.send(JSON.stringify({ type: 'modal_transcription_result', text: transcription }));
                        } else if (ws.currentConfig.purpose === 'panel') {
                            // Corrected: Removed '+' typo
                            ws.send(JSON.stringify({ type: 'panel_transcription_result', text: transcription }));
                        }

                    } catch (sttError) {
                        console.error('[STT] Error:', sttError);
                        ws.send(JSON.stringify({ type: 'error', data: 'Failed to transcribe audio.' }));
                    }
                } else {
                    console.error('[WebSocket] Received unhandled message format.');
                }
            }
        });

        ws.on('close', () => console.log('[WebSocket] Client disconnected.'));
        ws.on('error', (err) => console.error('[WebSocket] Connection error:', err));
    });
}

module.exports = { initializeWebSocket };