import java.awt.Desktop;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Scanner;
import java.util.Set;

// ============================================================
// SMART CLINIC MANAGEMENT SYSTEM
// Software Construction & Development Project
// ============================================================

public class SmartClinicManagement {

    static Scanner scanner = new Scanner(System.in);
    static int adminFailedAttempts = 0;
    static Set<Integer> paidBillIds = new HashSet<>();
    static Map<Integer, String> appointmentStatuses = new HashMap<>();
    static List<String> cancelledAppointmentsLog = new ArrayList<>();

    // ---- UI COLOURS (ANSI escape codes) ----------------------
    static final String RESET  = "\u001B[0m";
    static final String RED    = "\u001B[91m";
    static final String GREEN  = "\u001B[92m";
    static final String YELLOW = "\u001B[93m";
    static final String BLUE   = "\u001B[94m";
    static final String CYAN   = "\u001B[96m";
    static final String BOLD   = "\u001B[1m";

    // Lists used by the system
    static List<Doctor> doctors = new ArrayList<>();
    static List<Patient> patients = new ArrayList<>();
    static List<Appointment> appointments = new ArrayList<>();
    static List<Prescription> prescriptions = new ArrayList<>();
    static List<MedicalRecord> medicalRecords = new ArrayList<>();
    static List<Bill> bills = new ArrayList<>();

    static int patientIdCounter = 1001;
    static int doctorIdCounter = 101;
    static int appointmentIdCounter = 5001;
    static int prescriptionIdCounter = 7001;
    static int recordIdCounter = 8001;
    static int billIdCounter = 9001;

    static final String ADMIN_USER = "admin";
    static final String ADMIN_PASS = "admin123";
    static final int MAX_LOGIN_ATTEMPTS = 3;

    // ============================================================
    // MAIN METHOD
    // ============================================================

    public static void main(String[] args) {

        loadSampleData();

        boolean cliMode = false;
        for (String arg : args) {
            if ("--cli".equalsIgnoreCase(arg)) {
                cliMode = true;
            }
        }

        if (!cliMode) {
            int port = 8080;
            for (int i = 0; i < args.length - 1; i++) {
                if ("--port".equalsIgnoreCase(args[i])) {
                    try {
                        port = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            startWebServer(port);
            return;
        }

        welcomeScreen();

        while (true) {

            printHeader();

            printMenuItem(1, "Admin Login");
            printMenuItem(2, "Doctor Login");
            printMenuItem(3, "Receptionist Menu");
            printMenuItem(4, "Patient Registration");
            printMenuItem(5, "View Doctors");
            printMenuItem(6, "Exit");

            int choice = getIntInRange("  Enter your choice: ", 1, 6);

            try {

            switch (choice) {

                case 1:
                    adminLogin();
                    break;

                case 2:
                    doctorLogin();
                    break;

                case 3:
                    receptionistMenu();
                    break;

                case 4:
                    registerPatient();
                    break;

                case 5:
                    viewDoctors();
                    break;

                case 6:
                    printSection("GOOD BYE");
                    System.out.println("   " + GREEN + "Thank you for using Smart Clinic Management System." + RESET);
                    System.out.println("   " + CYAN + "Program closed successfully. Stay healthy!" + RESET);
                    pause();
                    scanner.close();
                    return;

                default:
                    showError("Invalid option selected. Please choose between 1 and 6.");
            }

            } catch (Exception e) {
                handleUnexpected(e);
            }
        }
    }

    // ============================================================
    // UI HELPERS
    // ============================================================

    static void welcomeScreen() {

        clearScreen();
        printHeader();

        System.out.println("   " + CYAN + "Welcome! Please select an option below." + RESET);
        System.out.println("   " + YELLOW + "Tip: Admin credentials -> admin / admin123" + RESET);
        System.out.println();
    }

    static void printHeader() {

        System.out.println();
        System.out.println(BLUE + "   +" + repeat('=', 58) + "+" + RESET);
        System.out.println(BLUE + "   |" + RESET + BOLD + CYAN
                + center("SMART CLINIC MANAGEMENT SYSTEM", 58) + RESET + BLUE + "|" + RESET);
        System.out.println(BLUE + "   |" + RESET + YELLOW
                + center("Software Construction & Development Project", 58) + RESET + BLUE + "|" + RESET);
        System.out.println(BLUE + "   +" + repeat('=', 58) + "+" + RESET);
    }

    static void printSection(String title) {

        String line = repeat('-', 58);

        System.out.println();
        System.out.println(GREEN + "   +" + line + "+" + RESET);
        System.out.println(GREEN + "   |" + RESET + BOLD + center(title.toUpperCase(), 58)
                + RESET + GREEN + "|" + RESET);
        System.out.println(GREEN + "   +" + line + "+" + RESET);
    }

    static void printMenuItem(int number, String label) {
        System.out.println("    " + CYAN + number + "." + RESET + "  " + label);
    }

    static void showSuccess(String message) {
        System.out.println();
        System.out.println("   " + GREEN + "[OK]    " + message + RESET);
    }

    static void showError(String message) {
        System.out.println();
        System.out.println("   " + RED + "[ERROR] " + message + RESET);
    }

    static void showInfo(String message) {
        System.out.println("   " + YELLOW + "[INFO]  " + message + RESET);
    }

    static void pause() {

        System.out.print(CYAN + "\n   Press Enter to continue..." + RESET);

        try {
            scanner.nextLine();
        } catch (NoSuchElementException ignored) {
            // input stream already closed
        }
    }

    static void handleUnexpected(Exception e) {
        showError("Something went wrong: " + e.getMessage());
        showInfo("The operation was cancelled safely. Please try again.");
    }

    static void clearScreen() {
        System.out.print("\u001B[2J\u001B[H");
    }

    static String repeat(char c, int times) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < times; i++) {
            sb.append(c);
        }
        return sb.toString();
    }

    static String center(String text, int width) {
        if (text.length() >= width) {
            return text.substring(0, width);
        }
        int left = (width - text.length()) / 2;
        return repeat(' ', left) + text;
    }

    static String pad(String text, int width, char fill) {
        StringBuilder sb = new StringBuilder(text);
        while (sb.length() < width) {
            sb.append(fill);
        }
        return sb.toString();
    }

    // ============================================================
    // HEADER
    // ============================================================

    // ============================================================
    // ADMIN LOGIN
    // ============================================================

    static void adminLogin() {

        printSection("ADMIN LOGIN");

        int attempts = 0;

        while (attempts < MAX_LOGIN_ATTEMPTS) {

            String username = getText("  Username: ");
            String password = getText("  Password: ");

            if (ADMIN_USER.equalsIgnoreCase(username) && ADMIN_PASS.equals(password)) {

                showSuccess("Login successful! Welcome, Administrator.");
                adminMenu();
                return;
            }

            attempts++;

            showError("You have entered the wrong credentials! Username or password is incorrect.");
            showInfo("Attempts remaining: " + (MAX_LOGIN_ATTEMPTS - attempts));

            if (attempts < MAX_LOGIN_ATTEMPTS) {
                pause();
            }
        }

        showError("Too many failed attempts. Admin access locked. Please try again later.");
    }

    // ============================================================
    // ADMIN MENU
    // ============================================================

    static void adminMenu() {

        while (true) {

            printSection("ADMIN MENU");

            printMenuItem(1, "Add Doctor");
            printMenuItem(2, "View Doctors");
            printMenuItem(3, "Search Doctor");
            printMenuItem(4, "Delete Doctor");
            printMenuItem(5, "View Patients");
            printMenuItem(6, "View Appointments");
            printMenuItem(7, "View Bills");
            printMenuItem(8, "System Statistics");
            printMenuItem(9, "Logout");

            int choice = getIntInRange("  Enter your choice: ", 1, 9);

            switch (choice) {

                case 1:
                    addDoctor();
                    break;

                case 2:
                    viewDoctors();
                    break;

                case 3:
                    searchDoctor();
                    break;

                case 4:
                    deleteDoctor();
                    break;

                case 5:
                    viewPatients();
                    break;

                case 6:
                    viewAppointments();
                    break;

                case 7:
                    viewBills();
                    break;

                case 8:
                    systemStatistics();
                    break;

                case 9:
                    showSuccess("Admin logged out.");
                    return;

                default:
                    showError("Invalid option selected.");
            }

            pause();
        }
    }

    // ============================================================
    // DOCTOR LOGIN
    // ============================================================

    static void doctorLogin() {

        printSection("DOCTOR LOGIN");

        int id = getIntInRange("  Enter Doctor ID: ", 1, Integer.MAX_VALUE);

        Doctor doctor = findDoctorById(id);

        if (doctor == null) {

            showError("Doctor not found with ID " + id + ". Please check the ID and try again.");
            return;
        }

        showSuccess("Welcome Dr. " + doctor.getName() + "!");
        doctorMenu(doctor);
    }

    // ============================================================
    // DOCTOR MENU
    // ============================================================

    static void doctorMenu(Doctor doctor) {

        while (true) {

            printSection("DOCTOR MENU");

            System.out.println("   " + CYAN + "Logged in as: Dr. " + doctor.getName()
                    + " (" + doctor.getSpecialization() + ")" + RESET);

            printMenuItem(1, "View My Appointments");
            printMenuItem(2, "View Patient");
            printMenuItem(3, "Add Medical Record");
            printMenuItem(4, "Create Prescription");
            printMenuItem(5, "View My Profile");
            printMenuItem(6, "Logout");

            int choice = getIntInRange("  Enter your choice: ", 1, 6);

            switch (choice) {

                case 1:
                    viewDoctorAppointments(doctor);
                    break;

                case 2:
                    doctorViewPatient();
                    break;

                case 3:
                    addMedicalRecord(doctor);
                    break;

                case 4:
                    createPrescription(doctor);
                    break;

                case 5:
                    doctor.displayInfo();
                    break;

                case 6:
                    showSuccess("Doctor logged out.");
                    return;

                default:
                    showError("Invalid option selected.");
            }

            pause();
        }
    }

    // ============================================================
    // RECEPTIONIST MENU
    // ============================================================

    static void receptionistMenu() {

        while (true) {

            printSection("RECEPTIONIST MENU");

            printMenuItem(1, "Register Patient");
            printMenuItem(2, "View Patients");
            printMenuItem(3, "Search Patient");
            printMenuItem(4, "Book Appointment");
            printMenuItem(5, "Cancel Appointment");
            printMenuItem(6, "View Appointments");
            printMenuItem(7, "Generate Bill");
            printMenuItem(8, "Logout");

            int choice = getIntInRange("  Enter your choice: ", 1, 8);

            switch (choice) {

                case 1:
                    registerPatient();
                    break;

                case 2:
                    viewPatients();
                    break;

                case 3:
                    searchPatient();
                    break;

                case 4:
                    bookAppointment();
                    break;

                case 5:
                    cancelAppointment();
                    break;

                case 6:
                    viewAppointments();
                    break;

                case 7:
                    generateBill();
                    break;

                case 8:
                    showSuccess("Receptionist logged out.");
                    return;

                default:
                    showError("Invalid option selected.");
            }

            pause();
        }
    }

    // ============================================================
    // DOCTOR MANAGEMENT
    // ============================================================

    static void addDoctor() {

        printSection("ADD DOCTOR");

        try {

            String name = getText("  Doctor name: ");
            String email = getEmail("  Email: ");
            String phone = getPhone("  Phone: ");
            String specialization = getText("  Specialization: ");
            String qualification = getText("  Qualification: ");

            if (findDoctorByEmail(email) != null) {
                showError("A doctor with email " + email + " is already registered.");
                return;
            }

            Doctor doctor = new Doctor(
                    doctorIdCounter++,
                    name,
                    email,
                    phone,
                    specialization,
                    qualification
            );

            doctors.add(doctor);

            showSuccess("Doctor added successfully.");
            System.out.println("   " + CYAN + "Doctor ID: " + doctor.getId() + RESET);

        } catch (Exception e) {
            handleUnexpected(e);
        }
    }

    static Doctor findDoctorByEmail(String email) {
        for (Doctor d : doctors) {
            if (d.getEmail().equalsIgnoreCase(email)) {
                return d;
            }
        }
        return null;
    }

    static void viewDoctors() {

        printSection("DOCTOR LIST");

        if (doctors.isEmpty()) {

            showInfo("No doctors available yet.");
            return;
        }

        for (Doctor doctor : doctors) {
            doctor.displayInfo();
        }
    }

    static void searchDoctor() {

        printSection("SEARCH DOCTOR");

        int id = getIntInRange("  Enter Doctor ID: ", 1, Integer.MAX_VALUE);

        Doctor doctor = findDoctorById(id);

        if (doctor != null) {

            doctor.displayInfo();

        } else {

            showError("Doctor not found with ID " + id + ".");
        }
    }

    static void deleteDoctor() {

        printSection("DELETE DOCTOR");

        int id = getIntInRange("  Enter Doctor ID: ", 1, Integer.MAX_VALUE);

        Doctor doctor = findDoctorById(id);

        if (doctor == null) {

            showError("Doctor not found with ID " + id + ".");
            return;
        }

        String confirm = getText("  Delete Dr. " + doctor.getName() + "? (yes/no): ");

        if ("yes".equalsIgnoreCase(confirm)) {

            doctors.remove(doctor);

            showSuccess("Doctor deleted successfully.");

        } else {

            showInfo("Delete operation cancelled.");
        }
    }

    // ============================================================
    // PATIENT MANAGEMENT
    // ============================================================

    static void registerPatient() {

        printSection("PATIENT REGISTRATION");

        try {

            String name = getText("  Patient name: ");
            String email = getEmail("  Email: ");
            String phone = getPhone("  Phone: ");
            int age = getIntInRange("  Age: ", 1, 130);
            String gender = getChoice("  Gender (Male/Female/Other): ",
                    new String[]{"Male", "Female", "Other"});
            String address = getText("  Address: ");

            if (findPatientByEmail(email) != null) {
                showError("A patient with email " + email + " is already registered.");
                return;
            }

            Patient patient = new Patient(
                    patientIdCounter++,
                    name,
                    email,
                    phone,
                    age,
                    gender,
                    address
            );

            patients.add(patient);

            showSuccess("Patient registered successfully.");
            System.out.println("   " + CYAN + "Patient ID: " + patient.getId() + RESET);

        } catch (Exception e) {
            handleUnexpected(e);
        }
    }

    static Patient findPatientByEmail(String email) {
        for (Patient p : patients) {
            if (p.getEmail().equalsIgnoreCase(email)) {
                return p;
            }
        }
        return null;
    }

    static void viewPatients() {

        printSection("PATIENT LIST");

        if (patients.isEmpty()) {

            showInfo("No patients registered yet.");
            return;
        }

        for (Patient patient : patients) {
            patient.displayInfo();
        }
    }

    static void searchPatient() {

        printSection("SEARCH PATIENT");

        int id = getIntInRange("  Enter Patient ID: ", 1, Integer.MAX_VALUE);

        Patient patient = findPatientById(id);

        if (patient != null) {

            patient.displayInfo();

        } else {

            showError("Patient not found with ID " + id + ".");
        }
    }

    static void doctorViewPatient() {

        int id = getIntInRange("  Enter Patient ID: ", 1, Integer.MAX_VALUE);

        Patient patient = findPatientById(id);

        if (patient == null) {

            showError("Patient not found with ID " + id + ".");
            return;
        }

        patient.displayInfo();

        System.out.println("   " + BOLD + "Medical Records:" + RESET);

        boolean found = false;

        for (MedicalRecord record : medicalRecords) {

            if (record.getPatientId() == id) {

                record.displayInfo();
                found = true;
            }
        }

        if (!found) {
            showInfo("No medical records found for this patient.");
        }
    }

    // ============================================================
    // APPOINTMENT MANAGEMENT
    // ============================================================

    static void bookAppointment() {

        printSection("BOOK APPOINTMENT");

        if (patients.isEmpty() || doctors.isEmpty()) {
            showError("Cannot book an appointment: at least one patient and one doctor must exist.");
            return;
        }

        int patientId = getIntInRange("  Patient ID: ", 1, Integer.MAX_VALUE);
        Patient patient = findPatientById(patientId);

        if (patient == null) {

            showError("Patient not found with ID " + patientId + ".");
            return;
        }

        int doctorId = getIntInRange("  Doctor ID: ", 1, Integer.MAX_VALUE);
        Doctor doctor = findDoctorById(doctorId);

        if (doctor == null) {

            showError("Doctor not found with ID " + doctorId + ".");
            return;
        }

        String date = getDate("  Appointment date (dd-MM-yyyy): ");
        String time = getText("  Appointment time (e.g. 10:30 AM): ");
        String reason = getText("  Reason for visit: ");

        for (Appointment a : appointments) {
            if (a.getDoctorId() == doctorId
                    && a.getDate().equalsIgnoreCase(date)
                    && a.getTime().equalsIgnoreCase(time)) {
                showError("This doctor already has an appointment on " + date + " at " + time + ".");
                showInfo("Please choose a different time slot.");
                return;
            }
        }

        Appointment appointment = new Appointment(
                appointmentIdCounter++,
                patientId,
                doctorId,
                date,
                time,
                reason
        );

        appointments.add(appointment);

        showSuccess("Appointment booked successfully for " + patient.getName() + " with Dr. "
                + doctor.getName() + ".");
        System.out.println("   " + CYAN + "Appointment ID: " + appointment.getId() + RESET);
    }

    static void viewAppointments() {

        printSection("ALL APPOINTMENTS");

        if (appointments.isEmpty()) {

            showInfo("No appointments available.");
            return;
        }

        for (Appointment appointment : appointments) {

            appointment.displayInfo();
        }
    }

    static void viewDoctorAppointments(Doctor doctor) {

        printSection("MY APPOINTMENTS");

        boolean found = false;

        for (Appointment appointment : appointments) {

            if (appointment.getDoctorId() == doctor.getId()) {

                appointment.displayInfo();
                found = true;
            }
        }

        if (!found) {

            showInfo("No appointments found for Dr. " + doctor.getName() + ".");
        }
    }

    static void cancelAppointment() {

        printSection("CANCEL APPOINTMENT");

        int id = getIntInRange("  Enter Appointment ID: ", 1, Integer.MAX_VALUE);

        Appointment appointment = findAppointmentById(id);

        if (appointment == null) {

            showError("Appointment not found with ID " + id + ".");
            return;
        }

        String confirm = getText("  Cancel appointment " + id + "? (yes/no): ");

        if ("yes".equalsIgnoreCase(confirm)) {

            appointments.remove(appointment);

            showSuccess("Appointment cancelled successfully.");

        } else {

            showInfo("Cancellation aborted.");
        }
    }

    // ============================================================
    // MEDICAL RECORD
    // ============================================================

    static void addMedicalRecord(Doctor doctor) {

        printSection("ADD MEDICAL RECORD");

        int patientId = getIntInRange("  Patient ID: ", 1, Integer.MAX_VALUE);

        Patient patient = findPatientById(patientId);

        if (patient == null) {

            showError("Patient not found with ID " + patientId + ".");
            return;
        }

        String diagnosis = getText("  Diagnosis: ");
        String symptoms = getText("  Symptoms: ");
        String notes = getText("  Doctor notes: ");

        MedicalRecord record = new MedicalRecord(
                recordIdCounter++,
                patientId,
                doctor.getId(),
                diagnosis,
                symptoms,
                notes
        );

        medicalRecords.add(record);

        showSuccess("Medical record added for " + patient.getName() + ".");
    }

    // ============================================================
    // PRESCRIPTION
    // ============================================================

    static void createPrescription(Doctor doctor) {

        printSection("CREATE PRESCRIPTION");

        int patientId = getIntInRange("  Patient ID: ", 1, Integer.MAX_VALUE);

        Patient patient = findPatientById(patientId);

        if (patient == null) {

            showError("Patient not found with ID " + patientId + ".");
            return;
        }

        String medicine = getText("  Medicine name: ");
        String dosage = getText("  Dosage: ");
        String duration = getText("  Duration: ");
        String instructions = getText("  Instructions: ");

        Prescription prescription = new Prescription(
                prescriptionIdCounter++,
                patientId,
                doctor.getId(),
                medicine,
                dosage,
                duration,
                instructions
        );

        prescriptions.add(prescription);

        showSuccess("Prescription created successfully for " + patient.getName() + ".");
        prescription.displayInfo();
    }

    // ============================================================
    // BILLING
    // ============================================================

    static void generateBill() {

        printSection("GENERATE BILL");

        int patientId = getIntInRange("  Patient ID: ", 1, Integer.MAX_VALUE);

        Patient patient = findPatientById(patientId);

        if (patient == null) {

            showError("Patient not found with ID " + patientId + ".");
            return;
        }

        double consultationFee = getDouble("  Consultation fee: ");
        double medicineFee = getDouble("  Medicine fee: ");
        double testFee = getDouble("  Test fee: ");

        double total = consultationFee + medicineFee + testFee;

        Bill bill = new Bill(
                billIdCounter++,
                patientId,
                consultationFee,
                medicineFee,
                testFee,
                total
        );

        bills.add(bill);

        showSuccess("Bill generated successfully for " + patient.getName() + ".");
        bill.displayInfo();
    }

    static void viewBills() {

        printSection("ALL BILLS");

        if (bills.isEmpty()) {

            showInfo("No bills available.");
            return;
        }

        double grandTotal = 0;

        for (Bill bill : bills) {

            bill.displayInfo();

            grandTotal += bill.getTotal();
        }

        System.out.println("   " + BOLD + "GRAND TOTAL" + RESET + " : " + GREEN
                + "Rs. " + String.format("%.2f", grandTotal) + RESET);
    }

    // ============================================================
    // SYSTEM STATISTICS
    // ============================================================

    static void systemStatistics() {

        printSection("SYSTEM STATISTICS");

        printStat("Total Doctors", doctors.size());
        printStat("Total Patients", patients.size());
        printStat("Total Appointments", appointments.size());
        printStat("Medical Records", medicalRecords.size());
        printStat("Prescriptions", prescriptions.size());
        printStat("Generated Bills", bills.size());

        double revenue = 0;
        for (Bill bill : bills) {
            revenue += bill.getTotal();
        }

        System.out.println("   " + CYAN + pad("Total Revenue", 20, '.') + RESET + BOLD
                + String.format("Rs. %.2f", revenue) + RESET);
    }

    static void printStat(String label, int value) {
        System.out.println("   " + CYAN + pad(label, 20, '.') + RESET + BOLD + value + RESET);
    }

    // ============================================================
    // SEARCH METHODS
    // ============================================================

    static Doctor findDoctorById(int id) {

        for (Doctor doctor : doctors) {

            if (doctor.getId() == id) {
                return doctor;
            }
        }

        return null;
    }

    static Patient findPatientById(int id) {

        for (Patient patient : patients) {

            if (patient.getId() == id) {
                return patient;
            }
        }

        return null;
    }

    static Appointment findAppointmentById(int id) {

        for (Appointment appointment : appointments) {

            if (appointment.getId() == id) {
                return appointment;
            }
        }

        return null;
    }

    // ============================================================
    // INPUT VALIDATION
    // ============================================================

    static int getInt(String message) {

        while (true) {

            String line = "";

            try {

                System.out.print(message);

                line = scanner.nextLine().trim();

                if (line.isEmpty()) {
                    showError("Value cannot be empty. Please enter a number.");
                    continue;
                }

                return Integer.parseInt(line);

            } catch (NumberFormatException e) {

                showError("'" + line + "' is not a valid number. Please enter digits only.");

            } catch (NoSuchElementException e) {

                showError("Input stream closed unexpectedly.");
                System.exit(0);
            }
        }
    }

    static int getIntInRange(String message, int min, int max) {

        while (true) {

            int value = getInt(message);

            if (value < min || value > max) {
                showError("Value must be between " + min + " and " + max + ".");
                continue;
            }

            return value;
        }
    }

    static double getDouble(String message) {

        while (true) {

            String line = "";

            try {

                System.out.print(message);

                line = scanner.nextLine().trim();

                if (line.isEmpty()) {
                    showError("Amount cannot be empty.");
                    continue;
                }

                double value = Double.parseDouble(line);

                if (value < 0) {

                    showError("Amount cannot be negative.");
                    continue;
                }

                if (value > 1000000) {
                    showError("Amount is too large. Please enter a realistic amount.");
                    continue;
                }

                return value;

            } catch (NumberFormatException e) {

                showError("'" + line + "' is not a valid amount. Please enter numbers only.");

            } catch (NoSuchElementException e) {

                showError("Input stream closed unexpectedly.");
                System.exit(0);
            }
        }
    }

    static String getText(String message) {

        while (true) {

            try {

                System.out.print(message);

                String value = scanner.nextLine().trim();

                if (value.isEmpty()) {
                    showError("This field cannot be empty.");
                    continue;
                }

                if (value.length() > 100) {
                    showError("Text is too long (maximum 100 characters).");
                    continue;
                }

                return value;

            } catch (NoSuchElementException e) {

                showError("Input stream closed unexpectedly.");
                System.exit(0);
            }
        }
    }

    static String getEmail(String message) {

        while (true) {

            String email = getText(message);

            if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                showError("'" + email + "' is not a valid email address.");
                continue;
            }

            return email;
        }
    }

    static String getPhone(String message) {

        while (true) {

            String phone = getText(message);
            String digits = phone.replaceAll("[\\s\\-\\+\\(\\)]", "");

            if (!digits.matches("\\d{10,15}")) {
                showError("'" + phone + "' is not a valid phone number (10 to 15 digits required).");
                continue;
            }

            return phone;
        }
    }

    static String getDate(String message) {

        while (true) {

            String date = getText(message);

            if (!date.matches("^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-((19|20)\\d{2})$")) {
                showError("'" + date + "' is not a valid date. Please use format dd-MM-yyyy.");
                continue;
            }

            return date;
        }
    }

    static String getChoice(String message, String[] options) {

        while (true) {

            String value = getText(message);

            for (String option : options) {
                if (option.equalsIgnoreCase(value)) {
                    return option;
                }
            }

            showError("'" + value + "' is not valid. Choose one of: " + String.join(", ", options) + ".");
        }
    }

    // ============================================================
    // SAMPLE DATA
    // ============================================================

    static void loadSampleData() {
        // System starts empty so users can add doctors, patients,
        // appointments, medical records, prescriptions, and bills themselves.
    }

    // ============================================================
    // EMBEDDED WEB SERVER & REST API (PURE JAVA.NET, NO EXTRA CLASSES)
    // ============================================================

    static void startWebServer(int port) {
        try (ServerSocket server = new ServerSocket(port)) {
            String url = "http://localhost:" + port;
            System.out.println();
            System.out.println(GREEN + "   Smart Clinic Management System (wellnest.) is running!" + RESET);
            System.out.println(CYAN + "   Open in browser: " + BOLD + url + RESET);
            System.out.println(YELLOW + "   Admin login: admin / admin123" + RESET);
            System.out.println("   (Tip: run with --cli for the original console interface)");
            System.out.println("   Press Ctrl+C to stop the server.");

            try {
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(new URI(url));
                }
            } catch (Exception ignored) {
                // headless or browser auto-open unavailable
            }

            while (true) {
                Socket client = server.accept();
                Thread t = new Thread(() -> handleHttpClient(client));
                t.setDaemon(true);
                t.start();
            }
        } catch (IOException e) {
            System.err.println("Failed to start web server on port " + port + ": " + e.getMessage());
        }
    }

    static void handleHttpClient(Socket client) {
        try (Socket s = client;
             InputStream rawIn = new BufferedInputStream(s.getInputStream());
             OutputStream out = s.getOutputStream()) {

            String requestLine = readHttpLine(rawIn);
            if (requestLine == null || requestLine.isEmpty()) {
                return;
            }
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                return;
            }
            String method = parts[0].trim();
            String rawTarget = parts[1].trim();
            int qIdx = rawTarget.indexOf('?');
            String path = qIdx >= 0 ? rawTarget.substring(0, qIdx) : rawTarget;

            int contentLength = 0;
            String headerLine;
            while ((headerLine = readHttpLine(rawIn)) != null && !headerLine.isEmpty()) {
                int colon = headerLine.indexOf(':');
                if (colon > 0) {
                    String hName = headerLine.substring(0, colon).trim();
                    String hVal = headerLine.substring(colon + 1).trim();
                    if ("Content-Length".equalsIgnoreCase(hName)) {
                        try {
                            contentLength = Integer.parseInt(hVal);
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
            }

            String reqBody = "";
            if (contentLength > 0 && contentLength < 10_000_000) {
                byte[] buf = new byte[contentLength];
                int read = 0;
                while (read < contentLength) {
                    int n = rawIn.read(buf, read, contentLength - read);
                    if (n < 0) break;
                    read += n;
                }
                reqBody = new String(buf, 0, read, StandardCharsets.UTF_8);
            }

            if ("OPTIONS".equalsIgnoreCase(method)) {
                sendOptions(out);
                return;
            }

            synchronized (SmartClinicManagement.class) {
                if ("/api/state".equals(path)) {
                    sendJson(out, 200, buildStateJson());
                } else if ("/api/login/admin".equals(path)) {
                    handleAdminLoginApi(method, reqBody, out);
                } else if ("/api/login/doctor".equals(path)) {
                    handleDoctorLoginApi(method, reqBody, out);
                } else if ("/api/doctors".equals(path) || path.startsWith("/api/doctors/")) {
                    handleDoctorsApi(method, path, reqBody, out);
                } else if ("/api/patients".equals(path) || path.startsWith("/api/patients/")) {
                    handlePatientsApi(method, reqBody, out);
                } else if ("/api/appointments/status".equals(path)) {
                    handleAppointmentStatusApi(method, reqBody, out);
                } else if ("/api/appointments".equals(path) || path.startsWith("/api/appointments/")) {
                    handleAppointmentsApi(method, path, reqBody, out);
                } else if ("/api/records".equals(path)) {
                    handleRecordsApi(method, reqBody, out);
                } else if ("/api/prescriptions".equals(path)) {
                    handlePrescriptionsApi(method, reqBody, out);
                } else if ("/api/bills/pay".equals(path)) {
                    handleBillPayApi(method, reqBody, out);
                } else if ("/api/bills".equals(path)) {
                    handleBillsApi(method, reqBody, out);
                } else {
                    handleStaticFile(method, path, out);
                }
            }
        } catch (IOException ignored) {
            // client closed connection
        }
    }

    static String readHttpLine(InputStream in) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int b;
        while ((b = in.read()) != -1) {
            if (b == '\n') {
                break;
            }
            if (b != '\r') {
                baos.write(b);
            }
        }
        if (b == -1 && baos.size() == 0) {
            return null;
        }
        return new String(baos.toByteArray(), StandardCharsets.UTF_8);
    }

    static void handleStaticFile(String method, String reqPath, OutputStream out) throws IOException {
        if (!"GET".equalsIgnoreCase(method)) {
            sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }
        if (reqPath == null || "/".equals(reqPath)) {
            reqPath = "/index.html";
        }
        if (reqPath.contains("..")) {
            sendText(out, 403, "text/plain", "Forbidden");
            return;
        }
        Path file = Paths.get("web", reqPath.substring(1));
        if (!Files.exists(file) || Files.isDirectory(file)) {
            file = Paths.get("web", "index.html");
        }
        if (!Files.exists(file)) {
            sendText(out, 404, "text/plain", "Frontend files not found in ./web");
            return;
        }
        String contentType = "text/html; charset=UTF-8";
        String lower = file.toString().toLowerCase(Locale.ROOT);
        if (lower.endsWith(".css")) {
            contentType = "text/css; charset=UTF-8";
        } else if (lower.endsWith(".js")) {
            contentType = "application/javascript; charset=UTF-8";
        } else if (lower.endsWith(".svg")) {
            contentType = "image/svg+xml";
        } else if (lower.endsWith(".png")) {
            contentType = "image/png";
        } else if (lower.endsWith(".json")) {
            contentType = "application/json; charset=UTF-8";
        }
        byte[] bytes = Files.readAllBytes(file);
        sendBytes(out, 200, contentType, bytes);
    }

    static void handleAdminLoginApi(String method, String reqBody, OutputStream out) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }
        Map<String, String> body = parseJsonObject(reqBody);
        String username = safeStr(body.get("username")).trim();
        String password = safeStr(body.get("password"));

        if (adminFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
            sendJson(out, 429, "{\"ok\":false,\"locked\":true,\"error\":\"Too many failed attempts. Admin access locked.\"}");
            return;
        }

        if ((ADMIN_USER.equalsIgnoreCase(username) || "admin@oakwoodclinic.com".equalsIgnoreCase(username))
                && ADMIN_PASS.equals(password)) {
            adminFailedAttempts = 0;
            sendJson(out, 200, "{\"ok\":true,\"role\":\"admin\",\"name\":\"Administrator\",\"subtitle\":\"Clinic administrator\"}");
            return;
        }

        adminFailedAttempts++;
        int remaining = MAX_LOGIN_ATTEMPTS - adminFailedAttempts;
        String msg = remaining > 0
                ? "Wrong credentials! Attempts remaining: " + remaining
                : "Too many failed attempts. Admin access locked.";
        sendJson(out, 401, "{\"ok\":false,\"locked\":" + (remaining <= 0)
                + ",\"remaining\":" + remaining + ",\"error\":" + jsonStr(msg) + "}");
    }

    static void handleDoctorLoginApi(String method, String reqBody, OutputStream out) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }
        Map<String, String> body = parseJsonObject(reqBody);
        String idRaw = safeStr(body.get("doctorId")).trim();
        int id;
        try {
            id = Integer.parseInt(idRaw);
        } catch (NumberFormatException e) {
            sendJson(out, 400, "{\"ok\":false,\"error\":\"Please enter a valid numeric Doctor ID (e.g. 101).\"}");
            return;
        }
        Doctor doctor = findDoctorById(id);
        if (doctor == null) {
            sendJson(out, 404, "{\"ok\":false,\"error\":\"Doctor not found with ID " + id + ".\"}");
            return;
        }
        sendJson(out, 200, "{\"ok\":true,\"role\":\"doctor\",\"doctor\":" + doctorToJson(doctor) + "}");
    }

    static void handleDoctorsApi(String method, String path, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, doctorsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            String name = safeStr(body.get("name")).trim();
            String email = safeStr(body.get("email")).trim();
            String phone = safeStr(body.get("phone")).trim();
            String specialization = safeStr(body.get("specialization")).trim();
            String qualification = safeStr(body.get("qualification")).trim();

            if (name.isEmpty() || email.isEmpty() || phone.isEmpty()
                    || specialization.isEmpty() || qualification.isEmpty()) {
                sendJson(out, 400, "{\"error\":\"All doctor fields are required.\"}");
                return;
            }
            if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                sendJson(out, 400, "{\"error\":\"'" + escapeJson(email) + "' is not a valid email address.\"}");
                return;
            }
            String digits = phone.replaceAll("[\\s\\-\\+\\(\\)]", "");
            if (!digits.matches("\\d{10,15}")) {
                sendJson(out, 400, "{\"error\":\"Phone number must contain 10 to 15 digits.\"}");
                return;
            }
            if (findDoctorByEmail(email) != null) {
                sendJson(out, 409, "{\"error\":\"A doctor with email " + escapeJson(email) + " is already registered.\"}");
                return;
            }
            Doctor doctor = new Doctor(doctorIdCounter++, name, email, phone, specialization, qualification);
            doctors.add(doctor);
            sendJson(out, 201, "{\"ok\":true,\"doctor\":" + doctorToJson(doctor) + "}");
            return;
        }
        if ("DELETE".equalsIgnoreCase(method)) {
            int id = extractTrailingId(path);
            Doctor doctor = findDoctorById(id);
            if (doctor == null) {
                sendJson(out, 404, "{\"error\":\"Doctor not found with ID " + id + ".\"}");
                return;
            }
            doctors.remove(doctor);
            sendJson(out, 200, "{\"ok\":true,\"deletedId\":" + id + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handlePatientsApi(String method, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, patientsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            String name = safeStr(body.get("name")).trim();
            String email = safeStr(body.get("email")).trim();
            String phone = safeStr(body.get("phone")).trim();
            String ageRaw = safeStr(body.get("age")).trim();
            String gender = safeStr(body.get("gender")).trim();
            String address = safeStr(body.get("address")).trim();

            if (name.isEmpty() || email.isEmpty() || phone.isEmpty()
                    || ageRaw.isEmpty() || gender.isEmpty() || address.isEmpty()) {
                sendJson(out, 400, "{\"error\":\"All required patient fields must be filled.\"}");
                return;
            }
            if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                sendJson(out, 400, "{\"error\":\"Please enter a valid email address.\"}");
                return;
            }
            String digits = phone.replaceAll("[\\s\\-\\+\\(\\)]", "");
            if (!digits.matches("\\d{10,15}")) {
                sendJson(out, 400, "{\"error\":\"Enter a valid phone number (10 to 15 digits).\"}");
                return;
            }
            int age;
            try {
                age = Integer.parseInt(ageRaw);
                if (age < 1 || age > 130) {
                    sendJson(out, 400, "{\"error\":\"Age must be between 1 and 130.\"}");
                    return;
                }
            } catch (NumberFormatException e) {
                sendJson(out, 400, "{\"error\":\"Age must be a valid number.\"}");
                return;
            }
            if (!"Male".equalsIgnoreCase(gender) && !"Female".equalsIgnoreCase(gender) && !"Other".equalsIgnoreCase(gender)) {
                sendJson(out, 400, "{\"error\":\"Gender must be Male, Female, or Other.\"}");
                return;
            }
            if (findPatientByEmail(email) != null) {
                sendJson(out, 409, "{\"error\":\"A patient with email " + escapeJson(email) + " is already registered.\"}");
                return;
            }
            String normalizedGender = "Male".equalsIgnoreCase(gender) ? "Male"
                    : ("Female".equalsIgnoreCase(gender) ? "Female" : "Other");
            Patient patient = new Patient(patientIdCounter++, name, email, phone, age, normalizedGender, address);
            patients.add(patient);
            sendJson(out, 201, "{\"ok\":true,\"patient\":" + patientToJson(patient) + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handleAppointmentsApi(String method, String path, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, appointmentsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            int patientId, doctorId;
            try {
                patientId = Integer.parseInt(safeStr(body.get("patientId")).trim());
                doctorId = Integer.parseInt(safeStr(body.get("doctorId")).trim());
            } catch (NumberFormatException e) {
                sendJson(out, 400, "{\"error\":\"Valid Patient ID and Doctor ID are required.\"}");
                return;
            }
            Patient patient = findPatientById(patientId);
            if (patient == null) {
                sendJson(out, 404, "{\"error\":\"Patient not found with ID " + patientId + ".\"}");
                return;
            }
            Doctor doctor = findDoctorById(doctorId);
            if (doctor == null) {
                sendJson(out, 404, "{\"error\":\"Doctor not found with ID " + doctorId + ".\"}");
                return;
            }
            String date = safeStr(body.get("date")).trim();
            String time = safeStr(body.get("time")).trim();
            String reason = safeStr(body.get("reason")).trim();
            if (!date.matches("^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-((19|20)\\d{2})$")) {
                sendJson(out, 400, "{\"error\":\"Date must be in dd-MM-yyyy format.\"}");
                return;
            }
            if (time.isEmpty() || reason.isEmpty()) {
                sendJson(out, 400, "{\"error\":\"Time and reason for visit are required.\"}");
                return;
            }
            for (Appointment a : appointments) {
                if (a.getDoctorId() == doctorId
                        && a.getDate().equalsIgnoreCase(date)
                        && a.getTime().equalsIgnoreCase(time)) {
                    sendJson(out, 409, "{\"error\":\"Dr. " + escapeJson(doctor.getName())
                            + " already has an appointment on " + escapeJson(date)
                            + " at " + escapeJson(time) + ". Please choose another slot.\"}");
                    return;
                }
            }
            Appointment appointment = new Appointment(appointmentIdCounter++, patientId, doctorId, date, time, reason);
            appointments.add(appointment);
            appointmentStatuses.put(appointment.getId(), "Confirmed");
            sendJson(out, 201, "{\"ok\":true,\"appointment\":" + appointmentToJson(appointment) + "}");
            return;
        }
        if ("DELETE".equalsIgnoreCase(method)) {
            int id = extractTrailingId(path);
            Appointment appointment = findAppointmentById(id);
            if (appointment == null) {
                sendJson(out, 404, "{\"error\":\"Appointment not found with ID " + id + ".\"}");
                return;
            }
            Map<String, String> body = parseJsonObject(reqBody);
            String cancelReason = safeStr(body.get("cancelReason")).trim();
            if (cancelReason.isEmpty()) {
                cancelReason = "Cancelled by staff";
            }
            String note = safeStr(body.get("note")).trim();
            String snap = "{\"id\":" + appointment.getId()
                    + ",\"patientId\":" + appointment.getPatientId()
                    + ",\"doctorId\":" + appointment.getDoctorId()
                    + ",\"date\":" + jsonStr(appointment.getDate())
                    + ",\"time\":" + jsonStr(appointment.getTime())
                    + ",\"reason\":" + jsonStr(String.valueOf(getFieldValue(appointment, "reason")))
                    + ",\"cancelReason\":" + jsonStr(cancelReason)
                    + ",\"note\":" + jsonStr(note) + "}";
            cancelledAppointmentsLog.add(snap);
            appointments.remove(appointment);
            appointmentStatuses.remove(id);
            sendJson(out, 200, "{\"ok\":true,\"cancelledId\":" + id + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handleAppointmentStatusApi(String method, String reqBody, OutputStream out) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }
        Map<String, String> body = parseJsonObject(reqBody);
        int id;
        try {
            id = Integer.parseInt(safeStr(body.get("id")).trim());
        } catch (NumberFormatException e) {
            sendJson(out, 400, "{\"error\":\"Invalid appointment ID.\"}");
            return;
        }
        if (findAppointmentById(id) == null) {
            sendJson(out, 404, "{\"error\":\"Appointment not found.\"}");
            return;
        }
        String status = safeStr(body.get("status")).trim();
        if (status.isEmpty()) {
            status = "Confirmed";
        }
        appointmentStatuses.put(id, status);
        sendJson(out, 200, "{\"ok\":true,\"id\":" + id + ",\"status\":" + jsonStr(status) + "}");
    }

    static void handleRecordsApi(String method, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, recordsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            int patientId, doctorId;
            try {
                patientId = Integer.parseInt(safeStr(body.get("patientId")).trim());
                doctorId = Integer.parseInt(safeStr(body.get("doctorId")).trim());
            } catch (NumberFormatException e) {
                sendJson(out, 400, "{\"error\":\"Valid Patient ID and Doctor ID are required.\"}");
                return;
            }
            if (findPatientById(patientId) == null) {
                sendJson(out, 404, "{\"error\":\"Patient not found with ID " + patientId + ".\"}");
                return;
            }
            if (findDoctorById(doctorId) == null) {
                sendJson(out, 404, "{\"error\":\"Doctor not found with ID " + doctorId + ".\"}");
                return;
            }
            String diagnosis = safeStr(body.get("diagnosis")).trim();
            String symptoms = safeStr(body.get("symptoms")).trim();
            String notes = safeStr(body.get("notes")).trim();
            if (diagnosis.isEmpty() || symptoms.isEmpty() || notes.isEmpty()) {
                sendJson(out, 400, "{\"error\":\"Diagnosis, symptoms, and doctor notes are required.\"}");
                return;
            }
            MedicalRecord record = new MedicalRecord(recordIdCounter++, patientId, doctorId, diagnosis, symptoms, notes);
            medicalRecords.add(record);
            sendJson(out, 201, "{\"ok\":true,\"record\":" + recordToJson(record) + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handlePrescriptionsApi(String method, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, prescriptionsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            int patientId, doctorId;
            try {
                patientId = Integer.parseInt(safeStr(body.get("patientId")).trim());
                doctorId = Integer.parseInt(safeStr(body.get("doctorId")).trim());
            } catch (NumberFormatException e) {
                sendJson(out, 400, "{\"error\":\"Valid Patient ID and Doctor ID are required.\"}");
                return;
            }
            if (findPatientById(patientId) == null) {
                sendJson(out, 404, "{\"error\":\"Patient not found with ID " + patientId + ".\"}");
                return;
            }
            if (findDoctorById(doctorId) == null) {
                sendJson(out, 404, "{\"error\":\"Doctor not found with ID " + doctorId + ".\"}");
                return;
            }
            String medicine = safeStr(body.get("medicine")).trim();
            String dosage = safeStr(body.get("dosage")).trim();
            String duration = safeStr(body.get("duration")).trim();
            String instructions = safeStr(body.get("instructions")).trim();
            if (medicine.isEmpty() || dosage.isEmpty() || duration.isEmpty() || instructions.isEmpty()) {
                sendJson(out, 400, "{\"error\":\"Medicine, dosage, duration, and instructions are required.\"}");
                return;
            }
            Prescription p = new Prescription(prescriptionIdCounter++, patientId, doctorId, medicine, dosage, duration, instructions);
            prescriptions.add(p);
            sendJson(out, 201, "{\"ok\":true,\"prescription\":" + prescriptionToJson(p) + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handleBillsApi(String method, String reqBody, OutputStream out) throws IOException {
        if ("GET".equalsIgnoreCase(method)) {
            sendJson(out, 200, billsListJson());
            return;
        }
        if ("POST".equalsIgnoreCase(method)) {
            Map<String, String> body = parseJsonObject(reqBody);
            int patientId;
            double consultationFee, medicineFee, testFee;
            try {
                patientId = Integer.parseInt(safeStr(body.get("patientId")).trim());
                consultationFee = Double.parseDouble(safeStr(body.get("consultationFee")).trim());
                medicineFee = Double.parseDouble(safeStr(body.get("medicineFee")).trim());
                testFee = Double.parseDouble(safeStr(body.get("testFee")).trim());
            } catch (NumberFormatException e) {
                sendJson(out, 400, "{\"error\":\"Please enter valid numeric amounts and Patient ID.\"}");
                return;
            }
            if (findPatientById(patientId) == null) {
                sendJson(out, 404, "{\"error\":\"Patient not found with ID " + patientId + ".\"}");
                return;
            }
            if (consultationFee < 0 || medicineFee < 0 || testFee < 0
                    || consultationFee > 1000000 || medicineFee > 1000000 || testFee > 1000000) {
                sendJson(out, 400, "{\"error\":\"Fees must be between 0 and 1,000,000.\"}");
                return;
            }
            double total = consultationFee + medicineFee + testFee;
            int id = billIdCounter++;
            Bill bill = new Bill(id, patientId, consultationFee, medicineFee, testFee, total);
            bills.add(bill);
            if ("paid".equalsIgnoreCase(safeStr(body.get("status")).trim())) {
                paidBillIds.add(id);
            }
            sendJson(out, 201, "{\"ok\":true,\"bill\":" + billToJson(bill) + "}");
            return;
        }
        sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    static void handleBillPayApi(String method, String reqBody, OutputStream out) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            sendJson(out, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }
        Map<String, String> body = parseJsonObject(reqBody);
        int id;
        try {
            id = Integer.parseInt(safeStr(body.get("id")).trim());
        } catch (NumberFormatException e) {
            sendJson(out, 400, "{\"error\":\"Invalid bill ID.\"}");
            return;
        }
        paidBillIds.add(id);
        sendJson(out, 200, "{\"ok\":true,\"id\":" + id + ",\"paid\":true}");
    }

    // ---- JSON & Reflection Helpers (No Extra Classes) ----------

    static Object getFieldValue(Object target, String fieldName) {
        Class<?> cls = target.getClass();
        while (cls != null) {
            try {
                Field f = cls.getDeclaredField(fieldName);
                f.setAccessible(true);
                return f.get(target);
            } catch (NoSuchFieldException e) {
                cls = cls.getSuperclass();
            } catch (IllegalAccessException e) {
                return "";
            }
        }
        return "";
    }

    static String buildStateJson() {
        double totalRevenue = 0;
        double paidRevenue = 0;
        for (Bill b : bills) {
            totalRevenue += b.getTotal();
            int bid = ((Number) getFieldValue(b, "id")).intValue();
            if (paidBillIds.contains(bid)) {
                paidRevenue += b.getTotal();
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"doctors\":").append(doctorsListJson()).append(",");
        sb.append("\"patients\":").append(patientsListJson()).append(",");
        sb.append("\"appointments\":").append(appointmentsListJson()).append(",");
        sb.append("\"cancelledAppointments\":[").append(String.join(",", cancelledAppointmentsLog)).append("],");
        sb.append("\"medicalRecords\":").append(recordsListJson()).append(",");
        sb.append("\"prescriptions\":").append(prescriptionsListJson()).append(",");
        sb.append("\"bills\":").append(billsListJson()).append(",");
        sb.append("\"stats\":{");
        sb.append("\"totalDoctors\":").append(doctors.size()).append(",");
        sb.append("\"totalPatients\":").append(patients.size()).append(",");
        sb.append("\"totalAppointments\":").append(appointments.size()).append(",");
        sb.append("\"cancelledAppointments\":").append(cancelledAppointmentsLog.size()).append(",");
        sb.append("\"totalMedicalRecords\":").append(medicalRecords.size()).append(",");
        sb.append("\"totalPrescriptions\":").append(prescriptions.size()).append(",");
        sb.append("\"totalBills\":").append(bills.size()).append(",");
        sb.append("\"paidBills\":").append(paidBillIds.size()).append(",");
        sb.append("\"totalRevenue\":").append(String.format(java.util.Locale.US, "%.2f", totalRevenue)).append(",");
        sb.append("\"paidRevenue\":").append(String.format(java.util.Locale.US, "%.2f", paidRevenue));
        sb.append("}}");
        return sb.toString();
    }

    static String doctorsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < doctors.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(doctorToJson(doctors.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String doctorToJson(Doctor d) {
        return "{\"id\":" + d.getId()
                + ",\"name\":" + jsonStr(d.getName())
                + ",\"email\":" + jsonStr(d.getEmail())
                + ",\"phone\":" + jsonStr(d.getPhone())
                + ",\"specialization\":" + jsonStr(d.getSpecialization())
                + ",\"qualification\":" + jsonStr(d.getQualification()) + "}";
    }

    static String patientsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < patients.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(patientToJson(patients.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String patientToJson(Patient p) {
        return "{\"id\":" + p.getId()
                + ",\"name\":" + jsonStr(p.getName())
                + ",\"email\":" + jsonStr(p.getEmail())
                + ",\"phone\":" + jsonStr(p.getPhone())
                + ",\"age\":" + getFieldValue(p, "age")
                + ",\"gender\":" + jsonStr(String.valueOf(getFieldValue(p, "gender")))
                + ",\"address\":" + jsonStr(String.valueOf(getFieldValue(p, "address"))) + "}";
    }

    static String appointmentsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < appointments.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(appointmentToJson(appointments.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String appointmentToJson(Appointment a) {
        String status = appointmentStatuses.getOrDefault(a.getId(), "Confirmed");
        return "{\"id\":" + a.getId()
                + ",\"patientId\":" + a.getPatientId()
                + ",\"doctorId\":" + a.getDoctorId()
                + ",\"date\":" + jsonStr(a.getDate())
                + ",\"time\":" + jsonStr(a.getTime())
                + ",\"reason\":" + jsonStr(String.valueOf(getFieldValue(a, "reason")))
                + ",\"status\":" + jsonStr(status) + "}";
    }

    static String recordsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < medicalRecords.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(recordToJson(medicalRecords.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String recordToJson(MedicalRecord r) {
        return "{\"id\":" + getFieldValue(r, "id")
                + ",\"patientId\":" + r.getPatientId()
                + ",\"doctorId\":" + getFieldValue(r, "doctorId")
                + ",\"diagnosis\":" + jsonStr(String.valueOf(getFieldValue(r, "diagnosis")))
                + ",\"symptoms\":" + jsonStr(String.valueOf(getFieldValue(r, "symptoms")))
                + ",\"notes\":" + jsonStr(String.valueOf(getFieldValue(r, "notes"))) + "}";
    }

    static String prescriptionsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < prescriptions.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(prescriptionToJson(prescriptions.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String prescriptionToJson(Prescription p) {
        return "{\"id\":" + getFieldValue(p, "id")
                + ",\"patientId\":" + getFieldValue(p, "patientId")
                + ",\"doctorId\":" + getFieldValue(p, "doctorId")
                + ",\"medicine\":" + jsonStr(String.valueOf(getFieldValue(p, "medicine")))
                + ",\"dosage\":" + jsonStr(String.valueOf(getFieldValue(p, "dosage")))
                + ",\"duration\":" + jsonStr(String.valueOf(getFieldValue(p, "duration")))
                + ",\"instructions\":" + jsonStr(String.valueOf(getFieldValue(p, "instructions"))) + "}";
    }

    static String billsListJson() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < bills.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(billToJson(bills.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    static String billToJson(Bill b) {
        int id = ((Number) getFieldValue(b, "id")).intValue();
        double cFee = ((Number) getFieldValue(b, "consultationFee")).doubleValue();
        double mFee = ((Number) getFieldValue(b, "medicineFee")).doubleValue();
        double tFee = ((Number) getFieldValue(b, "testFee")).doubleValue();
        boolean paid = paidBillIds.contains(id);
        return "{\"id\":" + id
                + ",\"patientId\":" + getFieldValue(b, "patientId")
                + ",\"consultationFee\":" + String.format(java.util.Locale.US, "%.2f", cFee)
                + ",\"medicineFee\":" + String.format(java.util.Locale.US, "%.2f", mFee)
                + ",\"testFee\":" + String.format(java.util.Locale.US, "%.2f", tFee)
                + ",\"total\":" + String.format(java.util.Locale.US, "%.2f", b.getTotal())
                + ",\"paid\":" + paid + "}";
    }

    static Map<String, String> parseJsonObject(String json) {
        Map<String, String> map = new HashMap<>();
        if (json == null) return map;
        String s = json.trim();
        if (s.startsWith("{")) s = s.substring(1);
        if (s.endsWith("}")) s = s.substring(0, s.length() - 1);
        int i = 0;
        int n = s.length();
        while (i < n) {
            while (i < n && (s.charAt(i) == ' ' || s.charAt(i) == ',' || s.charAt(i) == '\n' || s.charAt(i) == '\r' || s.charAt(i) == '\t')) i++;
            if (i >= n || s.charAt(i) != '"') break;
            int[] nextIdx = new int[1];
            String key = readJsonString(s, i, nextIdx);
            i = nextIdx[0];
            while (i < n && s.charAt(i) != ':') i++;
            i++; // skip ':'
            while (i < n && (s.charAt(i) == ' ' || s.charAt(i) == '\t' || s.charAt(i) == '\n' || s.charAt(i) == '\r')) i++;
            if (i >= n) break;
            String val;
            if (s.charAt(i) == '"') {
                val = readJsonString(s, i, nextIdx);
                i = nextIdx[0];
            } else {
                int start = i;
                while (i < n && s.charAt(i) != ',' && s.charAt(i) != '}') i++;
                val = s.substring(start, i).trim();
                if ("null".equals(val)) val = "";
            }
            map.put(key, val);
        }
        return map;
    }

    static String readJsonString(String s, int startQuote, int[] nextIdx) {
        StringBuilder sb = new StringBuilder();
        int i = startQuote + 1;
        int n = s.length();
        while (i < n) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < n) {
                char next = s.charAt(i + 1);
                if (next == '"') sb.append('"');
                else if (next == '\\') sb.append('\\');
                else if (next == 'n') sb.append('\n');
                else if (next == 'r') sb.append('\r');
                else if (next == 't') sb.append('\t');
                else sb.append(next);
                i += 2;
            } else if (c == '"') {
                i++;
                break;
            } else {
                sb.append(c);
                i++;
            }
        }
        nextIdx[0] = i;
        return sb.toString();
    }

    static int extractTrailingId(String path) {
        if (path == null) return -1;
        int slash = path.lastIndexOf('/');
        if (slash < 0 || slash == path.length() - 1) return -1;
        try {
            return Integer.parseInt(path.substring(slash + 1));
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    static String safeStr(String v) {
        return v == null ? "" : v;
    }

    static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    static String jsonStr(String s) {
        return "\"" + escapeJson(s) + "\"";
    }

    static void sendOptions(OutputStream out) throws IOException {
        String headers = "HTTP/1.1 204 No Content\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n"
                + "Access-Control-Allow-Headers: Content-Type\r\n"
                + "Content-Length: 0\r\n"
                + "Connection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    static void sendJson(OutputStream out, int status, String json) throws IOException {
        sendBytes(out, status, "application/json; charset=UTF-8", json.getBytes(StandardCharsets.UTF_8));
    }

    static void sendText(OutputStream out, int status, String contentType, String text) throws IOException {
        sendBytes(out, status, contentType, text.getBytes(StandardCharsets.UTF_8));
    }

    static void sendBytes(OutputStream out, int status, String contentType, byte[] bytes) throws IOException {
        String reason = status == 200 ? "OK"
                : status == 201 ? "Created"
                : status == 400 ? "Bad Request"
                : status == 401 ? "Unauthorized"
                : status == 403 ? "Forbidden"
                : status == 404 ? "Not Found"
                : status == 405 ? "Method Not Allowed"
                : status == 409 ? "Conflict"
                : status == 429 ? "Too Many Requests"
                : "Error";
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + contentType + "\r\n"
                + "Content-Length: " + bytes.length + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Cache-Control: no-cache\r\n"
                + "Connection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.UTF_8));
        out.write(bytes);
        out.flush();
    }
}


// ============================================================
// ABSTRACT USER CLASS
// ============================================================

abstract class User {

    private int id;
    private String name;
    private String email;
    private String phone;

    public User(int id, String name, String email, String phone) {

        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public abstract void displayInfo();

    protected void printRow(String label, String value) {
        System.out.println("   " + SmartClinicManagement.CYAN
                + SmartClinicManagement.pad(label, 16, ' ')
                + SmartClinicManagement.RESET + value);
    }

    protected void printBoxHeader(String title) {
        System.out.println();
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BOLD
                + SmartClinicManagement.pad(title, 48, ' ') + SmartClinicManagement.RESET);
    }

    protected void printBoxFooter() {
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
    }
}


// ============================================================
// DOCTOR CLASS
// ============================================================

class Doctor extends User {

    private String specialization;
    private String qualification;

    public Doctor(
            int id,
            String name,
            String email,
            String phone,
            String specialization,
            String qualification) {

        super(id, name, email, phone);

        this.specialization = specialization;
        this.qualification = qualification;
    }

    public String getSpecialization() {
        return specialization;
    }

    public String getQualification() {
        return qualification;
    }

    @Override
    public void displayInfo() {

        printBoxHeader("DOCTOR PROFILE");
        printRow("Doctor ID", String.valueOf(getId()));
        printRow("Name", getName());
        printRow("Email", getEmail());
        printRow("Phone", getPhone());
        printRow("Specialization", specialization);
        printRow("Qualification", qualification);
        printBoxFooter();
    }
}


// ============================================================
// PATIENT CLASS
// ============================================================

class Patient extends User {

    private int age;
    private String gender;
    private String address;

    public Patient(
            int id,
            String name,
            String email,
            String phone,
            int age,
            String gender,
            String address) {

        super(id, name, email, phone);

        this.age = age;
        this.gender = gender;
        this.address = address;
    }

    @Override
    public void displayInfo() {

        printBoxHeader("PATIENT PROFILE");
        printRow("Patient ID", String.valueOf(getId()));
        printRow("Name", getName());
        printRow("Email", getEmail());
        printRow("Phone", getPhone());
        printRow("Age", String.valueOf(age));
        printRow("Gender", gender);
        printRow("Address", address);
        printBoxFooter();
    }
}


// ============================================================
// APPOINTMENT CLASS
// ============================================================

class Appointment {

    private int id;
    private int patientId;
    private int doctorId;
    private String date;
    private String time;
    private String reason;

    public Appointment(
            int id,
            int patientId,
            int doctorId,
            String date,
            String time,
            String reason) {

        this.id = id;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.date = date;
        this.time = time;
        this.reason = reason;
    }

    public int getId() {
        return id;
    }

    public int getPatientId() {
        return patientId;
    }

    public int getDoctorId() {
        return doctorId;
    }

    public String getDate() {
        return date;
    }

    public String getTime() {
        return time;
    }

    public void displayInfo() {

        printBoxHeader("APPOINTMENT #" + id);
        printRow("Patient ID", String.valueOf(patientId));
        printRow("Doctor ID", String.valueOf(doctorId));
        printRow("Date", date);
        printRow("Time", time);
        printRow("Reason", reason);
        printBoxFooter();
    }

    private void printRow(String label, String value) {
        System.out.println("   " + SmartClinicManagement.CYAN
                + SmartClinicManagement.pad(label, 16, ' ')
                + SmartClinicManagement.RESET + value);
    }

    private void printBoxHeader(String title) {
        System.out.println();
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BOLD
                + SmartClinicManagement.pad(title, 48, ' ') + SmartClinicManagement.RESET);
    }

    private void printBoxFooter() {
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
    }
}


// ============================================================
// PRESCRIPTION CLASS
// ============================================================

class Prescription {

    private int id;
    private int patientId;
    private int doctorId;
    private String medicine;
    private String dosage;
    private String duration;
    private String instructions;

    public Prescription(
            int id,
            int patientId,
            int doctorId,
            String medicine,
            String dosage,
            String duration,
            String instructions) {

        this.id = id;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.medicine = medicine;
        this.dosage = dosage;
        this.duration = duration;
        this.instructions = instructions;
    }

    public void displayInfo() {

        System.out.println();
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BOLD
                + SmartClinicManagement.pad("PRESCRIPTION #" + id, 48, ' ')
                + SmartClinicManagement.RESET);
        row("Patient ID", String.valueOf(patientId));
        row("Doctor ID", String.valueOf(doctorId));
        row("Medicine", medicine);
        row("Dosage", dosage);
        row("Duration", duration);
        row("Instructions", instructions);
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
    }

    private void row(String label, String value) {
        System.out.println("   " + SmartClinicManagement.CYAN
                + SmartClinicManagement.pad(label, 16, ' ')
                + SmartClinicManagement.RESET + value);
    }
}


// ============================================================
// MEDICAL RECORD CLASS
// ============================================================

class MedicalRecord {

    private int id;
    private int patientId;
    private int doctorId;
    private String diagnosis;
    private String symptoms;
    private String notes;

    public MedicalRecord(
            int id,
            int patientId,
            int doctorId,
            String diagnosis,
            String symptoms,
            String notes) {

        this.id = id;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.diagnosis = diagnosis;
        this.symptoms = symptoms;
        this.notes = notes;
    }

    public int getPatientId() {
        return patientId;
    }

    public void displayInfo() {

        System.out.println();
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BOLD
                + SmartClinicManagement.pad("MEDICAL RECORD #" + id, 48, ' ')
                + SmartClinicManagement.RESET);
        row("Patient ID", String.valueOf(patientId));
        row("Doctor ID", String.valueOf(doctorId));
        row("Diagnosis", diagnosis);
        row("Symptoms", symptoms);
        row("Notes", notes);
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
    }

    private void row(String label, String value) {
        System.out.println("   " + SmartClinicManagement.CYAN
                + SmartClinicManagement.pad(label, 16, ' ')
                + SmartClinicManagement.RESET + value);
    }
}


// ============================================================
// BILL CLASS
// ============================================================

class Bill {

    private int id;
    private int patientId;
    private double consultationFee;
    private double medicineFee;
    private double testFee;
    private double total;

    public Bill(
            int id,
            int patientId,
            double consultationFee,
            double medicineFee,
            double testFee,
            double total) {

        this.id = id;
        this.patientId = patientId;
        this.consultationFee = consultationFee;
        this.medicineFee = medicineFee;
        this.testFee = testFee;
        this.total = total;
    }

    public double getTotal() {
        return total;
    }

    public void displayInfo() {

        System.out.println();
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BOLD
                + SmartClinicManagement.pad("BILL #" + id, 48, ' ')
                + SmartClinicManagement.RESET);
        row("Patient ID", String.valueOf(patientId));
        row("Consultation", "Rs. " + String.format("%.2f", consultationFee));
        row("Medicines", "Rs. " + String.format("%.2f", medicineFee));
        row("Tests", "Rs. " + String.format("%.2f", testFee));
        System.out.println("   " + SmartClinicManagement.GREEN + SmartClinicManagement.pad("TOTAL", 16, ' ')
                + " : Rs. " + String.format("%.2f", total) + SmartClinicManagement.RESET);
        System.out.println("   " + SmartClinicManagement.BLUE
                + "+------------------------------------------------+" + SmartClinicManagement.RESET);
    }

    private void row(String label, String value) {
        System.out.println("   " + SmartClinicManagement.CYAN
                + SmartClinicManagement.pad(label, 16, ' ')
                + SmartClinicManagement.RESET + value);
    }
}