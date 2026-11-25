# Smart Clinic Management System (`wellnest.`)

A complete Smart Clinic Management System built in **Java** with a modern 12-screen web frontend (`wellnest.`), powered by an embedded `java.net.ServerSocket` HTTP server with zero external dependencies.

## Features
- **Role-Based Portals**: Administrator (`admin` / `admin123`, 3-attempt lockout), Doctor (Doctor ID login), and Receptionist desk.
- **System Statistics**: Live KPIs, weekly appointment chart, daily status breakdown, and upcoming visits table.
- **Doctor Management**: Add, view, search, filter by specialty, delete doctors, and export CSV.
- **Patient Management**: Register patients with inline validation, search by ID/name/phone/email, and view full medical history & prescriptions.
- **Appointment Scheduling**: Interactive calendar, 30-minute time slot grid with real double-booking conflict prevention, status tracking, and appointment cancellation.
- **Clinical Workspace**: Doctor schedule view, Medical Record creation, and Prescription builder with live `Rx` preview & printing.
- **Billing & Invoices**: Generate itemized bills (Consultation, Medicine, Test fees in `Rs.`), filter Paid/Unpaid invoices, record payments, print, and download receipts.
- **Dual Mode**: Web UI by default, plus original console CLI mode via `--cli`.

## Architecture
The project preserves the 8 core Java classes in `SmartClinicManagement.java` without extra classes or external libraries:
- `SmartClinicManagement`
- `User` (abstract)
- `Doctor`
- `Patient`
- `Appointment`
- `MedicalRecord`
- `Prescription`
- `Bill`

## How to Run
```powershell
javac SmartClinicManagement.java
java SmartClinicManagement
```
Then open **http://localhost:8080** in your browser.

### Optional Flags
- Custom port: `java SmartClinicManagement --port 9090`
- Original console interface: `java SmartClinicManagement --cli`
