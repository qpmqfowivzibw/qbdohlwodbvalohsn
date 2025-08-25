const { Sequelize } = require("sequelize");
const fs = require("fs");
require("dotenv").config();
const path = require('path');

const rootDir = path.resolve(__dirname, '.');

// Helper functions
const toBool = (x) => {
  if (typeof x === 'boolean') return x;
  if (typeof x === 'string') return x.trim().toLowerCase() === 'true';
  return false;
};
const parseCommaSeparated = (x) => (x ? x.split(",").map(item => item.trim()) : []);

const DATABASE_URL = process.env.DATABASE_URL || path.join(rootDir, "SuperCore", "database.db");

// Ensure the database directory exists
const dbDir = path.dirname(DATABASE_URL);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(DATABASE_URL)
console.log(dbDir)

module.exports = {
  
  LOGS: toBool(process.env.LOGS ?? 'false'),
  ANTI_DELETE: toBool(process.env.ANTI_DELETE ?? 'false'),
  ANTI_DELETE_PATH: process.env.
  ANTI_DELETE_PATH || "",
  
  // Bot Behavior
  PREFIX: process.env.PREFIX && process.env.PREFIX.trim() !== "" ? process.env.PREFIX : "^",
 
  WARN_COUNT: parseInt(process.env.WARN_COUNT) || 3,
  AUTO_READ: toBool(process.env.AUTO_READ ?? 'false'),
  AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ ?? 'false'),
  AUTO_STATUS_REACT: toBool(process.env.AUTO_STATUS_REACT ?? 'false'),
  STATUS_SAVER: toBool(process.env.STATUS_SAVER ?? 'false'),
  STATUS_REACT_EMOJI: parseCommaSeparated(process.env.STATUS_REACT_EMOJI || "👹,🦍,😡,🥶,🌚"),
  CMD_REACT: toBool(process.env.CMD_REACT ?? 'false'),
  WORK_TYPE: process.env.WORK_TYPE || "private",
  
  
  RMBG_KEY: process.env.RMBG_KEY || "K1gAh8E6k7VNwV2umFonY5iA",
  
  
  BOT_NAME: process.env.BOT_NAME || "Dracula-Md",
  PACKNAME: process.env.PACKNAME || "KingDrax",
  AUTHOR: process.env.AUTHOR || "2349060853189",
  OWNER_NAME: process.env.OWNER_NAME || "King Dracula",
  PROCESSNAME: process.env.PROCESSNAME || "Dracula-Md",
  
  WELCOME_MSG: process.env.WELCOME_MSG || "Hi @user Welcome to @gname",
  GOODBYE_MSG: process.env.GOODBYE_MSG || "Hi @user It was Nice Seeing you",
  ANTICALL_MESSAGE: process.env.ANTICALL_MESSAGE,
  
  SESSION_ID: process.env.SESSION_ID || "",
  
  // Administration
  SUDO: parseCommaSeparated(process.env.SUDO || "2348034420510,2349060853189"),
  GEMINI_API: process.env.GEMINI_API || "",
  
  // Database
  DATABASE_URL: DATABASE_URL,
  DATABASE:
    DATABASE_URL.includes('.db') // Check if it's SQLite (contains .db)
      ? new Sequelize({
          dialect: "sqlite",
          storage: DATABASE_URL, // This is now an absolute path
          logging: false,
        })
      : new Sequelize(DATABASE_URL, {
          dialect: "postgres",
          ssl: true,
          protocol: "postgres",
          dialectOptions: {
            native: true,
            ssl: { require: true, rejectUnauthorized: false },
          },
          logging: false,
        }),
};
