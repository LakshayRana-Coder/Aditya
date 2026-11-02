/**
 * ============================================================================
 * Student Ranking & Result Management System (SRRMS)
 * Client-Side DSA Engine: Separate-Chaining Hash Table & Custom Merge Sort
 * ============================================================================
 */

export const SUBJECT_NAMES = [
    'Data Structures & Algorithms',
    'Database Management Systems',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering'
];

export const DEPARTMENTS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering'
];

export const SEMESTERS = [
    'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
    'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
];

/**
 * Academic Metric Calculators
 */
export function calculateAcademicMetrics(marks) {
    const valid = marks.map(m => Math.max(0, Math.min(100, parseInt(m, 10) || 0)));
    const total = valid.reduce((a, b) => a + b, 0);
    const percentage = parseFloat((total / 5.0).toFixed(2));
    let grade = 'F';
    let gradePoint = 0.0;

    if (percentage >= 90) { grade = 'A+'; gradePoint = 10.0; }
    else if (percentage >= 80) { grade = 'A'; gradePoint = 9.0; }
    else if (percentage >= 70) { grade = 'B'; gradePoint = 8.0; }
    else if (percentage >= 60) { grade = 'C'; gradePoint = 7.0; }
    else if (percentage >= 50) { grade = 'D'; gradePoint = 6.0; }

    const result = percentage >= 50 ? 'PASS' : 'FAIL';

    return { total, percentage, grade, gradePoint, result, validMarks: valid };
}

/**
 * Custom Hash Table with Separate Chaining
 */
export class HashTable {
    constructor(size = 31) {
        this.size = size;
        this.buckets = Array.from({ length: size }, () => []);
        this.count = 0;
        this.insertionOrder = [];
    }

    hash(rollNo) {
        return Math.abs(parseInt(rollNo, 10)) % this.size;
    }

    insert(rollNo, student) {
        const roll = parseInt(rollNo, 10);
        const bucketIndex = this.hash(roll);
        const bucket = this.buckets[bucketIndex];

        // Check duplicates
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].roll_no === roll || bucket[i].rollNo === roll) {
                return { success: false, message: `Duplicate Roll Number: ${roll} already exists!` };
            }
        }

        const normalized = {
            ...student,
            roll_no: roll,
            rollNo: roll
        };

        bucket.push(normalized);
        this.count++;
        this.insertionOrder.push(roll);
        return { success: true, bucketIndex, student: normalized };
    }

    search(rollNo) {
        const roll = parseInt(rollNo, 10);
        const steps = [];

        if (isNaN(roll)) {
            return {
                found: false,
                student: null,
                bucketIndex: -1,
                chainIndex: -1,
                comparisons: 0,
                steps: [{ step: 'Validation', detail: 'Invalid numeric Roll Number input', status: 'error' }]
            };
        }

        const bucketIndex = this.hash(roll);
        steps.push({
            step: 'Hash Function',
            detail: `h(${roll}) = |${roll}| mod ${this.size} = Bucket [${bucketIndex}]`,
            status: 'info'
        });

        const bucket = this.buckets[bucketIndex];
        let comparisons = 0;

        steps.push({
            step: 'Bucket Access',
            detail: `Inspecting Bucket [${bucketIndex}]. Chain depth: ${bucket.length} node(s).`,
            status: 'info'
        });

        for (let i = 0; i < bucket.length; i++) {
            comparisons++;
            const currentRoll = bucket[i].roll_no !== undefined ? bucket[i].roll_no : bucket[i].rollNo;

            if (currentRoll === roll) {
                steps.push({
                    step: 'Target Matched',
                    detail: `Comparison #${comparisons}: Chain item [${i}] RollNo (${currentRoll}) matches target (${roll}).`,
                    status: 'success'
                });
                return {
                    found: true,
                    student: bucket[i],
                    bucketIndex,
                    chainIndex: i,
                    comparisons,
                    steps
                };
            } else {
                steps.push({
                    step: 'Chain Traverse',
                    detail: `Comparison #${comparisons}: Chain item [${i}] RollNo (${currentRoll}) != target (${roll}). Advancing to next pointer.`,
                    status: 'warning'
                });
            }
        }

        steps.push({
            step: 'Target Not Found',
            detail: `Exhausted ${comparisons} chain node(s) in Bucket [${bucketIndex}]. Roll Number ${roll} does not exist.`,
            status: 'error'
        });

        return { found: false, student: null, bucketIndex, chainIndex: -1, comparisons, steps };
    }

    update(rollNo, updatedData) {
        const roll = parseInt(rollNo, 10);
        const bucketIndex = this.hash(roll);
        const bucket = this.buckets[bucketIndex];

        for (let i = 0; i < bucket.length; i++) {
            const currentRoll = bucket[i].roll_no !== undefined ? bucket[i].roll_no : bucket[i].rollNo;
            if (currentRoll === roll) {
                bucket[i] = { ...bucket[i], ...updatedData, roll_no: roll, rollNo: roll };
                return { success: true, student: bucket[i] };
            }
        }
        return { success: false, message: `Student with Roll Number ${roll} not found.` };
    }

    delete(rollNo) {
        const roll = parseInt(rollNo, 10);
        const bucketIndex = this.hash(roll);
        const bucket = this.buckets[bucketIndex];

        for (let i = 0; i < bucket.length; i++) {
            const currentRoll = bucket[i].roll_no !== undefined ? bucket[i].roll_no : bucket[i].rollNo;
            if (currentRoll === roll) {
                const [deleted] = bucket.splice(i, 1);
                this.count--;
                const oIdx = this.insertionOrder.indexOf(roll);
                if (oIdx !== -1) this.insertionOrder.splice(oIdx, 1);
                return { success: true, student: deleted };
            }
        }
        return { success: false, message: `Student with Roll Number ${roll} not found.` };
    }

    getAllStudents() {
        const all = [];
        for (const r of this.insertionOrder) {
            const res = this.search(r);
            if (res.found && res.student) all.push(res.student);
        }
        return all;
    }

    getCount() {
        return this.count;
    }

    clear() {
        this.buckets = Array.from({ length: this.size }, () => []);
        this.count = 0;
        this.insertionOrder = [];
    }

    getStats() {
        let occupied = 0;
        let collisions = 0;
        let longest = 0;

        for (let i = 0; i < this.size; i++) {
            const len = this.buckets[i].length;
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
            totalStudents: this.count,
            loadFactor: parseFloat((this.size > 0 ? this.count / this.size : 0).toFixed(2)),
            collisionCount: collisions,
            longestChain: longest,
            technique: 'Separate Chaining (Dynamic Bucket Arrays)',
            formula: `h(RollNo) = |RollNo| mod ${this.size}`
        };
    }
}

/**
 * Custom Recursive Merge Sort with 4-Tier Tie-Breaking
 * 1. Total Marks (Descending)
 * 2. Subject 1 Marks (Descending)
 * 3. Subject 2 Marks (Descending)
 * 4. Lower Roll Number (Ascending)
 */
export function studentComparator(a, b) {
    const aTotal = a.total !== undefined ? a.total : 0;
    const bTotal = b.total !== undefined ? b.total : 0;
    if (bTotal !== aTotal) return bTotal - aTotal;

    const aSub1 = a.subject1 !== undefined ? a.subject1 : (a.marks ? a.marks[0] : 0);
    const bSub1 = b.subject1 !== undefined ? b.subject1 : (b.marks ? b.marks[0] : 0);
    if (bSub1 !== aSub1) return bSub1 - aSub1;

    const aSub2 = a.subject2 !== undefined ? a.subject2 : (a.marks ? a.marks[1] : 0);
    const bSub2 = b.subject2 !== undefined ? b.subject2 : (b.marks ? b.marks[1] : 0);
    if (bSub2 !== aSub2) return bSub2 - aSub2;

    const aRoll = a.roll_no !== undefined ? a.roll_no : a.rollNo;
    const bRoll = b.roll_no !== undefined ? b.roll_no : b.rollNo;
    return aRoll - bRoll;
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

export function customMergeSort(items) {
    if (!items || items.length <= 1) return items ? [...items] : [];
    const mid = Math.floor(items.length / 2);
    const left = customMergeSort(items.slice(0, mid));
    const right = customMergeSort(items.slice(mid));
    return merge(left, right);
}

export function generateCompetitionRankings(students) {
    if (!students || students.length === 0) return [];
    const sorted = customMergeSort(students);
    let currentRank = 1;
    let prevTotal = -1;

    return sorted.map((s, idx) => {
        const item = { ...s };
        const total = item.total !== undefined ? item.total : 0;
        if (idx === 0) {
            currentRank = 1;
        } else {
            if (total !== prevTotal) {
                currentRank = idx + 1;
            }
        }
        prevTotal = total;
        item.rank = currentRank;
        return item;
    });
}
