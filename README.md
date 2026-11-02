# Product Requirements Document (PRD) & Master Manual
# Student Ranking & Result Management System (SRRMS)

**Document Version:** 4.0.0  
**Project Title:** Student Ranking & Result Management System (SRRMS Full-Stack Suite)  
**Target Academic Course:** Data Structures & Algorithms (College Project & Viva Voce Defense)  
**Database Backend:** Native SQLite 3 (`database.sqlite`) via Node.js v24 built-in `node:sqlite` (Zero external dependencies)  
**Dataset File:** `dataset.csv` (104 Student Records across 5 Engineering Departments & 8 Semesters, auto-synced)  
**Frontend Architecture:** Modern Obsidian Glassmorphic Academic Dashboard (HTML5, CSS3, Vanilla JS, Chart.js)  
**Core Algorithms:** Custom Separate-Chaining Hash Table ($O(1)$) & Custom Recursive Merge Sort ($O(n \log n)$)  

---

## 1. Executive Summary & Vision

The **Student Ranking & Result Management System (SRRMS)** is an institutional-grade academic records and ranking platform designed to bridge theoretical computer science data structures with real-world database systems and user interfaces.

The project demonstrates:
1. **Relational Database & Bidirectional CSV File Synchronization:** An embedded SQLite relational database (`database.sqlite`) maintains continuous two-way synchronization with an external CSV dataset named `dataset.csv`. Every record insertion, deletion, or marks update in the web interface is persisted transactionally to both SQLite and `dataset.csv`. Conversely, any manual additions, deletions, or edits made directly inside `dataset.csv` (via Excel, VS Code, or Notepad) are automatically detected in real time by the backend watcher and reflected immediately across all website views with zero latency.
2. **Instant Hash-Based Record Retrieval ($O(1)$ Average):** Direct roll number retrieval using a custom division-modulo Hash Table ($M=31$) with Separate Chaining, complete with live algorithmic telemetry and chain traversal tracing.
3. **Competition Ranking Engine ($O(n \log n)$):** A pure recursive Merge Sort implementation enforcing standard 1-2-2-4 competition ranking with a 4-tier tie-breaking hierarchy (Total Marks $\to$ Subject 1 $\to$ Subject 2 $\to$ Roll Number).
4. **Interactive Hash Structure Visualizer:** A 31-bucket visual array with interactive step-by-step trace simulation that highlights bucket resolution and chain node matches in real time.
5. **Institutional Grade Transcripts:** University-grade printable transcripts with automated GPA/Grade calculations, verification seals, and print stylesheet.

---

## 2. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│               Obsidian Glassmorphic UI (index.html)                    │
│   Dashboard • Students Directory • Hash Search • Enroll • Update Marks │
│   Rankings • Result Card • Analytics Reports • Hash Visualizer • About │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼ (HTTP / REST API)               ▼ (Offline Fallback)
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Node.js Full-Stack Server      │  │    Client-Side DSA Engine    │
│            (server.js)               │  │  (js/dsa.js / js/bundle.js)  │
│  • Built-in node:http                │  │  • HashTable M=31 (Chaining) │
│  • Built-in node:sqlite              │  │  • Custom Merge Sort O(nlogn)│
│  • Zero external npm dependencies    │  │  • Browser LocalStorage      │
└──────────────┬───────────────────────┘  └──────────────────────────────┘
               │
        ┌──────┴────────────────────────┐
        ▼                               ▼
┌────────────────────────┐    ┌────────────────────────┐
│ SQLite Database Engine │◄──►│ Persistent CSV Dataset │
│  (database.sqlite)     │    │     (dataset.csv)      │
│  • students table      │    │  • 104 Student Records │
│  • audit_logs table    │    │  • Auto-flushed on sync│
└────────────────────────┘    └────────────────────────┘
```

### 2.1 Backend Specifications (`server.js`)
- **Runtime:** Node.js (v24.x LTS).
- **Database Engine:** `node:sqlite` (`DatabaseSync`), storing records in `database.sqlite`.
- **Dataset File:** `dataset.csv` containing RollNo, Name, Department, Semester, 5 Subject Scores, Total, Percentage, and Grade.
- **Auto-Seed on Startup:** If SQLite is empty, it automatically parses `dataset.csv` and seeds the database.
- **Transactional Sync:** Every `POST /api/students`, `PUT /api/students/:rollNo`, or `DELETE /api/students/:rollNo` automatically flushes updated records back to `dataset.csv`.
- **REST Endpoints:**
  - `GET /api/health` - Database status, record count, and table metrics.
  - `GET /api/students` - Query students with optional `?search=`, `?department=`, `?semester=` filters.
  - `GET /api/students/:rollNo` - $O(1)$ Hash Table search with step-by-step telemetry and millisecond benchmark.
  - `POST /api/students` - Add new student with validation and duplicate roll prevention.
  - `PUT /api/students/:rollNo` - Update subject marks with delta tracking.
  - `DELETE /api/students/:rollNo` - Remove student and log deletion to audit trail.
  - `GET /api/rankings` - Competition leaderboard generated via Custom Merge Sort.
  - `GET /api/stats` - Cohort KPIs, top scorer, grade counts, and subject averages.
  - `GET /api/hash-table` - Bucket occupancy summary, collision count, and load factor ($\alpha$).
  - `GET /api/activities` - Recent audit log trail.
  - `POST /api/reset` - Re-seeds database from `dataset.csv`.

---

## 3. Sidebar Navigation & Module Breakdown

The web dashboard features 10 comprehensive modules accessible from the sidebar:

| # | View | Icon | Purpose & Technical Highlight |
|---|---|---|---|
| **1** | **Dashboard** | 🗂️ | Executive KPIs (Total Students, Class Avg, Highest Scorer, Rank 1 Champion), Top 5 Leaderboard, Hash Table Status Quad, Mini 31-cell bucket density track, and live Recent Activities audit stream. |
| **2** | **Students** | 👥 | Complete directory of 104 students. Features instant text search, Department filter, Semester filter, CSV dataset download (`dataset.csv`), database reset, and row-level actions (Transcript, Edit, Delete). |
| **3** | **Search Student** | 🔍 | Dual-mode search engine: Enter a numeric Roll Number for $O(1)$ Hash Table lookup with step-by-step diagnostic telemetry, or enter a student name for an $O(n)$ linear scan. |
| **4** | **Add Student** | ➕ | Academic enrollment form with live preview card. Validates positive roll numbers, rejects duplicates, and ensures all 5 marks are between 0 and 100. |
| **5** | **Update Marks** | ✏️ | Marks revision studio. Enter Roll Number to fetch candidate; live score delta calculator displays real-time difference (e.g. `+15 marks`) before committing changes. |
| **6** | **Rankings** | 🏆 | Official competition leaderboard powered by Custom Merge Sort. Renders Top 3 Podium (Gold 🥇, Silver 🥈, Bronze 🥉) and handles 1-2-2-4 competition rank ties. |
| **7** | **Result Card** | 📄 | University transcript generator with student selector dropdown. Formatted 5-subject marksheet with credits, GPA, signatures, and `@media print` styling for PDF generation. |
| **8** | **Reports** | 📊 | Chart.js visual analytics: Grade Distribution bar chart (`A+` through `F`), Subject Average bar chart, and Department Performance benchmark table. |
| **9** | **Data Structure (Hash)** | ⚡ | Interactive 31-bucket array visualizer. Features a Trace Simulator where entering any roll number highlights the target bucket and chain node in real time. |
| **10** | **About System** | ℹ️ | Algorithmic Big-O time and space complexity matrices, architectural breakdown, and Viva Voce defense cheat-sheet. |

---

## 4. Algorithmic Data Structures Implementation

### 4.1 Custom Separate-Chaining Hash Table (`HashTable`)
- **Bucket Array Capacity:** $M = 31$ (A prime number chosen to prevent harmonic key clustering with sequential roll numbers).
- **Hash Function:**
  $$h(k) = |k| \pmod{31}$$
- **Collision Resolution:** Separate Chaining with dynamic bucket arrays.
- **Time Complexity:**
  - **Search:** Average $O(1)$, Worst-case $O(n)$
  - **Insertion:** Average $O(1)$, Worst-case $O(n)$
  - **Deletion:** Average $O(1)$, Worst-case $O(n)$
  - **Load Factor ($\alpha$):** $\alpha = \frac{n}{M} = \frac{104}{31} \approx 3.35$

### 4.2 Custom Recursive Merge Sort (`customMergeSort`)
- **Paradigm:** Stable Divide-and-Conquer Sorting ($O(n \log n)$).
- **4-Tier Tie-Breaking Sequence:**
  1. **Primary:** Total Marks (Descending)
  2. **Secondary:** Subject 1 Marks (Data Structures)
  3. **Tertiary:** Subject 2 Marks (DBMS)
  4. **Quaternary:** Lower Roll Number (Ascending - deterministic tie-breaker)
- **Standard Competition Ranking (1-2-2-4):**
  If two students have identical total marks, they receive the same rank, and the subsequent rank skips accordingly.

---

## 5. Academic Grading Rubric

Each subject is evaluated out of 100 marks (Total: 500 Maximum Marks).

$$\text{Percentage} = \left(\frac{\text{Total Marks}}{500}\right) \times 100$$

| Percentage Range | Letter Grade | Grade Point | Academic Classification |
|---|:---:|:---:|---|
| **90.00% – 100.00%** | **A+** | 10.0 | Outstanding / First Class with Distinction |
| **80.00% – 89.99%** | **A** | 9.0 | Excellent / First Class |
| **70.00% – 79.99%** | **B** | 8.0 | Very Good / Second Class Upper |
| **60.00% – 69.99%** | **C** | 7.0 | Good / Second Class Lower |
| **50.00% – 59.99%** | **D** | 6.0 | Pass Division |
| **Below 50.00%** | **F** | 0.0 | Unsatisfactory / Failed |

---

## 6. How to Run the Application

### Option 1: 1-Click Launch on Windows (Recommended)
Double-click `start.bat` in the project root:
```cmd
start.bat
```
This automatically launches the Node.js backend server (`node server.js`) and opens `http://localhost:3000` in your default browser.

### Option 2: Running via Command Prompt or PowerShell
```powershell
cd c:\Aditya
node server.js
```
Then visit **`http://localhost:3000`** in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Option 3: Standalone Direct File Execution (Zero Server Needed)
Double-click `index.html` in File Explorer. The application detects the `file://` protocol and operates in client-side in-memory mode via `js/bundle.js` with full Hash Table and LocalStorage functionality.

---

## 7. College Viva Voce Defense Guide

**Q1: Why did you choose Separate Chaining over Linear Probing?**  
*Answer:* Separate chaining avoids primary clustering, where filled slots form contiguous blocks that degrade probe sequences to $O(n)$. It also makes deletions straightforward ($O(1)$ node removal from a chain) without requiring tombstone markers (`DELETED`).

**Q2: What is the significance of $M = 31$ in the hash function?**  
*Answer:* 31 is a prime number. In modular hashing $h(k) = k \bmod M$, if $M$ shares a common factor with key intervals (e.g. roll numbers incrementing by 2 or 5), all keys cluster into a subset of buckets. A prime $M$ guarantees $\gcd(k, M) = 1$, ensuring uniform dispersion across all buckets.

**Q3: How does your system synchronize SQLite and `dataset.csv`?**  
*Answer:* The system implements a full bidirectional live-sync engine. 
1. **Web to CSV:** When changes are made on the website (adding a student, updating marks, or deleting a student), SQLite executes the transaction and immediately serializes the updated rows to `dataset.csv`.
2. **CSV to Web:** When `dataset.csv` is edited directly outside the app (e.g. in Excel, VS Code, or Notepad), the server's file watcher (`fs.watchFile` + instant pre-request validation) detects the file change, validates the academic metrics, and reloads SQLite and the in-memory Hash Table atomically. The client browser polls `/api/version` and listens to `focus` events, automatically updating all dashboard views with zero delay.

**Q4: Why use Merge Sort instead of JavaScript's built-in `sort()` or Quick Sort?**  
*Answer:* `Merge Sort` guarantees $O(n \log n)$ performance in the worst case (unlike Quick Sort which degrades to $O(n^2)$ on sorted data). It is also naturally stable, ensuring that our secondary and tertiary tie-breakers (Subject 1, Subject 2, Roll Number) are preserved deterministically.
