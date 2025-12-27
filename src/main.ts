import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { config } from './config';

// Store current QR code as data URL for HTTP endpoint (production only)
export let currentQRImage: string | null = null;

const initWhatsapp = async (): Promise<Client> => {
  // Free tier: session stored in .wwebjs_auth (git-backed)
  // On Render, git restores the session automatically
  const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  });

  // QR Code event
  whatsappClient.on('qr', async (qr: string) => {
    console.log('\n========================================');
    console.log('📱 QR CODE RECEIVED');
    
    // In production (Render), direct to HTTP endpoint
    if (process.env.NODE_ENV === 'production') {
      const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com';
      console.log(`Scan QR at: ${renderUrl}/qr`);
    } else {
      console.log('Scan with WhatsApp (see QR code below)');
    }
    
    console.log('========================================\n');
    
    // Display in console (useful for development)
    qrcode.generate(qr, { small: true });
    
    // For production: generate QR image and store in memory for HTTP endpoint
    if (process.env.NODE_ENV === 'production') {
      try {
        currentQRImage = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 500,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (err) {
        console.error('Error generating QR image:', err);
      }
    }
  });

  // Message handler for commands
  whatsappClient.on('message', (msg: Message) => {
    if (config.DEBUG_MODE) {
      console.log(`[Message] ${msg.from}: ${msg.body}`);
    }
    
    if (msg.body === '!ping') {
      msg.reply('pong');
    }
  });

  // Client ready event
  whatsappClient.on('ready', () => {
    console.log('✓ WhatsApp client is ready!');
    if (config.WHATSAPP_NOTIFICATION_START) {
      whatsappClient.sendMessage(
        config.WHATSAPP_PHONE_NUMBER,
        'Roobai Web Scraper Started - Monitoring for offers!'
      ).catch(err => console.error('Failed to send start notification:', err));
    }
  });

  // Authentication failure
  whatsappClient.on('auth_failure', (msg: string) => {
    console.error('✗ Authentication failed:', msg);
  });

  // Disconnected event
  whatsappClient.on('disconnected', (reason: string) => {
    console.log('✗ Client disconnected:', reason);
  });

  // Initialize the client
  await whatsappClient.initialize();

  return whatsappClient;
};

export default initWhatsapp;
