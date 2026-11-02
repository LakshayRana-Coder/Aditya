/**
 * Student Ranking & Result Management System (SRRMS)
 * Data Model, Grading Standards, and LocalStorage Persistence
 */

export const SUBJECT_NAMES = [
    'Data Structures & Algorithms',
    'Database Management Systems',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering'
];

export const DEPARTMENTS = [
    'Computer Science',
    'Information Technology',
    'Electronics & Comm.',
    'Mechanical Engg.',
    'Civil Engg.'
];

export const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export const STORAGE_KEYS = {
    STUDENTS: 'srrms_students_v2',
    ACTIVITIES: 'srrms_activities_v2'
};

/**
 * Calculate Grade from Percentage based on documented academic rubric:
 *   90% and above     : A+
 *   80% to below 90%  : A
 *   70% to below 80%  : B
 *   60% to below 70%  : C
 *   50% to below 60%  : D
 *   Below 50%         : F (Fail)
 * 
 * @param {number} percentage
 * @returns {string} Letter grade
 */
export function getGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}

/**
 * Get Grade Points (0 - 10 scale)
 * @param {string} grade 
 * @returns {number}
 */
export function getGradePoints(grade) {
    switch (grade) {
        case 'A+': return 10.0;
        case 'A':  return 9.0;
        case 'B':  return 8.0;
        case 'C':  return 7.0;
        case 'D':  return 6.0;
        default:   return 0.0;
    }
}

/**
 * Validate and calculate student academic performance aggregates
 * Total Marks = Sum of 5 subject marks (Max: 500)
 * Percentage  = (Total Marks / 500) * 100
 * 
 * @param {Array<number>} marks - Array of 5 subject marks (0-100 each)
 * @returns {{
 *   total: number,
 *   percentage: number,
 *   grade: string,
 *   result: string,
 *   gradePoints: number
 * }}
 */
export function calculateStudentStats(marks) {
    const validMarks = marks.map(m => {
        const val = Number(m);
        return isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
    });

    const total = validMarks.reduce((acc, curr) => acc + curr, 0);
    const percentage = parseFloat(((total / 500) * 100).toFixed(2));
    const grade = getGrade(percentage);
    const result = percentage >= 50 ? 'PASS' : 'FAIL';
    const gradePoints = getGradePoints(grade);

    return {
        total,
        percentage,
        grade,
        result,
        gradePoints
    };
}

/**
 * Seed dataset of 104 realistic students pre-loaded with marks and departments
 */
export const SEED_STUDENTS = [
    { rollNo: 213, name: 'ADIDI', department: 'Computer Science', semester: '3rd', marks: [43, 99, 99, 99, 99] },
    { rollNo: 101, name: 'Aditya Sharma', department: 'Information Technology', semester: '4th', marks: [9, 99, 99, 99, 9] },
    { rollNo: 102, name: 'Diya Patel', department: 'Electronics & Comm.', semester: '5th', marks: [94, 96, 92, 95, 98] },
    { rollNo: 103, name: 'Rahul Verma', department: 'Mechanical Engg.', semester: '6th', marks: [75, 80, 72, 85, 78] },
    { rollNo: 104, name: 'Sneha Reddy', department: 'Civil Engg.', semester: '3rd', marks: [88, 84, 90, 86, 92] },
    { rollNo: 105, name: 'Aarav Gupta', department: 'Computer Science', semester: '4th', marks: [95, 91, 94, 88, 92] },
    { rollNo: 106, name: 'Ananya Iyer', department: 'Information Technology', semester: '5th', marks: [90, 92, 88, 95, 95] },
    { rollNo: 107, name: 'Vikram Malhotra', department: 'Electronics & Comm.', semester: '6th', marks: [68, 72, 70, 75, 65] },
    { rollNo: 108, name: 'Pooja Joshi', department: 'Mechanical Engg.', semester: '3rd', marks: [82, 85, 80, 84, 89] },
    { rollNo: 109, name: 'Rohan Nair', department: 'Civil Engg.', semester: '4th', marks: [78, 82, 85, 80, 75] },
    { rollNo: 110, name: 'Ishita Sen', department: 'Computer Science', semester: '5th', marks: [91, 89, 93, 87, 90] },
    { rollNo: 111, name: 'Karan Singh', department: 'Information Technology', semester: '6th', marks: [60, 65, 58, 62, 70] },
    { rollNo: 112, name: 'Meera Das', department: 'Electronics & Comm.', semester: '3rd', marks: [88, 86, 84, 90, 82] },
    { rollNo: 113, name: 'Siddharth Jain', department: 'Mechanical Engg.', semester: '4th', marks: [98, 97, 99, 96, 98] },
    { rollNo: 114, name: 'Kavya Kapoor', department: 'Civil Engg.', semester: '5th', marks: [94, 96, 92, 95, 98] },
    { rollNo: 115, name: 'Nikhil Bhatia', department: 'Computer Science', semester: '6th', marks: [70, 75, 68, 72, 80] },
    { rollNo: 116, name: 'Riya Bhatia', department: 'Information Technology', semester: '3rd', marks: [82, 56, 56, 75, 58] },
    { rollNo: 117, name: 'Varun Saxena', department: 'Electronics & Comm.', semester: '4th', marks: [62, 85, 75, 58, 87] },
    { rollNo: 118, name: 'Tanvi Bansal', department: 'Mechanical Engg.', semester: '5th', marks: [61, 62, 74, 65, 68] },
    { rollNo: 119, name: 'Kunal Choudhury', department: 'Civil Engg.', semester: '6th', marks: [62, 75, 51, 89, 78] },
    { rollNo: 120, name: 'Neha Chauhan', department: 'Computer Science', semester: '3rd', marks: [69, 57, 54, 84, 89] },
    { rollNo: 121, name: 'Siddharth Mishra', department: 'Information Technology', semester: '4th', marks: [76, 52, 84, 57, 94] },
    { rollNo: 122, name: 'Shreya Pandey', department: 'Electronics & Comm.', semester: '5th', marks: [83, 75, 59, 52, 65] },
    { rollNo: 123, name: 'Harsh Tiwari', department: 'Mechanical Engg.', semester: '6th', marks: [78, 90, 50, 76, 89] },
    { rollNo: 124, name: 'Anjali Yadav', department: 'Civil Engg.', semester: '3rd', marks: [86, 68, 57, 51, 52] },
    { rollNo: 125, name: 'Aman Agarwal', department: 'Computer Science', semester: '4th', marks: [88, 80, 55, 62, 87] },
    { rollNo: 126, name: 'Simran Pillai', department: 'Information Technology', semester: '5th', marks: [64, 81, 57, 52, 79] },
    { rollNo: 127, name: 'Pranav Menon', department: 'Electronics & Comm.', semester: '6th', marks: [75, 52, 70, 84, 80] },
    { rollNo: 128, name: 'Divya Bhatt', department: 'Mechanical Engg.', semester: '3rd', marks: [60, 50, 67, 63, 53] },
    { rollNo: 129, name: 'Yash Trivedi', department: 'Civil Engg.', semester: '4th', marks: [85, 53, 72, 50, 89] },
    { rollNo: 130, name: 'Priya Banerjee', department: 'Computer Science', semester: '5th', marks: [71, 75, 74, 50, 90] },
    { rollNo: 131, name: 'Deepak Deshmukh', department: 'Information Technology', semester: '6th', marks: [50, 50, 53, 82, 51] },
    { rollNo: 132, name: 'Swati Kulkarni', department: 'Electronics & Comm.', semester: '3rd', marks: [94, 95, 72, 68, 80] },
    { rollNo: 133, name: 'Gaurav Shinde', department: 'Mechanical Engg.', semester: '4th', marks: [52, 68, 56, 71, 88] },
    { rollNo: 134, name: 'Pallavi More', department: 'Civil Engg.', semester: '5th', marks: [76, 69, 64, 94, 78] },
    { rollNo: 135, name: 'Abhishek Patil', department: 'Computer Science', semester: '6th', marks: [86, 50, 93, 96, 66] },
    { rollNo: 136, name: 'Sakshi Hegde', department: 'Information Technology', semester: '3rd', marks: [84, 57, 55, 72, 66] },
    { rollNo: 137, name: 'Rohit Gowda', department: 'Electronics & Comm.', semester: '4th', marks: [88, 57, 56, 60, 78] },
    { rollNo: 138, name: 'Megha Bhat', department: 'Mechanical Engg.', semester: '5th', marks: [75, 98, 87, 82, 85] },
    { rollNo: 139, name: 'Tarun Kamath', department: 'Civil Engg.', semester: '6th', marks: [64, 77, 98, 81, 51] },
    { rollNo: 140, name: 'Kriti Prabhu', department: 'Computer Science', semester: '3rd', marks: [66, 95, 51, 60, 63] },
    { rollNo: 141, name: 'Manish Jain', department: 'Information Technology', semester: '4th', marks: [51, 60, 79, 70, 54] },
    { rollNo: 142, name: 'Komal Ghosh', department: 'Electronics & Comm.', semester: '5th', marks: [98, 55, 55, 65, 65] },
    { rollNo: 143, name: 'Rishabh Roy', department: 'Mechanical Engg.', semester: '6th', marks: [86, 90, 50, 52, 91] },
    { rollNo: 144, name: 'Jyoti Banerjee', department: 'Civil Engg.', semester: '3rd', marks: [93, 61, 95, 91, 63] },
    { rollNo: 145, name: 'Kartik Dutta', department: 'Computer Science', semester: '4th', marks: [76, 81, 80, 59, 64] },
    { rollNo: 146, name: 'Shalini Mukherjee', department: 'Information Technology', semester: '5th', marks: [58, 51, 61, 95, 98] },
    { rollNo: 147, name: 'Ayush Chatterjee', department: 'Electronics & Comm.', semester: '6th', marks: [88, 56, 93, 59, 64] },
    { rollNo: 148, name: 'Ritu Bose', department: 'Mechanical Engg.', semester: '3rd', marks: [77, 77, 84, 55, 79] },
    { rollNo: 149, name: 'Mayank Dey', department: 'Civil Engg.', semester: '4th', marks: [69, 93, 71, 67, 97] },
    { rollNo: 150, name: 'Preeti Saha', department: 'Computer Science', semester: '5th', marks: [72, 76, 96, 89, 56] },
    { rollNo: 151, name: 'Vivek Sharma', department: 'Information Technology', semester: '6th', marks: [55, 50, 58, 96, 85] },
    { rollNo: 152, name: 'Akanksha Patel', department: 'Electronics & Comm.', semester: '3rd', marks: [69, 78, 69, 56, 94] },
    { rollNo: 153, name: 'Sameer Verma', department: 'Mechanical Engg.', semester: '4th', marks: [97, 93, 58, 66, 76] },
    { rollNo: 154, name: 'Payal Reddy', department: 'Civil Engg.', semester: '5th', marks: [80, 96, 90, 86, 63] },
    { rollNo: 155, name: 'Alok Gupta', department: 'Computer Science', semester: '6th', marks: [66, 75, 89, 62, 93] },
    { rollNo: 156, name: 'Sonali Iyer', department: 'Information Technology', semester: '3rd', marks: [82, 59, 63, 61, 90] },
    { rollNo: 157, name: 'Mohit Malhotra', department: 'Electronics & Comm.', semester: '4th', marks: [81, 54, 70, 89, 93] },
    { rollNo: 158, name: 'Aarti Joshi', department: 'Mechanical Engg.', semester: '5th', marks: [88, 96, 96, 72, 93] },
    { rollNo: 159, name: 'Rajat Nair', department: 'Civil Engg.', semester: '6th', marks: [97, 57, 78, 60, 81] },
    { rollNo: 160, name: 'Shruti Sen', department: 'Computer Science', semester: '3rd', marks: [74, 84, 55, 89, 67] },
    { rollNo: 161, name: 'Akash Singh', department: 'Information Technology', semester: '4th', marks: [75, 85, 59, 75, 88] },
    { rollNo: 162, name: 'Rashmi Das', department: 'Electronics & Comm.', semester: '5th', marks: [78, 59, 95, 52, 52] },
    { rollNo: 163, name: 'Harish Rao', department: 'Mechanical Engg.', semester: '6th', marks: [60, 65, 58, 64, 63] },
    { rollNo: 164, name: 'Bhavna Mehta', department: 'Civil Engg.', semester: '3rd', marks: [93, 73, 68, 72, 87] },
    { rollNo: 165, name: 'Tushar Kapoor', department: 'Computer Science', semester: '4th', marks: [82, 98, 67, 91, 65] },
    { rollNo: 166, name: 'Barkha Bhatia', department: 'Information Technology', semester: '5th', marks: [58, 95, 79, 80, 68] },
    { rollNo: 167, name: 'Suraj Saxena', department: 'Electronics & Comm.', semester: '6th', marks: [96, 53, 73, 93, 65] },
    { rollNo: 168, name: 'Nandini Bansal', department: 'Mechanical Engg.', semester: '3rd', marks: [95, 93, 93, 50, 64] },
    { rollNo: 169, name: 'Chetan Choudhury', department: 'Civil Engg.', semester: '4th', marks: [78, 50, 93, 70, 83] },
    { rollNo: 170, name: 'Dolly Chauhan', department: 'Computer Science', semester: '5th', marks: [82, 98, 64, 96, 86] },
    { rollNo: 171, name: 'Bhavik Mishra', department: 'Information Technology', semester: '6th', marks: [51, 66, 82, 52, 83] },
    { rollNo: 172, name: 'Vandana Pandey', department: 'Electronics & Comm.', semester: '3rd', marks: [75, 67, 66, 60, 79] },
    { rollNo: 173, name: 'Akhil Tiwari', department: 'Mechanical Engg.', semester: '4th', marks: [81, 79, 65, 82, 54] },
    { rollNo: 174, name: 'Radhika Yadav', department: 'Civil Engg.', semester: '5th', marks: [56, 91, 64, 97, 67] },
    { rollNo: 175, name: 'Dev Agarwal', department: 'Computer Science', semester: '6th', marks: [50, 78, 67, 57, 58] },
    { rollNo: 176, name: 'Mansi Pillai', department: 'Information Technology', semester: '3rd', marks: [81, 55, 96, 58, 82] },
    { rollNo: 177, name: 'Lokesh Menon', department: 'Electronics & Comm.', semester: '4th', marks: [59, 81, 81, 92, 67] },
    { rollNo: 178, name: 'Chetna Bhatt', department: 'Mechanical Engg.', semester: '5th', marks: [80, 70, 70, 59, 88] },
    { rollNo: 179, name: 'Sunil Trivedi', department: 'Civil Engg.', semester: '6th', marks: [77, 76, 82, 70, 82] },
    { rollNo: 180, name: 'Garima Banerjee', department: 'Computer Science', semester: '3rd', marks: [97, 84, 61, 65, 76] },
    { rollNo: 181, name: 'Pankaj Deshmukh', department: 'Information Technology', semester: '4th', marks: [89, 83, 65, 78, 86] },
    { rollNo: 182, name: 'Chhavi Kulkarni', department: 'Electronics & Comm.', semester: '5th', marks: [72, 98, 74, 92, 52] },
    { rollNo: 183, name: 'Sachin Shinde', department: 'Mechanical Engg.', semester: '6th', marks: [70, 70, 58, 77, 69] },
    { rollNo: 184, name: 'Dimple More', department: 'Civil Engg.', semester: '3rd', marks: [50, 96, 72, 65, 73] },
    { rollNo: 185, name: 'Vishal Patil', department: 'Computer Science', semester: '4th', marks: [85, 70, 54, 59, 89] },
    { rollNo: 186, name: 'Karishma Hegde', department: 'Information Technology', semester: '5th', marks: [72, 94, 96, 74, 60] },
    { rollNo: 187, name: 'Jatin Gowda', department: 'Electronics & Comm.', semester: '6th', marks: [96, 93, 81, 81, 91] },
    { rollNo: 188, name: 'Madhu Bhat', department: 'Mechanical Engg.', semester: '3rd', marks: [74, 65, 53, 55, 94] },
    { rollNo: 189, name: 'Kapil Kamath', department: 'Civil Engg.', semester: '4th', marks: [80, 95, 77, 57, 68] },
    { rollNo: 190, name: 'Monika Prabhu', department: 'Computer Science', semester: '5th', marks: [56, 68, 55, 50, 81] },
    { rollNo: 191, name: 'Girish Jain', department: 'Information Technology', semester: '6th', marks: [51, 61, 94, 90, 90] },
    { rollNo: 192, name: 'Nupur Ghosh', department: 'Electronics & Comm.', semester: '3rd', marks: [69, 79, 56, 88, 64] },
    { rollNo: 193, name: 'Bharat Roy', department: 'Mechanical Engg.', semester: '4th', marks: [76, 52, 50, 81, 54] },
    { rollNo: 194, name: 'Prachi Banerjee', department: 'Civil Engg.', semester: '5th', marks: [75, 88, 75, 85, 94] },
    { rollNo: 195, name: 'Amit Dutta', department: 'Computer Science', semester: '6th', marks: [83, 93, 67, 69, 92] },
    { rollNo: 196, name: 'Anita Mukherjee', department: 'Information Technology', semester: '3rd', marks: [88, 91, 96, 89, 82] },
    { rollNo: 197, name: 'Ashish Chatterjee', department: 'Electronics & Comm.', semester: '4th', marks: [54, 89, 95, 91, 59] },
    { rollNo: 198, name: 'Shivani Bose', department: 'Mechanical Engg.', semester: '5th', marks: [84, 97, 89, 89, 71] },
    { rollNo: 199, name: 'Lalit Dey', department: 'Civil Engg.', semester: '6th', marks: [94, 59, 63, 90, 67] },
    { rollNo: 200, name: 'Juhi Saha', department: 'Computer Science', semester: '3rd', marks: [78, 95, 94, 52, 91] },
    { rollNo: 201, name: 'Aditya', department: 'Information Technology', semester: '4th', marks: [21, 34, 11, 89, 6] },
    { rollNo: 202, name: 'Varun Reddy', department: 'Electronics & Comm.', semester: '5th', marks: [88, 92, 95, 90, 85] },
    { rollNo: 203, name: 'Rohan Mehta', department: 'Mechanical Engg.', semester: '6th', marks: [80, 85, 90, 88, 92] }
];

/**
 * Load student records from LocalStorage or seed defaults if empty
 * @returns {Array<Object>}
 */
export function loadStoredStudents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(s => {
                    const stats = calculateStudentStats(s.marks);
                    return { ...s, ...stats };
                });
            }
        }
    } catch (e) {
        console.warn('Failed to parse students from LocalStorage:', e);
    }

    // Initialize with seed data if LocalStorage is empty
    const processedSeeds = SEED_STUDENTS.map(s => {
        const stats = calculateStudentStats(s.marks);
        return { ...s, ...stats };
    });
    saveStoredStudents(processedSeeds);
    return processedSeeds;
}

/**
 * Save student records to LocalStorage
 * @param {Array<Object>} students 
 */
export function saveStoredStudents(students) {
    try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (e) {
        console.error('Failed to save students to LocalStorage:', e);
    }
}

/**
 * Load recent activity logs
 * @returns {Array<Object>}
 */
export function loadActivities() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Failed to load activities:', e);
    }

    // Default welcome activities
    return [
        {
            id: 'act-1',
            type: 'system',
            title: 'System Initialized',
            description: 'SRRMS Hash Table & Merge Sort engines online with 104 student records loaded.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ];
}

/**
 * Record a new action into Recent Activities
 * @param {'insert'|'update'|'delete'|'search'|'system'} type 
 * @param {string} title 
 * @param {string} description 
 */
export function addActivity(type, title, description) {
    const activities = loadActivities();
    const newActivity = {
        id: 'act-' + Date.now(),
        type,
        title,
        description,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    activities.unshift(newActivity);
    // Keep last 30 activities
    if (activities.length > 30) {
        activities.pop();
    }

    try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    } catch (e) {
        console.error('Failed to save activity:', e);
    }

    return newActivity;
}
