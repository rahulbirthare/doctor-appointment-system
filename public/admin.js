let currentAppointmentId = null;
let currentPage = 1;
let totalPages = 1;
let bookingsChart = null;
let specialtyChart = null;
let doctorsList = []; // New global to store doctors

// DOM Elements
const dashboardView = document.getElementById('dashboardView');
const appointmentsView = document.getElementById('appointmentsView');
const statsContainer = document.getElementById('statsContainer');
const appointmentsBody = document.getElementById('appointmentsBody');
const loadingSpinner = document.getElementById('loadingSpinner');
const appointmentsTable = document.getElementById('appointmentsTable');
const paginationContainer = document.getElementById('paginationContainer');

// Auth Check
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));
if (!token || !user || user.role !== 'admin') {
    window.location.href = 'login.html';
}

async function fetchWithAuth(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
    return res;
}



// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    try {
        // Initialize charts FIRST so they exist when stats are loaded
        initCharts();
        
        await Promise.all([
            loadStats(),
            loadAppointments(1)
        ]);
    } catch (error) {
        console.error('Initialization error:', error);
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'none';
    }
    
    // Setup real-time preview for email
    const emailMessage = document.querySelector('#emailForm textarea[name="message"]');
    const emailSubject = document.querySelector('#emailForm input[name="subject"]');
    
    if (emailMessage) {
        emailMessage.addEventListener('input', updateEmailPreview);
    }
    if (emailSubject) {
        emailSubject.addEventListener('input', updateEmailPreview);
    }
    
    // Setup filter change listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                loadAppointments(1);
            }
        });
    }

    const filters = ['dateFilter', 'doctorFilter', 'statusFilter', 'limitSelect'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', () => loadAppointments(1));
    });
});

async function initCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Charts will not be initialized.');
        return;
    }

    try {
        const ctx1 = document.getElementById('bookingsChart')?.getContext('2d');
        if (ctx1) {
            bookingsChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Bookings',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        const ctx2 = document.getElementById('specialtyChart')?.getContext('2d');
        if (ctx2) {
            specialtyChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    } catch (e) {
        console.error('Error initializing charts:', e);
    }
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    };
    document.getElementById('currentTime').textContent = now.toLocaleDateString('en-US', options);
}

// Navigation functions
function showDashboard() {
    dashboardView.style.display = 'block';
    appointmentsView.style.display = 'none';
    const dv = document.getElementById('doctorsView');
    const rv = document.getElementById('reviewsView');
    if(dv) dv.style.display = 'none';
    if(rv) rv.style.display = 'none';
    updateActiveNav('dashboard');
}

function showAppointments() {
    dashboardView.style.display = 'none';
    appointmentsView.style.display = 'block';
    const dv = document.getElementById('doctorsView');
    const rv = document.getElementById('reviewsView');
    if(dv) dv.style.display = 'none';
    if(rv) rv.style.display = 'none';
    updateActiveNav('appointments');
    loadAppointments(1);
}

function showDoctors() {
    dashboardView.style.display = 'none';
    appointmentsView.style.display = 'none';
    const dv = document.getElementById('doctorsView');
    const rv = document.getElementById('reviewsView');
    if(dv) dv.style.display = 'block';
    if(rv) rv.style.display = 'none';
    updateActiveNav('doctors');
    loadDoctorsList();
}

function showReviews() {
    dashboardView.style.display = 'none';
    appointmentsView.style.display = 'none';
    const dv = document.getElementById('doctorsView');
    const rv = document.getElementById('reviewsView');
    if(dv) dv.style.display = 'none';
    if(rv) rv.style.display = 'block';
    updateActiveNav('reviews');
    loadReviewsList();
}

function updateActiveNav(view) {
    const links = document.querySelectorAll('.sidebar a');
    const title = document.getElementById('viewTitle');
    links.forEach(link => link.classList.remove('active'));
    
    if (view === 'dashboard') {
        links[0].classList.add('active');
        if(title) title.textContent = 'Dashboard Overview';
    } else if (view === 'appointments') {
        links[1].classList.add('active');
        if(title) title.textContent = 'Manage Appointments';
    } else if (view === 'doctors') {
        links[2].classList.add('active');
        if(title) title.textContent = 'Manage Doctors';
    } else if (view === 'reviews') {
        links[3].classList.add('active');
        if(title) title.textContent = 'Manage Reviews';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ============ DASHBOARD FUNCTIONS ============

async function loadStats() {
    console.log('Loading dashboard stats...');
    try {
        const response = await fetchWithAuth('/api/admin/stats');
        const data = await response.json();
        console.log('Stats Data Received:', data);
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards with animation or direct value
            const updateVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val !== undefined ? val : 0;
            };

            updateVal('totalAppointments', stats.totalAppointments);
            updateVal('todayAppointments', stats.todayAppointments);
            updateVal('confirmedAppointments', stats.confirmedAppointments);
            updateVal('cancelledAppointments', stats.cancelledAppointments);
            
            // Update quick stats
            updateVal('upcomingAppointments', stats.upcomingAppointments);
            updateVal('cancellationRate', (stats.cancellationRate || 0) + '%');
            
            // Financials
            updateVal('totalGross', `₹${(stats.totalGross || 0).toLocaleString()}`);
            updateVal('medibookRevenue', `₹${(stats.medibookRevenue || 0).toLocaleString()}`);
            updateVal('totalDoctorSettlement', `₹${(stats.totalDoctorSettlement || 0).toLocaleString()}`);
            
            const popDocEl = document.getElementById('popularDoctor');
            if (popDocEl) {
                popDocEl.textContent = stats.popularDoctor && stats.popularDoctor.doctor !== 'None' ? 
                    `${stats.popularDoctor.doctor}` : 'No bookings yet';
            }
            
            // Update Charts with Real Data
            updateCharts(stats);

            // Load recent activity
            loadRecentActivity();
        } else {
            console.error('Stats load unsuccessful:', data.message);
            showNotification('Failed to load stats: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error in loadStats:', error);
        showNotification('An error occurred while loading dashboard stats', 'error');
    }
}

function updateCharts(stats) {
    // Update Bookings Trend
    if (bookingsChart && stats.trendData) {
        bookingsChart.data.labels = stats.trendData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
        bookingsChart.data.datasets[0].data = stats.trendData.map(d => d.count);
        bookingsChart.update();
    }

    // Update Specialty Distribution
    if (specialtyChart && stats.specialtyData) {
        specialtyChart.data.labels = stats.specialtyData.map(s => s.specialty);
        specialtyChart.data.datasets[0].data = stats.specialtyData.map(s => s.count);
        specialtyChart.update();
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetchWithAuth('/api/admin/appointments?limit=5');
        const data = await response.json();
        
        if (data.success) {
            const recentActivity = document.getElementById('recentActivity');
            recentActivity.innerHTML = '';
            
            if (data.appointments.length === 0) {
                recentActivity.innerHTML = '<div class="text-center text-muted">No recent activity</div>';
                return;
            }
            
            data.appointments.forEach(appointment => {
                const activityItem = document.createElement('div');
                activityItem.className = 'd-flex justify-content-between align-items-center mb-2 p-2 border-bottom';
                
                const time = new Date(appointment.booking_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                activityItem.className = 'recent-activity-item p-3 mb-2 rounded-3 bg-light d-flex justify-content-between align-items-center';
                activityItem.innerHTML = `
                    <div>
                        <strong class="text-dark">${appointment.name}</strong>
                        <div class="text-muted small">
                            ${appointment.doctor} • ${time}
                        </div>
                    </div>
                    <span class="badge-status badge-${appointment.status}">
                        ${appointment.status}
                    </span>
                `;
                
                recentActivity.appendChild(activityItem);
            });
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function refreshStats() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if(loadingSpinner) loadingSpinner.style.display = 'flex';
    loadStats();
    loadAppointments(1); // Refresh appointments too
    showNotification('Dashboard refreshed', 'success');
}

// ============ APPOINTMENTS FUNCTIONS ============

async function loadAppointments(page = 1) {
    currentPage = page;
    
    // Show loading
    loadingSpinner.style.display = 'flex';
    appointmentsTable.style.display = 'none';
    
    // Build query parameters
    const search = document.getElementById('searchInput')?.value || '';
    const date = document.getElementById('dateFilter')?.value || '';
    const doctor = document.getElementById('doctorFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    const limit = document.getElementById('limitSelect')?.value || 25;
    
    let url = `/api/admin/appointments?page=${page}&limit=${limit}`;
    
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (date) url += `&date=${date}`;
    if (doctor && doctor !== 'all') url += `&doctor=${encodeURIComponent(doctor)}`;
    if (status && status !== 'all') url += `&status=${status}`;
    
    try {
        const response = await fetchWithAuth(url);
        const data = await response.json();
        
        if (data.success) {
            renderAppointments(data);
            // updateFilters(data.filters); // Removed for now to prevent duplication
            renderPagination(data.pagination);
            
            // Hide loading, show table
            loadingSpinner.style.display = 'none';
            appointmentsTable.style.display = 'table';
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        loadingSpinner.style.display = 'none';
        showNotification('Failed to load appointments', 'error');
    }
}

function renderAppointments(data) {
    const appointments = data.appointments;
    appointmentsBody.innerHTML = '';
    
    if (appointments.length === 0) {
        appointmentsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-muted">
                    <i class="fas fa-folder-open mb-3" style="font-size: 48px; opacity: 0.2;"></i>
                    <h5>No appointments found</h5>
                    <p>Try changing your filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: 700;">
                        ${appointment.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="fw-bold">${appointment.name}</div>
                        <div class="text-muted small">${appointment.email}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="fw-semibold">${appointment.doctor}</div>
                <div class="text-muted small">Specialist</div>
            </td>
            <td>
                <div class="fw-bold"><i class="far fa-calendar-alt me-2 text-primary"></i>${appointment.formatted_date}</div>
                <div class="text-muted small"><i class="far fa-clock me-2 text-primary"></i>${appointment.formatted_time}</div>
            </td>
            <td>
                <span class="badge-status badge-${appointment.status}">
                    <i class="fas fa-circle" style="font-size: 6px;"></i>
                    ${appointment.status}
                </span>
            </td>
            <td>
                <div class="d-flex">
                    <button class="action-btn btn-view" onclick="editAppointment(${appointment.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-email" onclick="sendAppointmentEmail(${appointment.id})" title="Send Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteAppointment(${appointment.id})" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        appointmentsBody.appendChild(row);
    });
}

function updateFilters(filters) {
    const doctorFilter = document.getElementById('doctorFilter');
    if (filters && filters.doctors) {
        // Clear existing options (keep "All Doctors")
        while (doctorFilter.options.length > 1) {
            doctorFilter.remove(1);
        }
        
        // Add doctor options
        filters.doctors.forEach(doctor => {
            if (doctor) { // Check for non-null values
                const option = document.createElement('option');
                option.value = doctor;
                option.textContent = doctor;
                doctorFilter.appendChild(option);
            }
        });
    }
}

function renderPagination(pagination) {
    paginationContainer.innerHTML = '';
    totalPages = pagination.totalPages;
    
    if (totalPages <= 1) return;
    
    const paginationEl = document.createElement('nav');
    paginationEl.innerHTML = `
        <ul class="pagination">
            <li class="page-item ${pagination.hasPrevPage ? '' : 'disabled'}">
                <a class="page-link" href="#" onclick="loadAppointments(${currentPage - 1}); return false;">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
            
            ${generatePageNumbers(currentPage, totalPages)}
            
            <li class="page-item ${pagination.hasNextPage ? '' : 'disabled'}">
                <a class="page-link" href="#" onclick="loadAppointments(${currentPage + 1}); return false;">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        </ul>
        <div class="ms-3 text-muted">
            Showing ${(currentPage - 1) * pagination.limit + 1} to 
            ${Math.min(currentPage * pagination.limit, pagination.total)} of 
            ${pagination.total} appointments
        </div>
    `;
    
    paginationContainer.appendChild(paginationEl);
}

function generatePageNumbers(current, total) {
    let pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    
    // Add ellipsis after first page if needed
    if (start > 2) {
        pages.push('...');
    }
    
    // Add middle pages
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (end < total - 1) {
        pages.push('...');
    }
    
    // Always show last page if not already shown
    if (total > 1 && !pages.includes(total)) {
        pages.push(total);
    }
    
    // Generate HTML
    return pages.map(page => {
        if (page === '...') {
            return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        return `
            <li class="page-item ${page === current ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadAppointments(${page}); return false;">
                    ${page}
                </a>
            </li>
        `;
    }).join('');
}

// ============ APPOINTMENT ACTIONS ============

async function editAppointment(id) {
    try {
        const response = await fetchWithAuth(`/api/admin/appointments/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const appointment = data.appointment;
            const form = document.getElementById('appointmentForm');
            
            // Fill form with appointment data
            form.name.value = appointment.name;
            form.email.value = appointment.email;
            form.phone.value = appointment.phone;
            form.doctor.value = appointment.doctor;
            form.appt_date.value = appointment.formatted_date;
            form.appt_time.value = appointment.formatted_time;
            form.status.value = appointment.status;
            form.id.value = appointment.id;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading appointment:', error);
        showNotification('Failed to load appointment details', 'error');
    }
}

async function saveAppointment() {
    const form = document.getElementById('appointmentForm');
    const appointmentId = form.id.value;
    
    const appointment = {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        doctor: form.doctor.value,
        appt_date: form.appt_date.value,
        appt_time: form.appt_time.value,
        status: form.status.value
    };
    
    try {
        const response = await fetchWithAuth(`/api/admin/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointment)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Appointment updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide();
            loadAppointments(currentPage);
            loadStats();
        } else {
            showNotification(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        showNotification('Failed to update appointment', 'error');
    }
}

async function sendAppointmentEmail(id) {
    try {
        const response = await fetchWithAuth(`/api/admin/appointments/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const appointment = data.appointment;
            const form = document.getElementById('emailForm');
            
            // Fill form with appointment data
            document.getElementById('emailTo').value = appointment.email;
            document.getElementById('emailPatientName').value = appointment.name;
            form.appointmentId.value = appointment.id;
            
            // Set default subject if empty
            const subjectInput = form.querySelector('input[name="subject"]');
            if (!subjectInput.value) {
                subjectInput.value = `Regarding your appointment with ${appointment.doctor}`;
            }
            
            // Update preview
            updateEmailPreview();
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('emailModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading appointment for email:', error);
        showNotification('Failed to load appointment details', 'error');
    }
}

function updateEmailPreview() {
    const form = document.getElementById('emailForm');
    const subject = form.querySelector('input[name="subject"]').value;
    const message = form.querySelector('textarea[name="message"]').value;
    const patientName = document.getElementById('emailPatientName').value;
    
    const preview = document.getElementById('emailPreview');
    
    if (!message.trim()) {
        preview.innerHTML = '<strong>Preview will appear here</strong>';
        return;
    }
    
    preview.innerHTML = `
        <strong>Subject:</strong> ${subject || '(No subject)'}<br><br>
        <strong>Message Preview:</strong><br>
        <div style="border-left: 3px solid #3498db; padding-left: 10px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
        </div>
        <small class="text-muted">This will be sent to ${patientName}</small>
    `;
}

async function sendEmail() {
    const form = document.getElementById('emailForm');
    const appointmentId = form.appointmentId.value;
    const subject = form.querySelector('input[name="subject"]').value;
    const message = form.querySelector('textarea[name="message"]').value;
    
    if (!subject.trim() || !message.trim()) {
        showNotification('Please fill in both subject and message', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/admin/appointments/${appointmentId}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subject, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Email sent successfully', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('emailModal'));
            modal.hide();
            
            // Clear form
            form.reset();
        } else {
            showNotification(data.message || 'Failed to send email', 'error');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        showNotification('Failed to send email', 'error');
    }
}

async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/appointments/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Appointment deleted successfully', 'success');
            loadAppointments(currentPage);
            loadStats();
        } else {
            showNotification(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification('Failed to delete appointment', 'error');
    }
}

function exportAppointments() {
    const search = document.getElementById('searchInput')?.value || '';
    const date = document.getElementById('dateFilter')?.value || '';
    const doctor = document.getElementById('doctorFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    
    // In a real app, you'd fetch filtered data from the server.
    // Here we'll generate a CSV from the current table rows for demonstration.
    const rows = Array.from(document.querySelectorAll('#appointmentsTable tbody tr'));
    
    if (rows.length === 0 || rows[0].innerText.includes('No appointments')) {
        showNotification('No data to export', 'error');
        return;
    }

    let csv = 'Patient,Specialist,Schedule,Status\n';
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if(cols.length < 4) return;
        
        const patient = cols[0].innerText.replace(/\n/g, ' ').trim();
        const specialist = cols[1].innerText.replace(/\n/g, ' ').trim();
        const schedule = cols[2].innerText.replace(/\n/g, ' ').trim();
        const status = cols[3].innerText.replace(/\n/g, ' ').trim();
        
        csv += `"${patient}","${specialist}","${schedule}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `appointments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('CSV exported successfully', 'success');
}

// ============ UTILITY FUNCTIONS ============

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Handle errors globally
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', {msg, url, lineNo, columnNo, error});
    showNotification('An error occurred. Check console for details.', 'error');
    return false;
};
// ============ DOCTORS FUNCTIONS ============

async function loadDoctorsList() {
    try {
        const response = await fetchWithAuth('/api/admin/doctors');
        const data = await response.json();
        
        if (data.success) {
            doctorsList = data.doctors; // Store in global
            const doctorsBody = document.getElementById('doctorsBody');
            doctorsBody.innerHTML = '';
            
            doctorsList.forEach(doctor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: 700;">
                                ${doctor.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="fw-bold">${doctor.name}</div>
                        </div>
                    </td>
                    <td>${doctor.specialty}</td>
                    <td>${doctor.experience}</td>
                    <td class="small fw-bold text-primary">${doctor.email || '-'}</td>
                    <td class="small text-muted font-monospace">${doctor.password || '-'}</td>
                    <td>
                        <span class="badge-status ${doctor.available ? 'badge-confirmed' : 'badge-cancelled'}">
                            ${doctor.available ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex">
                            <button class="action-btn btn-edit" onclick="openDoctorModal(${doctor.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="deleteDoctor(${doctor.id})" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;
                doctorsBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showNotification('Failed to load doctors', 'error');
    }
}

function openDoctorModal(id = null) {
    const modalEl = document.getElementById('doctorModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
    }
    
    const form = document.getElementById('doctorForm');
    const title = document.getElementById('doctorModalTitle');
    
    form.reset();
    if (id) {
        const doctor = doctorsList.find(d => d.id == id);
        if(!doctor) return;
        
        title.textContent = 'Edit Doctor Profile';
        form.id.value = doctor.id;
        form.name.value = doctor.name;
        form.specialty.value = doctor.specialty;
        form.experience.value = doctor.experience;
        form.email.value = doctor.email || '';
        form.password.value = doctor.password || '';
        form.rating.value = doctor.rating;
        form.available.value = doctor.available ? "1" : "0";
    } else {
        title.textContent = 'Add New Doctor';
        form.id.value = '';
    }
    
    modalInstance.show();
}

async function saveDoctor() {
    const form = document.getElementById('doctorForm');
    const id = form.id.value;
    const doctorData = {
        name: form.name.value,
        specialty: form.specialty.value,
        experience: form.experience.value,
        email: form.email.value,
        password: form.password.value,
        rating: form.rating.value,
        available: form.available.value === "1"
    };
    
    if (!doctorData.name || !doctorData.specialty) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    const url = id ? `/api/admin/doctors/${id}` : '/api/admin/doctors';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doctorData)
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Doctor ${id ? 'updated' : 'added'} successfully`, 'success');
            const modalEl = document.getElementById('doctorModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            loadDoctorsList();
        } else {
            showNotification(data.message || 'Failed to save doctor', 'error');
        }
    } catch (error) {
        console.error('Error saving doctor:', error);
        showNotification('Failed to save doctor', 'error');
    }
}

async function deleteDoctor(id) {
    if (!confirm('Are you sure you want to remove this doctor?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/admin/doctors/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showNotification('Doctor removed successfully', 'success');
            loadDoctorsList();
        }
    } catch (error) {
        console.error('Error deleting doctor:', error);
    }
}

// ============ REVIEWS FUNCTIONS ============

async function loadReviewsList() {
    try {
        const response = await fetchWithAuth('/api/reviews');
        const data = await response.json();
        
        if (data.success) {
            const reviewsBody = document.getElementById('reviewsBody');
            reviewsBody.innerHTML = '';
            
            data.reviews.forEach(review => {
                const row = document.createElement('tr');
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                row.innerHTML = `
                    <td>
                        <div class="fw-bold">${review.name}</div>
                        <div class="text-muted small">ID: ${review.id}</div>
                    </td>
                    <td><div class="text-warning">${stars}</div></td>
                    <td><div class="small" style="max-width: 300px; white-space: normal;">${review.comment}</div></td>
                    <td>${new Date(review.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn btn-delete" onclick="deleteReview(${review.id})" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                reviewsBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

async function deleteReview(id) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/reviews/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showNotification('Review deleted successfully', 'success');
            loadReviewsList();
        }
    } catch (error) {
        console.error('Error deleting review:', error);
    }
}
