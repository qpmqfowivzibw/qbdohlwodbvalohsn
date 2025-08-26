const originalLog = console.log;
const originalError = console.error;
const originalDebug = console.debug;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

function isNoisy(message) {
  return typeof message === "string" && (
    message.includes("Bad MAC") ||
    message.includes("Removing old closed session") ||
    message.includes("Closing open session") ||
    message.includes("Closing stale open session") ||
    message.includes("Closing session") ||
    message.includes("Decrypted message with closed session.") ||
    message.includes("Failed to decrypt message with any known session") ||
    message.includes("MessageCounterError: Key used already or never filled") ||
    message.includes("SessionCipher.doDecryptWhisperMessage") ||
    message.includes("SessionCipher.decryptWithSessions") ||
    message.includes("Error \n    at Database.<anonymous>") ||
    // Add Sequelize unique constraint error patterns
    message.includes("SequelizeUniqueConstraintError") ||
    message.includes("unique violation") ||
    message.includes("id must be unique") ||
    message.includes("duplicate key value violates unique constraint") ||
    message.includes("Chats_pkey") ||
    message.includes("_bt_check_unique")
  );
}

// Console overrides
console.log = (...args) => {
  if (isNoisy(args[0])) return;
  originalLog.apply(console, args);
};

console.error = (...args) => {
  if (isNoisy(args[0])) return;
  originalError.apply(console, args);
};

console.debug = (...args) => {
  if (isNoisy(args[0])) return;
  originalDebug.apply(console, args);
};

// Direct stdout/stderr stream overrides
process.stdout.write = (chunk, encoding, callback) => {
  if (isNoisy(chunk)) return true;
  return originalStdout.call(process.stdout, chunk, encoding, callback);
};

process.stderr.write = (chunk, encoding, callback) => {
  if (isNoisy(chunk)) return true;
  return originalStderr.call(process.stderr, chunk, encoding, callback);
};

const pino = require("pino");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const NodeCache = require("node-cache");
const msgRetryCounterCache = new NodeCache();
const util = require("util");
const plugins = require("./plugins");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  delay,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  areJidsSameUser,
  generateWAMessage,
  proto
} = require("baileys");
const { Boom } = require("@hapi/boom");
const { PausedChats } = require("../../SuperCore/Schema");
const config = require("../../config");
const { downloadMediaMessage } = require("baileys");
const { serialize, Greetings, downloadMedia } = require("../index");
const { Image, Message: CustomMessage, Sticker, Video, AllMessage } = require("../Infrastructure");
const {
  loadMessage,
  saveMessage,
  saveChat,
  getName,
} = require("../../SuperCore/Schema/StoreDb");

const { getStickerCommand, normalizeHash } = require("../../SuperCore/Schema/setcmd");

const { getcall } = require("../../SuperCore/Schema/callDb");

const logger = pino({ level: "fatal" });
const sessionDir = "./DraculaMd";

const pairingNumber = process.env.PAIR_NUMBER || config.PAIR_NUMBER;
const usePairingCode = !!pairingNumber;

if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

// Helper function for user input
const question = (prompt) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const handleError = async (err, conn, type) => {
  const error = util.format(err);
  return;
};

const connect = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__basedir, sessionDir)
  );
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    auth: state,
    printQRInTerminal: !usePairingCode,
    logger,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: true,
    markOnlineOnConnect: true,
    version: [2, 3000, 1023223821],
    emitOwnEvents: true,
    msgRetryCounterCache,
    getMessage: async (key) =>
      (loadMessage(key.id) || {}).message || { conversation: null },
  });

 
  conn.ev.on("call", async (c) => {
    try {
      const callList = await getcall(); // array of strings
      const isAllBlocked = callList.includes("all");

      c = Array.isArray(c) ? c[0] : c;
      const { status, from, id } = c;
      let frmid = "";

      if (from && typeof from === "string") {
        frmid = from.includes(":") ? from.split(":")[0] : from.split("@")[0];
      }

      const isBlocked = isAllBlocked || callList.some(item => item.split("@")[0] === frmid);

      if (status === "offer") {
        if (isBlocked) {
          await conn.rejectCall(id, from);
          await conn.sendMessage(from, {
            text: config.ANTICALL_MESSAGE || "🚫 Sorry, calls are blocked. Use text or voice messages.\n> Automated System"
          });
        }
      }
    } catch (error) {
      console.error("❌ Error handling call event:", error);
    }
  });
 
  conn.ev.on("connection.update", handleConnectionUpdate(conn));
  conn.ev.on("creds.update", saveCreds);
  conn.ev.on("group-participants.update", async (data) =>
    Greetings(data, conn)
  );
  conn.ev.on("chats.update", async (chats) => chats.forEach(saveChat));
  conn.ev.on("messages.upsert", handleMessages(conn));
  

  process.on("unhandledRejection", (err) =>
    handleError(err, conn, "unhandledRejection")
  );
  process.on("uncaughtException", (err) =>
    handleError(err, conn, "uncaughtException")
  );

  return conn;
};

const handleConnectionUpdate = (conn) => async (s) => {
  const { connection, lastDisconnect } = s;

  switch (connection) {
    case "connecting":
      console.log("Connecting to WhatsApp... Please Wait.");
      break;
    case "open":
      console.log("Login Successful!");
      const packageVersion = require("../../package.json").version;
      const totalPlugins = plugins.commands.length;
      const workType = config.WORK_TYPE;
      const statusMessage = `
╭───「 *Dracula-Md* 」───✦
│ ✅ *Connected*
│ 🔄 *Version* : \`V[${packageVersion}]\`
│ 🔌 *Plugins* : \`${totalPlugins}\`
│ ⚙️ *Worktype* : \`${workType}\`
╰─────────────────────✦
`.trim();
      await conn.sendMessage(conn.user.id, { text: statusMessage });
      break;
    case "close":
      const reconnectRequired =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      reconnectRequired ? reconnect(conn) : exitApp();
      break;
    default:
      break;
  }
};

const handleMessages = (conn) => async (m) => {
  if (m.type !== "notify") return;

  const msg = await serialize(JSON.parse(JSON.stringify(m.messages[0])), conn);
  await saveMessage(m.messages[0], msg.sender);

  if (config.AUTO_READ) {
    await conn.readMessages([msg.key]);
  }

  if (config.AUTO_STATUS_READ && msg.from === "status@broadcast") {
    const type = msg.type;

    const allowedTypes = [
      "imageMessage",
      "videoMessage",
      "audioMessage",
      "conversation",
      "extendedTextMessage",
      "protocolMessage"
    ];

    if (allowedTypes.includes(type)) {
      await conn.readMessages([msg.key]);
    }
  }

  if (
    config.STATUS_SAVER &&
    msg.from === "status@broadcast" &&
    !msg.key.fromMe
  ) {
    try {
      const clonedMsg = JSON.parse(JSON.stringify(msg));
      const type = clonedMsg.type;

      const allowedTypes = [
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "conversation",
        "extendedTextMessage",
        "protocolMessage"
      ];

      if (!allowedTypes.includes(type)) return;

      let forwardContent = {};
      let media = null;

      if (["imageMessage", "videoMessage", "audioMessage"].includes(type)) {
        try {
          const messageContent = clonedMsg.message[type];
          const stream = await downloadMediaMessage(
            { message: { [type]: messageContent } },
            "buffer"
          );
          media = stream;
        } catch (e) {
          console.warn("[STATUS_SAVER] Media download failed:", e.message);
          return;
        }

        if (!media) return;
      }

      if (type === "imageMessage") {
        forwardContent = {
          image: media,
          caption: clonedMsg.message.imageMessage.caption || ""
        };
      } else if (type === "videoMessage") {
        forwardContent = {
          video: media,
          caption: clonedMsg.message.videoMessage.caption || ""
        };
      } else if (type === "audioMessage") {
        forwardContent = {
          audio: media,
          mimetype: clonedMsg.message.audioMessage.mimetype || "audio/ogg"
        };
      } else if (type === "conversation" || type === "extendedTextMessage") {
        forwardContent = {
          text: clonedMsg.body || "*📩 Empty status text*"
        };
      }

      if (Object.keys(forwardContent).length > 0) {
        await conn.sendMessage(conn.user.id, forwardContent, {
          quoted: clonedMsg
        });
      }

    } catch (err) {
      console.error("[STATUS_SAVER] Error forwarding status:", err.message);
    }
  }

  // Auto status reaction logic
  if (config.AUTO_STATUS_REACT && config.AUTO_STATUS_READ) {
    try {
      const isStatus = msg.from === "status@broadcast";
      const isNotFromMe = !msg.key.fromMe;
      const type = msg.type;

      const allowedTypes = [
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "conversation",
        "extendedTextMessage",
        "protocolMessage"
      ];

      if (isStatus && isNotFromMe && allowedTypes.includes(type)) {
        let emojis = config.STATUS_REACT_EMOJI || [];
        let reactionEmoji = "🫩"; 

        if (Array.isArray(emojis) && emojis.length > 0) {
          reactionEmoji = emojis.length === 1
            ? emojis[0]
            : emojis[Math.floor(Math.random() * emojis.length)];
        }

        const participant = msg.key.participant || msg.participant;
        const botJid = conn.user.id;
        const messageId = msg.key.id;
        const remoteJid = msg.key.remoteJid;

        if (participant && messageId && remoteJid) {
          await conn.sendMessage(
            "status@broadcast",
            {
              react: {
                key: {
                  id: messageId,
                  remoteJid: remoteJid,
                  participant: participant,
                },
                text: reactionEmoji,
              },
            },
            {
              statusJidList: [participant, botJid],
            }
          );
        }
      }
    } catch (err) {
      console.error("[AUTO_STATUS_REACT] Reaction failed:", err.message);
    }
  }

  processMessage(msg, conn, m);
};

const reconnect = async (conn) => {
  console.log("♻️ Reconnecting...");
  await delay(2000);
  connect();
};

// Exit application after delay
const exitApp = async () => {
  console.log("🔗 Connection closed. Device logged out.");
  await delay(3000);
  process.exit(0);
};

const processMessage = async (msg, conn, m) => {
  if (!msg) return;

  const isMediaType = ["stickerMessage", "imageMessage", "videoMessage", "protocolMessage"].includes(msg.type);
  if (!msg.body && !isMediaType) return;

  const chatId = msg.from;
  const pausedChats = await PausedChats.getPausedChats();
  const regex = new RegExp(`${config.PREFIX}( ?resume)`, "is");
  if (
    pausedChats.some(
      (pausedChat) => pausedChat.chatId === chatId && !regex.test(msg.body)
    )
  )
    return;

  if (config.LOGS) logMessage(msg, conn);
  
  if (msg.type === 'stickerMessage') {
    const sha256 = msg.message?.stickerMessage?.fileSha256;
    if (!sha256) return;
    
    const hash = normalizeHash(sha256);
    const stickerCmd = await getStickerCommand(hash);
    if (!stickerCmd) return;
    
    try {
      const commandText = stickerCmd.command.startsWith(config.PREFIX)
        ? stickerCmd.command
        : config.PREFIX + stickerCmd.command;

      const quotedInfo = msg.message?.stickerMessage?.contextInfo;

      const commandMsg = {
        ...msg,
        message: {
          extendedTextMessage: {
            text: commandText,
            contextInfo: {
              mentionedJid: quotedInfo?.mentionedJid || [],
              quotedMessage: quotedInfo?.quotedMessage,
              participant: quotedInfo?.participant,
              stanzaId: quotedInfo?.stanzaId,
              remoteJid: msg.from,
            },
          },
        },
        body: commandText,
        type: 'conversation',
        mtype: 'conversation',
        isCommand: true,
        command: commandText.split(' ')[0].replace(config.PREFIX, ''),
        prefix: config.PREFIX,
      };

      // Execute the command
      const whats = new CustomMessage(conn, commandMsg);
      const matchedCommand = plugins.commands.find(cmd => 
        cmd.pattern && commandText.match(cmd.pattern)
      );
      
      if (matchedCommand) {
        if (config.CMD_REACT) await reactToMessage(conn, msg, "✅");

        await matchedCommand.function(
          whats, 
          commandText.replace(matchedCommand.pattern, '').trim(),
          commandMsg,
          conn,
          m
        );

        if (config.CMD_REACT) {
          await reactToMessage(conn, msg, "", true);
        }
      }
    } catch (error) {
      console.error('[STICKER CMD] Processing failed:', error);
    }
    return;
  }

  executeCommand(msg, conn, m);
};

const logMessage = async (msg, conn) => {
  const senderJid = msg.sender || msg.key?.participant || msg.key?.remoteJid || "unknown@s.whatsapp.net";
  const name = await getName(senderJid);
  const isGroup = msg.from?.endsWith("@g.us");

  let groupName = "Private Chat";
  if (isGroup) {
    try {
      groupName = (await conn.groupMetadata(msg.from)).subject;
    } catch {
      groupName = "Unknown Group";
    }
  }

  const output = isGroup
    ? `
╔═════[ ✘ DRACULA-MD LOG ✘ ]═════╗
║ ◉ Group  ➤ ${groupName}
║ ◉ Sender ➤ ${name}
║ ◉ JID ➤ ${senderJid.split("@")[0]}
║ ◉ Message ➤ ${msg.body || "N/A"}
╚═══════════════════════════════╝
`
    : `
╔═════[ ✘ DRACULA-MD LOG ✘ ]═════╗
║ ◉ Sender ➤ ${name}
║ ◉ JID ➤ ${senderJid.split("@")[0]}
║ ◉ Message ➤ ${msg.body || "N/A"}
╚═══════════════════════════════╝
`;

  console.log(output.trim());
};

const reactToMessage = async (conn, msg, emoji, remove = false) => {
  try {
    if (!msg.key || !msg.key.id) return;

    // Only send the emoji immediately if it's not removal
    if (!remove) {
      await conn.sendMessage(msg.key.remoteJid, {
        react: {
          text: emoji,
          key: msg.key,
        },
      });
    }

    // Schedule removal
    if (remove) {
      setTimeout(async () => {
        try {
          await conn.sendMessage(msg.key.remoteJid, {
            react: {
              text: "", // remove
              key: msg.key,
            },
          });
        } catch (e) {
          console.error("[CMD_REACT] Failed to remove reaction:", e.message);
        }
      }, 5000);
    }

  } catch (e) {
    console.error("[CMD_REACT] Reaction failed:", e.message);
  }
};

const executeCommand = (msg, conn, m) => {
  plugins.commands.forEach(async (command) => {
    if (command.fromMe && !msg.sudo) return;
    if (config.WORK_TYPE === 'private' && !msg.sudo && command.fromMe !== false) return;

    const handleCommand = (Instance, args) => {
      const whats = new Instance(conn, msg);
      command.function(whats, ...args, msg, conn, m);
    };

    const text_msg = msg.body;

    // ✅ Handle text commands with pattern
    if (text_msg && command.pattern) {
      const iscommand = text_msg.startsWith(config.PREFIX)
        ? text_msg.match(command.pattern)
        : null;

      if (iscommand) {
        const matchedCommand = `${iscommand[1]}${iscommand[2]}`;
        const inputCommand = text_msg.split(/\s+/)[0];

        // Only run if the command exactly matches the first word
        if (matchedCommand === inputCommand) {
          msg.prefix = iscommand[1];
          msg.command = matchedCommand;
          if (config.CMD_REACT) await reactToMessage(conn, msg, "✅");

          await handleCommand(CustomMessage, [text_msg.slice(matchedCommand.length).trim() || false]);

          if (config.CMD_REACT) {
            await reactToMessage(conn, msg, "", true); // remove after 5s
          }
        }
      }
    }

    // ✅ Handle sticker commands (even without pattern/text)
    else if (
      command.on === "sticker" &&
      msg.type === "stickerMessage" &&
      (!command.pattern || !text_msg)
    ) {
      handleCommand(Sticker, []);
    }

    // ✅ Fallback for other media/text handlers
    else {
      handleMediaCommand(command, msg, text_msg, handleCommand, conn);
    }
  });
};

const handleMediaCommand = (command, msg, text_msg, handleCommand, conn) => {
  switch (command.on) {
    case "text":
      if (text_msg) handleCommand(CustomMessage, [text_msg]);
      break;
    case "image":
      if (msg.type === "imageMessage") handleCommand(Image, [text_msg]);
      break;
    case "sticker":
      if (msg.type === "stickerMessage") handleCommand(Sticker, []);
      break;
    case "video":
      if (msg.type === "videoMessage") handleCommand(Video, []);
      break;
    case "delete":
      if (msg.type === "protocolMessage") {
        const whats = new CustomMessage(conn, msg);
        whats.messageId = msg.message.protocolMessage.key?.id;
        command.function(whats, msg, conn);
      }
      break;
    case "message":
      handleCommand(AllMessage, []);
      break;
    default:
      break;
  }
};

module.exports = connect;