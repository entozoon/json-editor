import { app, BrowserWindow, screen, ipcMain } from "electron";
import installExtension, {
  REACT_DEVELOPER_TOOLS
} from "electron-devtools-installer";
import { enableLiveReload } from "electron-compile";
const fs = require("fs");
const _ = require("lodash");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
const glob = require("glob");

let dir = process.env.PORTABLE_EXECUTABLE_DIR
  ? process.env.PORTABLE_EXECUTABLE_DIR
  : __dirname + "/..";
console.log("dir", dir);
console.log("__dirname", __dirname);
let jsonFiles = glob.sync(dir + "/*.json");
jsonFiles = jsonFiles.map(filename => {
  return {
    filename,
    json: require(filename),
    active: false
  };
});
// console.log("jsonFiles", jsonFiles);
// const data = require("../data");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);

if (isDevMode) enableLiveReload({ strategy: "react-hmr" });

const createWindow = async () => {
  // Create the browser window.
  const width = 900,
    height = 600;
  mainWindow = new BrowserWindow({
    width,
    height,
    resizable: true,
    frame: false,
    menu: null,
    transparent: false, // can't resize with this on
    webPreferences: {
      nodeIntegration: true
    }
  });
  // mainWindow.setMenu(null);
  // mainWindow.setResizable(true);

  // Position
  const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  mainWindow.setPosition(0, screenHeight - height);

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  if (isDevMode) {
    await installExtension(REACT_DEVELOPER_TOOLS);
    mainWindow.webContents.openDevTools();
  }

  // Bring it to the front
  // https://github.com/electron/electron/issues/2867#issuecomment-409858459
  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.setAlwaysOnTop(false);
  app.focus();

  mainWindow.webContents.once("dom-ready", () => {
    mainWindow.webContents.send("jsonFiles", jsonFiles);
    // mainWindow.webContents.send("data", data);
  });

  ipcMain.on("requestFile", (event, file) => {
    console.log("requestFile received", file);
    const { name, path } = file;
    mainWindow.webContents.send("jsonFile", {
      name,
      path,
      json: JSON.parse(fs.readFileSync(path))
    });
    // console.log(fs.readFileSync(filename));
  });

  ipcMain.on("save", (event, jsonFile) => {
    let { name, path, json } = jsonFile;
    if (jsonFile) {
      console.log(`Saving ${name}`);
      const backupFilename = `${path}.backup.${_.kebabCase(
        new Date()
          .toISOString()
          .replace("T", "-")
          .replace("Z", "")
      )}.json`;
      fs.copyFile(`${path}`, backupFilename, err => {
        if (err) throw err;
        console.log("Backed up", backupFilename);
        fs.writeFile(`${path}`, JSON.stringify(json, null, "  "), () => {
          console.log("Saved");
          mainWindow.webContents.send("saved", true);
        });
      });
    }
  });

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
