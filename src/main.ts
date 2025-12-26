import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { config } from './config';

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
  whatsappClient.on('qr', (qr: string) => {
    console.log('\n========================================');
    console.log('QR CODE RECEIVED - Scan with WhatsApp');
    console.log('========================================\n');
    qrcode.generate(qr, { small: true });
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
