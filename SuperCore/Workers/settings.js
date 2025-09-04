const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { command } = require("../../Framework");
const {
  getPresenceSetting,
  setPresenceSetting,
  getAllPresenceSettings,
} = require("../Schema/presence");

let recordTypeInterval = null;


const dotenvPath = path.join(__dirname, "../../.env");

function updateEnvVariable(key, value) {
  const env = fs.readFileSync(dotenvPath, "utf-8").split("\n");
  let found = false;

  const newEnv = env.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) newEnv.push(`${key}=${value}`);

  fs.writeFileSync(dotenvPath, newEnv.join("\n"));
}

function getEnvVariable(key) {
  const env = fs.readFileSync(dotenvPath, "utf-8").split("\n");
  for (const line of env) {
    if (line.startsWith(`${key}=`)) {
      return line.split("=")[1]?.trim();
    }
  }
  return null;
}

function toggleSetting(message, key, value, label = null) {
  const lower = value.toLowerCase();

  if (lower !== "on" && lower !== "off") {
    return message.reply("❌ Invalid option. Use only *on* or *off*.");
  }

  const boolVal = lower === "on";
  const strVal = boolVal ? "true" : "false";
  const current = getEnvVariable(key);

  config[key] = boolVal;
  updateEnvVariable(key, strVal);

  const displayName = label || key;

  if (current === null) {
    return message.reply(`✅ *${displayName}* was not set. Initialized as *${lower.toUpperCase()}*`);
  }

  if ((lower === "on" && current === "true") || (lower === "off" && current === "false")) {
    return message.reply(`ℹ️ *${displayName}* is already *${lower.toUpperCase()}*`);
  }

  return message.reply(`✅ *${displayName}* has been updated to *${lower.toUpperCase()}*`);
}

command(
  {
    pattern: "aread",
    fromMe: true,
    type: "settings",
    desc: "📩 mark incoming messages as read",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.aread on/off*");
    toggleSetting(message, "AUTO_READ", match.toLowerCase(), "aread");
  }
);

command(
  {
    pattern: "astatus",
    fromMe: true,
    type: "settings",
    desc: "👀 auto viewing status updates",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.astatus on/off*");
    toggleSetting(message, "AUTO_STATUS_READ", match.toLowerCase(), "astatus");
  }
);

command(
  {
    pattern: "astatusreact",
    fromMe: true,
    type: "settings",
    desc: "❤️ auto reacting to status updates",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.astatusreact on/off*");
    toggleSetting(message, "AUTO_STATUS_REACT", match.toLowerCase(), "astatusreact");
  }
);


command(
  {
    pattern: "cmdreact",
    fromMe: true,
    type: "settings",
    desc: "✅ Toggle Command Reaction",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.cmdreact on/off*");
    toggleSetting(message, "CMD_REACT", match.toLowerCase(), "cmdreact");
  }
);

command(
  {
    pattern: "atype",
    fromMe: true,
    type: "settings",
    desc: "✅ Toggle Typing Presence Update",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.atype on/off*");
    
    const choice = match
    const validMenus = ['on', 'off'];
    if (!validMenus.includes(choice)) {
      return message.reply(`Usage: *.atype on/off* `);
    }
    
    
  }
);


command(
  {
    pattern: "astatussave",
    fromMe: true,
    type: "settings",
    desc: "🔽 auto save status updates",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.astatussave on/off*");
    toggleSetting(message, "STATUS_SAVER", match.toLowerCase(), "astatussave");
  }
);

command(
  {
    pattern: "adelete",
    fromMe: true,
    type: "settings",
    desc: "♻️ recover deleted messages",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.adelete on/off*");
    toggleSetting(message, "ANTI_DELETE", match.toLowerCase(), "adelete");
  }
);


command(
  {
    pattern: "adeletepath",
    fromMe: true,
    type: "settings",
    desc: "♻️ Set anti-delete logging path (chat/private/JID)",
  },
  async (message, match) => {
    if (!match) {
      return await message.reply("Usage: *.adeletepath chat/private/JID*");
    }

    const choice = match.trim().toLowerCase();
    const validOptions = ["chat", "private"];

    // Validate
    if (
      !validOptions.includes(choice) &&
      !(choice.endsWith(".net") || choice.endsWith(".us"))
    ) {
      return await message.reply(
        "❌ Invalid option. Use *chat*, *private*, or a valid JID ending with `.net` or `.us`."
      );
    }

    const oldVal = getEnvVariable("ANTI_DELETE_PATH");

    // Write to .env
    updateEnvVariable("ANTI_DELETE_PATH", choice);

    // Update runtime environment
    process.env.ANTI_DELETE_PATH = choice;

    // Update config immediately
    config.ANTI_DELETE_PATH = choice;

    if (oldVal === null) {
      return await message.reply(`✅ *ANTI_DELETE_PATH* initialized as: \`${choice}\``);
    }

    if (oldVal === choice) {
      return await message.reply(`ℹ️ *ANTI_DELETE_PATH* is already set to: \`${choice}\``);
    }

    return await message.reply(`✅ *ANTI_DELETE_PATH* has been updated to: \`${choice}\``);
  }
);

// Typing Presence
command(
  {
    pattern: "atype",
    fromMe: true,
    type: "settings",
    desc: "✅ Toggle Typing Presence",
  },
  async (message, match) => {
    const input = typeof match === "string" ? match.trim().toLowerCase() : "";

    if (!["on", "off"].includes(input)) {
      return message.reply("Usage: *.atype on/off*");
    }

    const enabled = input === "on";
    await setPresenceSetting("atype", enabled);

    if (enabled) {
      await message.PresenceUpdate("composing");
      return message.reply("✅ *Typing presence enabled.*");
    } else {
      await message.PresenceUpdate("available");
      return message.reply("🛑 *Typing presence disabled.*");
    }
  }
);

// Recording Presence
command(
  {
    pattern: "arecord",
    fromMe: true,
    type: "settings",
    desc: "🎙️ Toggle Recording Presence",
  },
  async (message, match) => {
    const input = typeof match === "string" ? match.trim().toLowerCase() : "";

    if (!["on", "off"].includes(input)) {
      return message.reply("Usage: *.arecord on/off*");
    }

    const enabled = input === "on";
    await setPresenceSetting("arecord", enabled);

    if (enabled) {
      await message.PresenceUpdate("recording");
      return message.reply("✅ *Recording presence enabled.*");
    } else {
      await message.PresenceUpdate("available");
      return message.reply("🛑 *Recording presence disabled.*");
    }
  }
);

// Alternating Typing & Recording Presence
command(
  {
    pattern: "arecordtype",
    fromMe: true,
    type: "settings",
    desc: "🔄 Toggle alternating between Typing and Recording",
  },
  async (message, match) => {
    const input = typeof match === "string" ? match.trim().toLowerCase() : "";

    if (!["on", "off"].includes(input)) {
      return message.reply("Usage: *.arecordtype on/off*");
    }

    const enable = input === "on";
    await setPresenceSetting("arecordtype", enable);

    if (enable) {
      if (recordTypeInterval) {
        return message.reply("⏳ Already alternating presence...");
      }

      let state = "composing";
      recordTypeInterval = setInterval(async () => {
        try {
          await message.PresenceUpdate(state);
          state = state === "composing" ? "recording" : "composing";
        } catch (err) {
          console.error("Presence update error:", err);
        }
      }, 3000);

      return message.reply("🔁 *Alternating between typing and recording...*");
    } else {
      if (recordTypeInterval) {
        clearInterval(recordTypeInterval);
        recordTypeInterval = null;
        await message.PresenceUpdate("available");
        return message.reply("🛑 *Alternating stopped.*");
      } else {
        return message.reply("⚠️ Not running.");
      }
    }
  }
);



command(
  {
    pattern: "setvar",
    fromMe: true,
    type: "settings",
    desc: "🔧 Set any environment variable",
  },
  async (message, match) => {
    if (!match) return await message.reply("Usage: *.setvar VAR_NAME=value*");

    const [keyRaw, ...valParts] = match.split("=");
    if (!keyRaw || valParts.length === 0)
      return await message.reply("❌ Invalid format. Use: `.setvar VAR_NAME=value`");

    const key = keyRaw.trim().toUpperCase();
    const value = valParts.join("=").trim();

    if (!/^[A-Z0-9_]+$/.test(key))
      return await message.reply("❌ Invalid variable name. Use only uppercase letters, numbers, and underscores.");

    const oldVal = getEnvVariable(key);
    updateEnvVariable(key, value);

    // Update runtime environment immediately
    process.env[key] = value;

    // Categorize variables based on their behavior
    const requiresRestart = [
      'BOT_NAME', 'PACKNAME', 'AUTHOR', 'OWNER_NAME', 'PROCESSNAME',
      'DATABASE_URL', 'HANDLER', 'SESSION_ID', 'WORK_TYPE',
      'HEROKU_APP_NAME', 'HEROKU_API_KEY', 'GEMINI_API', 'RMBG_KEY'
    ];

    const booleanVariables = [
      'ANTI_LINK', 'LOGS', 'DELETED_LOG', 'AUTO_READ',
      'AUTO_STATUS_READ', 'AUTO_STATUS_REACT', 'STATUS_SAVER',
      'REMOVEBG', 'HEROKU'
    ];

    const arrayVariables = [
      'SUDO', 'STATUS_REACT_EMOJI'
    ];

    // Special handling for different variable types
    if (requiresRestart.includes(key)) {
      return await message.reply(`✅ *${key}* updated to: \`${value}\`\n⚠️ Changes will take effect after restart`);
    }

    // Clear the config module cache
    delete require.cache[require.resolve("../../config")];
    
    // Reload the config
    const newConfig = require("../../config");
    
    // Update all properties in the existing config object
    for (const prop in newConfig) {
      if (prop in config) {
        config[prop] = newConfig[prop];
      }
    }

    // Additional runtime updates for specific variables
    switch(key) {
      case 'ANTI_LINK':
        // Update anti-link behavior in real-time
        if (typeof global.antiLinkEnabled !== 'undefined') {
          global.antiLinkEnabled = toBool(value);
        }
        break;
        
      case 'AUTO_READ':
        // Update auto-read behavior
        if (typeof global.autoReadEnabled !== 'undefined') {
          global.autoReadEnabled = toBool(value);
        }
        break;
        
      case 'SUDO':
        // Update sudo users in real-time
        if (typeof global.sudoUsers !== 'undefined') {
          global.sudoUsers = parseCommaSeparated(value);
        }
        break;
        
      // Add more cases as needed for other variables
    }

    if (oldVal === null) {
      return await message.reply(`✅ *${key}* was not set. Initialized as: \`${value}\``);
    }

    if (oldVal === value) {
      return await message.reply(`ℹ️ *${key}* is already set to: \`${value}\``);
    }

    return await message.reply(`✅ *${key}* has been updated to: \`${value}\``);
  }
);