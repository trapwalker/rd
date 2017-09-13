const electron = require('electron');

const app = electron.app; // Module to control application life.

const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
const session = electron.session;
const Config = require('electron-config');
const config = new Config();

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;

// function getAllCookies() {
//    session.defaultSession.cookies.get({name: "server_host"}, (error, cookies) => {
//        // Cookies can be accessed here using cookies variable
//        console.log(cookies);
//    });
// }

// Получение состояния окна: либо последнее закрытое, либо по умолчанию
function getWindowState() {
    // Не сохраняем позицию окна (второй монитор вкл/выкл) сохраняем только размеры
    var def_options = {width: 1020, height: 740, minWidth: 1020, minHeight: 740};
    // Object.assign(def_options, config.get('winBounds') || {});  // todo: так по идее правильнее, но тогда сохранится позиция окна
    var curr_state = config.get('winBounds') || {};
    if (curr_state.width && curr_state.width >= def_options.minWidth) def_options.width = curr_state.width;
    if (curr_state.height && curr_state.height >= def_options.minHeight) def_options.height = curr_state.height;
    return def_options;
}


function createWindow() {
    var window_options = {backgroundColor: "#030f00", darkTheme: true};
    Object.assign(window_options, getWindowState());

    mainWindow = new BrowserWindow(window_options);
    mainWindow.setMenu(null);
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('close', function () {config.set('winBounds', mainWindow.getBounds())});
    mainWindow.on('closed', function () {mainWindow = null;});

    // todo: написать как-то в консоль, чтобы юзер был осторожнее
    //mainWindow.webContents.on('devtools-opened', function (event, input) {});

    var command_line_args = {};

    var args = process.argv.slice(2);
    args.forEach(function (elem) {
        var aa = elem.split('=');
        var a = aa[0].replace('--', "");
        var b = aa.length > 1 ? aa[1] : null;
        if (b)
            command_line_args[a] = b;
        else
            command_line_args[a] = true;
    });

    console.log(command_line_args);

    if (command_line_args.devtools)
        mainWindow.webContents.openDevTools();

    if (command_line_args.steam) {
        var greenworks;
        try {
            // if greenworks is installed in a node_modules folder, this will work
            greenworks = require('greenworks');
        } catch (e) {
            greenworks = require('../../greenworks');
        }

        if (!greenworks) {
            console.log('Greenworks not support for platform');
        } else {
            if (!greenworks.initAPI()) {
                console.log('Error on initializing steam API.');
            } else {
                console.log('Steam API initialized successfully.');
                var user_info = greenworks.getSteamId();
                mainWindow._steam_id = user_info && user_info.steamId;

                greenworks.getAuthSessionTicket(
                    function (ticket) {
                        //console.log("ticket: " + ticket.ticket.toString('hex'));
                        mainWindow._ticket_steam = ticket.ticket.toString('hex');
                    },
                    function (err) {
                        //console.log(err);
                        throw err;
                    }
                );
            }
        }
    }

}

app.on('ready', createWindow);
app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit() });
app.on('activate', function () { if (mainWindow === null) createWindow() });
