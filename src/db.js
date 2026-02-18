const fs = require('node:fs');
const path = require('node:path');

const VEHICLE_TYPES = ['Auto', 'Moto', 'Barca'];

function createEmptyData() {
  return {
    clients: [],
    vehicles: [],
    rentals: [],
    counters: {
      clients: 0,
      vehicles: 0,
      rentals: 0
    }
  };
}

function openDatabase(app) {
  const dbPath = path.join(app.getPath('userData'), 'gestionale-noleggi.json');
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createEmptyData(), null, 2), 'utf8');
  }

  return {
    dbPath,
    read() {
      const raw = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(raw);
    },
    write(data) {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    }
  };
}

function normalizeNumber(value) {
  return Number(value || 0);
}

function createRepository(store) {
  return {
    getVehicleTypes() {
      return VEHICLE_TYPES;
    },

    listClients() {
      const data = store.read();
      return [...data.clients].sort((a, b) => b.id - a.id);
    },

    createClient(payload) {
      const data = store.read();
      const id = ++data.counters.clients;
      data.clients.push({ id, ...payload });
      store.write(data);
      return { id };
    },

    listVehicles() {
      const data = store.read();
      return [...data.vehicles]
        .map((v) => ({ ...v, daily_rate: normalizeNumber(v.daily_rate) }))
        .sort((a, b) => b.id - a.id);
    },

    createVehicle(payload) {
      if (!VEHICLE_TYPES.includes(payload.type)) {
        throw new Error('Tipo veicolo non valido.');
      }

      const data = store.read();
      const duplicate = data.vehicles.some((v) => v.plate_or_code === payload.plate_or_code);
      if (duplicate) {
        throw new Error('Targa/Codice già presente in flotta.');
      }

      const id = ++data.counters.vehicles;
      data.vehicles.push({ id, ...payload, daily_rate: normalizeNumber(payload.daily_rate) });
      store.write(data);
      return { id };
    },

    listRentals() {
      const data = store.read();
      const clientsMap = new Map(data.clients.map((c) => [c.id, c]));
      const vehiclesMap = new Map(data.vehicles.map((v) => [v.id, v]));

      return [...data.rentals]
        .map((r) => {
          const client = clientsMap.get(r.client_id) || {};
          const vehicle = vehiclesMap.get(r.vehicle_id) || {};
          return {
            ...r,
            client_name: client.full_name || 'N/D',
            plate_or_code: vehicle.plate_or_code || 'N/D',
            vehicle_type: vehicle.type || 'N/D',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            total_amount: normalizeNumber(r.total_amount),
            deposit: normalizeNumber(r.deposit)
          };
        })
        .sort((a, b) => b.id - a.id);
    },

    createRental(payload) {
      const data = store.read();
      const vehicle = data.vehicles.find((v) => v.id === payload.vehicle_id);
      if (!vehicle) {
        throw new Error('Veicolo non trovato.');
      }
      if (vehicle.status !== 'Disponibile') {
        throw new Error('Il veicolo selezionato non è disponibile.');
      }

      const id = ++data.counters.rentals;
      data.rentals.push({
        id,
        ...payload,
        total_amount: normalizeNumber(payload.total_amount),
        deposit: normalizeNumber(payload.deposit)
      });
      vehicle.status = 'Prenotato';
      store.write(data);
      return { id };
    },

    updateRentalStatus({ rentalId, status, vehicleId }) {
      const data = store.read();
      const rental = data.rentals.find((r) => r.id === rentalId);
      if (!rental) {
        throw new Error('Noleggio non trovato.');
      }

      rental.status = status;
      if (status === 'Completato') {
        const vehicle = data.vehicles.find((v) => v.id === vehicleId);
        if (vehicle) vehicle.status = 'Disponibile';
      }

      if (status === 'In Corso') {
        const vehicle = data.vehicles.find((v) => v.id === vehicleId);
        if (vehicle) vehicle.status = 'Prenotato';
      }

      store.write(data);
      return { success: true };
    },

    dashboardSnapshot() {
      const data = store.read();
      const month = new Date().toISOString().slice(0, 7);

      const activeRentals = data.rentals.filter((r) => ['Prenotato', 'In Corso'].includes(r.status)).length;
      const availableVehicles = data.vehicles.filter((v) => v.status === 'Disponibile').length;
      const monthRevenue = data.rentals
        .filter((r) => String(r.start_date || '').startsWith(month))
        .reduce((sum, r) => sum + normalizeNumber(r.total_amount), 0);

      const upcomingThreshold = new Date();
      upcomingThreshold.setDate(upcomingThreshold.getDate() + 3);

      const clientsMap = new Map(data.clients.map((c) => [c.id, c]));
      const vehiclesMap = new Map(data.vehicles.map((v) => [v.id, v]));

      const upcomingReturns = data.rentals
        .filter((r) => ['Prenotato', 'In Corso'].includes(r.status))
        .filter((r) => new Date(r.end_date) <= upcomingThreshold)
        .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
        .slice(0, 8)
        .map((r) => ({
          id: r.id,
          client_name: clientsMap.get(r.client_id)?.full_name || 'N/D',
          plate_or_code: vehiclesMap.get(r.vehicle_id)?.plate_or_code || 'N/D',
          end_date: r.end_date
        }));

      return {
        availableVehicles,
        activeRentals,
        monthRevenue,
        upcomingReturns
      };
    }
  };
}

module.exports = {
  openDatabase,
  createRepository
};
