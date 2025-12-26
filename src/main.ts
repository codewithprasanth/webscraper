import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';

const initWhatsapp = async (): Promise<Client> => {
  // Use persistent storage path on Render
  const authPath = process.env.NODE_ENV === 'production'
    ? '/var/lib/roobai/.wwebjs_auth'
    : './.wwebjs_auth';

  const whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath,
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  });

  // QR Code event
  whatsappClient.on('qr', (qr: string) => {
    console.log('\n========================================');
    console.log('QR CODE RECEIVED - Scan with WhatsApp');
    console.log('========================================\n');
    qrcode.generate(qr, { small: true });
    
    // Save QR to file for debugging
    try {
      const qrDir = path.dirname(authPath);
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
      const qrPath = path.join(qrDir, 'qr_code.txt');
      fs.writeFileSync(qrPath, qr);
      console.log(`ℹ️  QR Code saved to: ${qrPath}`);
    } catch (err) {
      console.error('Failed to save QR code:', err);
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
