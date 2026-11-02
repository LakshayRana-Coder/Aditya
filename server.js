/**
 * ============================================================================
 * Student Ranking & Result Management System (SRRMS)
 * Full-Stack API Server with Integrated SQLite Database & dataset.csv Sync
 * Zero External Dependencies - Uses Node.js Built-In 'node:sqlite' & 'node:http'
 * ============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.sqlite');
const CSV_PATH = path.join(__dirname, 'dataset.csv');

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);

// Create Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        roll_no INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester TEXT NOT NULL,
        subject1 INTEGER NOT NULL,
        subject2 INTEGER NOT NULL,
        subject3 INTEGER NOT NULL,
        subject4 INTEGER NOT NULL,
        subject5 INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage REAL NOT NULL,
        grade TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

/**
 * Academic Rubric Calculation
 */
function calculateAcademicMetrics(marks) {
    const valid = marks.map(m => Math.max(0, Math.min(100, parseInt(m, 10) || 0)));
    const total = valid.reduce((a, b) => a + b, 0);
    const percentage = parseFloat((total / 5.0).toFixed(2));
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    return { total, percentage, grade, validMarks: valid };
}

/**
 * In-Memory DSA: Hash Table with Separate Chaining
 */
class ServerHashTable {
    constructor(size = 31) {
        this.size = size;
        this.buckets = Array.from({ length: size }, () => []);
    }

    hash(rollNo) {
        return Math.abs(parseInt(rollNo, 10)) % this.size;
    }

    rebuild() {
        this.buckets = Array.from({ length: this.size }, () => []);
        const students = db.prepare('SELECT * FROM students').all();
        for (const s of students) {
            const idx = this.hash(s.roll_no);
            this.buckets[idx].push(s);
        }
    }

    search(rollNo) {
        const roll = parseInt(rollNo, 10);
        const bucketIndex = this.hash(roll);
        const bucket = this.buckets[bucketIndex];
        const steps = [];
        steps.push({
            step: 'Hash Calculation',
            detail: `h(${roll}) = |${roll}| mod ${this.size} = Bucket [${bucketIndex}]`,
            status: 'info'
        });

        let comparisons = 0;
        for (let i = 0; i < bucket.length; i++) {
            comparisons++;
            if (bucket[i].roll_no === roll) {
                steps.push({
                    step: 'Match Located',
                    detail: `Comparison #${comparisons}: Chain item [${i}] RollNo (${bucket[i].roll_no}) matches query (${roll}).`,
                    status: 'success'
                });
                return { found: true, student: bucket[i], bucketIndex, chainIndex: i, comparisons, steps };
            }
        }

        steps.push({
            step: 'Chain Exhausted',
            detail: `Key ${roll} not found after checking ${comparisons} node(s) in Bucket [${bucketIndex}].`,
            status: 'error'
        });

        return { found: false, student: null, bucketIndex, chainIndex: -1, comparisons, steps };
    }

    getStats() {
        let occupied = 0;
        let collisions = 0;
        let longest = 0;
        let total = 0;

        for (let i = 0; i < this.size; i++) {
            const len = this.buckets[i].length;
            total += len;
            if (len > 0) {
                occupied++;
                if (len > 1) collisions += (len - 1);
                if (len > longest) longest = len;
            }
        }

        return {
            totalBuckets: this.size,
            occupiedBuckets: occupied,
            emptyBuckets: this.size - occupied,
            totalStudents: total,
            loadFactor: parseFloat((total / this.size).toFixed(2)),
            collisionCount: collisions,
            longestChain: longest,
            bucketsSummary: this.buckets.map((b, idx) => ({
                index: idx,
                count: b.length,
                students: b.map(s => ({ rollNo: s.roll_no, name: s.name, total: s.total }))
            }))
        };
    }
}

const hashTable = new ServerHashTable(31);

/**
 * Two-Way Realtime Synchronization Engine
 * Handles bidirectional changes between SQLite database and dataset.csv
 */
let dataVersion = 1;
let lastInternalCsvWriteTime = 0;
let lastSyncedMtime = 0;

function parseCSVLine(line) {
    const tokens = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            tokens.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            cur = '';
        } else {
            cur += char;
        }
    }
    tokens.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return tokens;
}

/**
 * Synchronize from dataset.csv into SQLite & in-memory Hash Table
 */
function syncCSVToDatabase(reason = 'external') {
    if (!fs.existsSync(CSV_PATH)) {
        console.log('[CSV Sync] dataset.csv not found; skipping sync.');
        return 0;
    }

    try {
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) return 0;

        let startIdx = 0;
        const firstLineTokens = parseCSVLine(lines[0]);
        // If first token is not a number, it's a header line
        if (isNaN(parseInt(firstLineTokens[0], 10))) {
            startIdx = 1;
        }

        const validRecords = [];
        const seenRolls = new Set();

        for (let i = startIdx; i < lines.length; i++) {
            const tokens = parseCSVLine(lines[i]);
            if (tokens.length >= 2) {
                const rollNo = parseInt(tokens[0], 10);
                const name = (tokens[1] || '').trim();
                if (isNaN(rollNo) || rollNo <= 0 || !name || seenRolls.has(rollNo)) {
                    continue;
                }
                seenRolls.add(rollNo);

                const dept = (tokens[2] || '').trim() || 'Computer Science & Engineering';
                const sem = (tokens[3] || '').trim() || 'Semester 3';
                const s1 = Math.max(0, Math.min(100, parseInt(tokens[4], 10) || 0));
                const s2 = Math.max(0, Math.min(100, parseInt(tokens[5], 10) || 0));
                const s3 = Math.max(0, Math.min(100, parseInt(tokens[6], 10) || 0));
                const s4 = Math.max(0, Math.min(100, parseInt(tokens[7], 10) || 0));
                const s5 = Math.max(0, Math.min(100, parseInt(tokens[8], 10) || 0));

                const metrics = calculateAcademicMetrics([s1, s2, s3, s4, s5]);

                validRecords.push({
                    rollNo,
                    name,
                    dept,
                    sem,
                    s1,
                    s2,
                    s3,
                    s4,
                    s5,
                    total: metrics.total,
                    percentage: metrics.percentage,
                    grade: metrics.grade
                });
            }
        }

        if (validRecords.length === 0) {
            console.warn('[CSV Sync] No valid student records found in dataset.csv.');
            return 0;
        }

        // Atomic SQLite Transaction
        db.exec('BEGIN TRANSACTION');
        db.exec('DELETE FROM students');
        const insertStmt = db.prepare(`
            INSERT INTO students 
            (roll_no, name, department, semester, subject1, subject2, subject3, subject4, subject5, total, percentage, grade)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const r of validRecords) {
            insertStmt.run(r.rollNo, r.name, r.dept, r.sem, r.s1, r.s2, r.s3, r.s4, r.s5, r.total, r.percentage, r.grade);
        }
        db.exec('COMMIT');

        // Rebuild In-Memory Hash Table
        hashTable.rebuild();
        dataVersion++;

        try {
            lastSyncedMtime = fs.statSync(CSV_PATH).mtimeMs;
        } catch (e) {}

        if (reason !== 'startup') {
            db.prepare('INSERT INTO audit_logs (action_type, title, description) VALUES (?, ?, ?)')
              .run('sync', 'CSV Synced to Database', `Synchronized ${validRecords.length} records updated directly in dataset.csv.`);
        }

        console.log(`[CSV Sync] Synced ${validRecords.length} records from dataset.csv into SQLite & Hash Table (Trigger: ${reason}, Version: ${dataVersion})`);
        return validRecords.length;
    } catch (err) {
        console.error('[CSV Sync Error] Failed to sync dataset.csv into SQLite:', err);
        return 0;
    }
}

/**
 * Flush SQLite Database contents to dataset.csv
 */
function syncDatabaseToCSV() {
    try {
        const rows = db.prepare('SELECT * FROM students ORDER BY roll_no ASC').all();
        let csvContent = 'RollNo,Name,Department,Semester,Subject1,Subject2,Subject3,Subject4,Subject5,Total,Percentage,Grade\n';
        for (const r of rows) {
            const escapedName = `"${r.name.replace(/"/g, '""')}"`;
            const escapedDept = `"${r.department.replace(/"/g, '""')}"`;
            const escapedSem = `"${r.semester.replace(/"/g, '""')}"`;
            csvContent += `${r.roll_no},${escapedName},${escapedDept},${escapedSem},${r.subject1},${r.subject2},${r.subject3},${r.subject4},${r.subject5},${r.total},${r.percentage},${r.grade}\n`;
        }
        lastInternalCsvWriteTime = Date.now();
        fs.writeFileSync(CSV_PATH, csvContent, 'utf-8');
        try {
            lastSyncedMtime = fs.statSync(CSV_PATH).mtimeMs;
        } catch (e) {}
        dataVersion++;
        console.log(`[Sync] Synced ${rows.length} records from SQLite to dataset.csv (Version: ${dataVersion})`);
    } catch (err) {
        console.error('[Sync Error] Failed to write dataset.csv:', err);
    }
}

/**
 * File Watcher: Detect when dataset.csv is edited directly by user/editor
 */
function setupCsvWatcher() {
    if (!fs.existsSync(CSV_PATH)) return;
    try {
        lastSyncedMtime = fs.statSync(CSV_PATH).mtimeMs;
    } catch (e) {}

    fs.watchFile(CSV_PATH, { interval: 400 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
            // Only trigger if modified externally (not written by server itself recently)
            if (Date.now() - lastInternalCsvWriteTime > 1200) {
                console.log('[CSV Watcher] dataset.csv changed externally. Synchronizing into SQLite...');
                syncCSVToDatabase('file_watch');
            }
        }
    });
}

/**
 * Instant Pre-Request Check: Guarantees zero latency sync on incoming HTTP requests
 */
function checkCSVUpdateOnRequest() {
    try {
        if (!fs.existsSync(CSV_PATH)) return;
        const currentMtime = fs.statSync(CSV_PATH).mtimeMs;
        if (currentMtime !== lastSyncedMtime && (Date.now() - lastInternalCsvWriteTime > 1200)) {
            console.log('[CSV Request Check] dataset.csv has newer timestamp. Synchronizing into SQLite...');
            syncCSVToDatabase('request_check');
        }
    } catch (e) {
        // file busy or transient read lock
    }
}

// Initial startup synchronization
if (fs.existsSync(CSV_PATH)) {
    const loaded = syncCSVToDatabase('startup');
    if (loaded === 0) {
        const count = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
        if (count > 0) syncDatabaseToCSV();
    }
} else {
    syncDatabaseToCSV();
}
setupCsvWatcher();

/**
 * In-Memory DSA: Custom Recursive Merge Sort with Multi-Level Tie-Breakers
 */
function studentComparator(a, b) {
    if (b.total !== a.total) return b.total - a.total; // 1. Higher total
    if (b.subject1 !== a.subject1) return b.subject1 - a.subject1; // 2. Higher Sub 1
    if (b.subject2 !== a.subject2) return b.subject2 - a.subject2; // 3. Higher Sub 2
    return a.roll_no - b.roll_no; // 4. Lower Roll Number
}

function merge(left, right) {
    const res = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (studentComparator(left[i], right[j]) <= 0) {
            res.push(left[i]);
            i++;
        } else {
            res.push(right[j]);
            j++;
        }
    }
    while (i < left.length) res.push(left[i++]);
    while (j < right.length) res.push(right[j++]);
    return res;
}

function customMergeSort(items) {
    if (items.length <= 1) return items;
    const mid = Math.floor(items.length / 2);
    const left = customMergeSort(items.slice(0, mid));
    const right = customMergeSort(items.slice(mid));
    return merge(left, right);
}

function computeCompetitionRankings(students) {
    const sorted = customMergeSort(students);
    let currentRank = 1;
    let prevTotal = -1;

    return sorted.map((s, idx) => {
        const item = { ...s };
        if (idx === 0) {
            currentRank = 1;
        } else {
            if (item.total !== prevTotal) {
                currentRank = idx + 1;
            }
        }
        prevTotal = item.total;
        item.rank = currentRank;
        return item;
    });
}

/**
 * Static MIME Types
 */
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

/**
 * HTTP Request Handler
 */
const server = http.createServer((req, res) => {
    // Instant pre-request synchronization check:
    // If dataset.csv was modified externally, sync to SQLite before handling request
    checkCSVUpdateOnRequest();

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Helper: JSON response
    const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(data));
    };

    // Helper: Read JSON body
    const readBody = (callback) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                callback(null, data);
            } catch (err) {
                callback(err, null);
            }
        });
    };

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // =========================================================================
    // REST API ENDPOINTS
    // =========================================================================

    // GET /api/version (Live synchronization state)
    if (pathname === '/api/version' && method === 'GET') {
        const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
        sendJson(200, {
            success: true,
            version: dataVersion,
            lastModified: lastSyncedMtime,
            count: studentCount
        });
        return;
    }

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
        const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
        sendJson(200, {
            status: 'ONLINE',
            database: 'SQLite 3 (node:sqlite built-in)',
            datasetFile: 'dataset.csv',
            dataVersion: dataVersion,
            studentsCount: studentCount,
            hashTableBuckets: hashTable.size
        });
        return;
    }

    // GET /api/students
    if (pathname === '/api/students' && method === 'GET') {
        let query = 'SELECT * FROM students';
        const params = [];
        const conditions = [];

        const search = parsedUrl.searchParams.get('search');
        const dept = parsedUrl.searchParams.get('department');
        const sem = parsedUrl.searchParams.get('semester');

        if (search) {
            conditions.push('(name LIKE ? OR CAST(roll_no AS TEXT) LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (dept) {
            conditions.push('department = ?');
            params.push(dept);
        }
        if (sem) {
            conditions.push('semester = ?');
            params.push(sem);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY roll_no ASC';

        const students = db.prepare(query).all(...params);
        sendJson(200, { success: true, count: students.length, students });
        return;
    }

    // GET /api/students/:rollNo (Hash Table Search with Telemetry)
    const singleMatch = pathname.match(/^\/api\/students\/(\d+)$/);
    if (singleMatch && method === 'GET') {
        const rollNo = parseInt(singleMatch[1], 10);
        const startTime = process.hrtime.bigint();
        const trace = hashTable.search(rollNo);
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000.0;

        // Log search activity
        db.prepare('INSERT INTO audit_logs (action_type, title, description) VALUES (?, ?, ?)')
          .run('search', 'Hash Search Executed', `Queried Roll No ${rollNo} in Bucket [${trace.bucketIndex}] (${durationMs.toFixed(3)} ms).`);

        sendJson(200, {
            success: trace.found,
            student: trace.student,
            bucketIndex: trace.bucketIndex,
            chainIndex: trace.chainIndex,
            comparisons: trace.comparisons,
            durationMs: parseFloat(durationMs.toFixed(3)),
            steps: trace.steps
        });
        return;
    }

    // POST /api/students (Add new student)
    if (pathname === '/api/students' && method === 'POST') {
        readBody((err, data) => {
            if (err) return sendJson(400, { success: false, message: 'Invalid JSON body' });

            const rollNo = parseInt(data.rollNo, 10);
            const name = (data.name || '').trim();
            const dept = data.department || 'Computer Science & Engineering';
            const sem = data.semester || 'Semester 3';
            const marks = data.marks || [data.subject1, data.subject2, data.subject3, data.subject4, data.subject5];

            if (isNaN(rollNo) || rollNo <= 0) {
                return sendJson(400, { success: false, message: 'Invalid Roll Number. Must be a positive integer.' });
            }
            if (!name) {
                return sendJson(400, { success: false, message: 'Student name is required.' });
            }

            // Check duplicate in SQLite / Hash Table
            const existing = db.prepare('SELECT roll_no FROM students WHERE roll_no = ?').get(rollNo);
            if (existing) {
                return sendJson(409, { success: false, message: `Student with Roll Number ${rollNo} already exists!` });
            }

            const metrics = calculateAcademicMetrics(marks);
            const [s1, s2, s3, s4, s5] = metrics.validMarks;

            db.prepare(`
                INSERT INTO students 
                (roll_no, name, department, semester, subject1, subject2, subject3, subject4, subject5, total, percentage, grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(rollNo, name, dept, sem, s1, s2, s3, s4, s5, metrics.total, metrics.percentage, metrics.grade);

            db.prepare('INSERT INTO audit_logs (action_type, title, description) VALUES (?, ?, ?)')
              .run('insert', 'Student Enrolled', `Enrolled ${name} (Roll No: ${rollNo}) into Department ${dept}.`);

            hashTable.rebuild();
            syncDatabaseToCSV();

            sendJson(201, {
                success: true,
                message: `Student ${name} successfully enrolled!`,
                student: { roll_no: rollNo, name, department: dept, semester: sem, total: metrics.total, percentage: metrics.percentage, grade: metrics.grade }
            });
        });
        return;
    }

    // PUT /api/students/:rollNo (Update marks)
    if (singleMatch && method === 'PUT') {
        const rollNo = parseInt(singleMatch[1], 10);
        readBody((err, data) => {
            if (err) return sendJson(400, { success: false, message: 'Invalid JSON payload' });

            const existing = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(rollNo);
            if (!existing) {
                return sendJson(404, { success: false, message: `Student with Roll No ${rollNo} not found.` });
            }

            const marks = data.marks || [data.subject1, data.subject2, data.subject3, data.subject4, data.subject5];
            const metrics = calculateAcademicMetrics(marks);
            const [s1, s2, s3, s4, s5] = metrics.validMarks;
            const diff = metrics.total - existing.total;
            const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

            db.prepare(`
                UPDATE students 
                SET subject1 = ?, subject2 = ?, subject3 = ?, subject4 = ?, subject5 = ?, total = ?, percentage = ?, grade = ?, updated_at = CURRENT_TIMESTAMP
                WHERE roll_no = ?
            `).run(s1, s2, s3, s4, s5, metrics.total, metrics.percentage, metrics.grade, rollNo);

            db.prepare('INSERT INTO audit_logs (action_type, title, description) VALUES (?, ?, ?)')
              .run('update', 'Marks Revised', `Updated scores for ${existing.name} (Roll ${rollNo}). Delta: ${diffStr} marks.`);

            hashTable.rebuild();
            syncDatabaseToCSV();

            sendJson(200, {
                success: true,
                message: `Marks updated successfully for ${existing.name}.`,
                oldTotal: existing.total,
                newTotal: metrics.total,
                diff
            });
        });
        return;
    }

    // DELETE /api/students/:rollNo (Delete student)
    if (singleMatch && method === 'DELETE') {
        const rollNo = parseInt(singleMatch[1], 10);
        const existing = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(rollNo);
        if (!existing) {
            return sendJson(404, { success: false, message: `Student with Roll No ${rollNo} not found.` });
        }

        db.prepare('DELETE FROM students WHERE roll_no = ?').run(rollNo);
        db.prepare('INSERT INTO audit_logs (action_type, title, description) VALUES (?, ?, ?)')
          .run('delete', 'Student Removed', `Deleted ${existing.name} (Roll No: ${rollNo}) from database and dataset.csv.`);

        hashTable.rebuild();
        syncDatabaseToCSV();

        sendJson(200, {
            success: true,
            message: `Student ${existing.name} (Roll ${rollNo}) deleted successfully.`
        });
        return;
    }

    // GET /api/rankings (Custom Merge Sort Leaderboard)
    if (pathname === '/api/rankings' && method === 'GET') {
        const students = db.prepare('SELECT * FROM students').all();
        const ranked = computeCompetitionRankings(students);
        sendJson(200, {
            success: true,
            algorithm: 'Custom Merge Sort (O(n log n))',
            tieBreakers: ['Total Marks', 'Subject 1', 'Subject 2', 'Roll Number'],
            count: ranked.length,
            rankings: ranked
        });
        return;
    }

    // GET /api/stats (Dynamic Dashboard Statistics)
    if (pathname === '/api/stats' && method === 'GET') {
        const students = db.prepare('SELECT * FROM students').all();
        const count = students.length;

        if (count === 0) {
            return sendJson(200, {
                totalStudents: 0,
                averagePercentage: 0,
                highestMarks: 0,
                highestScorer: null,
                passRate: 0,
                gradeCounts: { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
            });
        }

        const totalSum = students.reduce((sum, s) => sum + s.total, 0);
        const avgPercentage = parseFloat(((totalSum / count) / 5.0).toFixed(2));
        const passCount = students.filter(s => s.percentage >= 50).length;
        const passRate = parseFloat(((passCount / count) * 100).toFixed(1));

        const ranked = computeCompetitionRankings(students);
        const highestScorer = ranked[0];

        const gradeCounts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
        students.forEach(s => {
            if (gradeCounts[s.grade] !== undefined) gradeCounts[s.grade]++;
        });

        // Subject averages
        const subTotals = [0, 0, 0, 0, 0];
        students.forEach(s => {
            subTotals[0] += s.subject1;
            subTotals[1] += s.subject2;
            subTotals[2] += s.subject3;
            subTotals[3] += s.subject4;
            subTotals[4] += s.subject5;
        });
        const subjectAverages = subTotals.map(t => parseFloat((t / count).toFixed(1)));

        sendJson(200, {
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
        });
        return;
    }

    // GET /api/hash-table (Visualizer State)
    if (pathname === '/api/hash-table' && method === 'GET') {
        const stats = hashTable.getStats();
        sendJson(200, { success: true, ...stats });
        return;
    }

    // GET /api/activities (Audit Logs)
    if (pathname === '/api/activities' && method === 'GET') {
        const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 25').all();
        sendJson(200, { success: true, activities: logs });
        return;
    }

    // POST /api/reset (Re-sync from dataset.csv)
    if (pathname === '/api/reset' && method === 'POST') {
        db.exec('DELETE FROM audit_logs;');
        const loaded = syncCSVToDatabase('reset');
        sendJson(200, { success: true, message: `Database re-synchronized with ${loaded} records from dataset.csv!` });
        return;
    }

    // =========================================================================
    // STATIC FILE SERVING
    // =========================================================================
    let reqUrl = pathname;
    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.join(__dirname, reqUrl);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 SRRMS Full-Stack Engine Online!`);
    console.log(`🔗 Dashboard: http://localhost:${PORT}`);
    console.log(`💾 Database: SQLite (database.sqlite) synced with dataset.csv`);
    console.log(`⚡ DSA: Hash Table M=31 (Chaining) + Custom Merge Sort O(n log n)`);
    console.log(`================================================================`);
});
