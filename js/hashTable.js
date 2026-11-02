/**
 * Student Ranking & Result Management System (SRRMS)
 * Custom Hash Table Implementation using Separate Chaining
 * 
 * DSA Concept:
 * A Hash Table provides O(1) average time complexity for Insert, Search,
 * Update, and Delete operations by mapping keys (Student Roll Numbers) to
 * bucket indices via a deterministic hash function: h(k) = k mod M.
 * 
 * Collisions (when multiple keys map to the same index) are resolved using
 * Separate Chaining, where each bucket holds a collection/chain of records.
 */

export class HashTable {
    /**
     * @param {number} size - Number of buckets in the hash table (Default: 31, a prime number to reduce clustering)
     */
    constructor(size = 31) {
        this.size = size;
        // Initialize an array of empty bucket chains
        this.buckets = Array.from({ length: size }, () => []);
        this.count = 0; // Total records stored
        this.insertionOrder = []; // Preserves exact insertion order (FIFO)
    }

    /**
     * Deterministic Hash Function
     * Time Complexity: O(1)
     * Maps an integer Roll Number (or string key) to a valid bucket index [0 ... size - 1].
     * 
     * @param {number|string} key - The student Roll Number
     * @returns {number} The calculated bucket index
     */
    hash(key) {
        if (typeof key === 'number') {
            return Math.abs(key) % this.size;
        }

        // Polynomial rolling hash for string keys
        const strKey = String(key).trim();
        let numericVal = parseInt(strKey, 10);
        if (!isNaN(numericVal)) {
            return Math.abs(numericVal) % this.size;
        }

        let hashValue = 0;
        const primeMultiplier = 31;
        for (let i = 0; i < strKey.length; i++) {
            hashValue = (hashValue * primeMultiplier + strKey.charCodeAt(i)) % this.size;
        }
        return Math.abs(hashValue);
    }

    /**
     * Insert a new Student record into the Hash Table
     * Time Complexity: O(1) average, O(n) worst case
     * 
     * @param {number|string} key - Student Roll Number
     * @param {Object} student - Student data object
     * @returns {{ success: boolean, message: string, bucketIndex?: number }}
     */
    insert(key, student) {
        const rollNo = parseInt(key, 10);
        if (isNaN(rollNo) || rollNo <= 0) {
            return { success: false, message: 'Invalid Roll Number. Must be a positive integer.' };
        }

        const bucketIndex = this.hash(rollNo);
        const bucket = this.buckets[bucketIndex];

        // Collision Check & Duplicate Prevention:
        // Traverse bucket chain to verify roll number doesn't already exist
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].rollNo === rollNo) {
                return {
                    success: false,
                    message: `Duplicate Roll Number! Student with Roll No ${rollNo} already exists in Bucket [${bucketIndex}].`
                };
            }
        }

        // Insert into bucket chain
        const studentRecord = { ...student, rollNo };
        bucket.push(studentRecord);
        this.count++;
        this.insertionOrder.push(rollNo);

        return {
            success: true,
            message: `Student successfully inserted into Bucket [${bucketIndex}].`,
            bucketIndex
        };
    }

    /**
     * Search for a Student by Roll Number with full telemetry trace for visualization
     * Time Complexity: O(1) average, O(n) worst case
     * 
     * @param {number|string} key - Student Roll Number
     * @returns {{
     *   found: boolean,
     *   student: Object|null,
     *   bucketIndex: number,
     *   chainIndex: number,
     *   comparisons: number,
     *   steps: Array<{ step: string, detail: string, status: string }>
     * }}
     */
    search(key) {
        const rollNo = parseInt(key, 10);
        const steps = [];

        if (isNaN(rollNo)) {
            return {
                found: false,
                student: null,
                bucketIndex: -1,
                chainIndex: -1,
                comparisons: 0,
                steps: [{ step: 'Validation', detail: 'Invalid Roll Number input', status: 'error' }]
            };
        }

        // Step 1: Calculate Hash Index
        const bucketIndex = this.hash(rollNo);
        steps.push({
            step: 'Hash Calculation',
            detail: `h(${rollNo}) = |${rollNo}| mod ${this.size} = Bucket [${bucketIndex}]`,
            status: 'info'
        });

        const bucket = this.buckets[bucketIndex];
        let comparisons = 0;

        steps.push({
            step: 'Bucket Access',
            detail: `Navigated to Bucket [${bucketIndex}]. Chain contains ${bucket.length} node(s).`,
            status: 'info'
        });

        // Step 2: Linear search through separate chain
        for (let i = 0; i < bucket.length; i++) {
            comparisons++;
            const current = bucket[i];

            if (current.rollNo === rollNo) {
                steps.push({
                    step: 'Key Match Found',
                    detail: `Comparison #${comparisons}: Chain item [${i}] RollNo (${current.rollNo}) matches target (${rollNo}).`,
                    status: 'success'
                });

                return {
                    found: true,
                    student: current,
                    bucketIndex,
                    chainIndex: i,
                    comparisons,
                    steps
                };
            } else {
                steps.push({
                    step: 'Chain Traversal',
                    detail: `Comparison #${comparisons}: Chain item [${i}] RollNo (${current.rollNo}) != target (${rollNo}). Moving to next node.`,
                    status: 'warning'
                });
            }
        }

        // Not found
        steps.push({
            step: 'Search Exhausted',
            detail: `Target Roll Number ${rollNo} not found after ${comparisons} comparison(s) in Bucket [${bucketIndex}].`,
            status: 'error'
        });

        return {
            found: false,
            student: null,
            bucketIndex,
            chainIndex: -1,
            comparisons,
            steps
        };
    }

    /**
     * Update an existing Student's marks and attributes
     * Time Complexity: O(1) average, O(n) worst case
     * 
     * @param {number|string} key - Student Roll Number
     * @param {Object} updatedData - New student attributes
     * @returns {{ success: boolean, message: string, student?: Object }}
     */
    update(key, updatedData) {
        const rollNo = parseInt(key, 10);
        const bucketIndex = this.hash(rollNo);
        const bucket = this.buckets[bucketIndex];

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].rollNo === rollNo) {
                bucket[i] = { ...bucket[i], ...updatedData, rollNo };
                return {
                    success: true,
                    message: `Student Roll No ${rollNo} updated successfully in Bucket [${bucketIndex}].`,
                    student: bucket[i]
                };
            }
        }

        return {
            success: false,
            message: `Student with Roll Number ${rollNo} not found.`
        };
    }

    /**
     * Delete a Student record from the Hash Table
     * Time Complexity: O(1) average, O(n) worst case
     * 
     * @param {number|string} key - Student Roll Number
     * @returns {{ success: boolean, message: string, deletedStudent?: Object }}
     */
    delete(key) {
        const rollNo = parseInt(key, 10);
        const bucketIndex = this.hash(rollNo);
        const bucket = this.buckets[bucketIndex];

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].rollNo === rollNo) {
                const [deletedStudent] = bucket.splice(i, 1);
                this.count--;

                // Remove from insertion sequence
                const orderIdx = this.insertionOrder.indexOf(rollNo);
                if (orderIdx !== -1) {
                    this.insertionOrder.splice(orderIdx, 1);
                }

                return {
                    success: true,
                    message: `Student Roll No ${rollNo} removed from Bucket [${bucketIndex}].`,
                    deletedStudent
                };
            }
        }

        return {
            success: false,
            message: `Student with Roll Number ${rollNo} was not found.`
        };
    }

    /**
     * Get total number of student records stored
     * @returns {number}
     */
    getCount() {
        return this.count;
    }

    /**
     * Retrieve all students in their exact insertion order (FIFO)
     * Time Complexity: O(n)
     * 
     * @returns {Array<Object>}
     */
    getAllStudents() {
        const all = [];
        for (const rollNo of this.insertionOrder) {
            const result = this.search(rollNo);
            if (result.found && result.student) {
                all.push(result.student);
            }
        }
        return all;
    }

    /**
     * Retrieve diagnostic performance statistics about the Hash Table
     * Used for dashboard widgets and visualizer metrics
     * 
     * @returns {{
     *   totalBuckets: number,
     *   occupiedBuckets: number,
     *   emptyBuckets: number,
     *   totalStudents: number,
     *   loadFactor: number,
     *   collisionCount: number,
     *   longestChain: number,
     *   collisionHandlingTechnique: string,
     *   hashFormula: string
     * }}
     */
    getStatistics() {
        let occupied = 0;
        let collisions = 0;
        let maxChain = 0;

        for (let i = 0; i < this.size; i++) {
            const chainLen = this.buckets[i].length;
            if (chainLen > 0) {
                occupied++;
                if (chainLen > 1) {
                    collisions += (chainLen - 1); // Extra elements in chain beyond the first
                }
                if (chainLen > maxChain) {
                    maxChain = chainLen;
                }
            }
        }

        const loadFactor = this.size > 0 ? (this.count / this.size) : 0;

        return {
            totalBuckets: this.size,
            occupiedBuckets: occupied,
            emptyBuckets: this.size - occupied,
            totalStudents: this.count,
            loadFactor: parseFloat(loadFactor.toFixed(2)),
            collisionCount: collisions,
            longestChain: maxChain,
            collisionHandlingTechnique: 'Separate Chaining (Bucket Array Chains)',
            hashFormula: `h(key) = |key| mod ${this.size}`
        };
    }

    /**
     * Clear and reset the hash table
     */
    clear() {
        this.buckets = Array.from({ length: this.size }, () => []);
        this.count = 0;
        this.insertionOrder = [];
    }
}
