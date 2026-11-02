/**
 * ============================================================================
 * Student Ranking & Result Management System (SRRMS)
 * Main Application Orchestrator & Controller - Light Theme Professional
 * Full-Stack REST API Integration with Client-Side Fallback & Universal Support
 * ============================================================================
 */

import {
    HashTable,
    calculateAcademicMetrics,
    customMergeSort,
    generateCompetitionRankings,
    SUBJECT_NAMES,
    DEPARTMENTS,
    SEMESTERS
} from './dsa.js';

import { SEED_STUDENTS } from './data.js';

// Application State
const state = {
    isApiOnline: false,
    hashTable: new HashTable(31),
    students: [],
    rankings: [],
    stats: null,
    activities: [],
    currentView: 'dashboard',
    selectedStudentRoll: null,
    charts: {
        gradeDist: null,
        subjectAvg: null
    }
};

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(title, message, type = 'info') {
    const deck = document.getElementById('toast-deck');
    if (!deck) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-body">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(message)}</p>
        </div>
    `;

    deck.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ==========================================================================
   Data Synchronization & Storage Management
   ========================================================================== */

/**
 * Check if the backend REST server (server.js with node:sqlite) is online
 */
async function checkBackendHealth() {
    if (window.location.protocol === 'file:') {
        return false;
    }
    try {
        const res = await fetch('/api/health', { method: 'GET', cache: 'no-cache' });
        if (res.ok) {
            const data = await res.json();
            return data && data.status === 'ONLINE';
        }
    } catch (e) {
        // Server not reachable
    }
    return false;
}

/**
 * Re-populate client-side HashTable and local storage from loaded students
 */
function rebuildLocalDSA(students) {
    state.hashTable.clear();
    state.students = [...students];

    for (const s of students) {
        const roll = parseInt(s.roll_no !== undefined ? s.roll_no : s.rollNo, 10);
        state.hashTable.insert(roll, s);
    }

    state.rankings = generateCompetitionRankings(state.students);

    // Sync ranks back to student records
    for (const r of state.rankings) {
        const roll = parseInt(r.roll_no !== undefined ? r.roll_no : r.rollNo, 10);
        const res = state.hashTable.search(roll);
        if (res.found && res.student) {
            res.student.rank = r.rank;
        }
    }

    // Save to LocalStorage for offline resilience
    try {
        localStorage.setItem('srrms_students_data', JSON.stringify(state.students));
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
}

let currentClientDataVersion = null;

/**
 * Fetch all students from SQLite REST API or fallback to LocalStorage/Seed
 */
async function loadStudentsData() {
    if (state.isApiOnline) {
        try {
            const [studRes, statsRes, actRes, verRes] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/stats'),
                fetch('/api/activities'),
                fetch('/api/version')
            ]);

            if (studRes.ok) {
                const data = await studRes.json();
                rebuildLocalDSA(data.students || []);
            }
            if (statsRes.ok) {
                state.stats = await statsRes.json();
            }
            if (actRes.ok) {
                const actData = await actRes.json();
                state.activities = actData.activities || [];
            }
            if (verRes && verRes.ok) {
                const vData = await verRes.json();
                currentClientDataVersion = vData.version;
            }
            return;
        } catch (err) {
            console.warn('[SRRMS] Backend API fetch failed, falling back to local storage:', err);
            state.isApiOnline = false;
            updateConnectionBadge();
        }
    }

    // Fallback: LocalStorage or SEED_STUDENTS
    let loaded = null;
    try {
        const stored = localStorage.getItem('srrms_students_data');
        if (stored) {
            loaded = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('LocalStorage load error:', e);
    }

    if (!loaded || !Array.isArray(loaded) || loaded.length === 0) {
        loaded = SEED_STUDENTS.map(s => {
            const metrics = calculateAcademicMetrics(s.marks);
            return {
                roll_no: s.rollNo,
                rollNo: s.rollNo,
                name: s.name,
                department: s.department,
                semester: s.semester,
                subject1: metrics.validMarks[0],
                subject2: metrics.validMarks[1],
                subject3: metrics.validMarks[2],
                subject4: metrics.validMarks[3],
                subject5: metrics.validMarks[4],
                total: metrics.total,
                percentage: metrics.percentage,
                grade: metrics.grade
            };
        });
    }

    rebuildLocalDSA(loaded);
    computeLocalStats();
    loadLocalActivities();
}

/**
 * Compute stats locally when in offline/client mode
 */
function computeLocalStats() {
    const list = state.students;
    const count = list.length;
    if (count === 0) {
        state.stats = {
            totalStudents: 0,
            averagePercentage: 0,
            highestMarks: 0,
            highestScorer: null,
            passRate: 0,
            passCount: 0,
            failCount: 0,
            gradeCounts: { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 },
            subjectAverages: [0, 0, 0, 0, 0],
            top5: []
        };
        return;
    }

    const totalSum = list.reduce((acc, s) => acc + (s.total || 0), 0);
    const avgPercentage = parseFloat(((totalSum / count) / 5.0).toFixed(2));
    const passCount = list.filter(s => (s.percentage || 0) >= 50).length;
    const passRate = parseFloat(((passCount / count) * 100).toFixed(1));

    const ranked = state.rankings;
    const highestScorer = ranked.length > 0 ? ranked[0] : null;

    const gradeCounts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    list.forEach(s => {
        if (gradeCounts[s.grade] !== undefined) gradeCounts[s.grade]++;
    });

    const subTotals = [0, 0, 0, 0, 0];
    list.forEach(s => {
        subTotals[0] += s.subject1 || 0;
        subTotals[1] += s.subject2 || 0;
        subTotals[2] += s.subject3 || 0;
        subTotals[3] += s.subject4 || 0;
        subTotals[4] += s.subject5 || 0;
    });
    const subjectAverages = subTotals.map(t => parseFloat((t / count).toFixed(1)));

    state.stats = {
        totalStudents: count,
        averagePercentage: avgPercentage,
        highestMarks: highestScorer ? highestScorer.total : 0,
        highestScorer,
        passRate,
        passCount,
        failCount: count - passCount,
        gradeCounts,
        subjectAverages,
        top5: ranked.slice(0, 5)
    };
}

/**
 * Manage local activities
 */
function loadLocalActivities() {
    try {
        const raw = localStorage.getItem('srrms_audit_logs');
        if (raw) {
            state.activities = JSON.parse(raw);
            return;
        }
    } catch (e) {}

    state.activities = [
        {
            id: 1,
            action_type: 'system',
            title: 'System Initialized',
            description: 'SRRMS Academic Suite loaded with dataset.csv and separate-chaining Hash Table.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ];
}

function recordActivity(action_type, title, description) {
    const act = {
        id: Date.now(),
        action_type,
        title,
        description,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.activities.unshift(act);
    if (state.activities.length > 30) state.activities.pop();

    try {
        localStorage.setItem('srrms_audit_logs', JSON.stringify(state.activities));
    } catch (e) {}
}

/**
 * Update UI connection badge in sidebar
 */
function updateConnectionBadge() {
    const badgeText = document.getElementById('db-connection-text');
    const pulseDot = document.querySelector('.pulse-dot');
    if (!badgeText) return;

    if (state.isApiOnline) {
        badgeText.textContent = 'SQLite Database Active';
        if (pulseDot) pulseDot.style.background = 'var(--accent-green)';
    } else {
        badgeText.textContent = 'Client Storage Active';
        if (pulseDot) pulseDot.style.background = 'var(--accent-blue)';
    }
}

/* ==========================================================================
   View Routing & Navigation
   ========================================================================== */
const VIEW_METADATA = {
    'dashboard': {
        title: 'Executive Dashboard',
        desc: 'Unified academic registry, hashing retrieval, and competition ranking engine'
    },
    'students': {
        title: 'Student Cohort Directory',
        desc: 'Complete records management, filtering, and dataset.csv export'
    },
    'search': {
        title: 'Hash Search Studio',
        desc: 'Instant O(1) hash retrieval with step-by-step chain telemetry'
    },
    'add-student': {
        title: 'Enroll New Student',
        desc: 'Academic enrollment form with live rubrics preview and validation'
    },
    'update-marks': {
        title: 'Marks Revision Studio',
        desc: 'Retrieve student via Hash Table and recalculate performance deltas'
    },
    'rankings': {
        title: 'Competition Leaderboard',
        desc: 'O(n log n) Custom Merge Sort with 4-tier tie-breakers'
    },
    'result-card': {
        title: 'Official Academic Transcript',
        desc: 'Verified university marks certificate with grade points and print export'
    },
    'reports': {
        title: 'Performance Analytics',
        desc: 'Cohort-wide grade distributions, subject benchmarks, and departmental comparisons'
    },
    'hash-structure': {
        title: 'Data Structure (Hash Table)',
        desc: 'Live separate chaining visualizer with 31 buckets and interactive trace simulation'
    },
    'about-system': {
        title: 'About SRRMS Architecture',
        desc: 'Technical specifications, Big-O complexity matrices, and Viva Voce defense guide'
    }
};

function navigateTo(viewId) {
    state.currentView = viewId;

    // Update Sidebar active state
    document.querySelectorAll('.sidebar-nav-scroll .nav-item-btn').forEach(btn => {
        if (btn.dataset.nav === viewId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update View Panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`view-${viewId}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // Update Header
    const meta = VIEW_METADATA[viewId] || { title: 'Academic Portal', desc: 'SRRMS' };
    const titleEl = document.getElementById('view-title');
    const descEl = document.getElementById('view-desc');
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    // Scroll to top
    const stage = document.querySelector('.stage-viewport');
    if (stage) stage.scrollTop = 0;

    // View-specific refreshes
    if (viewId === 'dashboard') renderDashboard();
    else if (viewId === 'students') renderStudentsDirectory();
    else if (viewId === 'rankings') renderRankingsView();
    else if (viewId === 'result-card') renderResultCardView();
    else if (viewId === 'reports') renderReportsView();
    else if (viewId === 'hash-structure') renderHashVisualizerView();
}

function setupNavigation() {
    document.addEventListener('click', e => {
        const navTarget = e.target.closest('[data-nav]');
        if (navTarget) {
            e.preventDefault();
            const viewId = navTarget.dataset.nav;
            navigateTo(viewId);

            // Close mobile menu if open
            const sidebar = document.getElementById('app-sidebar');
            if (sidebar && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });

    // Mobile Hamburger
    const hamburger = document.getElementById('mobile-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // Topbar Search Quick Action
    const topSearch = document.getElementById('topbar-search-input');
    if (topSearch) {
        topSearch.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const val = topSearch.value.trim();
                if (val) {
                    navigateTo('search');
                    const mainSearch = document.getElementById('search-main-input');
                    if (mainSearch) {
                        mainSearch.value = val;
                        executeSearch(val);
                    }
                }
            }
        });
    }

    // Topbar Add Student CTA
    const topbarAdd = document.getElementById('btn-topbar-add');
    if (topbarAdd) {
        topbarAdd.addEventListener('click', () => navigateTo('add-student'));
    }
}

/* ==========================================================================
   VIEW 1: Dashboard Controller
   ========================================================================== */
function renderDashboard() {
    const totalCount = state.students.length;

    // Update global counters
    const cohortBadge = document.getElementById('sidebar-cohort-count');
    if (cohortBadge) cohortBadge.textContent = totalCount;

    const stats = state.stats || {};
    const topScorer = stats.highestScorer || (state.rankings.length > 0 ? state.rankings[0] : null);

    // KPI 1: Total Students
    const elTotal = document.getElementById('kpi-total-students');
    if (elTotal) elTotal.textContent = totalCount;

    // KPI 2: Average Percentage
    const elAvgPct = document.getElementById('kpi-avg-pct');
    if (elAvgPct) elAvgPct.textContent = `${(stats.averagePercentage || 0).toFixed(2)}%`;
    const elPassRate = document.getElementById('kpi-pass-rate');
    if (elPassRate) elPassRate.textContent = `${(stats.passRate || 0).toFixed(1)}% Pass Division`;

    // KPI 3: Highest Marks
    const elHighMarks = document.getElementById('kpi-highest-marks');
    if (elHighMarks) elHighMarks.textContent = `${topScorer ? topScorer.total : 0} / 500`;
    const elHighHolder = document.getElementById('kpi-highest-holder');
    if (elHighHolder) elHighHolder.textContent = topScorer ? topScorer.name : 'Top aggregate score';

    // KPI 4: Champion / Rank 1
    const elChampName = document.getElementById('kpi-champion-name');
    if (elChampName) elChampName.textContent = topScorer ? topScorer.name : '---';
    const elChampScore = document.getElementById('kpi-champion-score');
    if (elChampScore) {
        elChampScore.textContent = topScorer ? `Rank 1 • ${(topScorer.percentage || 0).toFixed(2)}%` : 'Rank 1 • 0%';
    }

    // Top 5 Table
    const top5Tbody = document.getElementById('dash-top5-tbody');
    if (top5Tbody) {
        const top5 = state.rankings.slice(0, 5);
        if (top5.length === 0) {
            top5Tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No records found.</td></tr>`;
        } else {
            top5Tbody.innerHTML = top5.map((s, idx) => {
                const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
                let medal = `<span style="font-weight: 700; color: var(--text-secondary);">#${s.rank}</span>`;
                if (s.rank === 1) medal = `<span style="color: #d97706; font-weight: 800;">🥇 #1</span>`;
                else if (s.rank === 2) medal = `<span style="color: #475569; font-weight: 800;">🥈 #2</span>`;
                else if (s.rank === 3) medal = `<span style="color: #b45309; font-weight: 800;">🥉 #3</span>`;

                return `
                    <tr>
                        <td>${medal}</td>
                        <td>
                            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(s.name)}</div>
                            <div style="font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-code);">Roll No: ${roll}</div>
                        </td>
                        <td style="font-family: var(--font-code); font-weight: 700; color: var(--text-primary);">${s.total} / 500</td>
                        <td><span style="font-family: var(--font-code); color: var(--accent-blue); font-weight: 700;">${(s.percentage || 0).toFixed(2)}%</span></td>
                        <td><span class="grade-pill grade-${s.grade}">${s.grade}</span></td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Hash Table Quad Metrics
    const htStats = state.hashTable.getStats();
    const elHashM = document.getElementById('dash-hash-m');
    const elHashOcc = document.getElementById('dash-hash-occupied');
    const elHashAlpha = document.getElementById('dash-hash-alpha');
    const elHashColl = document.getElementById('dash-hash-collisions');

    if (elHashM) elHashM.textContent = htStats.totalBuckets;
    if (elHashOcc) elHashOcc.textContent = `${htStats.occupiedBuckets} / ${htStats.totalBuckets}`;
    if (elHashAlpha) elHashAlpha.textContent = htStats.loadFactor.toFixed(2);
    if (elHashColl) elHashColl.textContent = htStats.collisionCount;

    // Mini Bucket Track (31 squares - Responsive, No Overflow)
    const miniTrack = document.getElementById('dash-mini-bucket-track');
    if (miniTrack) {
        let cellsHtml = '';
        for (let i = 0; i < htStats.totalBuckets; i++) {
            const bucketLen = state.hashTable.buckets[i].length;
            let bg = '#e2e8f0';
            let title = `Bucket [${i}]: Empty`;
            if (bucketLen === 1) {
                bg = '#4f46e5';
                title = `Bucket [${i}]: 1 student`;
            } else if (bucketLen > 1) {
                bg = '#d97706';
                title = `Bucket [${i}]: ${bucketLen} students (${bucketLen - 1} collisions)`;
            }

            cellsHtml += `
                <div class="mini-bucket-cell" data-bucket="${i}" title="${title}" style="background: ${bg};"></div>
            `;
        }
        miniTrack.innerHTML = cellsHtml;

        // Clicking mini square jumps to visualizer
        miniTrack.querySelectorAll('.mini-bucket-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const bIdx = parseInt(cell.dataset.bucket, 10);
                navigateTo('hash-structure');
                highlightBucketCard(bIdx);
            });
        });
    }

    // Recent Activities Audit Stream
    renderAuditStream();
}

function renderAuditStream() {
    const stream = document.getElementById('dash-audit-stream');
    if (!stream) return;

    if (state.activities.length === 0) {
        stream.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No recent activities recorded.</div>`;
        return;
    }

    stream.innerHTML = state.activities.map(act => {
        let badgeColor = 'var(--accent-blue)';
        let iconChar = '•';

        if (act.action_type === 'insert') {
            badgeColor = 'var(--accent-green)';
            iconChar = '+';
        } else if (act.action_type === 'update') {
            badgeColor = 'var(--accent-amber)';
            iconChar = '✎';
        } else if (act.action_type === 'delete') {
            badgeColor = '#dc2626';
            iconChar = '✕';
        } else if (act.action_type === 'search') {
            badgeColor = 'var(--accent-cyan)';
            iconChar = '🔍';
        }

        return `
            <div class="audit-item" style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #f8fafc; border: 1px solid #e2e8f0; color: ${badgeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0;">
                    ${iconChar}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <strong style="font-size: 0.86rem; color: var(--text-primary);">${escapeHtml(act.title)}</strong>
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-code);">${escapeHtml(act.timestamp)}</span>
                    </div>
                    <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(act.description)}</p>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   VIEW 2: Students Cohort Directory Controller
   ========================================================================== */
function setupStudentsDirectory() {
    const searchBox = document.getElementById('dir-search-box');
    const deptSelect = document.getElementById('dir-dept-select');
    const semSelect = document.getElementById('dir-sem-select');

    if (searchBox) searchBox.addEventListener('input', renderStudentsDirectory);
    if (deptSelect) deptSelect.addEventListener('change', renderStudentsDirectory);
    if (semSelect) semSelect.addEventListener('change', renderStudentsDirectory);

    // Export CSV dataset
    const exportBtn = document.getElementById('btn-export-dataset');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportDatasetCSV);
    }

    // Reseed / Reset dataset
    const reseedBtn = document.getElementById('btn-reseed-dataset');
    if (reseedBtn) {
        reseedBtn.addEventListener('click', resetDataset);
    }
}

function renderStudentsDirectory() {
    const searchVal = (document.getElementById('dir-search-box')?.value || '').trim().toLowerCase();
    const deptVal = document.getElementById('dir-dept-select')?.value || '';
    const semVal = document.getElementById('dir-sem-select')?.value || '';

    let filtered = state.students.filter(s => {
        const roll = String(s.roll_no !== undefined ? s.roll_no : s.rollNo);
        const name = (s.name || '').toLowerCase();
        const dept = s.department || '';
        const sem = s.semester || '';

        const matchesSearch = !searchVal || roll.includes(searchVal) || name.includes(searchVal);
        const matchesDept = !deptVal || dept === deptVal;
        const matchesSem = !semVal || sem === semVal;

        return matchesSearch && matchesDept && matchesSem;
    });

    const badgeCount = document.getElementById('students-badge-count');
    if (badgeCount) badgeCount.textContent = `${filtered.length} of ${state.students.length} Records`;

    const tbody = document.getElementById('directory-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px;">No student records match the specified filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
        const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
        const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);
        const s3 = s.subject3 !== undefined ? s.subject3 : (s.marks ? s.marks[2] : 0);
        const s4 = s.subject4 !== undefined ? s.subject4 : (s.marks ? s.marks[3] : 0);
        const s5 = s.subject5 !== undefined ? s.subject5 : (s.marks ? s.marks[4] : 0);

        return `
            <tr>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--accent-blue);">${roll}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(s.name)}</td>
                <td>
                    <div style="color: var(--text-secondary); font-size: 0.82rem;">${escapeHtml(s.department)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(s.semester)}</div>
                </td>
                <td style="font-family: var(--font-code); font-size: 0.78rem; color: var(--text-muted);">
                    ${s1}, ${s2}, ${s3}, ${s4}, ${s5}
                </td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--text-primary);">${s.total} / 500</td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--accent-blue);">${(s.percentage || 0).toFixed(2)}%</td>
                <td><span class="grade-pill grade-${s.grade}">${s.grade}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-action-ghost btn-dir-view" data-roll="${roll}" title="Open Result Card" style="padding: 5px 8px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </button>
                        <button class="btn-action-ghost btn-dir-edit" data-roll="${roll}" title="Update Marks" style="padding: 5px 8px; color: var(--accent-amber);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-action-ghost btn-dir-del" data-roll="${roll}" title="Delete Record" style="padding: 5px 8px; color: #dc2626;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.btn-dir-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const roll = parseInt(btn.dataset.roll, 10);
            state.selectedStudentRoll = roll;
            navigateTo('result-card');
        });
    });

    tbody.querySelectorAll('.btn-dir-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const roll = parseInt(btn.dataset.roll, 10);
            navigateTo('update-marks');
            const qInput = document.getElementById('update-query-roll');
            if (qInput) {
                qInput.value = roll;
                fetchStudentForUpdate(roll);
            }
        });
    });

    tbody.querySelectorAll('.btn-dir-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const roll = parseInt(btn.dataset.roll, 10);
            deleteStudent(roll);
        });
    });
}

/**
 * Export current students as dataset.csv
 */
function exportDatasetCSV() {
    const headers = ["RollNo", "Name", "Department", "Semester", "Subject1", "Subject2", "Subject3", "Subject4", "Subject5", "Total", "Percentage", "Grade"];
    const rows = state.students.map(s => {
        const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
        const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
        const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);
        const s3 = s.subject3 !== undefined ? s.subject3 : (s.marks ? s.marks[2] : 0);
        const s4 = s.subject4 !== undefined ? s.subject4 : (s.marks ? s.marks[3] : 0);
        const s5 = s.subject5 !== undefined ? s.subject5 : (s.marks ? s.marks[4] : 0);

        return [
            `"${roll}"`,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${(s.department || '').replace(/"/g, '""')}"`,
            `"${(s.semester || '').replace(/"/g, '""')}"`,
            `"${s1}"`,
            `"${s2}"`,
            `"${s3}"`,
            `"${s4}"`,
            `"${s5}"`,
            `"${s.total}"`,
            `"${s.percentage}"`,
            `"${s.grade}"`
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Dataset Exported', 'dataset.csv downloaded with latest student cohort.', 'success');
}

/**
 * Reset / Reseed database
 */
async function resetDataset() {
    const confirmReset = window.confirm('Are you sure you want to re-seed the registry from default dataset.csv? Any unsaved edits will be refreshed.');
    if (!confirmReset) return;

    if (state.isApiOnline) {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            if (res.ok) {
                showToast('Database Reseeded', 'SQLite database and dataset.csv have been reset to defaults.', 'success');
                await loadStudentsData();
                renderDashboard();
                renderStudentsDirectory();
                return;
            }
        } catch (e) {
            console.error('API reset failed:', e);
        }
    }

    // Client-side reset
    localStorage.removeItem('srrms_students_data');
    await loadStudentsData();
    recordActivity('system', 'Database Re-seeded', 'Restored default 104 students into registry.');
    showToast('Registry Reset', 'Reloaded default 104 students into memory.', 'success');
    renderDashboard();
    renderStudentsDirectory();
}

/**
 * Delete a student record
 */
async function deleteStudent(rollNo) {
    const target = state.students.find(s => (s.roll_no || s.rollNo) === rollNo);
    const name = target ? target.name : `Roll No ${rollNo}`;

    const confirmDel = window.confirm(`Permanently remove ${name} (Roll No: ${rollNo}) from the database and dataset.csv?`);
    if (!confirmDel) return;

    if (state.isApiOnline) {
        try {
            const res = await fetch(`/api/students/${rollNo}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Student Removed', `${name} successfully deleted from database and dataset.csv.`, 'success');
                await loadStudentsData();
                renderDashboard();
                renderStudentsDirectory();
                return;
            } else {
                const err = await res.json();
                showToast('Deletion Failed', err.message || 'Unable to delete student.', 'error');
                return;
            }
        } catch (e) {
            console.error('API delete error:', e);
        }
    }

    // Offline delete
    const delRes = state.hashTable.delete(rollNo);
    if (delRes.success) {
        state.students = state.students.filter(s => (s.roll_no || s.rollNo) !== rollNo);
        state.rankings = generateCompetitionRankings(state.students);
        computeLocalStats();
        recordActivity('delete', 'Student Deleted', `Removed ${name} (Roll No: ${rollNo}) from registry.`);
        try {
            localStorage.setItem('srrms_students_data', JSON.stringify(state.students));
        } catch (e) {}
        showToast('Student Removed', `${name} removed from registry.`, 'success');
        renderDashboard();
        renderStudentsDirectory();
    } else {
        showToast('Error', delRes.message, 'error');
    }
}

/* ==========================================================================
   VIEW 3: Search Student Controller
   ========================================================================== */
function setupSearch() {
    const btn = document.getElementById('btn-execute-search-main');
    const input = document.getElementById('search-main-input');

    if (btn && input) {
        btn.addEventListener('click', () => executeSearch(input.value.trim()));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') executeSearch(input.value.trim());
        });
    }
}

async function executeSearch(query) {
    const deck = document.getElementById('search-profile-deck');
    const telemetryBox = document.getElementById('search-telemetry-box');
    if (!deck) return;

    if (!query) {
        deck.innerHTML = `
            <div class="glass-box" style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
                <p>Please enter a Roll Number or Student Name to perform search.</p>
            </div>
        `;
        if (telemetryBox) telemetryBox.style.display = 'none';
        return;
    }

    const rollNo = parseInt(query, 10);
    const isNumeric = !isNaN(rollNo) && String(rollNo) === query.trim();

    if (isNumeric) {
        let trace = null;
        let durationMs = 0;

        if (state.isApiOnline) {
            try {
                const t0 = performance.now();
                const res = await fetch(`/api/students/${rollNo}`);
                const t1 = performance.now();
                durationMs = parseFloat((t1 - t0).toFixed(3));
                if (res.ok) {
                    trace = await res.json();
                }
            } catch (e) {
                console.warn('Backend search error:', e);
            }
        }

        if (!trace) {
            const t0 = performance.now();
            trace = state.hashTable.search(rollNo);
            const t1 = performance.now();
            durationMs = parseFloat((t1 - t0).toFixed(3));
        }

        recordActivity('search', 'Hash Search Executed', `Queried Roll No ${rollNo} in Bucket [${trace.bucketIndex}].`);

        if (telemetryBox) {
            telemetryBox.style.display = 'block';
            telemetryBox.style.background = '#eff6ff';
            telemetryBox.style.border = '1px solid #bfdbfe';
            telemetryBox.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #bfdbfe; padding-bottom: 6px;">
                    <span style="color: var(--accent-blue); font-weight: 800;">HASH TABLE TELEMETRY (SEPARATE CHAINING)</span>
                    <span style="color: var(--text-secondary); font-size: 0.78rem;">Lookup Time: <strong>${durationMs} ms</strong> • Comparisons: <strong>${trace.comparisons}</strong></span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${(trace.steps || []).map(s => {
                        let color = '#475569';
                        if (s.status === 'success') color = 'var(--accent-green)';
                        else if (s.status === 'warning') color = 'var(--accent-amber)';
                        else if (s.status === 'error') color = 'var(--accent-red)';
                        return `<div><span style="color: ${color}; font-weight: 700;">[${escapeHtml(s.step)}]:</span> ${escapeHtml(s.detail)}</div>`;
                    }).join('')}
                </div>
            `;
        }

        if (!trace.found || !trace.student) {
            deck.innerHTML = `
                <div class="glass-box" style="text-align: center; padding: 48px 24px;">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">No Student Found</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Roll Number <strong>${rollNo}</strong> mapped to Bucket [${trace.bucketIndex}], but was not located in the chain.</p>
                </div>
            `;
            return;
        }

        renderStudentResultCard(trace.student, deck);

    } else {
        const t0 = performance.now();
        const matches = state.students.filter(s => (s.name || '').toLowerCase().includes(query.toLowerCase()));
        const t1 = performance.now();
        const durationMs = parseFloat((t1 - t0).toFixed(3));

        recordActivity('search', 'Name Query Executed', `Scanned ${state.students.length} records for "${query}". Found ${matches.length} matches.`);

        if (telemetryBox) {
            telemetryBox.style.display = 'block';
            telemetryBox.style.background = '#fffbeb';
            telemetryBox.style.border = '1px solid #fde68a';
            telemetryBox.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: var(--accent-amber); font-weight: 800;">LINEAR SCAN TELEMETRY (O(n) STRING SEARCH)</span>
                    <span style="color: var(--text-secondary); font-size: 0.78rem;">Scan Time: <strong>${durationMs} ms</strong> • Evaluated: <strong>${state.students.length} Records</strong></span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.8rem;">
                    Scanned full array sequentially. Found <strong>${matches.length}</strong> matching candidate(s) containing "${escapeHtml(query)}".
                </div>
            `;
        }

        if (matches.length === 0) {
            deck.innerHTML = `
                <div class="glass-box" style="text-align: center; padding: 48px 24px;">
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">No Matching Students</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">No student records contain the name "${escapeHtml(query)}".</p>
                </div>
            `;
            return;
        }

        deck.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
                ${matches.map(s => buildStudentCardHtml(s)).join('')}
            </div>
        `;
        wireDynamicCardButtons(deck);
    }
}

function buildStudentCardHtml(s) {
    const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
    const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
    const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);
    const s3 = s.subject3 !== undefined ? s.subject3 : (s.marks ? s.marks[2] : 0);
    const s4 = s.subject4 !== undefined ? s.subject4 : (s.marks ? s.marks[3] : 0);
    const s5 = s.subject5 !== undefined ? s.subject5 : (s.marks ? s.marks[4] : 0);

    const initial = (s.name || '?').charAt(0).toUpperCase();

    return `
        <div class="glass-box" style="padding: 24px; position: relative;">
            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
                <div class="preview-badge-avatar" style="width: 52px; height: 52px; font-size: 1.3rem;">${initial}</div>
                <div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${escapeHtml(s.name)}</h3>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                        Roll No: <strong style="color: var(--accent-blue); font-family: var(--font-code);">${roll}</strong> • ${escapeHtml(s.department)}
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: var(--radius-md); margin-bottom: 18px; text-align: center;">
                <div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Aggregate</div>
                    <strong style="font-size: 1.1rem; color: var(--text-primary); font-family: var(--font-code);">${s.total}</strong>
                </div>
                <div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Percentage</div>
                    <strong style="font-size: 1.1rem; color: var(--accent-blue); font-family: var(--font-code);">${(s.percentage || 0).toFixed(2)}%</strong>
                </div>
                <div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Grade</div>
                    <div><span class="grade-pill grade-${s.grade}">${s.grade}</span></div>
                </div>
                <div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Rank</div>
                    <strong style="font-size: 1.1rem; color: var(--accent-amber); font-family: var(--font-code);">#${s.rank || '--'}</strong>
                </div>
            </div>

            <div style="margin-bottom: 18px;">
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 8px;">Subject Performance:</div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem;">
                    <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>${SUBJECT_NAMES[0]}</span><span style="font-family: var(--font-code); font-weight: 600;">${s1}/100</span></div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>${SUBJECT_NAMES[1]}</span><span style="font-family: var(--font-code); font-weight: 600;">${s2}/100</span></div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>${SUBJECT_NAMES[2]}</span><span style="font-family: var(--font-code); font-weight: 600;">${s3}/100</span></div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>${SUBJECT_NAMES[3]}</span><span style="font-family: var(--font-code); font-weight: 600;">${s4}/100</span></div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>${SUBJECT_NAMES[4]}</span><span style="font-family: var(--font-code); font-weight: 600;">${s5}/100</span></div>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <button class="btn-cta btn-card-transcript" data-roll="${roll}" style="flex: 1; padding: 8px 12px; font-size: 0.82rem;">View Transcript</button>
                <button class="btn-action-ghost btn-card-update" data-roll="${roll}" style="padding: 8px 12px; font-size: 0.82rem; color: var(--accent-amber);">Update</button>
            </div>
        </div>
    `;
}

function renderStudentResultCard(s, container) {
    container.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto;">
            ${buildStudentCardHtml(s)}
        </div>
    `;
    wireDynamicCardButtons(container);
}

function wireDynamicCardButtons(container) {
    container.querySelectorAll('.btn-card-transcript').forEach(b => {
        b.addEventListener('click', () => {
            const roll = parseInt(b.dataset.roll, 10);
            state.selectedStudentRoll = roll;
            navigateTo('result-card');
        });
    });

    container.querySelectorAll('.btn-card-update').forEach(b => {
        b.addEventListener('click', () => {
            const roll = parseInt(b.dataset.roll, 10);
            navigateTo('update-marks');
            const qInput = document.getElementById('update-query-roll');
            if (qInput) {
                qInput.value = roll;
                fetchStudentForUpdate(roll);
            }
        });
    });
}

/* ==========================================================================
   VIEW 4: Add Student Controller
   ========================================================================== */
function setupAddStudent() {
    const form = document.getElementById('form-enroll-student');
    const inputs = ['enroll-m1', 'enroll-m2', 'enroll-m3', 'enroll-m4', 'enroll-m5', 'enroll-rollNo', 'enroll-name', 'enroll-dept', 'enroll-sem'];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateAddStudentPreview);
            el.addEventListener('change', updateAddStudentPreview);
        }
    });

    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            await submitNewStudent();
        });
    }

    updateAddStudentPreview();
}

function updateAddStudentPreview() {
    const name = document.getElementById('enroll-name')?.value.trim() || 'Candidate Name';
    const roll = document.getElementById('enroll-rollNo')?.value.trim() || '---';
    const dept = document.getElementById('enroll-dept')?.value || '---';
    const sem = document.getElementById('enroll-sem')?.value || '---';

    const m1 = parseInt(document.getElementById('enroll-m1')?.value, 10) || 0;
    const m2 = parseInt(document.getElementById('enroll-m2')?.value, 10) || 0;
    const m3 = parseInt(document.getElementById('enroll-m3')?.value, 10) || 0;
    const m4 = parseInt(document.getElementById('enroll-m4')?.value, 10) || 0;
    const m5 = parseInt(document.getElementById('enroll-m5')?.value, 10) || 0;

    const metrics = calculateAcademicMetrics([m1, m2, m3, m4, m5]);

    const elAvatar = document.getElementById('enroll-preview-avatar');
    const elName = document.getElementById('enroll-preview-name');
    const elMeta = document.getElementById('enroll-preview-meta');
    const elTotal = document.getElementById('enroll-preview-total');
    const elPct = document.getElementById('enroll-preview-pct');
    const elGrade = document.getElementById('enroll-preview-grade');
    const elStatus = document.getElementById('enroll-preview-status');

    if (elAvatar) elAvatar.textContent = name.charAt(0).toUpperCase();
    if (elName) elName.textContent = name;
    if (elMeta) elMeta.textContent = `Roll No: ${roll} • Dept: ${dept} • ${sem}`;
    if (elTotal) elTotal.textContent = `${metrics.total} / 500`;
    if (elPct) elPct.textContent = `${metrics.percentage.toFixed(2)}%`;
    if (elGrade) elGrade.innerHTML = `<span class="grade-pill grade-${metrics.grade}">${metrics.grade}</span>`;
    if (elStatus) {
        elStatus.textContent = metrics.result;
        elStatus.style.color = metrics.result === 'PASS' ? 'var(--accent-green)' : 'var(--accent-red)';
    }
}

async function submitNewStudent() {
    const rollNo = parseInt(document.getElementById('enroll-rollNo')?.value, 10);
    const name = (document.getElementById('enroll-name')?.value || '').trim();
    const dept = document.getElementById('enroll-dept')?.value;
    const sem = document.getElementById('enroll-sem')?.value;

    const m1 = parseInt(document.getElementById('enroll-m1')?.value, 10);
    const m2 = parseInt(document.getElementById('enroll-m2')?.value, 10);
    const m3 = parseInt(document.getElementById('enroll-m3')?.value, 10);
    const m4 = parseInt(document.getElementById('enroll-m4')?.value, 10);
    const m5 = parseInt(document.getElementById('enroll-m5')?.value, 10);

    const marks = [m1, m2, m3, m4, m5];

    if (isNaN(rollNo) || rollNo <= 0) {
        showToast('Invalid Input', 'Roll Number must be a positive integer.', 'error');
        return;
    }
    if (!name) {
        showToast('Invalid Input', 'Student name is required.', 'error');
        return;
    }

    for (let i = 0; i < 5; i++) {
        if (isNaN(marks[i]) || marks[i] < 0 || marks[i] > 100) {
            showToast('Invalid Marks', `Subject ${i + 1} score must be between 0 and 100.`, 'error');
            return;
        }
    }

    const checkRes = state.hashTable.search(rollNo);
    if (checkRes.found) {
        showToast('Duplicate Roll Number', `Student with Roll Number ${rollNo} already exists in registry!`, 'error');
        return;
    }

    const payload = {
        rollNo,
        name,
        department: dept,
        semester: sem,
        marks
    };

    if (state.isApiOnline) {
        try {
            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Student Enrolled', `${name} successfully added to database and dataset.csv!`, 'success');
                document.getElementById('form-enroll-student')?.reset();
                await loadStudentsData();
                renderDashboard();
                return;
            } else {
                const err = await res.json();
                showToast('Enrollment Failed', err.message || 'Error creating record.', 'error');
                return;
            }
        } catch (e) {
            console.error('API insert error:', e);
        }
    }

    // Local insertion
    const metrics = calculateAcademicMetrics(marks);
    const newStudent = {
        roll_no: rollNo,
        rollNo,
        name,
        department: dept,
        semester: sem,
        subject1: metrics.validMarks[0],
        subject2: metrics.validMarks[1],
        subject3: metrics.validMarks[2],
        subject4: metrics.validMarks[3],
        subject5: metrics.validMarks[4],
        total: metrics.total,
        percentage: metrics.percentage,
        grade: metrics.grade
    };

    state.hashTable.insert(rollNo, newStudent);
    state.students.push(newStudent);
    state.rankings = generateCompetitionRankings(state.students);
    computeLocalStats();
    recordActivity('insert', 'Student Enrolled', `Enrolled ${name} (Roll: ${rollNo}) into ${dept}.`);

    try {
        localStorage.setItem('srrms_students_data', JSON.stringify(state.students));
    } catch (e) {}

    showToast('Student Enrolled', `${name} successfully added to local registry!`, 'success');
    document.getElementById('form-enroll-student')?.reset();
    renderDashboard();
}

/* ==========================================================================
   VIEW 5: Update Marks Controller
   ========================================================================== */
let activeUpdateStudent = null;

function setupUpdateMarks() {
    const btnRetrieve = document.getElementById('btn-retrieve-for-update');
    const queryInput = document.getElementById('update-query-roll');
    const updateForm = document.getElementById('form-update-marks');

    if (btnRetrieve && queryInput) {
        btnRetrieve.addEventListener('click', () => {
            const roll = parseInt(queryInput.value, 10);
            fetchStudentForUpdate(roll);
        });
        queryInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const roll = parseInt(queryInput.value, 10);
                fetchStudentForUpdate(roll);
            }
        });
    }

    const markFields = ['rev-m1', 'rev-m2', 'rev-m3', 'rev-m4', 'rev-m5'];
    markFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', recalculateUpdateDeltas);
    });

    if (updateForm) {
        updateForm.addEventListener('submit', async e => {
            e.preventDefault();
            await submitUpdatedMarks();
        });
    }
}

function fetchStudentForUpdate(rollNo) {
    if (isNaN(rollNo) || rollNo <= 0) {
        showToast('Invalid Input', 'Please enter a valid numeric Roll Number.', 'warning');
        return;
    }

    const res = state.hashTable.search(rollNo);
    if (!res.found || !res.student) {
        showToast('Not Found', `Student with Roll Number ${rollNo} not found in registry.`, 'error');
        const form = document.getElementById('form-update-marks');
        if (form) form.style.display = 'none';
        return;
    }

    activeUpdateStudent = res.student;
    const form = document.getElementById('form-update-marks');
    if (form) form.style.display = 'block';

    const s = activeUpdateStudent;
    const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;

    const elName = document.getElementById('update-target-name');
    const elMeta = document.getElementById('update-target-meta');
    const elScore = document.getElementById('update-target-score');

    if (elName) elName.textContent = s.name;
    if (elMeta) elMeta.textContent = `Roll: ${roll} • ${s.department} • ${s.semester}`;
    if (elScore) elScore.textContent = `${s.total} / 500`;

    const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
    const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);
    const s3 = s.subject3 !== undefined ? s.subject3 : (s.marks ? s.marks[2] : 0);
    const s4 = s.subject4 !== undefined ? s.subject4 : (s.marks ? s.marks[3] : 0);
    const s5 = s.subject5 !== undefined ? s.subject5 : (s.marks ? s.marks[4] : 0);

    const m1Input = document.getElementById('rev-m1');
    const m2Input = document.getElementById('rev-m2');
    const m3Input = document.getElementById('rev-m3');
    const m4Input = document.getElementById('rev-m4');
    const m5Input = document.getElementById('rev-m5');

    if (m1Input) m1Input.value = s1;
    if (m2Input) m2Input.value = s2;
    if (m3Input) m3Input.value = s3;
    if (m4Input) m4Input.value = s4;
    if (m5Input) m5Input.value = s5;

    recalculateUpdateDeltas();
}

function recalculateUpdateDeltas() {
    if (!activeUpdateStudent) return;

    const m1 = parseInt(document.getElementById('rev-m1')?.value, 10) || 0;
    const m2 = parseInt(document.getElementById('rev-m2')?.value, 10) || 0;
    const m3 = parseInt(document.getElementById('rev-m3')?.value, 10) || 0;
    const m4 = parseInt(document.getElementById('rev-m4')?.value, 10) || 0;
    const m5 = parseInt(document.getElementById('rev-m5')?.value, 10) || 0;

    const metrics = calculateAcademicMetrics([m1, m2, m3, m4, m5]);
    const oldTotal = activeUpdateStudent.total || 0;
    const diff = metrics.total - oldTotal;

    const elTotal = document.getElementById('update-recalc-total');
    const elDelta = document.getElementById('update-recalc-delta');
    const elGrade = document.getElementById('update-recalc-grade');

    if (elTotal) elTotal.textContent = `${metrics.total} / 500 (${metrics.percentage.toFixed(2)}%)`;
    if (elDelta) {
        if (diff > 0) {
            elDelta.textContent = `(+${diff} marks)`;
            elDelta.style.color = 'var(--accent-green)';
        } else if (diff < 0) {
            elDelta.textContent = `(${diff} marks)`;
            elDelta.style.color = 'var(--accent-red)';
        } else {
            elDelta.textContent = `(No change)`;
            elDelta.style.color = 'var(--text-muted)';
        }
    }
    if (elGrade) {
        elGrade.textContent = `Grade: ${metrics.grade}`;
    }
}

async function submitUpdatedMarks() {
    if (!activeUpdateStudent) return;

    const rollNo = activeUpdateStudent.roll_no !== undefined ? activeUpdateStudent.roll_no : activeUpdateStudent.rollNo;
    const m1 = parseInt(document.getElementById('rev-m1')?.value, 10);
    const m2 = parseInt(document.getElementById('rev-m2')?.value, 10);
    const m3 = parseInt(document.getElementById('rev-m3')?.value, 10);
    const m4 = parseInt(document.getElementById('rev-m4')?.value, 10);
    const m5 = parseInt(document.getElementById('rev-m5')?.value, 10);

    const marks = [m1, m2, m3, m4, m5];
    for (let i = 0; i < 5; i++) {
        if (isNaN(marks[i]) || marks[i] < 0 || marks[i] > 100) {
            showToast('Invalid Score', `Subject ${i + 1} must be between 0 and 100.`, 'error');
            return;
        }
    }

    if (state.isApiOnline) {
        try {
            const res = await fetch(`/api/students/${rollNo}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marks })
            });

            if (res.ok) {
                const data = await res.json();
                showToast('Marks Updated', `Updated scores for ${activeUpdateStudent.name} (Delta: ${data.diff >= 0 ? '+' : ''}${data.diff}).`, 'success');
                await loadStudentsData();
                renderDashboard();
                fetchStudentForUpdate(rollNo);
                return;
            } else {
                const err = await res.json();
                showToast('Update Failed', err.message || 'Unable to update marks.', 'error');
                return;
            }
        } catch (e) {
            console.error('API update error:', e);
        }
    }

    // Local update
    const metrics = calculateAcademicMetrics(marks);
    const updated = {
        ...activeUpdateStudent,
        subject1: metrics.validMarks[0],
        subject2: metrics.validMarks[1],
        subject3: metrics.validMarks[2],
        subject4: metrics.validMarks[3],
        subject5: metrics.validMarks[4],
        total: metrics.total,
        percentage: metrics.percentage,
        grade: metrics.grade
    };

    state.hashTable.update(rollNo, updated);
    const idx = state.students.findIndex(s => (s.roll_no || s.rollNo) === rollNo);
    if (idx !== -1) state.students[idx] = updated;

    state.rankings = generateCompetitionRankings(state.students);
    computeLocalStats();
    recordActivity('update', 'Marks Revised', `Updated scores for ${activeUpdateStudent.name} (Roll: ${rollNo}).`);

    try {
        localStorage.setItem('srrms_students_data', JSON.stringify(state.students));
    } catch (e) {}

    showToast('Marks Updated', `Scores for ${activeUpdateStudent.name} updated successfully!`, 'success');
    renderDashboard();
    fetchStudentForUpdate(rollNo);
}

/* ==========================================================================
   VIEW 6: Competition Rankings Controller
   ========================================================================== */
function setupRankingsView() {
    const deptFilter = document.getElementById('rankings-filter-dept');
    const semFilter = document.getElementById('rankings-filter-sem');

    if (deptFilter) deptFilter.addEventListener('change', renderRankingsView);
    if (semFilter) semFilter.addEventListener('change', renderRankingsView);
}

function renderRankingsView() {
    const deptVal = document.getElementById('rankings-filter-dept')?.value || '';
    const semVal = document.getElementById('rankings-filter-sem')?.value || '';

    let list = state.students;
    if (deptVal) list = list.filter(s => s.department === deptVal);
    if (semVal) list = list.filter(s => s.semester === semVal);

    const ranked = generateCompetitionRankings(list);

    const chip = document.getElementById('rankings-count-chip');
    if (chip) chip.textContent = `${ranked.length} Ranked`;

    // Top 3 Podium
    const podiumDeck = document.getElementById('podium-highlight-deck');
    if (podiumDeck) {
        if (ranked.length < 3) {
            podiumDeck.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">Need at least 3 students to render podium.</div>`;
        } else {
            const first = ranked[0];
            const second = ranked[1];
            const third = ranked[2];

            podiumDeck.innerHTML = `
                <!-- Rank 2: Silver -->
                <div class="glass-box" style="padding: 22px; text-align: center; border-color: #cbd5e1; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
                    <div style="font-size: 2rem; margin-bottom: 4px;">🥈</div>
                    <div class="tech-chip" style="margin-bottom: 10px; color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1;">RANK 2</div>
                    <h4 style="font-size: 1.15rem; color: var(--text-primary); font-weight: 800;">${escapeHtml(second.name)}</h4>
                    <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">Roll: ${second.roll_no || second.rollNo} • ${escapeHtml(second.department)}</p>
                    <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-secondary); font-family: var(--font-code);">${second.total} / 500</div>
                    <div style="color: var(--accent-blue); font-weight: 700; font-size: 0.88rem;">${(second.percentage || 0).toFixed(2)}%</div>
                </div>

                <!-- Rank 1: Gold Champion -->
                <div class="glass-box" style="padding: 24px; text-align: center; border-color: #fcd34d; background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%); transform: translateY(-6px); box-shadow: var(--shadow-md);">
                    <div style="font-size: 2.3rem; margin-bottom: 4px;">👑 🥇</div>
                    <div class="tech-chip" style="margin-bottom: 10px; color: #b45309; background: #fef3c7; border: 1px solid #fde68a;">CHAMPION • RANK 1</div>
                    <h4 style="font-size: 1.25rem; color: var(--text-primary); font-weight: 800;">${escapeHtml(first.name)}</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">Roll: ${first.roll_no || first.rollNo} • ${escapeHtml(first.department)}</p>
                    <div style="font-size: 1.6rem; font-weight: 800; color: #b45309; font-family: var(--font-code);">${first.total} / 500</div>
                    <div style="color: var(--accent-blue); font-weight: 700; font-size: 0.95rem;">${(first.percentage || 0).toFixed(2)}%</div>
                </div>

                <!-- Rank 3: Bronze -->
                <div class="glass-box" style="padding: 22px; text-align: center; border-color: #fdba74; background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);">
                    <div style="font-size: 2rem; margin-bottom: 4px;">🥉</div>
                    <div class="tech-chip" style="margin-bottom: 10px; color: #9a3412; background: #ffedd5; border: 1px solid #fed7aa;">RANK 3</div>
                    <h4 style="font-size: 1.15rem; color: var(--text-primary); font-weight: 800;">${escapeHtml(third.name)}</h4>
                    <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">Roll: ${third.roll_no || third.rollNo} • ${escapeHtml(third.department)}</p>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #9a3412; font-family: var(--font-code);">${third.total} / 500</div>
                    <div style="color: var(--accent-blue); font-weight: 700; font-size: 0.88rem;">${(third.percentage || 0).toFixed(2)}%</div>
                </div>
            `;
        }
    }

    // Rankings Table
    const tbody = document.getElementById('rankings-table-tbody');
    if (!tbody) return;

    if (ranked.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No students match criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = ranked.map(s => {
        const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
        const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
        const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);

        let rankBadge = `<span style="font-weight: 700; color: var(--text-secondary); font-family: var(--font-code);">#${s.rank}</span>`;
        if (s.rank === 1) rankBadge = `<span style="color: #d97706; font-weight: 800;">🥇 #1</span>`;
        else if (s.rank === 2) rankBadge = `<span style="color: #475569; font-weight: 800;">🥈 #2</span>`;
        else if (s.rank === 3) rankBadge = `<span style="color: #b45309; font-weight: 800;">🥉 #3</span>`;

        return `
            <tr>
                <td>${rankBadge}</td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--accent-blue);">${roll}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(s.name)}</td>
                <td>
                    <div style="color: var(--text-secondary); font-size: 0.82rem;">${escapeHtml(s.department)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(s.semester)}</div>
                </td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--text-primary);">${s.total} / 500</td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--accent-blue);">${(s.percentage || 0).toFixed(2)}%</td>
                <td><span class="grade-pill grade-${s.grade}">${s.grade}</span></td>
                <td style="font-family: var(--font-code); font-size: 0.8rem; color: var(--text-muted);">${s1}</td>
                <td style="font-family: var(--font-code); font-size: 0.8rem; color: var(--text-muted);">${s2}</td>
                <td>
                    <button class="btn-action-ghost btn-rank-view" data-roll="${roll}" style="padding: 4px 10px; font-size: 0.76rem;">Transcript</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.btn-rank-view').forEach(b => {
        b.addEventListener('click', () => {
            const roll = parseInt(b.dataset.roll, 10);
            state.selectedStudentRoll = roll;
            navigateTo('result-card');
        });
    });
}

/* ==========================================================================
   VIEW 7: Official Result Card / Transcript Controller
   ========================================================================== */
function setupResultCard() {
    const picker = document.getElementById('transcript-student-picker');
    const printBtn = document.getElementById('btn-print-transcript-doc');

    if (picker) {
        picker.addEventListener('change', () => {
            const roll = parseInt(picker.value, 10);
            renderTranscriptDetails(roll);
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
}

function renderResultCardView() {
    const picker = document.getElementById('transcript-student-picker');
    if (!picker) return;

    picker.innerHTML = state.students.map(s => {
        const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
        return `<option value="${roll}">Roll ${roll} - ${escapeHtml(s.name)} (${escapeHtml(s.department)})</option>`;
    }).join('');

    let targetRoll = state.selectedStudentRoll;
    if (!targetRoll && state.students.length > 0) {
        targetRoll = state.students[0].roll_no !== undefined ? state.students[0].roll_no : state.students[0].rollNo;
    }

    if (targetRoll) {
        picker.value = targetRoll;
        renderTranscriptDetails(targetRoll);
    }
}

function renderTranscriptDetails(rollNo) {
    const res = state.hashTable.search(rollNo);
    if (!res.found || !res.student) return;

    const s = res.student;
    const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
    state.selectedStudentRoll = roll;

    // Metadata Grid
    const metaGrid = document.getElementById('transcript-meta-grid');
    if (metaGrid) {
        metaGrid.innerHTML = `
            <div>
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Candidate Name</span>
                <strong style="color: var(--text-primary); font-size: 1.05rem; display: block; margin-top: 2px;">${escapeHtml(s.name)}</strong>
            </div>
            <div>
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Roll / Registration No</span>
                <strong style="color: var(--accent-blue); font-family: var(--font-code); font-size: 1.05rem; display: block; margin-top: 2px;">${roll}</strong>
            </div>
            <div>
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Department / Discipline</span>
                <strong style="color: var(--text-primary); font-size: 0.95rem; display: block; margin-top: 2px;">${escapeHtml(s.department)}</strong>
            </div>
            <div>
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Academic Term</span>
                <strong style="color: var(--text-primary); font-size: 0.95rem; display: block; margin-top: 2px;">${escapeHtml(s.semester)}</strong>
            </div>
        `;
    }

    const s1 = s.subject1 !== undefined ? s.subject1 : (s.marks ? s.marks[0] : 0);
    const s2 = s.subject2 !== undefined ? s.subject2 : (s.marks ? s.marks[1] : 0);
    const s3 = s.subject3 !== undefined ? s.subject3 : (s.marks ? s.marks[2] : 0);
    const s4 = s.subject4 !== undefined ? s.subject4 : (s.marks ? s.marks[3] : 0);
    const s5 = s.subject5 !== undefined ? s.subject5 : (s.marks ? s.marks[4] : 0);

    const scores = [s1, s2, s3, s4, s5];
    const codes = ['CS-301', 'CS-302', 'CS-303', 'CS-304', 'CS-305'];

    const tbody = document.getElementById('transcript-subject-tbody');
    if (tbody) {
        tbody.innerHTML = SUBJECT_NAMES.map((subName, i) => {
            const mark = scores[i];
            let grade = 'F';
            let gp = 0.0;
            if (mark >= 90) { grade = 'A+'; gp = 10.0; }
            else if (mark >= 80) { grade = 'A'; gp = 9.0; }
            else if (mark >= 70) { grade = 'B'; gp = 8.0; }
            else if (mark >= 60) { grade = 'C'; gp = 7.0; }
            else if (mark >= 50) { grade = 'D'; gp = 6.0; }

            return `
                <tr>
                    <td style="font-family: var(--font-code); color: var(--text-muted);">${codes[i]}</td>
                    <td style="font-weight: 600; color: var(--text-primary);">${subName}</td>
                    <td style="font-family: var(--font-code);">100</td>
                    <td style="font-family: var(--font-code); font-weight: 700; color: var(--text-primary);">${mark}</td>
                    <td style="font-family: var(--font-code);">${gp.toFixed(1)}</td>
                    <td><span class="grade-pill grade-${grade}">${grade}</span></td>
                </tr>
            `;
        }).join('');
    }

    const elTotal = document.getElementById('tc-total');
    const elPct = document.getElementById('tc-pct');
    const elGrade = document.getElementById('tc-grade');
    const elRank = document.getElementById('tc-rank');

    if (elTotal) elTotal.textContent = `${s.total} / 500`;
    if (elPct) elPct.textContent = `${(s.percentage || 0).toFixed(2)}%`;
    if (elGrade) elGrade.innerHTML = `<span class="grade-pill grade-${s.grade}" style="font-size: 1rem; padding: 4px 14px;">${s.grade}</span>`;
    if (elRank) elRank.textContent = `#${s.rank || '--'}`;
}

/* ==========================================================================
   VIEW 8: Performance Analytics & Reports Controller
   ========================================================================== */
function renderReportsView() {
    renderGradeDistChart();
    renderSubjectAvgChart();
    renderDepartmentBenchmarks();
}

function renderGradeDistChart() {
    const canvas = document.getElementById('chart-grade-dist');
    if (!canvas || typeof Chart === 'undefined') return;

    if (state.charts.gradeDist) {
        state.charts.gradeDist.destroy();
    }

    const counts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    state.students.forEach(s => {
        if (counts[s.grade] !== undefined) counts[s.grade]++;
    });

    const ctx = canvas.getContext('2d');
    state.charts.gradeDist = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['A+ (>=90%)', 'A (80-89%)', 'B (70-79%)', 'C (60-69%)', 'D (50-59%)', 'F (<50%)'],
            datasets: [{
                label: 'Student Cohort Count',
                data: [counts['A+'], counts['A'], counts['B'], counts['C'], counts['D'], counts['F']],
                backgroundColor: [
                    'rgba(5, 150, 105, 0.85)',
                    'rgba(37, 99, 235, 0.85)',
                    'rgba(79, 70, 229, 0.85)',
                    'rgba(217, 119, 6, 0.85)',
                    'rgba(234, 88, 12, 0.85)',
                    'rgba(220, 38, 38, 0.85)'
                ],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#475569' }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#475569', stepSize: 5 },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderSubjectAvgChart() {
    const canvas = document.getElementById('chart-subject-avg');
    if (!canvas || typeof Chart === 'undefined') return;

    if (state.charts.subjectAvg) {
        state.charts.subjectAvg.destroy();
    }

    const subTotals = [0, 0, 0, 0, 0];
    const n = state.students.length || 1;
    state.students.forEach(s => {
        subTotals[0] += s.subject1 || 0;
        subTotals[1] += s.subject2 || 0;
        subTotals[2] += s.subject3 || 0;
        subTotals[3] += s.subject4 || 0;
        subTotals[4] += s.subject5 || 0;
    });

    const avgs = subTotals.map(t => parseFloat((t / n).toFixed(1)));
    const ctx = canvas.getContext('2d');

    state.charts.subjectAvg = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['DSA', 'DBMS', 'Networks', 'OS', 'Software Engg'],
            datasets: [{
                label: 'Class Average Score (/100)',
                data: avgs,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: '#1d4ed8',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#475569' },
                    max: 100,
                    beginAtZero: true
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#475569' }
                }
            }
        }
    });
}

function renderDepartmentBenchmarks() {
    const tbody = document.getElementById('dept-benchmark-tbody');
    if (!tbody) return;

    const depts = DEPARTMENTS;
    tbody.innerHTML = depts.map(dept => {
        const cohort = state.students.filter(s => s.department === dept);
        const count = cohort.length;
        if (count === 0) {
            return `<tr><td style="font-weight: 600; color: var(--text-primary);">${dept}</td><td>0</td><td>--</td><td>--</td><td>--</td></tr>`;
        }

        const totalSum = cohort.reduce((acc, s) => acc + (s.total || 0), 0);
        const avgPct = (totalSum / count / 5.0).toFixed(2);
        const top = [...cohort].sort((a, b) => b.total - a.total)[0];
        const passCount = cohort.filter(s => s.percentage >= 50).length;
        const passRate = ((passCount / count) * 100).toFixed(1);

        return `
            <tr>
                <td style="font-weight: 600; color: var(--text-primary);">${dept}</td>
                <td style="font-family: var(--font-code); color: var(--accent-blue);">${count} Students</td>
                <td style="font-family: var(--font-code); font-weight: 700; color: var(--text-primary);">${avgPct}%</td>
                <td>
                    <div style="font-size: 0.85rem; color: var(--text-primary);">${escapeHtml(top.name)}</div>
                    <div style="font-size: 0.72rem; color: var(--accent-amber); font-family: var(--font-code);">${top.total} Marks</div>
                </td>
                <td style="font-family: var(--font-code); color: var(--accent-green); font-weight: 700;">${passRate}%</td>
            </tr>
        `;
    }).join('');
}

/* ==========================================================================
   VIEW 9: Hash Table Visualizer Controller (M = 31)
   ========================================================================== */
function setupHashVisualizer() {
    const btnRun = document.getElementById('btn-run-hash-trace');
    const inputSim = document.getElementById('sim-trace-input');

    if (btnRun && inputSim) {
        btnRun.addEventListener('click', () => {
            const roll = parseInt(inputSim.value, 10);
            runHashTraceSimulation(roll);
        });
        inputSim.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const roll = parseInt(inputSim.value, 10);
                runHashTraceSimulation(roll);
            }
        });
    }
}

function renderHashVisualizerView() {
    const grid = document.getElementById('visualizer-bucket-grid');
    if (!grid) return;

    const size = state.hashTable.size;
    let cardsHtml = '';

    for (let i = 0; i < size; i++) {
        const bucket = state.hashTable.buckets[i];
        const len = bucket.length;

        let statusClass = 'empty';
        let badge = `<span style="font-size: 0.72rem; color: var(--text-muted);">Empty</span>`;

        if (len === 1) {
            statusClass = 'occupied';
            badge = `<span style="font-size: 0.72rem; color: var(--accent-blue); font-weight: 700;">1 Node</span>`;
        } else if (len > 1) {
            statusClass = 'collision';
            badge = `<span style="font-size: 0.72rem; color: var(--accent-amber); font-weight: 800;">Collision (${len})</span>`;
        }

        cardsHtml += `
            <div class="bucket-card bucket-${statusClass}" id="bcard-${i}" data-index="${i}">
                <div class="bcard-header">
                    <strong style="font-family: var(--font-code); color: var(--text-primary); font-size: 0.88rem;">Bucket [${i}]</strong>
                    ${badge}
                </div>
                <div class="bcard-chain" id="chain-container-${i}">
                    ${len === 0 ? `
                        <div style="font-size: 0.74rem; color: var(--text-muted); font-style: italic; padding: 6px 0;">NULL pointer</div>
                    ` : bucket.map((s, cIdx) => {
                        const roll = s.roll_no !== undefined ? s.roll_no : s.rollNo;
                        return `
                            <div class="chain-node" id="cnode-${i}-${cIdx}">
                                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                    <strong style="color: var(--accent-blue); font-family: var(--font-code); font-size: 0.8rem;">Roll ${roll}</strong>
                                    <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-code);">${s.total}m</span>
                                </div>
                                <div style="font-size: 0.72rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(s.name)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    grid.innerHTML = cardsHtml;
}

function highlightBucketCard(bucketIndex) {
    document.querySelectorAll('.bucket-card').forEach(c => c.classList.remove('active-glow'));
    const target = document.getElementById(`bcard-${bucketIndex}`);
    if (target) {
        target.classList.add('active-glow');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function runHashTraceSimulation(rollNo) {
    const stepDeck = document.getElementById('sim-step-deck');
    if (!stepDeck) return;

    if (isNaN(rollNo) || rollNo <= 0) {
        stepDeck.innerHTML = `<div style="color: var(--accent-red); font-family: var(--font-code);">Please provide a valid positive integer Roll Number.</div>`;
        return;
    }

    const trace = state.hashTable.search(rollNo);
    highlightBucketCard(trace.bucketIndex);

    document.querySelectorAll('.chain-node').forEach(n => n.classList.remove('node-match'));
    if (trace.found && trace.chainIndex !== -1) {
        const nodeEl = document.getElementById(`cnode-${trace.bucketIndex}-${trace.chainIndex}`);
        if (nodeEl) nodeEl.classList.add('node-match');
    }

    stepDeck.innerHTML = `
        <div style="font-family: var(--font-code); font-size: 0.85rem; display: flex; flex-direction: column; gap: 8px;">
            <div style="color: var(--accent-blue); font-weight: 800; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">
                TRACING EXECUTION FOR ROLL NO: ${rollNo}
            </div>
            ${trace.steps.map(s => {
                let badgeStyle = 'background: #f8fafc; color: var(--text-secondary); border: 1px solid #e2e8f0;';
                if (s.status === 'success') badgeStyle = 'background: #ecfdf5; color: var(--accent-green); border: 1px solid #a7f3d0;';
                else if (s.status === 'warning') badgeStyle = 'background: #fffbeb; color: var(--accent-amber); border: 1px solid #fde68a;';
                else if (s.status === 'error') badgeStyle = 'background: #fef2f2; color: var(--accent-red); border: 1px solid #fecaca;';

                return `
                    <div style="padding: 9px 12px; border-radius: var(--radius-md); ${badgeStyle}">
                        <strong>[${escapeHtml(s.step)}]</strong> ${escapeHtml(s.detail)}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/* ==========================================================================
   Two-Way Live Synchronization Watcher
   Automatically detects external changes to dataset.csv and updates UI
   ========================================================================== */
function refreshActiveView() {
    const viewId = state.currentView;
    if (viewId === 'dashboard') renderDashboard();
    else if (viewId === 'students') renderStudentsDirectory();
    else if (viewId === 'rankings') renderRankingsView();
    else if (viewId === 'result-card') renderResultCardView();
    else if (viewId === 'reports') renderReportsView();
    else if (viewId === 'hash-structure') renderHashVisualizerView();
}

async function checkServerVersionAndSync() {
    if (!state.isApiOnline) return;
    try {
        const res = await fetch('/api/version', { cache: 'no-cache' });
        if (res.ok) {
            const data = await res.json();
            if (currentClientDataVersion !== null && data.version !== currentClientDataVersion) {
                console.log(`[LiveSync] Server dataset version incremented (${currentClientDataVersion} -> ${data.version}). Refreshing UI...`);
                currentClientDataVersion = data.version;
                await loadStudentsData();
                refreshActiveView();
                showToast('CSV Synchronized', 'Website updated with latest dataset.csv modifications.', 'info');
            } else if (currentClientDataVersion === null) {
                currentClientDataVersion = data.version;
            }
        }
    } catch (e) {
        // Server unreachable or connection dropped
    }
}

function setupLiveSync() {
    if (!state.isApiOnline) return;

    // 1. Initial version check
    checkServerVersionAndSync();

    // 2. Poll every 2 seconds for external file modifications on dataset.csv
    setInterval(checkServerVersionAndSync, 2000);

    // 3. Instant sync check as soon as user switches back to browser tab
    window.addEventListener('focus', checkServerVersionAndSync);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkServerVersionAndSync();
        }
    });
}

/* ==========================================================================
   Global Bootstrap Entry Point
   ========================================================================== */
async function init() {
    console.log('[SRRMS] Starting Student Ranking & Result Management System (Professional Light Mode)...');

    // 1. Detect server mode
    state.isApiOnline = await checkBackendHealth();
    updateConnectionBadge();

    // 2. Load dataset
    await loadStudentsData();

    // 3. Setup interactive controllers
    setupNavigation();
    setupStudentsDirectory();
    setupSearch();
    setupAddStudent();
    setupUpdateMarks();
    setupRankingsView();
    setupResultCard();
    setupHashVisualizer();

    // 4. Initial view
    navigateTo('dashboard');

    // 5. Activate bidirectional live sync
    setupLiveSync();

    console.log(`[SRRMS] Ready! Mode: ${state.isApiOnline ? 'Full-Stack REST (SQLite + dataset.csv)' : 'Client-Side (HashTable + LocalStorage)'}`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
