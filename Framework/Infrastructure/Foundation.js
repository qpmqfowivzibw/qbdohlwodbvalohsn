"use strict";
const config = require("../../config");
const { getBuffer, isUrl, decodeJid, parsedJid, fontx, detectType, generateProfilePicture } = require("../Nexus/functions");
const { writeExifWebp } = require('../Nexus/sticker');
const fileType = require('file-type');
const {
  generateForwardMessageContent,
  generateWAMessageFromContent,
  downloadAndSaveMediaMessage,
} = require("baileys");
const fs = require("fs");
const { format } = require("util");
const axios = require('axios');


const aix = {
  key: {
    remoteJid: "status@broadcast", 
    fromMe: false, 
    participant: "13135550002@s.whatsapp.net"
  },
  message: {
    contactMessage: {
      displayName: "™Dracula Md",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta AI
TEL;type=CELL;type=VOICE;waid=13135550002:+1 3135550002
END:VCARD`
    }
  }
};

const zets = {
			key: {
				fromMe: false,
				participant: "0@s.whatsapp.net",
				remoteJid: "status@broadcast"
			},
			message: {
				orderMessage: {
					orderId: "2029",
					thumbnail: "",
					itemCount: `2025`,
					status: "INQUIRY",
					surface: "CATALOG",
					message: `Dracula-Md`,
					token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
				}
			},
			contextInfo: {
				mentionedJid: [this.user],
				forwardingScore: 99,
				isForwarded: true
			}
		}
		

class Base {
  constructor(client, data) {
    if (!client) throw new Error("Client is required");
    Object.defineProperty(this, "client", { value: client });
    
    // Initialize with safe defaults
    this.id = '';
    this.jid = '';
    this.fromMe = false;
    this.isGroup = false;
    this.pushName = '';
    this.participant = '';
    this.sudo = false;
    
    if (data) this._patch(data);
  }

  _patch(data) {
    try {
      // Handle key safely
      if (data.key) {
  this.key = data.key;
  this.id = data.key.id || '';
  this.fromMe = Boolean(data.key.fromMe);

  if (data.key.remoteJid?.endsWith("@lid")) {
    this.jid =
      data.key.senderPn ||
      data.key.participantPn ||
      data.key.participant ||
      '';
  } else {
    this.jid = data.key.remoteJid || '';
  }
}

      // Set basic properties
      this.isGroup = this.jid.endsWith('@g.us');
      this.pushName = data.pushName || '';
      this.user = decodeJid(this.client.user.id);
      
      
      // Handle sender safely
      if (data.sender) {
        this.participant = parsedJid(data.sender)[0] || '';
      } else if (data.key?.participant) {
        this.participant = parsedJid(data.key.participant)[0] || '';
      } else {
        this.participant = this.jid;
      }

      // Handle timestamp safely
      this.timestamp = typeof data.messageTimestamp === "object" 
        ? data.messageTimestamp.low 
        : data.messageTimestamp || Date.now();
      
      // SUDO check
      try {
        const sudoNumbers = config.SUDO.map(num => num.replace(/\D/g, ''));
        const currentNumber = this.participant.replace(/\D/g, '');
        this.sudo = sudoNumbers.includes(currentNumber) || this.fromMe;
      } catch {
        this.sudo = false;
      }
      
      this.isBaileys = this.id.startsWith("BAE5") || false;
    } catch (error) {
      console.error('Error patching Base:', error);
    }
    return this;
  }

  async sendFile(content, options = {}) {
    let { data } = await this.client.getFile(content);
    let type = await fileType.fromBuffer(data);
    return this.client.sendMessage(
      this.jid,
      { [type.mime.split("/")[0]]: data, ...options },
      { ...options }
    );
  }
  
  
  async makeQuotedMetaStatus() {
  const imageUrl = "https://cnd.davex.site/ephoto.jpg"; 
  const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(data, "binary");

  return {
    key: {
      remoteJid: "status@broadcast",
      fromMe: false,
      id: "ABCD12345",
      participant: "0@s.whatsapp.net",
    },
    message: {
      viewOnceMessage: {
        message: {
          imageMessage: {
            caption: "Meta AI • Status\nContact: ™Dracula Md",
            jpegThumbnail: buffer,
            mimetype: "image/jpeg",
          },
        },
      },
    },
  };
}


  async reply(text, opt = {}) {
    return this.client.sendMessage(
      this.jid,
      { text: require("util").format(fontx(text)), ...opt },
      { ...opt, quoted: this }
    );
  }
  
  
  async send(content, opts = {}) {
  const jid = opts.jid || this.jid;
  const type = opts.type || (await detectType(content));
  const mentions = opts.mentions || [];

  let message;

  const caption = opts.caption ? format(fontx(opts.caption)) : undefined;
  const formattedText = typeof content === "string" ? format(fontx(content)) : "";

  if (type === "text") {
    message = { text: formattedText, mentions, ...opts };
  } else if (type === "image") {
    message = {
      image: Buffer.isBuffer(content) ? content : { url: content },
      caption,
      mentions,
      ...opts,
    };
  } else if (type === "video") {
    message = {
      video: Buffer.isBuffer(content) ? content : { url: content },
      caption,
      mentions,
      ...opts,
    };
  } else if (type === "audio") {
    message = {
      audio: Buffer.isBuffer(content) ? content : { url: content },
      mimetype: "audio/mpeg",
      mentions,
      ...opts,
    };
  } else if (type === "document") {
    message = {
      document: Buffer.isBuffer(content) ? content : { url: content },
      fileName: opts.fileName || "file",
      mentions,
      ...opts,
    };
  } else if (type === "sticker") {
    message = {
      sticker: Buffer.isBuffer(content) ? content : { url: content },
      mentions,
      ...opts,
    };
  } else {
    throw new Error("❌ Unsupported message type");
  }

  const msg = await this.client.sendMessage(jid, message, {
  quoted: opts.quoted,
});
  return new this.constructor(this.client, msg); // Returns a new Base instance
}
	 
   
 async xreply(text, opt = {}) {
    return this.client.sendMessage(
      this.jid,
      { text: require("util").format(fontx(text)), ...opt },
      { ...opt, quoted: zets }
    );
  }

  
  async clearChat(jid) {
		const msg = await this.client.chatModify(
			{
				delete: true,
				lastMessages: [
					{
						key: this.key,
						messageTimestamp: this.timestamp
					}
				]
			},
			jid
		);
		return new this.constructor(this.client, msg);
	}
	

  async sendMessage(
    jid,
    content,
    opt = { packname: "KingDrax", author: "Dracula-Md" },
    type = "text"
  ) {
  
     const formattedText = typeof content === "string" ? format(fontx(content)) : "";
    const recipient = jid || this.jid;
    switch (type.toLowerCase()) {
      case "text":
        return this.client.sendMessage(recipient, { text: formattedText, ...opt });
      case "image":
      case "video":
      case "audio":
        if (Buffer.isBuffer(content)) {
          return this.client.sendMessage(recipient, { [type]: content, ...opt });
        } else if (isUrl(content)) {
          return this.client.sendMessage(recipient, { [type]: { url: content }, ...opt });
        }
        break;
      case "template":
        const optional = await generateWAMessage(recipient, content, opt);
        const message = {
          viewOnceMessage: {
            message: {
              ...optional.message,
            },
          },
        };
        await this.client.relayMessage(recipient, message, {
          messageId: optional.key.id,
        });
        break;
 case "sticker":  
    let { data, mime } = await this.client.getFile(content);  
    if (mime == "image/webp") {  
      let buff = await writeExifWebp(data, opt);  
      await this.client.sendMessage(  
        this.jid,  
        { sticker: { url: buff }, ...opt },  
        opt  
      );  
    } else {  
      mime = await mime.split("/")[0];  

      if (mime === "video") {  
        await this.client.sendVideoAsSticker(this.jid, content, opt);  
      } else if (mime === "image") {  
        await this.client.sendImageAsSticker(this.jid, content, opt);  
      }  
    }  
    break;
      /* case "sticker":
        if (Buffer.isBuffer(content)) {
          await this.client.sendMessage(recipient, {
            sticker: content,
            ...opt,
          });
        } else if (isUrl(content)) {
          await this.client.sendMessage(recipient, {
            sticker: { url: content },
            ...opt,
          });
        } else {
          throw new Error("❌ Invalid sticker content: must be Buffer or URL");
        }
        break; */
    }
  }


async forward(jid, message, options = {}) {
    const m = generateWAMessageFromContent(jid, message, {
      ...options,
      userJid: this.client.user.id,
    });
    await this.client.relayMessage(jid, m.message, {
      messageId: m.key.id,
      ...options,
    });
    return m;
  }


  async delete(key) {
    await this.client.sendMessage(this.jid, { delete: key });
  }

  async updateName(name) {
    await this.client.updateProfileName(name);
  }

  async PresenceUpdate(status) {
    await this.client.sendPresenceUpdate(status, this.jid);
  }
  

async setPP(ppBuffer) {
  try {
    let mediaPath;

    if (Buffer.isBuffer(ppBuffer)) {
      const tempFile = `/tmp/pp-${Date.now()}.jpg`;
      fs.writeFileSync(tempFile, ppBuffer);
      mediaPath = tempFile;
    } else {
      mediaPath = await downloadAndSaveMediaMessage({ url: ppBuffer }, "ppbot");
    }

    const { img } = await generateProfilePicture(mediaPath);

    await this.client.query({
      tag: "iq",
      attrs: {
        to: "s.whatsapp.net", 
        type: "set",
        xmlns: "w:profile:picture",
      },
      content: [
        {
          tag: "picture",
          attrs: { type: "image" },
          content: img,
        },
      ],
    });

    fs.unlinkSync(mediaPath);
  } catch (err) {
    console.error("❌ Failed to set profile picture:", err);
    throw err;
  }
}

  

  async block(jid) {
    await this.client.updateBlockStatus(jid, "block");
  }

  async unblock(jid) {
    await this.client.updateBlockStatus(jid, "unblock");
  }

  async add(jid) {
    return await this.client.groupParticipantsUpdate(this.jid, jid, "add");
  }

  async kick(jid) {
    return await this.client.groupParticipantsUpdate(this.jid, jid, "remove");
  }

  async promote(jid) {
    return await this.client.groupParticipantsUpdate(this.jid, jid, "promote");
  }

  async demote(jid) {
    return await this.client.groupParticipantsUpdate(this.jid, jid, "demote");
  }
}

module.exports = Base;