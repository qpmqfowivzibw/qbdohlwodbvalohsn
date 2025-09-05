const {
  command,
  qrcode,
  Bitly,
  identifyAudio,
  isPrivate,
  isUrl,
  readQr,
} = require("../../Framework/");
const { downloadMediaMessage } = require("baileys");
const { getLyrics } = require("../../Framework/Nexus/functions");
const config = require("../../config");
const path = require("path");
const fs = require("fs");
const { tmpdir } = require("os");
const axios = require('axios');
const crypto = require('crypto')



command(
  {
    pattern: "vv",
    fromMe: true,
    desc: "👁️‍🗨️ Forwards view-once message",
    type: "tool",
  },
  async (message, match, m) => {
    try {
      const media = await m.quoted.download();
      return await message.sendFile(media);
    } catch (e) {
      return await message.reply("❌ Failed to forward. Make sure you're replying to a *view-once* message.");
    }
  }
);


command(
  {
    pattern: "shazam",
    fromMe: true,
    desc: "🎵 Identify a song from replied audio",
    type: "tool",
  },
  async (message, match, m) => {
    const r = message.reply_message || m.quoted;

    if (!r || (!r.audio && !r.voice)) {
      return await message.reply("```⚠️ │ Reply to an audio or voice message!```");
    }

    try {
      const tempPath = path.join(tmpdir(), `acr_${Date.now()}.mp3`);
      const mediaBuffer = await m.quoted.download();
      fs.writeFileSync(tempPath, mediaBuffer);

      const result = await identifyAudio(tempPath);
      fs.unlinkSync(tempPath);

      if (
        result.status?.code !== 0 ||
        !result.metadata?.music?.length
      ) {
        return await message.reply("❌ *Couldn’t identify the song*");
      }

      const music = result.metadata.music[0];
      const title = music.title || "Unknown";
      const artists = (music.artists || []).map(a => a.name).join(", ");
      const album = music.album?.name || "Unknown";
      const releaseDate = music.release_date || "Unknown";

      await message.reply(
        `🎶 *Song Identified!*\n` +
        `🎵 *Title:* ${title}\n` +
        `🧑‍🎤 *Artist(s):* ${artists}\n` +
        `💽 *Album:* ${album}\n` +
        `📅 *Release:* ${releaseDate}`
      );
    } catch (e) {
      await message.reply("```❌ │ Error identifying audio.```");
    }
  }
);

command(
  {
    on: "text",
    fromMe: false,
    desc: "💾 Save or resend status (via keywords)",
    dontAddCommandList: true,
    type: "tool",
  },
  async (message, match, m) => {
    try {
      if (message.isGroup) return;
      const keywords = ["save", "send", "sent", "abeg", "give", "snd"];
      const trigger = match.toLowerCase().split(" ")[0];
      if (keywords.some(k => trigger.includes(k))) {
        if (!m.quoted) return;
        await console.log(message.jid)
        await console.log(message.quoted)
        return await message.client.relayMessage(
          message.jid,
          m.quoted.message,
          { messageId: m.quoted.key.id }
        );
      }
    } catch (err) {
      console.error("[StatusSaver Error]:", err);
    }
  }
);

command(
  {
    pattern: "qr",
    fromMe: true,
    desc: "📷 Read or generate QR codes",
    type: "tool",
  },
  async (message, match, m) => {
    match = match || message.reply_message?.text;

    if (match) {
      const img = await qrcode(match);
      return await message.sendMessage(message.jid, img, {}, "image");
    }

    if (message.reply_message?.image) {
      const buffer = await m.quoted.download();
      return readQr(buffer)
        .then(data => message.sendMessage(message.jid, `📄 *QR Content:*\n\`\`\`\n${data}\n\`\`\``))
        .catch(err => message.reply("❌ Failed to read QR code."));
    }

    return await message.reply("📌 *Usage:* `qr yourText`\n📸 Or reply to a QR code image.");
  }
);

command(
  {
    pattern: "freefire",
    fromMe: true,
    desc: "Like a Free Fire account using UID",
    type: "tool",
  },
  async (message, match) => {
    const uid = (match || "").trim();

    if (!uid) {
      return message.reply(
        "Please provide a Free Fire UID.\n" +
        "Example: `.freefire 258xxxxx`"
      );
    }

    await message.client.sendMessage(message.jid, {
      react: { text: "❤️", key: message.key },
    });

    try {
      const axios = require("axios");
      const apiUrl = "https://community-ffbd.onrender.com/like";

      const res = await axios.get(apiUrl, {
        params: { key: "SomeoneFromNigeria", uid: uid },
      });

      if (!Array.isArray(res.data) || res.data.length < 2) {
        return message.reply("Unexpected API response. Please try again later.");
      }

      const keyInfo = res.data[0];
      const playerInfo = res.data[1];

      const replyText = 
`Free Fire Auto Liker Result
------------------------------
Key Expire: ${keyInfo["key expire"]}
Remaining Limit: ${keyInfo["remaining limit"]}
Key Verified: ${keyInfo.verify ? "Yes" : "No"}

Player Name: ${playerInfo["Player Name"] || "Unknown"}
Player UID: ${playerInfo["Player UID"] || uid}
Likes Before: ${playerInfo["Likes Before Command"] || playerInfo["Current Likes"] || "N/A"}
Likes After: ${playerInfo["Likes after"] || "N/A"}

Status: ${playerInfo.Status || playerInfo.message || "No status"}`;

      await message.reply(replyText);
    } catch (err) {
      console.error("FF Liker Error:", err.message || err);
      await message.reply("An error occurred while processing the UID. Please try again later.");
    }
  }
);


command(
  {
    pattern: "nglspam",
    fromMe: true,
    desc: "Spam NGL anonymously",
    type: "tools",
  },
  async (message, match) => {
    const input = String(match || "").trim();
    const args = input.split("|").map(arg => arg.trim());

    if (args.length < 3) {
      return await message.reply(
        "⚠️ Usage: `.nglspam username|message|amount`\n" +
        "Example: `.nglspam dracula|hi|5`"
      );
    }

    const [username, msgText, amount] = args;

    if (!username || !msgText || !amount || isNaN(amount) || Number(amount) <= 0) {
      return await message.reply("⚠️ Invalid parameters. Example: `.nglspam dracula|hi|5`");
    }
    
    await message.reply('🔽 Starting To Send Messages');

    try {
      const res = await axios.post("https://my-chatbot-tik.onrender.com/nglspam", {
        username,
        message: msgText,
        amount: Number(amount),
      });

      if (res.data?.success) {
        await message.reply(res.data.message || "✅ Done!");
      } else {
        await message.reply(res.data?.error || "❌ Failed to start spam.");
      }
    } catch (err) {
      await message.reply("❌ Error while sending request to spam API.");
    }
  }
);

command(
  {
    pattern: "bitly",
    fromMe: true,
    desc: "🔗 Shortens URLs using Bitly",
    type: "tool",
  },
  async (message, match) => {
    match = match || message.reply_message?.text;
    if (!match) return await message.reply("❗ *Reply to or enter a URL to shorten*.");
    if (!isUrl(match)) return await message.reply("⚠️ *Invalid URL provided.*");

    try {
      const short = await Bitly(match);
      return await message.reply(`🔗 *Shortened URL:*\n${short.link}`);
    } catch (e) {
      return await message.reply("❌ Error generating shortened URL.");
    }
  }
);

command(
  {
    pattern: "lyrics",
    fromMe: isPrivate,
    desc: "🎵 Fetch lyrics with format: song|artist",
    type: "tool",
  },
  async (message, match) => {
    if (!match || typeof match !== "string" || !match.includes("|")) {
      return await message.reply("🎶 *Usage:* `lyrics song|artist`\nExample: `lyrics not like us|Kendrick`");
    }

    const [song, artist] = match.split("|").map((item) => item.trim());

    if (!song || !artist) {
      return await message.reply("🎶 *Usage:* `lyrics song|artist`\nExample: `lyric not like us|Kendrick`");
    }

    try {
      const data = await getLyrics(song, artist);

      if (!data) {
        return await message.reply("❌ *No lyrics found for this song and artist.*");
      }

      return await message.reply(
        `🎤 *Artist:* ${data.artist_name}\n🎵 *Song:* ${data.song}\n\n📜 *Lyrics:*\n${data.lyrics.trim()}`
      );
    } catch (e) {
      console.error(e);
      return await message.reply("⚠️ *Error fetching lyrics. Please try again later.*");
    }
  }
);