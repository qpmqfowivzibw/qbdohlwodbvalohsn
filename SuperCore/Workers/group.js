const { command } = require("../../Framework");
const { isAdmin, parsedJid } = require("../../Framework");
const path = require("path");
const fs = require("fs");
const { tmpdir } = require("os");

// ✅ Helper: Check group & admin status
async function groupAdminCheck(message) {
  if (!message.isGroup) {
    await message.reply("❌ *This command can only be used in groups.*");
    return false;
  }
  const chatId = message.jid;

  const admin = await isAdmin(chatId, message.key.participant || message.sender, message.client);
  if (!admin) {
    await message.reply("🛑 *I need admin rights to perform this action.*");
    return false;
  }

  return true;
}

// ➕ ADD
command(
  {
    pattern: "add",
    fromMe: true,
    desc: "➕ Add a member to the group",
    type: "group",
  },
  async (message, match) => {
    if (!(await groupAdminCheck(message))) return;

    const target = match || message.reply_message?.jid;
    if (!target) return await message.reply("⚠️ *Mention or reply to a user to add.*");

    const jids = parsedJid(target);
    await message.client.groupParticipantsUpdate(message.jid, jids, "add");

    return await message.reply(`✅ *Added:* @${jids[0].split("@")[0]}`, {
      mentions: jids,
    });
  }
);

// ❌ KICK
command(
  {
    pattern: "kick",
    fromMe: true,
    desc: "❌ Remove a member from the group",
    type: "group",
  },
  async (message, match) => {
    if (!(await groupAdminCheck(message))) return;

    const target = match || message.reply_message?.jid;
    if (!target) return await message.reply("⚠️ *Mention or reply to a user to remove.*");

    const jids = parsedJid(target);
    await message.client.groupParticipantsUpdate(message.jid, jids, "remove");

    return await message.reply(`👢 *Removed:* @${jids[0].split("@")[0]}`, {
      mentions: jids,
    });
  }
);

// ⬆️ PROMOTE
command(
  {
    pattern: "promote",
    fromMe: true,
    desc: "⬆️ Promote a member to admin",
    type: "group",
  },
  async (message, match) => {
    if (!(await groupAdminCheck(message))) return;

    const target = match || message.reply_message?.jid;
    
    console.log(message.reply_message)
    if (!target) return await message.reply("⚠️ *Mention or reply to a user to promote.*");

    const jids = parsedJid(target);
    await message.client.groupParticipantsUpdate(message.jid, jids, "promote");

    return await message.reply(`🛡️ *Promoted:* @${jids[0].split("@")[0]}`, {
      mentions: jids,
    });
  }
);

// ⬇️ DEMOTE
command(
  {
    pattern: "demote",
    fromMe: true,
    desc: "⬇️ Demote an admin to member",
    type: "group",
  },
  async (message, match) => {
    if (!(await groupAdminCheck(message))) return;

    const target = match || message.reply_message?.jid;
    if (!target) return await message.reply("⚠️ *Mention or reply to a user to demote.*");

    const jids = parsedJid(target);
    await message.client.groupParticipantsUpdate(message.jid, jids, "demote");

    return await message.reply(`📉 *Demoted:* @${jids[0].split("@")[0]}`, {
      mentions: jids,
    });
  }
);

// 🔇 MUTE GROUP
command(
  {
    pattern: "mute",
    fromMe: true,
    desc: "🔇 Mute the group (only admins can send messages)",
    type: "group",
  },
  async (message) => {
    if (!(await groupAdminCheck(message))) return;

    await message.client.groupSettingUpdate(message.jid, "announcement");
    return await message.reply("🔇 *Group is now muted. Only admins can send messages.*");
  }
);

// 🔊 UNMUTE GROUP
command(
  {
    pattern: "unmute",
    fromMe: true,
    desc: "🔊 Unmute the group (everyone can send messages)",
    type: "group",
  },
  async (message) => {
    if (!(await groupAdminCheck(message))) return;

    await message.client.groupSettingUpdate(message.jid, "not_announcement");
    return await message.reply("🔊 *Group is now unmuted. Everyone can send messages.*");
  }
);

// 🆔 GJID
command(
  {
    pattern: "gjid",
    fromMe: true,
    desc: "🆔 Show all member JIDs",
    type: "group",
  },
  async (message) => {
    if (!message.isGroup) return await message.reply("❌ *Group-only command.*");

    const { participants } = await message.client.groupMetadata(message.jid);
    const lines = participants.map((p, i) => `🔹 ${i + 1}. \`${p.id}\``).join("\n");

    await message.reply(`📄 *Group Members JIDs:*\n\n${lines}`);
  }
);

// 🏷️ TAGALL
command(
  {
    pattern: "tagall",
    fromMe: true,
    desc: "🏷️ Mention all group members",
    type: "group",
  },
  async (message) => {
    if (!message.isGroup) return;
    if (!(await groupAdminCheck(message))) return;

    const { participants } = await message.client.groupMetadata(message.jid);
    const mentions = participants.map((u) => u.id);
    const tags = mentions.map((id) => `@${id.split("@")[0]}`).join("\n");

    await message.sendMessage(message.jid, `👥 *Everyone:*\n${tags}`, {
      mentions,
    });
  }
);

// 🏷️ TAG [message or reply]
command(
  {
    pattern: "tag",
    fromMe: true,
    desc: "📢 Mention all with custom message",
    type: "group",
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return;
    if (!(await groupAdminCheck(message))) return;

    let text = "";

    if (typeof match === "string" && match.trim()) {
      text = match.trim();
    } else if (message.reply_message) {
      const msg = message.reply_message;
      if (msg.text) text = msg.text;
      else if (msg.image?.caption) text = msg.imageMessage.caption;
      else if (msg.video?.caption) text = msg.videoMessage.caption;
    }

    if (!text) {
      return await message.reply("⚠️ *Provide or reply to a text-based message to tag everyone.*");
    }

    const groupData = await message.client.groupMetadata(message.jid);
    const mentions = groupData.participants.map((u) => u.id);

    const announcement = `📢 *ANNOUNCEMENT*\n\`\`\`${text}\`\`\``;
    return await message.sendMessage(message.jid, announcement, { mentions });
  }
);


command(
  {
    pattern: "mediamention",
    fromMe: true,
    desc: "📎 Mention all members with a replied media message",
    type: "group",
  },
  async (message, match, m) => {
    if (!message.isGroup) return message.reply("❌ *This command can only be used in groups.*");
    if (!(await groupAdminCheck(message))) return;

    const r = message.reply_message || m.quoted;
    if (!r) {
      return message.reply(
        `📢 *Media Mention*\n\n` +
        `> Reply to an *image*, *video*, *sticker*, or *audio* message with:\n` +
        `\`\`\`.mediamention\`\`\``
      );
    }

    const mediaType =
      r.image ? "image" :
      r.video ? "video" :
      r.sticker ? "sticker" :
      r.audio ? "audio" :
      null;

    if (!mediaType) {
      return await message.reply("⚠️ *Only image, video, sticker, or audio messages are allowed.*");
    }

    const participants = (await message.client.groupMetadata(message.jid)).participants;
    const mentions = participants.map((u) => u.id);

    try {
      const buffer = await m.quoted.download();
      await message.client.sendMessage(
        message.jid,
        { [mediaType]: buffer, mentions }
      );
    } catch (err) {
      return message.reply("❌ *Failed to send media with mentions.*");
    }
  }
);


command(
  {
    pattern: "vcf",
    fromMe: true,
    desc: "📇 Export all group members as a VCF contact file",
    type: "group",
  },
  async (message, match, m) => {
    if (!message.isGroup) {
      return await message.reply("❌ *This command only works in groups.*");
    }
    
    if (!(await groupAdminCheck(message))) return;

    const groupMetadata = await message.client.groupMetadata(message.jid);
    const participants = groupMetadata.participants;

    

    await message.reply(`⏳ *Preparing contact file for ${participants.length} members...*`);

    let vcardData = "";
    participants.forEach((member, index) => {
      const number = member.id.split("@")[0];
      vcardData += `BEGIN:VCARD\n` +
                   `VERSION:3.0\n` +
                   `FN:[${index + 1}] +${number}\n` +
                   `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n` +
                   `END:VCARD\n`;
    });

    const filePath = "./contacts.vcf";
    fs.writeFileSync(filePath, vcardData.trim());

    await message.client.sendMessage(message.jid, {
      document: fs.readFileSync(filePath),
      mimetype: "text/vcard",
      fileName: `${groupMetadata.subject}_Contacts.vcf`,
      caption:
        `📇 *Group Contacts Exported*\n\n` +
        `🏷️ *Group:* ${groupMetadata.subject}\n` +
        `👥 *Members:* ${participants.length}`,
    },);

    fs.unlinkSync(filePath);
  }
);
