const electron = require('electron');

const app = electron.app; // Module to control application life.

const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
const session = electron.session;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;


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

function getAllCookies() {
   session.defaultSession.cookies.get({name: "server_host"}, (error, cookies) => {
       // Cookies can be accessed here using cookies variable
       console.log(cookies);
   });
}

function createWindow() {
    mainWindow = new BrowserWindow();
    mainWindow.setMenu(null);
    //mainWindow.maximize();
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('closed', function () {
        //save_cookies_on_exit();
        mainWindow = null;
    });


    mainWindow.webContents.on('devtools-opened', function (event, input) {
        // mainWindow.console.warn("aaaaaaaa");
        // console.warn('WARNING!');
    });


    mainWindow.webContents.openDevTools();

    getAllCookies();
    // var args = process.argv.slice(2);
    // args.forEach(function (elem) {
    //     var aa = elem.split('=');
    //     var a = aa[0].replace('--', "");
    //     var b = aa.length > 1 ? aa[1] :null;
    //     if (b)
    //         console.log(a, '=', b);
    //     else
    //         console.log(a);
    // });
}

app.on('ready', createWindow);
app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit() });
app.on('activate', function () { if (mainWindow === null) createWindow() });
