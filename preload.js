const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
	send: (channel, data) => {
		// whitelist channels
		let validChannels = [
			"recieve-data",
			"send-data",
			"resultSent",
			"recieve-api-data",
		];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		let validChannels = [
			"resultSent",
			"recieve-api-data",
			"recieve-data",
			"send-data",
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
});
