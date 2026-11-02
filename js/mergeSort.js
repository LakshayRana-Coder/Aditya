/**
 * Student Ranking & Result Management System (SRRMS)
 * Custom Merge Sort Implementation for Student Academic Ranking
 * 
 * DSA Concept:
 * Merge Sort is a divide-and-conquer, stable sorting algorithm.
 * Time Complexity:
 *   - Best Case:    O(n log n)
 *   - Average Case: O(n log n)
 *   - Worst Case:   O(n log n)
 * Space Complexity: O(n) auxiliary memory
 * 
 * Recurrence Relation:
 *   T(n) = 2T(n/2) + O(n) ==> O(n log n) by Master Theorem
 * 
 * Stability:
 * Crucial for multi-criteria academic ranking to maintain consistent relative orders.
 */

/**
 * Academic Tie-Breaking Comparator Function:
 * 1. Primary: Higher Total Marks (Descending)
 * 2. Secondary: Higher marks in Subject 1 (Descending)
 * 3. Tertiary: Higher marks in Subject 2 (Descending)
 * 4. Quaternary: Lower Roll Number (Ascending - deterministic final tie-breaker)
 * 
 * @param {Object} a - First student
 * @param {Object} b - Second student
 * @returns {number} Negative if a should precede b, Positive if b should precede a, 0 if identical
 */
export function studentComparator(a, b) {
    // 1. Total marks descending
    if (b.total !== a.total) {
        return b.total - a.total;
    }

    // 2. Higher marks in Subject 1 (index 0)
    const aSub1 = (a.marks && a.marks[0] !== undefined) ? a.marks[0] : 0;
    const bSub1 = (b.marks && b.marks[0] !== undefined) ? b.marks[0] : 0;
    if (bSub1 !== aSub1) {
        return bSub1 - aSub1;
    }

    // 3. Higher marks in Subject 2 (index 1)
    const aSub2 = (a.marks && a.marks[1] !== undefined) ? a.marks[1] : 0;
    const bSub2 = (b.marks && b.marks[1] !== undefined) ? b.marks[1] : 0;
    if (bSub2 !== aSub2) {
        return bSub2 - aSub2;
    }

    // 4. Lower Roll Number as deterministic tie-breaker (Ascending)
    return a.rollNo - b.rollNo;
}

/**
 * Merge two sorted sub-arrays into a single sorted array
 * Time Complexity: O(n)
 * 
 * @param {Array<Object>} left - Left sorted sub-array
 * @param {Array<Object>} right - Right sorted sub-array
 * @param {Function} comparator - Comparison function
 * @returns {Array<Object>} Merged sorted array
 */
function merge(left, right, comparator) {
    const result = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
        // If comparator(left[i], right[j]) <= 0, left[i] comes first
        if (comparator(left[i], right[j]) <= 0) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }

    // Append remaining elements from left or right
    while (i < left.length) {
        result.push(left[i]);
        i++;
    }
    while (j < right.length) {
        result.push(right[j]);
        j++;
    }

    return result;
}

/**
 * Custom Recursive Merge Sort
 * Time Complexity: O(n log n) in all cases
 * Space Complexity: O(n)
 * 
 * @param {Array<Object>} items - Array of student records to sort
 * @param {Function} comparator - Comparison function
 * @returns {Array<Object>} Fresh sorted array
 */
export function customMergeSort(items, comparator = studentComparator) {
    // Base case: list of 0 or 1 elements is already sorted
    if (!items || items.length <= 1) {
        return items ? [...items] : [];
    }

    const mid = Math.floor(items.length / 2);
    const leftHalf = items.slice(0, mid);
    const rightHalf = items.slice(mid);

    const sortedLeft = customMergeSort(leftHalf, comparator);
    const sortedRight = customMergeSort(rightHalf, comparator);

    return merge(sortedLeft, sortedRight, comparator);
}

/**
 * Generate official Competition Rankings for a list of students
 * Rules:
 * - Students are sorted using Custom Merge Sort (O(n log n))
 * - Students with equal total marks receive the same rank
 * - The subsequent rank skips accordingly (Standard 1224 Competition Ranking)
 * 
 * @param {Array<Object>} students - Array of student records
 * @returns {Array<Object>} Ranked students with .rank property assigned
 */
export function generateCompetitionRankings(students) {
    if (!students || students.length === 0) {
        return [];
    }

    // Sort using our custom merge sort
    const sortedStudents = customMergeSort(students, studentComparator);

    // Assign competition ranks
    let prevTotal = -1;
    let currentRank = 1;

    for (let i = 0; i < sortedStudents.length; i++) {
        const student = { ...sortedStudents[i] };
        const position = i + 1; // 1-based index

        if (i === 0) {
            currentRank = 1;
        } else {
            if (student.total !== prevTotal) {
                currentRank = position; // Skip ranks based on competition scheme
            }
            // else total is identical to previous, so currentRank remains the same
        }

        prevTotal = student.total;
        student.rank = currentRank;
        sortedStudents[i] = student;
    }

    return sortedStudents;
}
