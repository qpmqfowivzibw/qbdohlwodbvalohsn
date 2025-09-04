const config = require("../../config")
const { command, serialize } = require("../../Framework");
const { loadMessage, getName } = require("../Schema/StoreDb");

command(
  {
    on: "delete",
    fromMe: false,
    desc: "Logs the recently deleted message",
  },
  async (message) => {
    if (!config.ANTI_DELETE) return;

    const path = config.ANTI_DELETE_PATH;

    // If unset
    if (!path) {
      return await message.sendMessage(
        message.user,
        "⚠️ Please set *ANTI_DELETE_PATH* in ENV to enable deleted message logging."
      );
    }

    if (!message?.key || typeof message.key.fromMe === "undefined") return;
    if (message.key.fromMe) return;

    // Load deleted message from cache
    let msg;
    try {
      msg = await loadMessage(message.messageId);
      if (!msg) return;
    } catch (err) {
      console.error(`[DELETE] Error loading deleted message:`, err);
      return;
    }

    // Serialize
    try {
      msg = await serialize(JSON.parse(JSON.stringify(msg.message)), message.client);
    } catch (e) {
      console.error(`[DELETE] Failed to serialize message:`, e);
      return;
    }

    // Prepare content
    let content = {};
    const m = msg.message || {};
    const type = Object.keys(m)[0];
    const unsupportedTypes = ["senderKeyDistributionMessage", "protocolMessage"];
    if (!type || unsupportedTypes.includes(type)) return;

    try {
      if (m.conversation || m.extendedTextMessage) {
        content.text = m.conversation || m.extendedTextMessage?.text || "_[Empty text]_";
      } else if (m.imageMessage) {
        const buffer = await msg.download();
        content.image = buffer;
        content.caption = m.imageMessage.caption || "";
      } else if (m.videoMessage) {
        const buffer = await msg.download();
        content.video = buffer;
        content.caption = m.videoMessage.caption || "";
      } else if (m.audioMessage) {
        const buffer = await msg.download();
        content.audio = buffer;
        content.mimetype = m.audioMessage.mimetype;
        content.ptt = m.audioMessage.ptt || false;
      } else if (m.stickerMessage) {
        const buffer = await msg.download();
        content.sticker = buffer;
      } else if (m.documentMessage) {
        const buffer = await msg.download();
        content.document = buffer;
        content.fileName = m.documentMessage.fileName || "file";
        content.mimetype = m.documentMessage.mimetype || "application/octet-stream";
      } else {
        content.text = "_[Unsupported message type]_";
      }
    } catch (err) {
      console.error(`[DELETE] Error preparing media:`, err);
      return;
    }

    // Decide destination
    let destination;
    if (path === "chat") {
      destination = msg.key.senderPn || msg.key?.participantPn || msg.key?.participant;
    } else if (path === "private") {
      destination = message.user;
    } else if (path.endsWith(".net") || path.endsWith(".us")) {
      destination = path;
    } else {
      // Invalid path
      await message.sendMessage(
        message.user,
        "⚠️ Invalid *ANTI_DELETE_PATH* value.\nIt must be either `chat`, `private`, or a valid JID ending with `.net` or `.us`."
      );
      return;
    }

    // Forward the deleted message
    let forwarded;
    try {
      forwarded = await message.client.sendMessage(destination, content, { quoted: msg });
    } catch (err) {
      console.error(`[DELETE] Failed to send forwarded message:`, err);
      return;
    }

    // Extract sender details
    const senderJid = msg.key.senderPn || msg.key?.participantPn || msg.key?.participant;
    const senderNum = senderJid?.split("@")[0];
    const mentions = [senderJid];

    // Get name info
    let nameInfo;
    try {
      if (msg.from.endsWith("@g.us")) {
        const groupMeta = await message.client.groupMetadata(msg.from);
        const senderName = await getName(senderJid);
        nameInfo = `\`👥 Group\` : \`\`\`${groupMeta.subject}\`\`\`\n\`📝 Name\` : \`\`\`${senderName}\`\`\``;
      } else {
        const senderName = await getName(senderJid);
        nameInfo = `\`📝 Name\` : \`\`\`${senderName}\`\`\``;
      }
    } catch (e) {
      console.error("[DELETE] Error fetching name info:", e);
      nameInfo = "`📝 Name` : _Unknown_";
    }

    // Build log message
    const logText = `_🗑️ Message Deleted_\n\`👤 From\` : @${senderNum}\n${nameInfo}\n\`💻 SenderJid\` : \`\`\`${senderJid}\`\`\``;

    // Send log quoting forwarded message
    try {
      await message.client.sendMessage(
        destination,
        { text: logText, mentions },
        { quoted: forwarded }
      );
    } catch (err) {
      console.error(`[DELETE] Failed to send log message:`, err);
    }
  }
);