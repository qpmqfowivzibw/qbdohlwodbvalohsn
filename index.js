const fs = require("fs"); 
const fsp = require("fs").promises;
const path = require("path");
const config = require("./config");
const connect = require("./Framework/System/connection");
const axios = require("axios");
const chalk = require('chalk')
const os = require('os');
const { getandRequirePlugins } = require("./SuperCore/Schema/plugins");
const File = require("megajs").File;
const StartUpTime = require("./SuperCore/Schema/Uptime");

// Set base directory to the parent of Startup folder
global.__basedir = __dirname;

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
  const credsPath = path.join(__basedir, "DraculaMd", "creds.json");
  
  try {
    if (fs.existsSync(credsPath)) {
      console.log('✅ Using existing session credentials');
      return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    }

    if (!fs.existsSync(path.join(__basedir, "DraculaMd"))) {
      fs.mkdirSync(path.join(__basedir, "DraculaMd"));
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
    if (config.SESSION_ID) {
      await loadSession();
    }
    
    
    await readAndRequireFiles(path.join(__basedir, "SuperCore/Schema/"));
    await config.DATABASE.sync();
    
    (async () => {
      await StartUpTime.sync();
      const existing = await StartUpTime.findOne();
      if (!existing) {
        await StartUpTime.create({ startedAt: new Date() });
      }
    })();


    await readAndRequireFiles(path.join(__basedir, "SuperCore/Workers/"));
   
    console.log("⬇  Installing Workers...");
    await getandRequirePlugins();
    console.log("✅ Workers Installed Successfully!");
    
    return await connect();
  } catch (error) {
    console.error("Initialization error:", error);
    return process.exit(1); 
  }
}

initialize();
