const fs = require("fs"); 
const fsp = require("fs").promises;
const path = require("path");
const config = require("../config");
const connect = require("../Framework/System/connection");
const axios = require("axios");
const chalk = require('chalk')
const os = require('os');
const { getandRequirePlugins } = require("../SuperCore/Schema/plugins");
const File = require("megajs").File;
const StartUpTime = require("../SuperCore/Schema/Uptime");

// Set base directory to the parent of Startup folder
global.__basedir = path.join(__dirname, '..');

// Fix database path - extract storage path from the Sequelize instance or use DATABASE_URL
let databaseStoragePath;
if (config.DATABASE && config.DATABASE.options && config.DATABASE.options.storage) {
  // For SQLite with storage option
  databaseStoragePath = config.DATABASE.options.storage;
} else if (config.DATABASE_URL && config.DATABASE_URL.includes('./')) {
  // For SQLite with DATABASE_URL
  databaseStoragePath = config.DATABASE_URL;
} else {
  // Fallback to default path
  databaseStoragePath = path.join(__basedir, "SuperCore", "database.db");
}

// Ensure the database path is absolute
if (databaseStoragePath && !path.isAbsolute(databaseStoragePath)) {
  databaseStoragePath = path.join(__basedir, databaseStoragePath);
}

// Ensure the directory exists
const dbDir = path.dirname(databaseStoragePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Define all directory paths
const directories = {
  schema: path.join(__basedir, "SuperCore", "Schema"),
  workers: path.join(__basedir, "SuperCore", "Workers"),
  draculaMd: path.join(__basedir, "DraculaMd"),
  framework: path.join(__basedir, "Framework"),
  startup: path.join(__basedir, "Startup")
};

// Create all directories if they don't exist
Object.values(directories).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const readAndRequireFiles = async (directory) => {
  try {
    const files = await fsp.readdir(directory);
    return Promise.all(
      files
        .filter((file) => path.extname(file).toLowerCase() === ".js")
        .map((file) => require(path.join(directory, file)))
    );
  } catch (error) {
    console.error("Error reading and requiring files:", error);
    throw error;
  }
};

const systemInfo = {
    Hostname: os.hostname(),
    Platform: os.platform(),
    Architecture: os.arch(),
    Uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    Memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    CPUs: os.cpus().length,
    NodeVersion: process.version,
    RAMUsage: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    Threads: os.cpus().length * 2,
};

console.log(chalk.bold.hex('#6A5ACD')('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.green.bold(' Dracula-Md Whatsapp Bot'));
console.log(chalk.bold.hex('#6A5ACD')('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

console.log(chalk.cyan('📡 System Information:'));
console.log(chalk.gray('─────────────────────────────'));
Object.entries(systemInfo).forEach(([key, value]) => {
    console.log(`${chalk.yellow(key.padEnd(14))}: ${chalk.white(value)}`);
});
console.log(chalk.gray('─────────────────────────────\n'));

console.log(chalk.green.bold('✅ All systems operational.\n'));

async function loadSession() {
  const credsPath = path.join(directories.draculaMd, "creds.json");
  
  try {
    if (fs.existsSync(credsPath)) {
      console.log('✅ Using existing session credentials');
      return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    }

    if (config.SESSION_ID) {
      if (config.SESSION_ID.startsWith("Dracula-Md~")) {
        const sessionId = config.SESSION_ID;
        console.log("Downloading session from API...");
        
        const response = await axios.get(
          `https://dracula-md-sesion-backend.onrender.com/api/downloadCreds.php/${sessionId}`,
          {
            headers: { 'x-api-key': "drax_api@1" }
          }
        );

        if (!response.data.credsData) {
          throw new Error('No credential data received from API server');
        }

        await fsp.writeFile(credsPath, JSON.stringify(response.data.credsData), 'utf8');
        console.log('✅ API session downloaded successfully');
        return response.data.credsData;
      } 
      else if (config.SESSION_ID.startsWith("Dracula_Md~")) {
        const megaFileId = config.SESSION_ID.replace("Dracula_Md~", "");
        console.log("Downloading session from MEGA...");
        
        const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);
        const data = await new Promise((resolve, reject) => {
          filer.download((err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        
        await fsp.writeFile(credsPath, data);
        console.log('✅ MEGA session downloaded successfully');
        return JSON.parse(data.toString());
      }
      else if (config.SESSION_ID.startsWith("Dracula-Md_")) {
        const credsId = config.SESSION_ID.replace("Dracula-Md_", "");
        console.log("Downloading session from GitHub Gist...");
        
        const response = await axios.get(`https://gist.githubusercontent.com/Kakaieudoqidiwhsxnkwybs/${credsId}/raw`);
        
        if (!response.data) {
          throw new Error('No credential data received from GitHub Gist');
        }

        await fsp.writeFile(credsPath, JSON.stringify(response.data), 'utf8');
        console.log('✅ GitHub Gist session downloaded successfully');
        return response.data;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading session:', error.message);
    console.log('Will generate QR code instead');
    return null;
  }
}

async function initialize() {
  try {
    console.log("📁 Directory structure initialized:");
    console.log(`   - Schema: ${directories.schema}`);
    console.log(`   - Workers: ${directories.workers}`);
    console.log(`   - Session: ${directories.draculaMd}`);
    console.log(`   - Database: ${databaseStoragePath}`);
    
    if (config.SESSION_ID) {
      await loadSession();
    }
    
    // Load schema files
    console.log("📊 Loading database schemas...");
    await readAndRequireFiles(directories.schema);
    
    await config.DATABASE.sync();
    console.log('✅ Database synchronized successfully.');
    
    // Initialize startup time tracking
    (async () => {
      await StartUpTime.sync();
      const existing = await StartUpTime.findOne();
      if (!existing) {
        await StartUpTime.create({ startedAt: new Date() });
      }
    })();

    // Load workers
    console.log("⬇️  Installing Workers...");
    await readAndRequireFiles(directories.workers);
    
    // Load plugins
    await getandRequirePlugins();
    console.log("✅ Workers & Plugins Installed Successfully!");

    // Establish WhatsApp connection
    console.log("🔗 Establishing WhatsApp connection...");
    return await connect();
  } catch (error) {
    console.error("❌ Initialization error:", error);
    return process.exit(1); 
  }
}

// Handle the initialization promise
initialize()
  .then(conn => {
    if (conn) {
      console.log("🎉 Bot initialization completed successfully!");
    }
  })
  .catch(error => {
    console.error("💥 Fatal initialization error:", error);
    process.exit(1);
  });
