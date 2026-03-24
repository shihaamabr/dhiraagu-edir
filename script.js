const form = document.getElementById('searchForm');
const phoneInput = document.getElementById('phoneNumber');
const searchBtn = document.getElementById('searchBtn');
const tableSearch = document.getElementById('tableSearch');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyTableBody = document.getElementById('historyTableBody');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');
const confirmModal = document.getElementById('confirmModal');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const mobileTableContainer = document.getElementById('mobileTableContainer');
const mobileTableBody = document.getElementById('mobileTableBody');
const emptyStateMobile = document.getElementById('emptyStateMobile');
const qrModal = document.getElementById('qrModal');
const qrContainer = document.getElementById('qrContainer');
const qrTitle = document.getElementById('qrTitle');
const closeQrBtn = document.getElementById('closeQrBtn');

let searchHistory = [];
let currentSort = { column: 'timestamp', direction: 'desc' };

const HISTORY_KEY = 'edir_search_history';

function loadHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
        searchHistory = JSON.parse(stored);
    }
    renderTable();
}

function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
}

function addToHistory(phone, result, status) {
    const entry = {
        id: Date.now(),
        phone,
        result,
        status,
        timestamp: Date.now()
    };
    searchHistory.unshift(entry);
    saveHistory();
    renderTable();
}

function clearHistory() {
    searchHistory = [];
    localStorage.removeItem(HISTORY_KEY);
    renderTable();
    showToast('History cleared', 'success');
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const datePart = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    return `<span class="date-part">${datePart}</span><span class="time-part">${timePart}</span>`;
}

function getStatusBadge(status) {
    const badges = {
        success: '<span class="status-badge status-success">Found</span>',
        not_found: '<span class="status-badge status-not-found">Not Found</span>',
        error: '<span class="status-badge status-error">Error</span>'
    };
    return badges[status] || badges.error;
}

function renderTable(filteredHistory = null) {
    const data = filteredHistory || getSortedHistory();
    historyTableBody.innerHTML = '';
    mobileTableBody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        mobileTableContainer.style.display = 'none';
        emptyStateMobile.style.display = '';
        resultsCount.textContent = filteredHistory ? 'No results found' : '';
        return;
    }

    emptyState.style.display = 'none';
    mobileTableContainer.style.display = '';
    emptyStateMobile.style.display = 'none';
    resultsCount.textContent = `Showing ${data.length} ${data.length === 1 ? 'result' : 'results'}`;

    data.forEach((entry, index) => {
        let resultHtml;
        if (entry.status === 'not_found') {
            resultHtml = getStatusBadge(entry.status);
        } else if (entry.status === 'error') {
            resultHtml = `${escapeHtml(entry.result)}<div style="margin-top: 8px;">${getStatusBadge(entry.status)}<button class="retry-btn" data-phone="${escapeHtml(entry.phone)}" data-id="${entry.id}" title="Retry"><span class="material-icons">refresh</span></button></div>`;
        } else {
            resultHtml = escapeHtml(entry.result);
        }

        // Desktop table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="phone-number">
                <div class="phone-cell">
                    <div class="phone-icons">
                        <a href="tel:${escapeHtml(entry.phone)}" class="phone-icon-btn" title="Call">
                            <span class="material-icons">phone</span>
                        </a>
                        <button class="phone-icon-btn qr-btn" title="QR Code">
                            <span class="material-icons">qr_code_2</span>
                        </button>
                    </div>
                    <span class="phone-text">${escapeHtml(entry.phone)}</span>
                </div>
            </td>
            <td class="result">${resultHtml}</td>
            <td class="datetime">${formatDate(entry.timestamp)}</td>
        `;
        row.querySelector('.qr-btn').addEventListener('click', () => showQrCode(entry.phone));
        const resultCell = row.querySelector('.result');
        if (entry.status === 'success') {
            resultCell.classList.add('copyable');
            resultCell.addEventListener('click', () => copyToClipboard(entry.result));
        }
        const retryBtn = row.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => retrySearch(entry.id, entry.phone, retryBtn));
        }
        historyTableBody.appendChild(row);

        // Mobile table row
        const mobileRow = document.createElement('tr');
        mobileRow.innerHTML = `
            <td class="phone-number">
                <div class="phone-cell">
                    <div class="phone-icons">
                        <a href="tel:${escapeHtml(entry.phone)}" class="phone-icon-btn" title="Call">
                            <span class="material-icons">phone</span>
                        </a>
                        <button class="phone-icon-btn qr-btn" title="QR Code">
                            <span class="material-icons">qr_code_2</span>
                        </button>
                    </div>
                    <span class="phone-text">${escapeHtml(entry.phone)}</span>
                </div>
            </td>
            <td class="result">${resultHtml}</td>
            <td class="datetime">${formatDate(entry.timestamp)}</td>
        `;
        mobileRow.querySelector('.qr-btn').addEventListener('click', () => showQrCode(entry.phone));
        const mobileResultCell = mobileRow.querySelector('.result');
        if (entry.status === 'success') {
            mobileResultCell.classList.add('copyable');
            mobileResultCell.addEventListener('click', () => copyToClipboard(entry.result));
        }
        const mobileRetryBtn = mobileRow.querySelector('.retry-btn');
        if (mobileRetryBtn) {
            mobileRetryBtn.addEventListener('click', () => retrySearch(entry.id, entry.phone, mobileRetryBtn));
        }
        mobileTableBody.appendChild(mobileRow);
    });
}

function getSortedHistory() {
    const sorted = [...searchHistory];
    sorted.sort((a, b) => {
        let comparison = 0;
        if (currentSort.column === 'phone') {
            comparison = a.phone.localeCompare(b.phone);
        } else if (currentSort.column === 'result') {
            comparison = a.result.localeCompare(b.result);
        } else if (currentSort.column === 'timestamp') {
            comparison = a.timestamp - b.timestamp;
        } else if (currentSort.column === 'status') {
            comparison = a.status.localeCompare(b.status);
        }
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
}

function filterHistory(searchTerm) {
    if (!searchTerm.trim()) {
        renderTable();
        clearSearchBtn.classList.remove('show');
        return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = searchHistory.filter(entry =>
        entry.phone.toLowerCase().includes(term) ||
        entry.result.toLowerCase().includes(term)
    );

    renderTable(filtered);
    clearSearchBtn.classList.add('show');
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    document.querySelectorAll(`th[data-sort="${column}"]`).forEach(th => {
        th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    });

    const searchTerm = tableSearch.value;
    if (searchTerm.trim()) {
        filterHistory(searchTerm);
    } else {
        renderTable();
    }
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}

async function retrySearch(entryId, phoneNumber, button) {
    button.classList.add('loading');

    let apiNumber = phoneNumber;
    if (/^\+960\d{7}$/.test(phoneNumber)) {
        apiNumber = phoneNumber.slice(4);
    } else if (/^960\d{7}$/.test(phoneNumber)) {
        apiNumber = phoneNumber.slice(3);
    }

    try {
        const response = await fetch(`https://dhiraagu-edir-proxy.shihaam.me/${encodeURIComponent(apiNumber)}`);
        const data = await response.json();

        const entryIndex = searchHistory.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        if (response.ok && data && data.dirEnquiryEntry) {
            if (data.dirEnquiryEntry === 'Number not found') {
                searchHistory[entryIndex].result = 'Number not found';
                searchHistory[entryIndex].status = 'not_found';
            } else {
                searchHistory[entryIndex].result = data.dirEnquiryEntry;
                searchHistory[entryIndex].status = 'success';
            }
        } else {
            searchHistory[entryIndex].result = 'No results found';
            searchHistory[entryIndex].status = 'error';
        }
        searchHistory[entryIndex].timestamp = Date.now();
        saveHistory();
        renderTable();
        showToast('Retry successful', 'success');
    } catch (error) {
        button.classList.remove('loading');
        showToast('Retry failed', 'error');
    }
}

function showQrCode(phone) {
    const telUrl = `tel:${phone}`;
    qrTitle.textContent = phone;
    qrContainer.innerHTML = '';
    const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
    new QRCode(qrContainer, {
        text: telUrl,
        width: 200,
        height: 200,
        colorDark: isLightMode ? '#e07800' : '#ff8c00',
        colorLight: isLightMode ? '#ffffff' : '#111111',
        correctLevel: QRCode.CorrectLevel.H
    });
    qrModal.classList.add('show');
}

// Only allow numbers and + in phone input
phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9+]/g, '');
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) return;

    // Strip +960 or 960 prefix for API call if it's a valid Maldivian number
    let apiNumber = phoneNumber;
    if (/^\+960\d{7}$/.test(phoneNumber)) {
        apiNumber = phoneNumber.slice(4); // Remove +960
    } else if (/^960\d{7}$/.test(phoneNumber)) {
        apiNumber = phoneNumber.slice(3); // Remove 960
    }

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch(`https://dhiraagu-edir-proxy.shihaam.me/${encodeURIComponent(apiNumber)}`);
        const data = await response.json();

        if (response.ok && data && data.dirEnquiryEntry) {
            if (data.dirEnquiryEntry === 'Number not found') {
                addToHistory(phoneNumber, 'Number not found', 'not_found');
            } else {
                addToHistory(phoneNumber, data.dirEnquiryEntry, 'success');
            }
        } else {
            addToHistory(phoneNumber, 'No results found', 'error');
        }
    } catch (error) {
        addToHistory(phoneNumber, 'Failed to fetch data', 'error');
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<span class="material-icons">search</span>';
        phoneInput.value = '';
    }
});

tableSearch.addEventListener('input', (e) => {
    filterHistory(e.target.value);
});

clearSearchBtn.addEventListener('click', () => {
    tableSearch.value = '';
    filterHistory('');
    tableSearch.focus();
});

document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        handleSort(th.dataset.sort);
    });
});

clearHistoryBtn.addEventListener('click', () => {
    if (searchHistory.length === 0) {
        showToast('No history to clear', 'error');
        return;
    }
    confirmModal.classList.add('show');
});

cancelClearBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
});

confirmClearBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    clearHistory();
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
    }
});

closeQrBtn.addEventListener('click', () => {
    qrModal.classList.remove('show');
});

qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
        qrModal.classList.remove('show');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        tableSearch.focus();
    }
});

loadHistory();
