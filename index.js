const { spawnSync, spawn } = require('child_process');
const { existsSync } = require('fs');

let nodeRestartCount = 0;
const maxNodeRestarts = 5;
const restartWindow = 30000; // 30 seconds
let lastRestartTime = Date.now();

function startNode() {
  const child = spawn('node', ['index.js'], { stdio: 'inherit' });

  child.on('exit', (code) => {
    if (code !== 0) {
      const currentTime = Date.now();
      if (currentTime - lastRestartTime > restartWindow) {
        nodeRestartCount = 0;
      }
      lastRestartTime = currentTime;
      nodeRestartCount++;

      if (nodeRestartCount > maxNodeRestarts) {
        console.error('Node.js process is restarting continuously. Stopping retries...');
        return;
      }
      console.log(`Node.js process exited with code ${code}. Restarting... (Attempt ${nodeRestartCount})`);
      startNode();
    }
  });
}

function startPm2() {
  const pm2 = spawn('yarn', ['pm2', 'start', 'Startup/processing.js', '--name', 'Dracula-Md', '--attach'], {
  stdio: 'inherit',
});

  let restartCount = 0;
  const maxRestarts = 5;

  pm2.on('exit', (code) => {
    if (code !== 0) {
      startNode();
    }
  });

  pm2.on('error', (error) => {
    console.error(`yarn pm2 error: ${error.message}`);
    startNode();
  });

  // No colors, just raw logs
  if (pm2.stdout) {
    pm2.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output); 
      if (output.includes('Connecting')) {
        restartCount = 0;
      }
    });
  }

  if (pm2.stderr) {
    pm2.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('restart')) {
        restartCount++;
        if (restartCount > maxRestarts) {
          spawnSync('yarn', ['pm2', 'delete', 'Dracula-Mf'], { stdio: 'inherit' });
          startNode();
        }
      }
    });
  }
}

function installDependencies() {
  console.log('Installing dependencies...');
  process.env.COREPACK_ENABLE_PROMTS = '0'; 
  const installProcess = spawnSync(
    'yarn',
    ['install', '--force', '--non-interactive', '--network-concurrency', '3'],
    {
      input: 'y\n',
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' }, 
      timeout: 120000, 
    }
  );

  if (installProcess.error || installProcess.status !== 0) {
    console.error(`Failed to install dependencies: ${installProcess.error ? installProcess.error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

function checkDependencies() {
  if (!existsSync('package.json')) {
    console.error('package.json not found!');
    process.exit(1);
  }

  const result = spawnSync('yarn', ['check', '--verify-tree'], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.log('Some dependencies are missing or incorrectly installed.');
    installDependencies();
  }
}

checkDependencies();
startPm2();