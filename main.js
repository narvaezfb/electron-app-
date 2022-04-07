const electron = require("electron");
const path = require("path");
const url = require("url");
const axios = require("axios");

const { app, BrowserWindow, ipcMain, Menu } = electron;

const isMac = process.platform === "darwin";
let mainWindow;
let addUserWindow;
let apiWindow;

var knex = require("knex")({
	client: "sqlite3",
	connection: {
		filename: "./database.sqlite",
	},
});

const createMainWindow = () => {
	mainWindow = new BrowserWindow({
		width: 900,
		height: 600,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	//load html into the window
	mainWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "./html/main.html"),
			protocol: "file",
			slashes: true,
		})
	);

	//build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	//insert menu
	Menu.setApplicationMenu(mainMenu);

	mainWindow.webContents.openDevTools();

	mainWindow.on("closed", () => {
		app.quit();
	});
};

//create menu template
const mainMenuTemplate = [
	{
		label: "File",
		submenu: [
			{
				label: "Create User",
				click() {
					createAddUserWindow();
				},
			},
			{
				label: "Delete User",
			},
			{
				label: "Quit",
				accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
				click() {
					app.quit();
				},
			},
		],
	},
	{
		label: "API",
		submenu: [
			{
				label: "Retrieve data from API",
				click() {
					createApiWindow();
				},
			},
		],
	},
];

const createAddUserWindow = () => {
	addUserWindow = new BrowserWindow({
		width: 600,
		height: 400,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	addUserWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "./html/createUser.html"),
			protocol: "file",
			slashes: true,
		})
	);

	addUserWindow.webContents.openDevTools();

	ipcMain.once("recieve-data", function (event, data) {
		console.log(data);
		let result = knex("Users").insert({
			name: data.userName,
			email: data.userEmail,
			phone: data.userPhone,
		});
		result.then(() => {
			result = null;
			addUserWindow.destroy();
			mainWindow.reload();
			console.log("data added successfully");
		});
	});

	addUserWindow.on("close", function () {
		addUserWindow = null;
	});
};

const createApiWindow = () => {
	apiWindow = new BrowserWindow({
		width: 900,
		height: 600,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	apiWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "./html/api.html"),
			protocol: "file",
			slashes: true,
		})
	);

	apiWindow.webContents.openDevTools();
	fetchData();

	// apiWindow.webContents.send("recieve-api-data", data);

	apiWindow.on("closed", () => {
		apiWindow = null;
	});
};

function fetchData() {
	axios
		.get("https://catfact.ninja/fact")
		.then((response) => {
			console.log(response.data);
			apiWindow.webContents.send("recieve-api-data", response.data);
		})
		.catch((error) => {
			console.error(error);
		});
}

const sendDataFromDb = () => {
	ipcMain.on("send-data", (event, args) => {
		let result = knex.select("name", "email", "phone").from("Users");
		result.then((rows) => {
			mainWindow.webContents.send("resultSent", rows);
		});
	});
};

app.on("ready", () => {
	createMainWindow();
	sendDataFromDb();
});

app.on("window-all-closed", () => {
	if (!isMac) app.quit();
});
