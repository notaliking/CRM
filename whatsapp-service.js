const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const QRCode = require('qrcode');
const http = require('http');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const dbPath = path.resolve(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});
const prisma = new PrismaClient({ adapter });
const sessions = {};

const SESSIONS_DIR = process.env.SESSIONS_DIR 
  ? path.resolve(process.env.SESSIONS_DIR) 
  : path.join(__dirname, 'sessions');

// Helper to clean up session directory
function cleanSessionDir(userId) {
  const sessionPath = path.join(SESSIONS_DIR, userId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
}

// Initialize a WhatsApp connection for a user
async function initWhatsappSession(userId) {
  if (sessions[userId]) {
    console.log(`[Session] User ${userId} already has an active session instance.`);
    // Sync the pairing code to the database if the session is already active but unregistered
    const sock = sessions[userId];
    if (sock.authState && sock.authState.state && sock.authState.state.creds) {
      const creds = sock.authState.state.creds;
      if (!creds.registered && creds.pairingCode) {
        console.log(`[Session] Syncing existing pairing code ${creds.pairingCode} for user ${userId} to database.`);
        await prisma.user.update({
          where: { id: userId },
          data: { whatsappPairingCode: creds.pairingCode },
        });
      }
    }
    return;
  }

  console.log(`[Session] Starting WhatsApp session for user ${userId}...`);
  const sessionPath = path.join(SESSIONS_DIR, userId);
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true, // Also print to terminal for easy local debugging
  });

  sessions[userId] = sock;

  // Request a pairing code if the user has a WhatsApp number and is not registered
  if (!state.creds.registered) {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (dbUser && dbUser.whatsapp) {
      const phoneNumber = dbUser.whatsapp.replace(/\D/g, '');
      if (phoneNumber) {
        if (state.creds.pairingCode) {
          console.log(`[Session] Using existing WhatsApp Pairing Code from creds for user ${userId}: ${state.creds.pairingCode}`);
          await prisma.user.update({
            where: { id: userId },
            data: { whatsappPairingCode: state.creds.pairingCode },
          });
        } else {
          console.log(`[Session] Requesting WhatsApp Pairing Code for ${phoneNumber}...`);
          setTimeout(async () => {
            try {
              const code = await sock.requestPairingCode(phoneNumber);
              console.log(`[Session] Pairing Code generated for user ${userId}: ${code}`);
              await prisma.user.update({
                where: { id: userId },
                data: { whatsappPairingCode: code },
              });
            } catch (err) {
              console.error('[Session] Failed to request pairing code:', err);
            }
          }, 3000);
        }
      }
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[Session] New QR Code generated for user ${userId}.`);
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await prisma.user.update({
          where: { id: userId },
          data: { whatsappQr: qrDataUrl },
        });
      } catch (err) {
        console.error('[Session] Failed to generate QR data URL:', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Session] Connection closed for user ${userId}. Reconnecting:`, shouldReconnect);
      
      await prisma.user.update({
        where: { id: userId },
        data: { whatsappConnected: false, whatsappQr: null, whatsappPairingCode: null },
      });

      delete sessions[userId];

      if (shouldReconnect) {
        // Reconnect after a delay
        setTimeout(() => initWhatsappSession(userId), 5000);
      } else {
        // Logged out - clean up credentials
        cleanSessionDir(userId);
        await prisma.user.update({
          where: { id: userId },
          data: { whatsappBusinessId: null },
        });
      }
    } else if (connection === 'open') {
      console.log(`[Session] WhatsApp connection successfully opened for user ${userId}.`);
      const wabaId = sock.user.id.split(':')[0];
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          whatsappConnected: true,
          whatsappQr: null,
          whatsappPairingCode: null,
          whatsappBusinessId: wabaId,
        },
      });
    }
  });

  // Handle incoming/outgoing messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (!msg.message) continue;

      const contactPhone = msg.key.remoteJid.split('@')[0];
      if (msg.key.remoteJid.endsWith('@g.us')) continue; // Skip groups

      const isFromMe = msg.key.fromMe;
      const contactName = msg.pushName || contactPhone;
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   '[Media/Unsupported Message]';

      console.log(`[Message] Syncing WhatsApp message: fromMe=${isFromMe}, phone=${contactPhone}: ${text}`);

      try {
        let chat = await prisma.whatsappChat.findFirst({
          where: {
            userId,
            contactPhone,
          },
        });

        let currentMessages = [];
        if (chat) {
          try {
            currentMessages = JSON.parse(chat.messages);
          } catch (e) {
            currentMessages = [];
          }
        }

        const newMessage = {
          sender: isFromMe ? 'agent' : 'lead',
          text,
          time: new Date().toISOString(),
        };

        const updatedMessages = [...currentMessages, newMessage];

        if (chat) {
          await prisma.whatsappChat.update({
            where: { id: chat.id },
            data: {
              lastMessage: text,
              messages: JSON.stringify(updatedMessages),
            },
          });
        } else {
          await prisma.whatsappChat.create({
            data: {
              userId,
              contactName,
              contactPhone,
              lastMessage: text,
              messages: JSON.stringify(updatedMessages),
            },
          });
        }
      } catch (err) {
        console.error('[Session] Error saving message to database:', err);
      }
    }
  });

  // Sync historical chats and messages when session connects
  sock.ev.on('messaging-history.set', async ({ chats, messages }) => {
    const historicalChats = chats || [];
    const historicalMessages = messages || [];
    console.log(`[History] Received history set: ${historicalChats.length} chats, ${historicalMessages.length} messages.`);
    for (const chat of historicalChats) {
      if (chat.id.endsWith('@g.us')) continue; // Skip groups
      
      const contactPhone = chat.id.split('@')[0];
      const contactName = chat.name || contactPhone;
      
      // Find messages for this chat
      const chatMessages = historicalMessages
        .filter(m => m.key.remoteJid === chat.id && m.message)
        .map(m => {
          const isMe = m.key.fromMe;
          const text = m.message.conversation || 
                       m.message.extendedTextMessage?.text || 
                       '[Media/Unsupported Message]';
          return {
            sender: isMe ? 'agent' : 'lead',
            text,
            time: new Date(m.messageTimestamp * 1000).toISOString()
          };
        })
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      if (chatMessages.length === 0) continue;

      const lastMessage = chatMessages[chatMessages.length - 1].text;

      try {
        let existing = await prisma.whatsappChat.findFirst({
          where: { userId, contactPhone }
        });

        if (existing) {
          // Merge messages
          let currentMessages = [];
          try {
            currentMessages = JSON.parse(existing.messages);
          } catch (e) {}
          
          const merged = [...currentMessages];
          for (const msg of chatMessages) {
            if (!merged.some(m => m.text === msg.text && Math.abs(new Date(m.time) - new Date(msg.time)) < 5000)) {
              merged.push(msg);
            }
          }
          merged.sort((a, b) => new Date(a.time) - new Date(b.time));

          await prisma.whatsappChat.update({
            where: { id: existing.id },
            data: {
              lastMessage,
              messages: JSON.stringify(merged)
            }
          });
        } else {
          await prisma.whatsappChat.create({
            data: {
              userId,
              contactName,
              contactPhone,
              lastMessage,
              messages: JSON.stringify(chatMessages)
            }
          });
        }
      } catch (err) {
        console.error('[History] Error saving historical chat:', err);
      }
    }
  });
}


// Auto-restore active sessions on startup
async function restoreSessions() {
  try {
    const connectedUsers = await prisma.user.findMany({
      where: { whatsapp: { not: null } },
    });
    
    for (const user of connectedUsers) {
      // If session files exist, restore the connection automatically
      const sessionPath = path.join(SESSIONS_DIR, user.id);
      if (fs.existsSync(sessionPath)) {
        initWhatsappSession(user.id);
      }
    }
  } catch (err) {
    console.error('[Backup] Failed to restore sessions:', err);
  }
}

// Start HTTP Server to receive commands from Next.js
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { userId } = JSON.parse(body);
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'userId is required' }));
          return;
        }

        initWhatsappSession(userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Session initialization started.' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/disconnect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { userId } = JSON.parse(body);
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'userId is required' }));
          return;
        }

        const sock = sessions[userId];
        if (sock) {
          await sock.logout();
        } else {
          cleanSessionDir(userId);
          await prisma.user.update({
            where: { id: userId },
            data: { whatsappConnected: false, whatsappQr: null, whatsappBusinessId: null },
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Session disconnected.' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { chatId, message } = JSON.parse(body);
        if (!chatId || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'chatId and message are required' }));
          return;
        }

        const chat = await prisma.whatsappChat.findUnique({ where: { id: chatId } });
        if (!chat) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Chat not found' }));
          return;
        }

        const sock = sessions[chat.userId];
        if (!sock) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'WhatsApp session is not active for this agent.' }));
          return;
        }

        // Send message via Baileys (detect if it is a LID or a normal JID)
        const cleanPhone = chat.contactPhone.replace(/\D/g, '');
        const domain = (cleanPhone.startsWith('1') && cleanPhone.length > 12) ? 'lid' : 's.whatsapp.net';
        const jid = `${cleanPhone}@${domain}`;
        await sock.sendMessage(jid, { text: message });

        // Update local database
        const currentMessages = JSON.parse(chat.messages);
        const updatedMessages = [
          ...currentMessages,
          { sender: 'agent', text: message, time: new Date().toISOString() },
        ];

        await prisma.whatsappChat.update({
          where: { id: chatId },
          data: {
            lastMessage: message,
            messages: JSON.stringify(updatedMessages),
          },
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('[Send] Error sending message:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[Server] WhatsApp Background Integration Service running on http://localhost:${PORT}`);
  restoreSessions();
});
