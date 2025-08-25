/* const { command, restart } = require("../../Framework");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

// Hardcoded private repo with token
const REPO_USER = "qpmqfowivzibw";
const TOKEN = "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";
const REPO_NAME = "qbdohlwodbvalohsn";


const repo = `https://${REPO_USER}:${TOKEN}@github.com/${REPO_USER}/${REPO_NAME}`;
const api = `https://api.github.com/repos/${REPO_USER}/${REPO_NAME}`;

// Get local version
function getLocalVersion() {
  try {
    const pkg = require("../../package.json");
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

command(
  {
    pattern: "update",
    fromMe: true,
    desc: "🚀 Update bot to latest version (private repo)",
    type: "system",
  },
  async (message) => {
    try {
      const localVersion = getLocalVersion();
      await message.reply(`🔍 Current version: *${localVersion}*`);

      let latestVersion = "";
      let changes = "Manual update required.";

      // Try to fetch latest release
      try {
        const release = await axios.get(`${api}/releases/latest`, {
          headers: { Authorization: `token ${TOKEN}` },
          timeout: 10000,
        });

        latestVersion = release.data.tag_name;
        changes = release.data.body || "No changelog provided.";

        if (latestVersion === localVersion) {
          return await message.reply(`✅ Already up-to-date: *${latestVersion}*`);
        }
      } catch {
        const commit = await axios.get(`${api}/commits/main`, {
          headers: { Authorization: `token ${TOKEN}` },
          timeout: 10000,
        });

        latestVersion = commit.data.sha.substring(0, 7);
        changes = commit.data.commit.message || "No commit message.";

        if (latestVersion === localVersion) {
          return await message.reply(`✅ Already up-to-date: *${latestVersion}*`);
        }
      }

      await message.reply(`📥 New version found: *${latestVersion}*\n\n📝 Changes:\n${changes}\n\n⏳ Downloading update...`);

      const zipUrl = `https://${REPO_USER}:${TOKEN}@github.com/${REPO_USER}/${REPO_NAME}/archive/refs/heads/main.zip`;

      const { data } = await axios.get(zipUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const zip = new AdmZip(data);
      const entries = zip.getEntries();
      const basePath = `${REPO_NAME}-main/`;
      const skipFiles = ["config.js", ".env", "assets/database.db", "package-lock.json"];

      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const relPath = entry.entryName.replace(basePath, "");
        const destPath = path.join(__dirname, "../..", relPath);

        if (skipFiles.some((p) => destPath.includes(p))) continue;

        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        zip.extractEntryTo(entry, dir, false, true, entry.name);
      }

      await message.reply(`✅ Updated to *${latestVersion}* successfully!\n\n♻️ Restarting...`);
      setTimeout(() => restart(), 2000);

    } catch (error) {
      console.error("Update error:", error);
      await message.reply(`❌ Update failed: ${error.message}\n\nTry manually from:\n${repo}`);
    }
  }
); */