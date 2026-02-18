const path = require('node:path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { openDatabase, createRepository } = require('./db');

let repository;

function nowIso() {
  return new Date().toISOString();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Gestionale Noleggi Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function validateRequired(payload, fields) {
  for (const field of fields) {
    if (!payload[field] && payload[field] !== 0) {
      throw new Error(`Campo obbligatorio mancante: ${field}`);
    }
  }
}

app.whenReady().then(() => {
  const db = openDatabase(app);
  repository = createRepository(db);

  ipcMain.handle('app:bootstrap', async () => ({
    vehicleTypes: repository.getVehicleTypes(),
    stats: repository.dashboardSnapshot(),
    clients: repository.listClients(),
    vehicles: repository.listVehicles(),
    rentals: repository.listRentals()
  }));

  ipcMain.handle('clients:create', async (_evt, payload) => {
    validateRequired(payload, ['full_name']);
    const result = repository.createClient({
      full_name: payload.full_name,
      phone: payload.phone || '',
      email: payload.email || '',
      document_id: payload.document_id || '',
      created_at: nowIso()
    });
    return { result, clients: repository.listClients() };
  });

  ipcMain.handle('vehicles:create', async (_evt, payload) => {
    validateRequired(payload, ['plate_or_code', 'type', 'brand', 'model', 'daily_rate']);
    const result = repository.createVehicle({
      plate_or_code: payload.plate_or_code,
      type: payload.type,
      brand: payload.brand,
      model: payload.model,
      daily_rate: Number(payload.daily_rate),
      status: payload.status || 'Disponibile',
      notes: payload.notes || '',
      created_at: nowIso()
    });
    return { result, vehicles: repository.listVehicles(), stats: repository.dashboardSnapshot() };
  });

  ipcMain.handle('rentals:create', async (_evt, payload) => {
    validateRequired(payload, ['client_id', 'vehicle_id', 'start_date', 'end_date', 'total_amount']);
    const result = repository.createRental({
      client_id: Number(payload.client_id),
      vehicle_id: Number(payload.vehicle_id),
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_amount: Number(payload.total_amount),
      deposit: Number(payload.deposit || 0),
      status: payload.status || 'Prenotato',
      notes: payload.notes || '',
      created_at: nowIso()
    });

    return {
      result,
      rentals: repository.listRentals(),
      vehicles: repository.listVehicles(),
      stats: repository.dashboardSnapshot()
    };
  });

  ipcMain.handle('rentals:update-status', async (_evt, payload) => {
    validateRequired(payload, ['rentalId', 'status', 'vehicleId']);
    repository.updateRentalStatus({
      rentalId: Number(payload.rentalId),
      status: payload.status,
      vehicleId: Number(payload.vehicleId)
    });

    return {
      rentals: repository.listRentals(),
      vehicles: repository.listVehicles(),
      stats: repository.dashboardSnapshot()
    };
  });

  ipcMain.handle('dashboard:refresh', async () => repository.dashboardSnapshot());

  ipcMain.handle('dialog:error', async (_evt, message) => {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Errore',
      message
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
