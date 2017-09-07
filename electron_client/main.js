const electron = require('electron');

const app = electron.app; // Module to control application life.

const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
const session = electron.session;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


//function save_cookies_on_exit() {
//  console.log("save_cookies_on_exit");
//  console.log(mainWindow.document != null);
//
////     electron.defaultSession.cookies.set(
////         {url: 'http://www.github.com', name: 'dummy_name', value: 'dummy'},
////         (error) = > {
////         if(error) console.error(error)
//// })
//}

//function getAllCookies() {
//    session.defaultSession.cookies.get({}, (error, cookies) => {
//        // Cookies can be accessed here using cookies variable
//        console.log("aaaaaaaaaa");
//        console.log(error);
//        console.log(cookies);
//    });
//}

function createWindow() {
    mainWindow = new BrowserWindow();
    mainWindow.setMenu(null);
    mainWindow.maximize();
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        //save_cookies_on_exit();
        mainWindow = null;
    });
    //getAllCookies();
}

app.on('ready', createWindow);
app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit() });
app.on('activate', function () { if (mainWindow === null) createWindow() });
