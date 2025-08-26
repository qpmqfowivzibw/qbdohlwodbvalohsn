const {
  command,
  isPrivate,
  isUrl,
  getBuffer,
  getJson,
  fontx,
  sleep,
  validateQuality,
} = require("../../Framework");
const { yta, ytv, ytsdl } = require("../../Framework/Nexus/ytdl");
const { tiktok, instagram, twitter, apkMirror, facebook, pinterest } = require("../../Framework");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { tmpdir } = require("os");


command(
  {
    pattern: "yta",
    fromMe: isPrivate,
    desc: "🎧 Download audio from YouTube",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a YouTube URL*");
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
      const { dlink } = await yta(input);
      const downloadMsg = await message.reply(`🎶 *Downloading*`);
      const audioBuffer = await getBuffer(dlink);

      
return await message.client.sendMessage(
  message.jid,
  {
    audio: audioBuffer,
    mimetype: "audio/mpeg",
    fileName: `dracula.mp3`,
  },
  {
    quoted: downloadMsg,
  }
);
    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

// 📹 ytv — Download YouTube Video by URL + optional quality
command(
  {
    pattern: "ytv",
    fromMe: isPrivate,
    desc: "📹 Download video from YouTube",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input)
      return await message.reply("❌ *Provide a YouTube link & resolution*\nExample: `ytv https://youtube.com/watch?v=abc123;480p`");

    const [urlPart, qualityPart] = input.split(";").map((s) => s.trim());
    if (!isUrl(urlPart)) return await message.reply("🔗 *Invalid YouTube URL*");

    const quality = qualityPart || "360p";
    if (!validateQuality(quality)) {
      return await message.reply("⚠️ *Invalid quality*\nSupported: `144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p`");
    }

    try {
      const { title, dlink } = await ytv(urlPart, quality);
      const downloadMsg = await message.reply(`📥 *Downloading:* \`${title}\`\n🧩 *Quality:* \`${quality}\``);
      const videoBuffer = await getBuffer(dlink);

      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `${title}.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );
    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);


command(
  {
    pattern: "play",
    fromMe: isPrivate,
    desc: "🎵 Download a song from YouTube",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a song name or URL*");

    try {
      const { title, dlink } = await ytsdl(input);
      const downloadMsg = await message.reply(`🎧 *Downloading:* \`${title}\``);
      const audioBuffer = await getBuffer(dlink);

    return await message.client.sendMessage(
  message.jid,
  {
    audio: audioBuffer,
    mimetype: "audio/mpeg",
    fileName: `${title}.mp3`,
  },
  {
    quoted: message.quoted,
  }
);
    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

command(
  {
    pattern: "video",
    fromMe: isPrivate,
    desc: "📺 Download a video from YouTube",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a video name or URL*");

    try {
      const { title, dlink } = await ytsdl(input, "video");
      const downloadMsg = await message.reply(`📹 *Downloading:* \`${title}\``);
      const videoBuffer = await getBuffer(dlink);

      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `${title}.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );
    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

command(
 {
   pattern: "image",
   fromMe: isPrivate,
   desc: "🔽 Download images with query",
   type: "downloader",
 },
 async (message, match) => {
 
 const input = match || message.reply_message?.text;
 
 
 if (!input) return message.reply('❌ *please provide a query to search for*')
 
 try {
 
 const response = await getJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(input)}`)
 
 
 if (!response.status) return message.reply('❌ *no results found*');
 
  const downloadingMsg = await message.reply("🔽 *downloading images please wait...*")
  
   const datas = response.data.slice(0, 5);

 for (const data of datas) {
     await message.client.sendMessage(
        message.jid,
        {
          image: { url: data.image_url },
          mimetype: "image/jpeg",
          caption: fontx(`\`${data.seo_alt_text}\``),
        },
        {
          quoted: downloadingMsg,
        }
      );
    }
  } catch (err) {
     return
  }
 }
);


command(
 {
   pattern: "pinterest",
   fromMe: isPrivate,
   desc: "🔽 Download an image from Pinterest",
   type: "downloader",
 },
 async (message, match) => {
 
 const input = match || message.reply_message?.text;
 
 
 if (!input) return message.reply('❌ *please provide a query to search for*')
 
 try {
 
 const response = await getJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(input)}`)
 
 
 if (!response.status) return message.reply('❌ *no results found*');
 
  const downloadingMsg = await message.reply("🔽 *downloading image please wait...*")
  
   const data = response.data[0];
   const imageUrl = data.image_url
  
  return await message.client.sendMessage(
        message.jid,
        {
          image: { url: imageUrl },
          mimetype: "image/jpeg",
          caption: fontx(`\`${data.grid_title}\``),
        },
        {
          quoted: downloadingMsg,
        }
      );
  } catch (err) {
     return  
  }
 }
);
 
 
command(
 {
   pattern: "xvideo",
   fromMe: isPrivate,
   desc: "🔽 Download porn videos",
   type: "downloader",
 },
 async (message, match) => {
const input = match || message.reply_message?.text;

 if (!input) return message.reply('❌ *please provide a query to search for*')
 
 try {
 const response = await getJson(`https://api-aswin-sparky.koyeb.app/api/search/xnxx?search=${encodeURIComponent(input)}`)
 
 if (!response.status) return reply('❌ *no results found*');
 
  const downloadingMsg = await message.reply("🔽 *downloading video please wait...*")
  
  const url = response.result.result[0];
  
  const videoUrl = url.link
  
  const details = await getJson(`https://api-aswin-sparky.koyeb.app/api/downloader/xnxx?url=${videoUrl}`)
  
   if (!details.status) return reply('❌ *video download failed*');
   
   const download = details.data.files.high
  
   
   const title = details.data.title
   
   let caption = fontx("🎥 *Video Downloaded Successfully!*\n\n");
caption += fontx(`🔹 *Title:* ${title}\n`);
caption += `🔗 *URL:* ${videoUrl}`;
   
   return await message.client.sendMessage(
        message.jid,
        {
          video: { url: download },
          mimetype: "video/mp4",
          caption: caption,
          fileName: `${title}.mp4`,
        },
        {
          quoted: downloadingMsg,
        }
      );
    } catch (err) {
     return
  } 
 }
);


command(
  {
    pattern: "tiktok",
    fromMe: isPrivate,
    desc: "📺 Download a video from Tiktok",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a Tiktok video URL*");
    
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
      
      
      
      const result = await tiktok(input);

  if (!result.url1 || !result.url2) {
  return await message.reply("❌ *Failed to get video URL from TikTok API*");
}

const videoUrl = result.url1 || result.url2;


      const downloadMsg = await message.reply(`📹 *Downloading...*`);
      
      const videoBuffer = await getBuffer(videoUrl);
      

      // Send video as buffer
      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `tiktok.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

command(
  {
    pattern: "tiktok2",
    fromMe: isPrivate,
    desc: "📺 Download a video from TikTok",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a TikTok video URL*");

    if (!/^https?:\/\//.test(input)) {
      return await message.reply("🔗 *Invalid URL format*");
    }

    try {
      await message.reply("🔄 *Downloading...*");

      const res = await axios.get(`https://apis.kingdrax.my.id/api/tikdl?url=${encodeURIComponent(input)}`);
      const videoUrl = res.data.downloadLink;

      if (!videoUrl) {
        return await message.reply("⚠️ *Download links not found. Try a different URL.*");
      }

      const timestamp = Date.now();
      
const tmpDir = path.join(__dirname, "../../tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const videoPath = path.join(tmpDir, `tiktok_video_${timestamp}.mp4`);

      
      // Download helper
      const downloadToFile = async (url, dest) => {
        const response = await axios.get(url, {
          responseType: "stream",
          headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
        });

        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const stat = fs.statSync(dest);

        if (stat.size < 50 * 1024) {
          const content = await fs.promises.readFile(dest, "utf8");
          throw new Error("Downloaded file seems invalid or too small");
        }
      };

      await downloadToFile(videoUrl, videoPath);
      
      const videoBuffer = await fs.promises.readFile(videoPath);
      await message.send(videoBuffer, {
        type: "video",
        mimetype: "video/mp4",
        fileName: "tiktok_video.mp4",
        quoted: message.quoted,
      });

      await fs.promises.unlink(videoPath).catch(() => {});

    } catch (err) {
      return await message.reply(`❌ *Error*`);
    }
  }
);




command(
  {
    pattern: "instagram",
    fromMe: isPrivate,
    desc: "📺 Download a video from instagram",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a Instagram video URL*");
    
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
           
      const result = await instagram(input);      
      const videoUrl = result[0]
  
      const downloadMsg = await message.reply(`📹 *Downloading...*`);
      
      const videoBuffer = await getBuffer(videoUrl);
      
      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `tiktok.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      
      return await message.reply(`⚠️ *Error*`);
    }
  }
);


command(
  {
    pattern: "twitter",
    fromMe: isPrivate,
    desc: "📺 Download a video from twitter",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a twitter video URL*");
    
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
           
      const result = await twitter(input);      
            
     const videoUrl = result[0].url
       
      const downloadMsg = await message.reply(`📹 *Downloading...*`);
      
      const videoBuffer = await getBuffer(videoUrl);
      
      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `tiktok.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      return await message.reply(`⚠️ *Error*`);
    }
  }
);


command(
  {
    pattern: "apk",
    fromMe: isPrivate,
    desc: "📱 Search and download APKs",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;

    if (!input) return await message.reply("❌ *Please provide an app name to search*");

    try {
      const searchResult = await apkMirror(input, true);
      
        if (!searchResult?.result?.length) {
        return await message.reply("❌ *No results found on APKMirror.*");
      }

      const app = searchResult.result[0]; 
      const downloadOptions = await apkMirror(`405;;${app.url}`);

      const architectures = Object.keys(downloadOptions.result);

      if (architectures.length === 0) {
        return await message.reply("❌ *No download options found.*");
      }

      const firstArch = architectures[0]; 
      const archDownloadInfo = downloadOptions.result[firstArch];

      const finalDownload = await apkMirror(`301;;${archDownloadInfo.url}`);

      if (!finalDownload?.result) {
        return await message.reply("❌ *Failed to fetch download link.*");
      }

      const downloadingMsg = await message.reply(`📥 *Downloading ${app.title} (${firstArch})...*`);

      const apkBuffer = await getBuffer(finalDownload.result);

      return await message.client.sendMessage(
        message.jid,
        {
          document: apkBuffer,
          mimetype: "application/vnd.android.package-archive",
          fileName: `${app.title.replace(/\s+/g, "_")}_${firstArch}.apk`,
          caption: fontx(`📦 *${app.title}*\n🔹 Arch: ${firstArch}`),
        },
        {
          quoted: downloadingMsg,
        }
      );
    } catch (err) {
      return await message.reply("⚠️ *An error occurred while processing your request.*");
    }
  }
);

command(
  {
    pattern: "facebook",
    fromMe: isPrivate,
    desc: "📺 Download a video from facebook",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a Facebook video URL*");
    
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
           
      const result = await facebook(input);      
      
      const videoUrl = result[1].url || result[0].url
      
      const downloadMsg = await message.reply(`📹 *Downloading...*`);
      
      const videoBuffer = await getBuffer(videoUrl);
      
      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `tiktok.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      
      return await message.reply(`⚠️ *Error*`);
    }
  }
);


command(
  {
    pattern: "pindl",
    fromMe: isPrivate,
    desc: "📺 Download a video from Pinterest",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a Pinterest video URL*");
    
    if (!isUrl(input)) return await message.reply("🔗 *Invalid URL format*");

    try {
           
      const result = await pinterest(input);      
      
      const videoUrl = result.downloadLinks[0].url
      
      const downloadMsg = await message.reply(`📹 *Downloading...*`);
      
      const videoBuffer = await getBuffer(videoUrl);
      
      return await message.client.sendMessage(
        message.jid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: `tiktok.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

command(
  {
    pattern: "moviedl",
    fromMe: isPrivate,
    desc: "📺 Download Movies",
    type: "downloader",
  },
  async (message, match) => {
    const input = match || message.reply_message?.text;
    if (!input) return await message.reply("❌ *Provide a movie name to download*");
   
    try {
    
    
    const https = require("https");

const agent = new https.Agent({  
  rejectUnauthorized: false,  
});

const result = await getJson(`https://api.kingdrax.my.id/api/movie?query=${encodeURIComponent(input)}`, {
  httpsAgent: agent
});
           
      
      const videoUrl = result.download_link
      const title = result.title
      
      const downloadMsg = await message.reply(`📹 *Downloading: ${title}...*`);
      
      
      
      return await message.client.sendMessage(
        message.jid,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          fileName: `${title}.mp4`,
        },
        {
          quoted: downloadMsg,
        }
      );

    } catch (err) {
      console.log(err)
      return await message.reply(`⚠️ *Error*`);
    }
  }
);

