// Auth Check
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'doctor') {
    window.location.href = 'doctor-login.html';
}

document.getElementById('drName').textContent = user.name.split(' ')[0];
document.getElementById('welcomeMsg').textContent = `Welcome, ${user.name}`;

async function fetchWithAuth(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'doctor-login.html';
    }
    return res;
}

async function loadDashboardData() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try {
        await Promise.all([loadStats(), loadAppointments()]);
    } catch (err) {
        console.error(err);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

async function loadStats() {
    const res = await fetchWithAuth('/api/doctor-panel/stats');
    const data = await res.json();
    if (data.success) {
        document.getElementById('statTotal').textContent = data.stats.total;
        document.getElementById('statPending').textContent = data.stats.pending;
        document.getElementById('statRevenue').textContent = `₹${data.stats.totalRevenue.toLocaleString()}`;
        
        // Settlement Summary
        document.getElementById('grossEarnings').textContent = `₹${data.stats.totalRevenue.toFixed(2)}`;
        document.getElementById('medibookCharges').textContent = `- ₹${data.stats.medibookCharges.toFixed(2)}`;
        document.getElementById('finalSettlement').textContent = `₹${data.stats.finalSettlement.toFixed(2)}`;
    }
}

async function loadAppointments() {
    const res = await fetchWithAuth('/api/doctor-panel/appointments');
    const data = await res.json();
    if (data.success) {
        const body = document.getElementById('appointmentsBody');
        body.innerHTML = '';
        
        if (data.appointments.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="text-center py-4">No appointments found</td></tr>';
            return;
        }

        data.appointments.forEach(appt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="fw-bold">${appt.name}</div>
                    <div class="small text-muted">ID: #${appt.id}</div>
                </td>
                <td>
                    <div class="small">${appt.email}</div>
                    <div class="small">${appt.phone}</div>
                </td>
                <td>
                    <div class="fw-bold">${appt.formatted_date}</div>
                    <div class="small text-primary">${appt.formatted_time}</div>
                </td>
                <td>
                    <span class="badge-status badge-${appt.status}">${appt.status}</span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        ${appt.status === 'pending' ? `
                            <button class="btn btn-sm btn-success btn-action" onclick="updateStatus(${appt.id}, 'confirmed')">Confirm</button>
                            <button class="btn btn-sm btn-danger btn-action" onclick="updateStatus(${appt.id}, 'cancelled')">Cancel</button>
                        ` : ''}
                        ${appt.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-primary btn-action" onclick="updateStatus(${appt.id}, 'completed')">Mark Done</button>
                        ` : ''}
                    </div>
                </td>
            `;
            body.appendChild(row);
        });
    }
}

async function updateStatus(id, status) {
    if (!confirm(`Are you sure you want to mark this appointment as ${status}?`)) return;

    try {
        const res = await fetchWithAuth(`/api/doctor-panel/appointments/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            loadDashboardData();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'doctor-login.html';
}

// Initial Load
loadDashboardData();
