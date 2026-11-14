-- =====================================================================
-- Academic Tasks, Assignments & Deadline Tracker
-- Course : Database Management System Lab (CSE0612216S)
-- Engine : MySQL (XAMPP / phpMyAdmin)
-- Objects: 7 tables, 5 stored procedures, 3 views, triggers
-- =====================================================================

DROP DATABASE IF EXISTS academic_tracker;
CREATE DATABASE academic_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE academic_tracker;

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------
CREATE TABLE instructor (
    instructor_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    designation   VARCHAR(50)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE student (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(50)  NOT NULL,
    semester   INT          NOT NULL,
    CONSTRAINT chk_student_semester CHECK (semester BETWEEN 1 AND 12)
) ENGINE=InnoDB;

CREATE TABLE course (
    course_id     INT AUTO_INCREMENT PRIMARY KEY,
    course_code   VARCHAR(20)  NOT NULL UNIQUE,
    course_title  VARCHAR(150) NOT NULL,
    credits       DECIMAL(3,1) NOT NULL,
    instructor_id INT NOT NULL,
    CONSTRAINT chk_course_credits CHECK (credits > 0),
    CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id)
        REFERENCES instructor(instructor_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    course_id     INT NOT NULL,
    CONSTRAINT uq_enrollment UNIQUE (student_id, course_id),
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id)
        REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id)
        REFERENCES course(course_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_type (
    type_id   INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE task (
    task_id       INT AUTO_INCREMENT PRIMARY KEY,
    course_id     INT NOT NULL,
    type_id       INT NOT NULL,
    title         VARCHAR(150) NOT NULL,
    description   TEXT NULL,
    assigned_date DATE NOT NULL,
    due_date      DATE NOT NULL,
    max_marks     INT  NOT NULL,
    priority      ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
    CONSTRAINT chk_task_max_marks CHECK (max_marks > 0),
    CONSTRAINT fk_task_course FOREIGN KEY (course_id)
        REFERENCES course(course_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_task_type FOREIGN KEY (type_id)
        REFERENCES task_type(type_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE submission (
    submission_id   INT AUTO_INCREMENT PRIMARY KEY,
    task_id         INT NOT NULL,
    student_id      INT NOT NULL,
    submission_time DATETIME NULL,
    status          ENUM('Pending','Submitted','Late','Graded') NOT NULL DEFAULT 'Pending',
    marks_obtained  DECIMAL(6,2) NULL,
    remarks         VARCHAR(255) NULL,
    CONSTRAINT uq_submission UNIQUE (task_id, student_id),
    CONSTRAINT fk_submission_task FOREIGN KEY (task_id)
        REFERENCES task(task_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id)
        REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DELIMITER $$

-- Due date can never be earlier than the assigned date
CREATE TRIGGER trg_task_before_insert BEFORE INSERT ON task
FOR EACH ROW
BEGIN
    IF NEW.due_date < NEW.assigned_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Due date cannot be earlier than the assigned date';
    END IF;
END$$

CREATE TRIGGER trg_task_before_update BEFORE UPDATE ON task
FOR EACH ROW
BEGIN
    IF NEW.due_date < NEW.assigned_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Due date cannot be earlier than the assigned date';
    END IF;
END$$

-- A new task automatically creates a Pending submission row for every enrolled student
CREATE TRIGGER trg_task_after_insert AFTER INSERT ON task
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO submission (task_id, student_id, status)
    SELECT NEW.task_id, e.student_id, 'Pending'
    FROM enrollment e
    WHERE e.course_id = NEW.course_id;
END$$

-- A new enrollment automatically creates Pending submissions for existing tasks of that course
CREATE TRIGGER trg_enrollment_after_insert AFTER INSERT ON enrollment
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO submission (task_id, student_id, status)
    SELECT t.task_id, NEW.student_id, 'Pending'
    FROM task t
    WHERE t.course_id = NEW.course_id;
END$$

-- Marks can never be negative or above the task's maximum marks
CREATE TRIGGER trg_submission_before_update BEFORE UPDATE ON submission
FOR EACH ROW
BEGIN
    DECLARE v_max INT;
    IF NEW.marks_obtained IS NOT NULL THEN
        IF NEW.marks_obtained < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot be negative';
        END IF;
        SELECT max_marks INTO v_max FROM task WHERE task_id = NEW.task_id;
        IF NEW.marks_obtained > v_max THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot exceed the maximum marks of the task';
        END IF;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- STORED PROCEDURES
-- ---------------------------------------------------------------------

-- Instructor creates a task
CREATE PROCEDURE sp_create_task(
    IN p_course_id     INT,
    IN p_type_id       INT,
    IN p_title         VARCHAR(150),
    IN p_description   TEXT,
    IN p_assigned_date DATE,
    IN p_due_date      DATE,
    IN p_max_marks     INT,
    IN p_priority      VARCHAR(10)
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM course WHERE course_id = p_course_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM task_type WHERE type_id = p_type_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Task type does not exist';
    END IF;
    IF p_max_marks IS NULL OR p_max_marks <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Maximum marks must be greater than zero';
    END IF;
    IF p_priority NOT IN ('Low','Medium','High') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Priority must be Low, Medium or High';
    END IF;

    INSERT INTO task (course_id, type_id, title, description, assigned_date, due_date, max_marks, priority)
    VALUES (p_course_id, p_type_id, p_title, p_description, p_assigned_date, p_due_date, p_max_marks, p_priority);

    SELECT LAST_INSERT_ID() AS task_id;
END$$

-- Student submits a task. Late submissions are marked automatically.
CREATE PROCEDURE sp_submit_task(IN p_task_id INT, IN p_student_id INT)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_due    DATE DEFAULT NULL;
    DECLARE v_new    VARCHAR(20);

    SELECT s.status, t.due_date INTO v_status, v_due
    FROM submission s
    JOIN task t ON t.task_id = s.task_id
    WHERE s.task_id = p_task_id AND s.student_id = p_student_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is not enrolled in the course of this task';
    END IF;
    IF v_status = 'Graded' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This task is already graded';
    END IF;
    IF v_status IN ('Submitted','Late') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This task is already submitted';
    END IF;

    IF NOW() >= DATE_ADD(v_due, INTERVAL 1 DAY) THEN
        SET v_new = 'Late';
    ELSE
        SET v_new = 'Submitted';
    END IF;

    UPDATE submission
    SET submission_time = NOW(), status = v_new
    WHERE task_id = p_task_id AND student_id = p_student_id;

    SELECT v_new AS status;
END$$

-- Instructor grades a submitted task with marks and remarks
CREATE PROCEDURE sp_grade_task(
    IN p_task_id    INT,
    IN p_student_id INT,
    IN p_marks      DECIMAL(6,2),
    IN p_remarks    VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    SELECT status INTO v_status
    FROM submission
    WHERE task_id = p_task_id AND student_id = p_student_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Submission record not found';
    END IF;
    IF v_status = 'Pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot grade a task that has not been submitted';
    END IF;

    UPDATE submission
    SET marks_obtained = p_marks, remarks = p_remarks, status = 'Graded'
    WHERE task_id = p_task_id AND student_id = p_student_id;

    SELECT 'Graded' AS status;
END$$

-- Pending tasks of one student with days left / days overdue
CREATE PROCEDURE sp_pending_tasks(IN p_student_id INT)
BEGIN
    SELECT t.task_id, c.course_code, c.course_title, tt.type_name, t.title,
           t.due_date, t.max_marks, t.priority, s.status,
           DATEDIFF(t.due_date, CURDATE()) AS days_left
    FROM submission s
    JOIN task t       ON t.task_id  = s.task_id
    JOIN course c     ON c.course_id = t.course_id
    JOIN task_type tt ON tt.type_id = t.type_id
    WHERE s.student_id = p_student_id AND s.status = 'Pending'
    ORDER BY t.due_date;
END$$

-- Every task of every course the student is enrolled in, sorted by due date
CREATE PROCEDURE sp_student_tasks(IN p_student_id INT)
BEGIN
    SELECT t.task_id, c.course_code, c.course_title, tt.type_name, t.title,
           t.description, t.assigned_date, t.due_date, t.max_marks, t.priority,
           s.status, s.submission_time, s.marks_obtained, s.remarks,
           DATEDIFF(t.due_date, CURDATE()) AS days_left
    FROM submission s
    JOIN task t       ON t.task_id  = s.task_id
    JOIN course c     ON c.course_id = t.course_id
    JOIN task_type tt ON tt.type_id = t.type_id
    WHERE s.student_id = p_student_id
    ORDER BY t.due_date;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------
CREATE VIEW v_upcoming_deadlines AS
SELECT s.student_id, st.full_name AS student_name, t.task_id, c.course_code,
       t.title, tt.type_name, t.due_date, t.max_marks, t.priority,
       DATEDIFF(t.due_date, CURDATE()) AS days_left
FROM submission s
JOIN student st   ON st.student_id = s.student_id
JOIN task t       ON t.task_id = s.task_id
JOIN course c     ON c.course_id = t.course_id
JOIN task_type tt ON tt.type_id = t.type_id
WHERE s.status = 'Pending' AND t.due_date >= CURDATE();

CREATE VIEW v_overdue_tasks AS
SELECT s.student_id, st.full_name AS student_name, t.task_id, c.course_code,
       t.title, tt.type_name, t.due_date, t.max_marks, t.priority,
       DATEDIFF(CURDATE(), t.due_date) AS days_overdue
FROM submission s
JOIN student st   ON st.student_id = s.student_id
JOIN task t       ON t.task_id = s.task_id
JOIN course c     ON c.course_id = t.course_id
JOIN task_type tt ON tt.type_id = t.type_id
WHERE s.status = 'Pending' AND t.due_date < CURDATE();

CREATE VIEW v_leaderboard AS
SELECT st.student_id, st.full_name,
       ROUND(COALESCE(AVG(CASE WHEN s.status = 'Graded'
                               THEN s.marks_obtained / t.max_marks * 100 END), 0), 2) AS avg_percentage,
       CAST(COALESCE(SUM(s.status = 'Graded'), 0) AS SIGNED) AS completed_tasks,
       CAST(COALESCE(SUM(s.submission_time IS NOT NULL
                         AND s.submission_time >= DATE_ADD(t.due_date, INTERVAL 1 DAY)), 0) AS SIGNED) AS late_submissions
FROM student st
LEFT JOIN submission s ON s.student_id = st.student_id
LEFT JOIN task t       ON t.task_id = s.task_id
GROUP BY st.student_id, st.full_name
ORDER BY avg_percentage DESC, completed_tasks DESC, late_submissions ASC;

-- ---------------------------------------------------------------------
-- SAMPLE DATA
-- ---------------------------------------------------------------------
INSERT INTO instructor (full_name, email, designation) VALUES
('Tania Akter Setu',      'tania.setu@uits.edu.bd',   'Assistant Professor'),
('Dr. Mahfida Amjad Dipa','mahfida.dipa@uits.edu.bd', 'Lecturer'),
('Rahim Uddin',           'rahim.uddin@uits.edu.bd',  'Lecturer');

INSERT INTO student (full_name, email, department, semester) VALUES
('Zabin Tashnim Chowdhury', 'zabin.tashnim@student.uits.edu.bd', 'CSE', 3),
('Zulin Tashnin Chowdhury', 'zulin.tashnin@student.uits.edu.bd', 'CSE', 3),
('Aurthy Afia Anjum',       'aurthy.afia@student.uits.edu.bd',   'CSE', 3),
('Sabbir Hossain',          'sabbir.hossain@student.uits.edu.bd','CSE', 3),
('Nusrat Jahan',            'nusrat.jahan@student.uits.edu.bd',  'CSE', 3);

INSERT INTO course (course_code, course_title, credits, instructor_id) VALUES
('CSE0612216S', 'Database Management System Lab', 1.5, 2),
('CSE0611101',  'Data Structures',                3.0, 1),
('CSE0613203',  'Object Oriented Programming',    3.0, 3);

INSERT INTO task_type (type_name) VALUES
('Assignment'),('Quiz'),('Project'),('Lab Report'),('Presentation'),('Exam');

INSERT INTO enrollment (student_id, course_id) VALUES
(1,1),(2,1),(3,1),(4,1),(5,1),
(1,2),(2,2),(3,2),
(1,3),(4,3),(5,3);

-- Dates are relative to today, so Upcoming / Overdue always show data.
-- The trigger creates a Pending submission for every enrolled student.
INSERT INTO task (course_id, type_id, title, description, assigned_date, due_date, max_marks, priority) VALUES
(1, 4, 'Lab Report 1 - ER Diagram',  'Submit the ER diagram of your project',  DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 20, 'High'),
(1, 3, 'DBMS Final Project',         'MySQL project with report and demo',      DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 15 DAY), 50, 'High'),
(1, 2, 'SQL Joins Quiz',             'Quiz on joins and subqueries',            CURDATE(),                            DATE_ADD(CURDATE(), INTERVAL 3 DAY),  10, 'Medium'),
(2, 1, 'Linked List Assignment',     'Implement a singly linked list',          DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY),  15, 'Medium'),
(2, 6, 'Data Structures Mid Exam',   'Syllabus: arrays to trees',               CURDATE(),                            DATE_ADD(CURDATE(), INTERVAL 7 DAY),  30, 'High'),
(3, 5, 'OOP Concept Presentation',   'Presentation on inheritance',             DATE_SUB(CURDATE(), INTERVAL 3 DAY),  DATE_ADD(CURDATE(), INTERVAL 10 DAY), 20, 'Low'),
(3, 1, 'OOP Assignment 1',           'Classes and objects problems',            DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY),  15, 'Medium');

-- Some submissions already submitted / graded (historical timestamps)
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 11 DAY), status = 'Graded',
       marks_obtained = 18, remarks = 'Well designed ER diagram' WHERE task_id = 1 AND student_id = 1;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 11 DAY), status = 'Graded',
       marks_obtained = 17, remarks = 'Good work' WHERE task_id = 1 AND student_id = 2;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 8 DAY), status = 'Graded',
       marks_obtained = 14, remarks = 'Submitted late' WHERE task_id = 1 AND student_id = 3;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 12 DAY), status = 'Graded',
       marks_obtained = 19, remarks = 'Excellent' WHERE task_id = 1 AND student_id = 5;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 3 DAY), status = 'Graded',
       marks_obtained = 13, remarks = 'Good logic' WHERE task_id = 4 AND student_id = 1;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 1 DAY), status = 'Late',
       marks_obtained = NULL WHERE task_id = 4 AND student_id = 3;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 1 DAY), status = 'Submitted'
       WHERE task_id = 3 AND student_id = 1;
UPDATE submission SET submission_time = DATE_SUB(NOW(), INTERVAL 6 DAY), status = 'Graded',
       marks_obtained = 14, remarks = 'Nice' WHERE task_id = 7 AND student_id = 4;
