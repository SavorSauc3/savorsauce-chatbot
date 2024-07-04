const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const log = require('electron-log');
const fs = require('fs');
const os = require('os');

let mainWindow;

// Ensure the logs directory exists
const logDir = path.join(os.homedir(), 'logs', 'luminaria');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

log.transports.file.resolvePath = () => path.join(logDir, 'main.log');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(app.getAppPath(), '..', 'assets', 'icon.png'),
        webPreferences: {
            // preload: path.join(__dirname, 'preload.js')
        }
    });

    if (app.isPackaged) {
        // Load the React app from the build directory in production
        mainWindow.loadFile(path.join(app.getAppPath(), 'build', 'index.html'));
    } else {
        // Load the React app from the local server during development
        mainWindow.loadURL('http://localhost:3000');
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    log.info('App directory name:', app.getAppPath());

    let pythonExecutablePath = null;
    // Run the Python executable
    if (app.isPackaged) {
        pythonExecutablePath = path.join(app.getAppPath(), '..', 'bin', 'dist', 'main', 'main.exe');
    } else {
        pythonExecutablePath = path.join(app.getAppPath(), 'bin', 'dist', 'main', 'main.exe');
    }
    const pythonProcess = spawn(pythonExecutablePath);

    pythonProcess.stdout.on('data', (data) => {
        log.info(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        log.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        log.info(`child process exited with code ${code}`);
    });

    pythonProcess.on('error', (err) => {
        log.error(`Failed to start process: ${err}`);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
