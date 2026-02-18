const path = require('node:path');
const Database = require('better-sqlite3');

const VEHICLE_TYPES = ['Auto', 'Moto', 'Barca'];

function openDatabase(app) {
  const dbPath = path.join(app.getPath('userData'), 'gestionale-noleggi.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      document_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_or_code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Disponibile',
      notes TEXT,
      created_at TEXT NOT NULL,
      CHECK (type IN ('Auto', 'Moto', 'Barca'))
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      deposit REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Prenotato',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_rentals_vehicle ON rentals(vehicle_id);
  `);

  return db;
}

function mapVehicle(row) {
  return {
    ...row,
    daily_rate: Number(row.daily_rate)
  };
}

function mapRental(row) {
  return {
    ...row,
    total_amount: Number(row.total_amount),
    deposit: Number(row.deposit)
  };
}

function createRepository(db) {
  const statements = {
    listClients: db.prepare('SELECT * FROM clients ORDER BY id DESC'),
    insertClient: db.prepare(`
      INSERT INTO clients(full_name, phone, email, document_id, created_at)
      VALUES (@full_name, @phone, @email, @document_id, @created_at)
    `),

    listVehicles: db.prepare('SELECT * FROM vehicles ORDER BY id DESC'),
    insertVehicle: db.prepare(`
      INSERT INTO vehicles(plate_or_code, type, brand, model, daily_rate, status, notes, created_at)
      VALUES (@plate_or_code, @type, @brand, @model, @daily_rate, @status, @notes, @created_at)
    `),
    updateVehicleStatus: db.prepare('UPDATE vehicles SET status = ? WHERE id = ?'),

    listRentals: db.prepare(`
      SELECT r.*, c.full_name AS client_name,
             v.plate_or_code, v.type AS vehicle_type, v.brand, v.model
      FROM rentals r
      JOIN clients c ON c.id = r.client_id
      JOIN vehicles v ON v.id = r.vehicle_id
      ORDER BY r.id DESC
    `),
    insertRental: db.prepare(`
      INSERT INTO rentals(
        client_id, vehicle_id, start_date, end_date,
        total_amount, deposit, status, notes, created_at
      ) VALUES (
        @client_id, @vehicle_id, @start_date, @end_date,
        @total_amount, @deposit, @status, @notes, @created_at
      )
    `),
    updateRentalStatus: db.prepare('UPDATE rentals SET status = ? WHERE id = ?'),

    dashboardStats: {
      availableVehicles: db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'Disponibile'"),
      activeRentals: db.prepare("SELECT COUNT(*) AS count FROM rentals WHERE status IN ('Prenotato','In Corso')"),
      monthRevenue: db.prepare(`
        SELECT IFNULL(SUM(total_amount), 0) AS revenue
        FROM rentals
        WHERE substr(start_date,1,7) = ?
      `),
      upcomingReturns: db.prepare(`
        SELECT r.id, c.full_name AS client_name, v.plate_or_code, r.end_date
        FROM rentals r
        JOIN clients c ON c.id = r.client_id
        JOIN vehicles v ON v.id = r.vehicle_id
        WHERE r.status IN ('Prenotato', 'In Corso')
          AND date(r.end_date) <= date('now', '+3 day')
        ORDER BY date(r.end_date) ASC
        LIMIT 8
      `)
    }
  };

  return {
    getVehicleTypes() {
      return VEHICLE_TYPES;
    },

    listClients() {
      return statements.listClients.all();
    },

    createClient(payload) {
      const result = statements.insertClient.run(payload);
      return { id: result.lastInsertRowid };
    },

    listVehicles() {
      return statements.listVehicles.all().map(mapVehicle);
    },

    createVehicle(payload) {
      if (!VEHICLE_TYPES.includes(payload.type)) {
        throw new Error('Tipo veicolo non valido.');
      }
      const result = statements.insertVehicle.run(payload);
      return { id: result.lastInsertRowid };
    },

    listRentals() {
      return statements.listRentals.all().map(mapRental);
    },

    createRental(payload) {
      const createTx = db.transaction((txPayload) => {
        const insert = statements.insertRental.run(txPayload);
        statements.updateVehicleStatus.run('Prenotato', txPayload.vehicle_id);
        return insert.lastInsertRowid;
      });

      const id = createTx(payload);
      return { id };
    },

    updateRentalStatus({ rentalId, status, vehicleId }) {
      const updateTx = db.transaction((input) => {
        statements.updateRentalStatus.run(input.status, input.rentalId);
        if (input.status === 'Completato') {
          statements.updateVehicleStatus.run('Disponibile', input.vehicleId);
        }
      });
      updateTx({ rentalId, status, vehicleId });
      return { success: true };
    },

    dashboardSnapshot() {
      const month = new Date().toISOString().slice(0, 7);
      return {
        availableVehicles: statements.dashboardStats.availableVehicles.get().count,
        activeRentals: statements.dashboardStats.activeRentals.get().count,
        monthRevenue: Number(statements.dashboardStats.monthRevenue.get(month).revenue),
        upcomingReturns: statements.dashboardStats.upcomingReturns.all()
      };
    }
  };
}

module.exports = {
  openDatabase,
  createRepository
};
