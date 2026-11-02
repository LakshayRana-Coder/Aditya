#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <fstream>
#include <sstream>
#include <cmath>

#ifdef _WIN32
#include <windows.h>
#endif

using namespace std;

// Student structure to store student details
struct Student {
    int rollNo;
    string name;
    int marks[5];
    int total;
    double percentage;

    // Default constructor
    Student() {
        rollNo = 0;
        name = "";
        for (int i = 0; i < 5; i++) {
            marks[i] = 0;
        }
        total = 0;
        percentage = 0.0;
    }

    // Parameterized constructor
    Student(int r, string n, int m[5]) {
        rollNo = r;
        name = n;
        total = 0;
        for (int i = 0; i < 5; i++) {
            marks[i] = m[i];
            total += m[i];
        }
        percentage = (double)total / 5.0;
    }

    // Recalculate total and percentage after marks change
    void calculateResult() {
        total = 0;
        for (int i = 0; i < 5; i++) {
            total += marks[i];
        }
        percentage = (double)total / 5.0;
    }
};

// Letter grade helper
string getGrade(double percentage) {
    if (percentage >= 90.0) return "A+";
    if (percentage >= 80.0) return "A";
    if (percentage >= 70.0) return "B";
    if (percentage >= 60.0) return "C";
    if (percentage >= 50.0) return "D";
    return "F";
}

// Pass / Fail status helper
string getStatusBadge(double percentage) {
    if (percentage >= 50.0) return "PASS";
    return "FAIL";
}

// Format percentage with 2 decimal places and % symbol
string formatPercentage(double pct) {
    ostringstream oss;
    oss << fixed << setprecision(2) << pct << "%";
    return oss.str();
}

// Custom Hash Table using separate chaining
// Preserves insertion sequence so newly added records are placed at the very end
class HashTable {
private:
    int size;
    vector<vector<Student>> table;
    vector<int> studentOrder; // Preserves sequence of addition
    int studentCount;

    // Hash function: simple modulo on roll number
    int hashFunction(int rollNo) {
        return abs(rollNo) % size;
    }

public:
    HashTable(int s = 211) {
        size = s;
        table.resize(size);
        studentCount = 0;
    }

    // Time Complexity: O(1) average, O(n) worst case
    // Insert student record into hash table
    bool insert(Student s) {
        int idx = hashFunction(s.rollNo);

        // Check if roll no already exists
        for (size_t i = 0; i < table[idx].size(); i++) {
            if (table[idx][i].rollNo == s.rollNo) {
                return false;
            }
        }

        table[idx].push_back(s);
        studentOrder.push_back(s.rollNo);
        studentCount++;
        return true;
    }

    // Time Complexity: O(1) average, O(n) worst case
    // Search student by roll number
    Student* search(int rollNo) {
        int idx = hashFunction(rollNo);
        for (size_t i = 0; i < table[idx].size(); i++) {
            if (table[idx][i].rollNo == rollNo) {
                return &table[idx][i];
            }
        }
        return nullptr;
    }

    // Time Complexity: O(1) average, O(n) worst case
    // Update marks of an existing student
    bool update(int rollNo, int newMarks[5]) {
        Student* s = search(rollNo);
        if (s == nullptr) {
            return false;
        }

        for (int i = 0; i < 5; i++) {
            s->marks[i] = newMarks[i];
        }
        s->calculateResult();
        return true;
    }

    // Time Complexity: O(1) average, O(n) worst case
    // Remove student record by roll number
    bool remove(int rollNo) {
        int idx = hashFunction(rollNo);
        for (size_t i = 0; i < table[idx].size(); i++) {
            if (table[idx][i].rollNo == rollNo) {
                table[idx].erase(table[idx].begin() + i);
                studentCount--;

                for (size_t k = 0; k < studentOrder.size(); k++) {
                    if (studentOrder[k] == rollNo) {
                        studentOrder.erase(studentOrder.begin() + k);
                        break;
                    }
                }
                return true;
            }
        }
        return false;
    }

    // Time Complexity: O(n)
    // Return all students in addition order
    vector<Student> getAllStudents() {
        vector<Student> all;
        for (size_t i = 0; i < studentOrder.size(); i++) {
            Student* s = search(studentOrder[i]);
            if (s != nullptr) {
                all.push_back(*s);
            }
        }
        return all;
    }

    int getCount() {
        return studentCount;
    }

    void clear() {
        for (int i = 0; i < size; i++) {
            table[i].clear();
        }
        studentOrder.clear();
        studentCount = 0;
    }
};

// Custom Max Heap for ranking students based on total marks
class MaxHeap {
private:
    vector<Student> heap;

    int parent(int i) {
        return (i - 1) / 2;
    }

    int leftChild(int i) {
        return 2 * i + 1;
    }

    int rightChild(int i) {
        return 2 * i + 2;
    }

    // Time Complexity: O(log n)
    // Move up to restore heap property
    void heapifyUp(int index) {
        while (index > 0 && heap[parent(index)].total < heap[index].total) {
            Student temp = heap[index];
            heap[index] = heap[parent(index)];
            heap[parent(index)] = temp;
            index = parent(index);
        }
    }

    // Time Complexity: O(log n)
    // Move down to restore heap property
    void heapifyDown(int index) {
        int largest = index;
        int left = leftChild(index);
        int right = rightChild(index);

        if (left < (int)heap.size() && heap[left].total > heap[largest].total) {
            largest = left;
        }

        if (right < (int)heap.size() && heap[right].total > heap[largest].total) {
            largest = right;
        }

        if (largest != index) {
            Student temp = heap[index];
            heap[index] = heap[largest];
            heap[largest] = temp;
            heapifyDown(largest);
        }
    }

public:
    MaxHeap() {}

    // Time Complexity: O(log n)
    // Insert student into heap
    void insert(Student s) {
        heap.push_back(s);
        heapifyUp((int)heap.size() - 1);
    }

    // Time Complexity: O(n)
    // Build heap from student vector
    void heapify(const vector<Student>& students) {
        heap = students;
        for (int i = ((int)heap.size() / 2) - 1; i >= 0; i--) {
            heapifyDown(i);
        }
    }

    // Time Complexity: O(log n)
    // Extract student with maximum total marks
    Student extractMax() {
        if (heap.empty()) {
            return Student();
        }

        Student maxStudent = heap[0];
        heap[0] = heap.back();
        heap.pop_back();

        if (!heap.empty()) {
            heapifyDown(0);
        }

        return maxStudent;
    }

    bool isEmpty() {
        return heap.empty();
    }

    int size() {
        return (int)heap.size();
    }
};

// Global hash table instance with capacity 211
HashTable studentTable(211);

// Get absolute path to students.csv adjacent to the executable
string getDataFilePath() {
#ifdef _WIN32
    char buffer[MAX_PATH];
    DWORD len = GetModuleFileNameA(NULL, buffer, MAX_PATH);
    if (len > 0) {
        string exePath(buffer);
        size_t pos = exePath.find_last_of("\\/");
        if (pos != string::npos) {
            return exePath.substr(0, pos + 1) + "students.csv";
        }
    }
#endif
    return "students.csv";
}

// Helper function to validate mark input (0 to 100)
int getValidMark(const string& subjectName) {
    int mark;
    while (true) {
        cout << "  Enter marks for " << subjectName << " (0-100): ";
        if (cin >> mark) {
            if (mark >= 0 && mark <= 100) {
                return mark;
            } else {
                cout << "  Invalid marks. Please enter a value between 0 and 100.\n";
            }
        } else {
            cout << "  Invalid input. Please enter an integer.\n";
            cin.clear();
            cin.ignore(10000, '\n');
        }
    }
}

// Save records to students.csv with CSV header
bool saveRecordsToFile(bool verbose = true) {
    string filePath = getDataFilePath();
    ofstream outFile(filePath.c_str());
    if (!outFile.is_open()) {
        cout << "Error: Could not write to " << filePath << "\n";
        cout << "If the file is open in another program, please close it and try again.\n";
        return false;
    }

    outFile << "RollNo,Name,Subject1,Subject2,Subject3,Subject4,Subject5\n";

    vector<Student> students = studentTable.getAllStudents();
    for (size_t i = 0; i < students.size(); i++) {
        outFile << students[i].rollNo << ","
                << students[i].name << ","
                << students[i].marks[0] << ","
                << students[i].marks[1] << ","
                << students[i].marks[2] << ","
                << students[i].marks[3] << ","
                << students[i].marks[4] << "\n";
    }

    outFile.flush();
    outFile.close();
    if (verbose) {
        cout << "Records saved successfully.\n";
    }
    return true;
}

// Load records from students.csv on startup
void loadRecordsFromFile() {
    studentTable.clear();
    string filePath = getDataFilePath();
    ifstream inFile(filePath.c_str());
    if (!inFile.is_open()) {
        inFile.open("students.csv");
    }

    if (!inFile.is_open()) {
        return;
    }

    string line;
    while (getline(inFile, line)) {
        if (line.empty()) continue;

        // Skip CSV header line
        if (line.find("RollNo") != string::npos || line.find("roll") != string::npos) {
            continue;
        }

        stringstream ss(line);
        string item;
        vector<string> tokens;

        while (getline(ss, item, ',')) {
            while (!item.empty() && (item.back() == '\r' || item.back() == ' ' || item.back() == '\t')) {
                item.pop_back();
            }
            size_t start = 0;
            while (start < item.size() && (item[start] == ' ' || item[start] == '\t')) {
                start++;
            }
            if (start > 0) {
                item = item.substr(start);
            }
            tokens.push_back(item);
        }

        if (tokens.size() == 7) {
            try {
                int r = stoi(tokens[0]);
                string n = tokens[1];
                int m[5];
                for (int i = 0; i < 5; i++) {
                    m[i] = stoi(tokens[2 + i]);
                }
                studentTable.insert(Student(r, n, m));
            } catch (...) {
                // Ignore malformed lines
            }
        }
    }
    inFile.close();
}

// 1. Add Student
void addStudent() {
    cout << "\n----------------------------------------------------------------------------------------\n";
    cout << "                                      ADD STUDENT                                       \n";
    cout << "----------------------------------------------------------------------------------------\n";

    int rollNo;
    cout << "Enter Roll Number: ";
    if (!(cin >> rollNo)) {
        cout << "Invalid roll number.\n";
        cin.clear();
        cin.ignore(10000, '\n');
        return;
    }

    if (rollNo <= 0) {
        cout << "Roll number must be a positive integer.\n";
        cin.ignore(10000, '\n');
        return;
    }

    if (studentTable.search(rollNo) != nullptr) {
        cout << "Student with Roll Number " << rollNo << " already exists.\n";
        cin.ignore(10000, '\n');
        return;
    }

    string name;
    cout << "Enter Student Name: ";
    cin >> ws;
    getline(cin, name);

    int marks[5];
    for (int i = 0; i < 5; i++) {
        string subName = "Subject " + to_string(i + 1);
        marks[i] = getValidMark(subName);
    }

    Student newStudent(rollNo, name, marks);
    studentTable.insert(newStudent);

    cout << "\nStudent added successfully.\n";

    // Auto-save silently to students.csv
    saveRecordsToFile(false);
}

// 2. Update Student Marks
void updateStudentMarks() {
    cout << "\n----------------------------------------------------------------------------------------\n";
    cout << "                                  UPDATE STUDENT MARKS                                  \n";
    cout << "----------------------------------------------------------------------------------------\n";

    int rollNo;
    cout << "Enter Roll Number: ";
    if (!(cin >> rollNo)) {
        cout << "Invalid roll number.\n";
        cin.clear();
        cin.ignore(10000, '\n');
        return;
    }

    Student* s = studentTable.search(rollNo);
    if (s == nullptr) {
        cout << "Student not found.\n";
        return;
    }

    cout << "Student: " << s->name << " (Roll No: " << s->rollNo << ")\n";
    cout << "Current Marks: [" << s->marks[0] << ", " << s->marks[1] << ", "
         << s->marks[2] << ", " << s->marks[3] << ", " << s->marks[4] << "]\n";
    cout << "Total: " << s->total << " / 500 (" << formatPercentage(s->percentage) << ")\n\n";

    int newMarks[5];
    for (int i = 0; i < 5; i++) {
        string subName = "Subject " + to_string(i + 1);
        newMarks[i] = getValidMark(subName);
    }

    studentTable.update(rollNo, newMarks);
    cout << "\nMarks updated successfully.\n";

    saveRecordsToFile(false);
}

// 3. Search Student
void searchStudent() {
    cout << "\n----------------------------------------------------------------------------------------\n";
    cout << "                                     SEARCH STUDENT                                     \n";
    cout << "----------------------------------------------------------------------------------------\n";

    int rollNo;
    cout << "Enter Roll Number: ";
    if (!(cin >> rollNo)) {
        cout << "Invalid roll number.\n";
        cin.clear();
        cin.ignore(10000, '\n');
        return;
    }

    Student* s = studentTable.search(rollNo);
    if (s == nullptr) {
        cout << "Student not found.\n";
        return;
    }

    cout << "\n----------------------------------------------------------------------------------------\n";
    cout << "                                     STUDENT RECORD                                     \n";
    cout << "----------------------------------------------------------------------------------------\n";
    cout << "  Roll Number  : " << left << setw(28) << s->rollNo
         << "Total Marks : " << s->total << " / 500\n";
    cout << "  Student Name : " << left << setw(28) << s->name
         << "Percentage  : " << formatPercentage(s->percentage) << "\n";
    cout << "  Grade        : " << left << setw(28) << getGrade(s->percentage)
         << "Result      : " << getStatusBadge(s->percentage) << "\n";
    cout << "----------------------------------------------------------------------------------------\n";
    cout << "  Subject Marks:\n";
    for (int i = 0; i < 5; i++) {
        cout << "    - Subject " << (i + 1) << " : " << setw(3) << s->marks[i] << " / 100\n";
    }
    cout << "----------------------------------------------------------------------------------------\n";
}

// 4. Delete Student
void deleteStudent() {
    cout << "\n----------------------------------------------------------------------------------------\n";
    cout << "                                     DELETE STUDENT                                     \n";
    cout << "----------------------------------------------------------------------------------------\n";

    int rollNo;
    cout << "Enter Roll Number: ";
    if (!(cin >> rollNo)) {
        cout << "Invalid roll number.\n";
        cin.clear();
        cin.ignore(10000, '\n');
        return;
    }

    Student* s = studentTable.search(rollNo);
    if (s == nullptr) {
        cout << "Student not found.\n";
        return;
    }

    cout << "Are you sure you want to delete '" << s->name << "' (Roll No: " << s->rollNo << ")? (y/n): ";
    char confirm;
    cin >> confirm;

    if (confirm == 'y' || confirm == 'Y') {
        studentTable.remove(rollNo);
        cout << "Student deleted successfully.\n";
        saveRecordsToFile(false);
    } else {
        cout << "Operation cancelled.\n";
    }
}

// 5. Display All Students
void displayAllStudents() {
    vector<Student> students = studentTable.getAllStudents();
    if (students.empty()) {
        cout << "\nNo student records available.\n";
        return;
    }

    cout << "\n=============================================================================================================\n";
    cout << "                                             ALL STUDENT RECORDS                                             \n";
    cout << "=============================================================================================================\n";
    cout << left << setw(7)  << "No."
         << setw(10) << "Roll No"
         << setw(26) << "Name"
         << setw(6)  << "Sub1"
         << setw(6)  << "Sub2"
         << setw(6)  << "Sub3"
         << setw(6)  << "Sub4"
         << setw(6)  << "Sub5"
         << setw(8)  << "Total"
         << setw(14) << "Percentage"
         << setw(8)  << "Grade"
         << setw(8)  << "Status" << "\n";
    cout << "-------------------------------------------------------------------------------------------------------------\n";

    for (size_t i = 0; i < students.size(); i++) {
        string grade = getGrade(students[i].percentage);
        string status = getStatusBadge(students[i].percentage);

        cout << left << setw(7)  << (to_string(i + 1) + ".")
             << setw(10) << students[i].rollNo
             << setw(26) << students[i].name
             << setw(6)  << students[i].marks[0]
             << setw(6)  << students[i].marks[1]
             << setw(6)  << students[i].marks[2]
             << setw(6)  << students[i].marks[3]
             << setw(6)  << students[i].marks[4]
             << setw(8)  << students[i].total
             << setw(14) << formatPercentage(students[i].percentage)
             << setw(8)  << grade
             << setw(8)  << status << "\n";
    }
    cout << "=============================================================================================================\n";
    cout << "Total Students: " << students.size() << "\n";
}

// 6. Display Full Ranking
void displayRanking() {
    vector<Student> students = studentTable.getAllStudents();
    if (students.empty()) {
        cout << "\nNo student records available.\n";
        return;
    }

    MaxHeap heap;
    heap.heapify(students);

    cout << "\n=============================================================================================================\n";
    cout << "                                            STUDENT RANKING LIST                                             \n";
    cout << "=============================================================================================================\n";
    cout << left << setw(8)  << "Rank"
         << setw(10) << "Roll No"
         << setw(28) << "Name"
         << setw(10) << "Total"
         << setw(14) << "Percentage"
         << setw(8)  << "Grade"
         << setw(20) << "Result" << "\n";
    cout << "-------------------------------------------------------------------------------------------------------------\n";

    int itemsProcessed = 0;
    int prevTotal = -1;
    int currentRank = 1;

    while (!heap.isEmpty()) {
        Student s = heap.extractMax();
        itemsProcessed++;

        // Ties receive identical ranks
        if (itemsProcessed == 1) {
            currentRank = 1;
        } else {
            if (s.total != prevTotal) {
                currentRank = itemsProcessed;
            }
        }
        prevTotal = s.total;

        cout << left << setw(8)  << currentRank
             << setw(10) << s.rollNo
             << setw(28) << s.name
             << setw(10) << s.total
             << setw(14) << formatPercentage(s.percentage)
             << setw(8)  << getGrade(s.percentage)
             << setw(20) << getStatusBadge(s.percentage) << "\n";
    }
    cout << "=============================================================================================================\n";
}

// 7. Display Top 10 Students
void displayTop10() {
    vector<Student> students = studentTable.getAllStudents();
    if (students.empty()) {
        cout << "\nNo student records available.\n";
        return;
    }

    MaxHeap originalHeap;
    originalHeap.heapify(students);

    MaxHeap heapCopy = originalHeap;

    cout << "\n=============================================================================================================\n";
    cout << "                                              TOP 10 STUDENTS                                                \n";
    cout << "=============================================================================================================\n";
    cout << left << setw(8)  << "Rank"
         << setw(10) << "Roll No"
         << setw(28) << "Name"
         << setw(10) << "Total"
         << setw(14) << "Percentage"
         << setw(8)  << "Grade"
         << setw(20) << "Result" << "\n";
    cout << "-------------------------------------------------------------------------------------------------------------\n";

    int itemsProcessed = 0;
    int prevTotal = -1;
    int currentRank = 1;
    int limit = 10;
    if ((int)students.size() < limit) {
        limit = (int)students.size();
    }

    for (int i = 0; i < limit; i++) {
        Student s = heapCopy.extractMax();
        itemsProcessed++;

        if (itemsProcessed == 1) {
            currentRank = 1;
        } else {
            if (s.total != prevTotal) {
                currentRank = itemsProcessed;
            }
        }
        prevTotal = s.total;

        cout << left << setw(8)  << currentRank
             << setw(10) << s.rollNo
             << setw(28) << s.name
             << setw(10) << s.total
             << setw(14) << formatPercentage(s.percentage)
             << setw(8)  << getGrade(s.percentage)
             << setw(20) << getStatusBadge(s.percentage) << "\n";
    }
    cout << "=============================================================================================================\n";
}

// 8. Class Academic Statistics
void displayClassStats() {
    vector<Student> students = studentTable.getAllStudents();
    if (students.empty()) {
        cout << "\nNo student records available.\n";
        return;
    }

    int totalMarksSum = 0;
    Student highest = students[0];
    Student lowest = students[0];

    int countA_Plus = 0, countA = 0, countB = 0, countC = 0, countD = 0, countF = 0;
    int passCount = 0;

    for (size_t i = 0; i < students.size(); i++) {
        totalMarksSum += students[i].total;
        if (students[i].total > highest.total) highest = students[i];
        if (students[i].total < lowest.total) lowest = students[i];

        if (students[i].percentage >= 90.0) countA_Plus++;
        else if (students[i].percentage >= 80.0) countA++;
        else if (students[i].percentage >= 70.0) countB++;
        else if (students[i].percentage >= 60.0) countC++;
        else if (students[i].percentage >= 50.0) countD++;
        else countF++;

        if (students[i].percentage >= 50.0) passCount++;
    }

    double avgTotal = (double)totalMarksSum / (double)students.size();
    double avgPercentage = avgTotal / 5.0;
    double passRate = ((double)passCount / (double)students.size()) * 100.0;

    cout << "\n========================================================================================\n";
    cout << "                                    CLASS STATISTICS                                    \n";
    cout << "========================================================================================\n";
    cout << "  Total Students Enrolled  : " << students.size() << "\n";
    cout << fixed << setprecision(2);
    cout << "  Class Average Total      : " << avgTotal << " / 500\n";
    cout << "  Class Average Percentage : " << avgPercentage << " %\n";
    cout << "  Overall Pass Rate        : " << passRate << " % (" << passCount << " Passed, "
         << (students.size() - passCount) << " Failed)\n";
    cout << "----------------------------------------------------------------------------------------\n";
    cout << "  Highest Total Marks      : " << highest.total << " / 500 ("
         << formatPercentage(highest.percentage) << ") - " << highest.name << " (Roll: " << highest.rollNo << ")\n";
    cout << "  Lowest Total Marks       : " << lowest.total << " / 500 ("
         << formatPercentage(lowest.percentage) << ") - " << lowest.name << " (Roll: " << lowest.rollNo << ")\n";
    cout << "----------------------------------------------------------------------------------------\n";
    cout << "  Grade Distribution:\n";

    auto printGradeStat = [&](string gradeLabel, int count) {
        double pct = ((double)count / (double)students.size()) * 100.0;
        cout << "    - " << left << setw(24) << gradeLabel << ": "
             << right << setw(3) << count << " students ("
             << fixed << setprecision(1) << setw(5) << pct << "%)\n";
    };

    printGradeStat("Grade A+ (90% - 100%)", countA_Plus);
    printGradeStat("Grade A  (80% -  89%)", countA);
    printGradeStat("Grade B  (70% -  79%)", countB);
    printGradeStat("Grade C  (60% -  69%)", countC);
    printGradeStat("Grade D  (50% -  59%)", countD);
    printGradeStat("Grade F  (< 50%)", countF);
    cout << "========================================================================================\n";
}

// Menu display
void showMenu() {
    cout << "\n========================================================================================\n";
    cout << "                      STUDENT RANKING AND RESULT MANAGEMENT SYSTEM                      \n";
    cout << "========================================================================================\n";
    cout << "  1. Add Student                            6. Display Full Ranking\n";
    cout << "  2. Update Student Marks                   7. Display Top 10 Students\n";
    cout << "  3. Search Student                         8. Display Class Statistics\n";
    cout << "  4. Delete Student                         9. Save Records to File\n";
    cout << "  5. Display All Students                  10. Exit\n";
    cout << "========================================================================================\n";
    cout << "Enter your choice (1-10): ";
}

int main() {
    // Load existing records from CSV
    loadRecordsFromFile();

    int choice = 0;
    while (choice != 10) {
        showMenu();
        if (!(cin >> choice)) {
            cout << "Invalid choice. Please enter a number between 1 and 10.\n";
            cin.clear();
            cin.ignore(10000, '\n');
            continue;
        }

        switch (choice) {
            case 1:
                addStudent();
                break;
            case 2:
                updateStudentMarks();
                break;
            case 3:
                searchStudent();
                break;
            case 4:
                deleteStudent();
                break;
            case 5:
                displayAllStudents();
                break;
            case 6:
                displayRanking();
                break;
            case 7:
                displayTop10();
                break;
            case 8:
                displayClassStats();
                break;
            case 9:
                saveRecordsToFile(true);
                break;
            case 10:
                cout << "\nSaving records before exiting...\n";
                saveRecordsToFile(false);
                cout << "Goodbye!\n\n";
                break;
            default:
                cout << "Invalid choice. Please select between 1 and 10.\n";
                break;
        }
    }

    return 0;
}
