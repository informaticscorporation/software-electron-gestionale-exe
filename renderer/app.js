const state = {
  clients: [],
  vehicles: [],
  rentals: [],
  stats: null,
  vehicleTypes: []
};

const statusClassMap = {
  Disponibile: 'disponibile',
  Prenotato: 'prenotato',
  'In Corso': 'in-corso',
  Completato: 'completato'
};

function euro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function showError(error) {
  const message = error?.message || 'Errore inatteso.';
  window.api.showError(message);
}

function renderDashboard() {
  const root = document.getElementById('dashboardCards');
  if (!state.stats) {
    root.innerHTML = '';
    return;
  }

  const returns = state.stats.upcomingReturns
    .map((r) => `<li>#${r.id} · ${r.client_name} · ${r.plate_or_code} · ${r.end_date}</li>`)
    .join('');

  root.innerHTML = `
    <div class="card"><h3>Veicoli Disponibili</h3><div class="value">${state.stats.availableVehicles}</div></div>
    <div class="card"><h3>Noleggi Attivi</h3><div class="value">${state.stats.activeRentals}</div></div>
    <div class="card"><h3>Fatturato del Mese</h3><div class="value">${euro(state.stats.monthRevenue)}</div></div>
    <div class="card"><h3>Rientri entro 3 giorni</h3><ul class="returns">${returns || '<li>Nessun rientro imminente</li>'}</ul></div>
  `;
}

function renderClients() {
  document.getElementById('clientsTable').innerHTML = state.clients
    .map((c) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.full_name}</td>
        <td>${c.phone || '-'}<br/><small>${c.email || ''}</small></td>
      </tr>
    `)
    .join('');

  document.getElementById('rentalClientSelect').innerHTML = [
    '<option value="">Seleziona cliente*</option>',
    ...state.clients.map((c) => `<option value="${c.id}">${c.full_name}</option>`)
  ].join('');
}

function renderVehicles() {
  document.getElementById('vehiclesTable').innerHTML = state.vehicles
    .map((v) => `
      <tr>
        <td>${v.id}</td>
        <td>${v.plate_or_code}<br/><small>${v.brand} ${v.model}</small></td>
        <td>${v.type}</td>
        <td>${euro(v.daily_rate)}</td>
        <td><span class="status-chip ${statusClassMap[v.status] || ''}">${v.status}</span></td>
      </tr>
    `)
    .join('');

  const availableVehicles = state.vehicles.filter((v) => v.status === 'Disponibile');
  document.getElementById('rentalVehicleSelect').innerHTML = [
    '<option value="">Seleziona veicolo*</option>',
    ...availableVehicles.map((v) => `<option value="${v.id}">${v.plate_or_code} · ${v.type}</option>`)
  ].join('');
}

function renderRentals() {
  document.getElementById('rentalsTable').innerHTML = state.rentals
    .map((r) => {
      const markInProgress = r.status === 'Prenotato'
        ? `<button class="status" data-action="start" data-id="${r.id}" data-vehicle-id="${r.vehicle_id}">Avvia</button>`
        : '';
      const markCompleted = r.status !== 'Completato'
        ? `<button class="status" data-action="close" data-id="${r.id}" data-vehicle-id="${r.vehicle_id}">Completa</button>`
        : '';

      return `
      <tr>
        <td>${r.id}</td>
        <td>${r.client_name}</td>
        <td>${r.plate_or_code}<br/><small>${r.vehicle_type}</small></td>
        <td>${r.start_date} → ${r.end_date}</td>
        <td>${euro(r.total_amount)}</td>
        <td><span class="status-chip ${statusClassMap[r.status] || ''}">${r.status}</span></td>
        <td>${markInProgress} ${markCompleted}</td>
      </tr>`;
    })
    .join('');
}

function renderVehicleTypeOptions() {
  document.getElementById('vehicleTypeSelect').innerHTML = [
    '<option value="">Tipo veicolo*</option>',
    ...state.vehicleTypes.map((type) => `<option value="${type}">${type}</option>`)
  ].join('');
}

async function initialize() {
  try {
    const bootstrap = await window.api.bootstrap();
    state.clients = bootstrap.clients;
    state.vehicles = bootstrap.vehicles;
    state.rentals = bootstrap.rentals;
    state.stats = bootstrap.stats;
    state.vehicleTypes = bootstrap.vehicleTypes;

    renderVehicleTypeOptions();
    renderDashboard();
    renderClients();
    renderVehicles();
    renderRentals();
  } catch (error) {
    showError(error);
  }
}

document.getElementById('clientForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target));

  try {
    const response = await window.api.createClient(formData);
    state.clients = response.clients;
    event.target.reset();
    renderClients();
  } catch (error) {
    showError(error);
  }
});

document.getElementById('vehicleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target));

  try {
    const response = await window.api.createVehicle(formData);
    state.vehicles = response.vehicles;
    state.stats = response.stats;
    event.target.reset();
    renderVehicles();
    renderDashboard();
  } catch (error) {
    showError(error);
  }
});

document.getElementById('rentalForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target));

  try {
    const response = await window.api.createRental(formData);
    state.rentals = response.rentals;
    state.vehicles = response.vehicles;
    state.stats = response.stats;
    event.target.reset();
    renderRentals();
    renderVehicles();
    renderDashboard();
  } catch (error) {
    showError(error);
  }
});

document.getElementById('rentalsTable').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const payload = {
    rentalId: Number(button.dataset.id),
    vehicleId: Number(button.dataset.vehicleId),
    status: button.dataset.action === 'start' ? 'In Corso' : 'Completato'
  };

  try {
    const response = await window.api.updateRentalStatus(payload);
    state.rentals = response.rentals;
    state.vehicles = response.vehicles;
    state.stats = response.stats;
    renderRentals();
    renderVehicles();
    renderDashboard();
  } catch (error) {
    showError(error);
  }
});

initialize();
