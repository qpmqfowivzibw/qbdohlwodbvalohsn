const { command, isPrivate } = require("../../Framework/");
const { parsedJid } = require("../../Framework/Nexus/functions");
const { banUser, unbanUser, isBanned } = require("../Schema/ban");



command(
  {
    on: "message",
    fromMe: true,
    dontAddCommandList: true,
  },
  async (message, match) => {
    if (!message.isBaileys) return;
    const isban = await isBanned(message.jid);
    if (!isban) return;
    await message.reply("🚨 *Bot Usage Is Banned In This Chat*\n> You Will Be Removed");
    const jid = parsedJid(message.participant);
    return await message.client.groupParticipantsUpdate(
      message.jid,
      jid,
      "remove"
    );
  }
);

command(
  {
    pattern: "banbots",
    fromMe: true,
    desc: "ban bot from a chat",
    type: "user",
  },
  async (message, match) => {
    const chatid = message.jid;
    const isban = await isBanned(chatid);
    await console.log(message.quoted)
    if (isban) {
      return await message.sendMessage(message.jid, "*⚠️ Bots are already banned in this chat*");
    }
    await banUser(chatid);
    return await message.sendMessage(message.jid, "*✅ Bot has been successfully banned in this chat*");
  }
);

command(
  {
    pattern: "unbanbots",
    fromMe: true,
    desc: "Unban bot from a chat",
    type: "user",
  },
  async (message, match) => {
    const chatid = message.jid;
    const isban = await isBanned(chatid);
    if (!isban) {
      return await message.sendMessage(message.jid, "*⚠️ Bots are not banned in this chat*");
    }
    await unbanUser(chatid);
    return await message.sendMessage(message.jid, "*✅ Bot has been successfully unbanned in this chat*");
  }
);
