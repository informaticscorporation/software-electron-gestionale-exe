const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  createClient: (payload) => ipcRenderer.invoke('clients:create', payload),
  createVehicle: (payload) => ipcRenderer.invoke('vehicles:create', payload),
  createRental: (payload) => ipcRenderer.invoke('rentals:create', payload),
  updateRentalStatus: (payload) => ipcRenderer.invoke('rentals:update-status', payload),
  refreshDashboard: () => ipcRenderer.invoke('dashboard:refresh'),
  showError: (message) => ipcRenderer.invoke('dialog:error', message)
});
