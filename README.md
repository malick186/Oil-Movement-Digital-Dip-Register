# MASTER DEVELOPMENT PROMPT

## Tank Farm & Oil Terminal Dip Recording Control Center

Develop a complete, polished, production-oriented **offline desktop application** named:

# **Tank Farm & Terminal Dip Recording Control Center**

The application will be used by an **Oil Movement / Tank Farm / Oil Terminal operations team** for recording, verifying, approving, tracking, and reviewing tank gauging observations.

The application must reflect the actual operational workflow used in refinery Tank Farm and Oil Terminal operations.

---

# 1. TECHNOLOGY STACK

Use:

* **Tauri 2.x**
* **React**
* **TypeScript**
* **Vite**
* **Rust / Tauri Commands**
* **SQLite**
* **Tailwind CSS**
* **Lucide React**
* **React Hook Form**
* **Zod**
* **Zustand**
* **Recharts**
* **date-fns**

The application must work completely **offline**.

Do NOT require:

* Internet
* Cloud
* Website hosting
* Remote APIs
* SQL Server
* PostgreSQL
* MySQL
* Node.js server at runtime
* Windows Service
* Administrator rights
* External authentication service

All operational data must remain locally on the user's computer.

---

# 2. DEPLOYMENT

Primary target:

**Windows 10/11 corporate computers with restricted IT access.**

The application should support current-user installation under a writable location such as:

`%LOCALAPPDATA%`

It should NOT require:

`Run as Administrator`

Where practical, provide a portable Windows build.

Use the installed Microsoft WebView2 runtime where available.

The application must not automatically download external components at runtime.

---

# 3. APPLICATION PURPOSE

The application will digitize and improve the existing **Tank Dip Register and Tank Gauging Verification process**.

The normal operational workflow is:

1. A designated Field Operator performs tank gauging.
2. The Operator takes the required observations.
3. The Shift Supervisor records the observations in the application.
4. The system stores the tank, product, gauging values, tank status, operator, date/time and remarks.
5. Radar and Auto Dip readings are recorded along with the physical Gross Dip.
6. The system automatically calculates differences between Gross Dip, Auto Dip and Radar Dip.
7. At shift closing, the Shift In-Charge reviews the readings and their differences.
8. The Shift In-Charge determines whether the observation is acceptable.
9. The reading may be:

   * Approved
   * Recheck Required
   * Rejected / Not OK
10. Approved records become part of the permanent operational history.

The application should therefore function as:

**Digital Dip Register + Tank Gauging Verification System + Shift Closing Control Center.**

---

# 4. CORE WORKFLOW

Implement the following workflow:

**Tank Gauging**

→

**Operator Performs Dip**

→

**Shift Supervisor Records Dip**

→

**Gross Dip / Auto Dip / Radar Dip Comparison**

→

**Automatic Difference Calculation**

→

**Tolerance Evaluation**

→

**Shift In-Charge Review**

→

**Approve / Recheck / Reject**

→

**Shift Closing**

→

**Permanent Historical Record**

→

**Audit Trail**

---

# 5. REQUIRED DIP RECORD

Every Dip Record must contain the following fields:

1. **Date**
2. **Time**

   * Format: `HH:MM`
   * Use 24-hour format
3. **Tank No.**
4. **Product Type**

   * Crude
   * HSFO
   * HSD
   * MS
   * Naphtha
   * Product Master should remain extensible for future products
5. **Reference Point**

   * Automatically obtained from the selected Tank's Master Data
   * Should normally not require manual typing during each Dip entry
6. **Gross Dip**

   * Unit: mm
7. **Auto Dip**

   * Unit: mm
8. **Radar Dip**

   * Unit: mm
9. **Water Dip**

   * Unit: mm
10. **Sludge Dip**

    * Unit: mm
11. **Temperature**

    * Support °C or °F
    * Temperature unit must be recorded with the observation
12. **Density**

    * Numeric field
    * Allow suitable decimal precision
13. **Tank Status**

    * Dropdown list
    * Values configurable through Master Data / Settings
    * Also allow a controlled "Other / Custom" status where permitted
14. **Dip Performed By**

    * Dropdown containing Operator names
    * Names obtained from Operator Master
15. **Remarks**

    * Free-text/custom field

System-generated information must additionally include:

* Unique Record Number
* Location
* Shift
* Entered By
* Entry Date/Time
* Reviewed By
* Review Date/Time
* Approval Status
* Approval Date/Time
* Correction Status
* Audit information

---

# 6. USER ROLES

Initially support:

## Shift Supervisor

Can:

* Create Dip Records
* Select Tank
* Select Product
* Select Operator
* Enter Gross Dip
* Enter Auto Dip
* Enter Radar Dip
* Enter Water Dip
* Enter Sludge Dip
* Enter Temperature and unit
* Enter Density
* Select Tank Status
* Enter Remarks
* Submit Dip for verification
* View Dip history
* Correct unapproved records
* Request correction of approved records

## Shift In-Charge

Can:

* Review Dip Records
* Review Gross/Auto/Radar differences
* Approve readings
* Mark Recheck Required
* Reject / Not OK
* Enter review remarks
* Approve corrected readings
* Complete Shift Closing
* Review Exceptions
* Review reports and trends

## Administrator

Can manage:

* Tank Master
* Product Master
* Operator Master
* Users
* Roles
* Tank Status Master
* Locations
* Shift configuration
* Tolerances
* Reference Points
* Temperature defaults
* Backup/Restore
* General application settings

Field Operators do not necessarily require application login.

Their identity is recorded using the **Dip Performed By** field.

---

# 7. LEFT NAVIGATION

Create a professional fixed/collapsible **left navigation sidebar**.

## OPERATIONS

* Dashboard
* New Dip
* Dip Verification
* Shift Closing
* Tank Status
* Exceptions

## RECORDS

* Dip History
* Tank Trends
* Reports

## MASTER DATA

* Tank Master
* Product Master
* Operator Master
* Tank Status Master

## SYSTEM

* User Management
* Settings
* Backup & Restore
* Audit Log

At the bottom display:

* Logged-in User
* Role
* Current Shift
* Application Version

---

# 8. DASHBOARD

Create a professional Tank Farm operations dashboard.

Display:

### Current Shift

* Date
* Shift
* Shift Start
* Shift End
* Shift Supervisor
* Shift In-Charge

### KPI Cards

* Active Tanks
* Tanks Expected for Gauging
* Dips Completed
* Dips Pending
* Awaiting Review
* Recheck Required
* Abnormal Difference
* Approved
* Shift Closing Status

### Attention Required Table

Columns:

* Tank No.
* Product
* Gross Dip
* Auto Dip
* Radar Dip
* Gross vs Auto Difference
* Gross vs Radar Difference
* Tank Status
* Verification Status
* Last Gauged
* Action

Provide quick actions:

* Record New Dip
* Review Pending Dips
* Open Shift Closing
* View Exceptions

---

# 9. TANK MASTER

Create a proper Tank Master.

Fields should include:

* Tank ID
* Tank No.
* Location
* Tank Farm / Terminal
* Normal Product
* Current Product
* **Reference Point**
* Tank Type
* Roof Type
* Safe Fill Height
* Minimum Operating Level
* Reference Gauge Height if applicable
* Datum Height if applicable
* Working Capacity if available
* Radar Available — Yes/No
* Auto Dip Available — Yes/No
* Water Dip Applicable — Yes/No
* Sludge Dip Applicable — Yes/No
* Active / Inactive
* Remarks

The **Reference Point must be associated with the Tank Master**.

When a user selects a Tank during Dip Entry, automatically display its Reference Point.

Example:

`Tank No.: KG-05`

`Reference Point: Gauge Hatch No. 1`

The user should normally not have to manually enter the Reference Point every time.

Allow the Administrator to update Reference Point information.

---

# 10. PRODUCT MASTER

Initial Product Types:

* Crude
* HSFO
* HSD
* MS
* Naphtha

Do not permanently hardcode the list.

Create Product Master so additional products can later be added.

Fields:

* Product ID
* Product Name
* Product Code
* Category
* Active / Inactive
* Remarks

---

# 11. OPERATOR MASTER

Fields:

* Employee ID
* Operator Name
* Designation
* Location
* Shift Group
* Active / Inactive
* Remarks

During Dip Entry:

`Dip Performed By: [Operator Name ▼]`

Employee ID and designation may automatically display after selection.

---

# 12. TANK STATUS MASTER

Do not permanently hardcode Tank Status values.

Create a configurable Tank Status Master.

Suggested initial statuses:

* Static
* Receiving
* Delivering
* Settling
* Inter Tank Transfer
* Export
* Import
* Under Maintenance
* Isolated
* Out of Service
* Circulation
* Mixing
* Other

Administrator should be able to:

* Add Status
* Edit Status
* Activate / Deactivate Status
* Define Display Order

For "Other", allow the Supervisor to enter a short custom description where permitted.

---

# 13. NEW DIP ENTRY SCREEN

Create a modern card-based form.

## SECTION A — GENERAL INFORMATION

Fields:

**Date**

Use date picker.

Default to current date but allow authorized modification where necessary.

**Time**

Use `HH:MM` 24-hour format.

Default to current time.

**Tank No.**

Searchable dropdown from Tank Master.

After Tank selection automatically display:

* Location
* Reference Point
* Normal Product
* Radar Availability
* Auto Dip Availability

**Product Type**

Dropdown from Product Master.

Initial products:

* Crude
* HSFO
* HSD
* MS
* Naphtha

Product may default from Tank Master but remain editable where operationally required.

---

## SECTION B — REFERENCE POINT

Display:

**Reference Point**

Automatically populated from Tank Master.

Example:

`Reference Point: Gauge Hatch No. 1`

Make it read-only during normal Dip Entry.

If the Tank has no Reference Point configured, clearly warn:

`Reference Point not configured in Tank Master.`

---

# 14. DIP OBSERVATIONS

Provide one organized Gauging Observation card.

Fields:

### Gross Dip

`_____ mm`

Required.

### Auto Dip

`_____ mm`

Required when Auto Dip is available for the Tank.

### Radar Dip

`_____ mm`

Required when Radar is available for the Tank.

### Water Dip

`_____ mm`

Allow zero where no free water is observed.

### Sludge Dip

`_____ mm`

Allow zero where no sludge is observed.

### Temperature

`_____`

Unit selector:

* °C
* °F

The selected temperature unit must be stored with the record.

### Density

Allow appropriate decimal values.

Example:

`0.8421`

Do not automatically assume Density units unless configured.

If later required, allow Density Unit to be configured through application settings.

---

# 15. TANK STATUS

Provide:

`Tank Status: [Dropdown ▼]`

Populate from Tank Status Master.

Examples:

* Static
* Receiving
* Delivering
* Settling
* ITT
* Export
* Import

If:

`Other`

is selected, display:

`Custom Status / Details: __________`

---

# 16. DIP PERFORMED BY

Provide:

`Dip Performed By: [Operator ▼]`

Operator list comes from Operator Master.

After selection display:

* Employee ID
* Designation
* Shift Group

This identifies the person who physically performed the tank gauging.

---

# 17. REMARKS

Provide a free-text:

**Remarks**

Examples may include:

* Tank under receipt
* Water level increased
* Radar fluctuating
* Auto Dip unavailable
* Recheck requested
* Gauging performed after settling
* Any abnormal observation

Do not restrict Remarks to predefined values.

---

# 18. AUTOMATIC DIFFERENCE CALCULATIONS

After entering:

* Gross Dip
* Auto Dip
* Radar Dip

automatically calculate:

### Gross Dip vs Auto Dip

`Gross Dip - Auto Dip`

### Gross Dip vs Radar Dip

`Gross Dip - Radar Dip`

Optionally also calculate:

### Auto Dip vs Radar Dip

`Auto Dip - Radar Dip`

Display both:

* Signed Difference
* Absolute Difference

Example:

Gross Dip = `11,845 mm`

Auto Dip = `11,847 mm`

Radar Dip = `11,849 mm`

Display:

`Gross vs Auto = -2 mm`

`Absolute Difference = 2 mm`

`Gross vs Radar = -4 mm`

`Absolute Difference = 4 mm`

Never require the user to manually calculate these differences.

---

# 19. DIP COMPARISON PANEL

Create a clear comparison panel:

| Reading        |     Value |
| -------------- | --------: |
| Gross Dip      | 11,845 mm |
| Auto Dip       | 11,847 mm |
| Radar Dip      | 11,849 mm |
| Gross vs Auto  |     -2 mm |
| Gross vs Radar |     -4 mm |
| Auto vs Radar  |     -2 mm |

Display status below:

`WITHIN TOLERANCE`

or

`ATTENTION REQUIRED`

or

`RECHECK REQUIRED`

---

# 20. CONFIGURABLE TOLERANCES

Do NOT hardcode allowable differences.

Create:

**Settings → Gauging Tolerance Configuration**

Allow tolerance rules based on:

* Tank
* Product
* Location
* Measurement comparison

Comparison types:

* Gross vs Auto
* Gross vs Radar
* Auto vs Radar

Support:

### Normal

Within approved limit.

### Attention

Requires review.

### Recheck Required

Exceeds approved limit.

Example values may be used only as sample/demo data.

Actual limits must be configured according to approved company SOP/procedure.

---

# 21. WATER AND SLUDGE VALIDATION

Implement validation for:

* Water Dip
* Sludge Dip

Values must:

* Be numeric
* Not be negative
* Remain within reasonable tank/reference limits

If Water Dip or Sludge Dip shows an unusual increase from the previous reading, optionally flag:

`Significant change from previous Dip`

Do not automatically reject the record.

Leave final decision to the reviewer.

---

# 22. TEMPERATURE HANDLING

Support:

* °C
* °F

Store both:

* Numeric Temperature
* Temperature Unit

Do not silently convert the original observation.

If conversion is displayed, retain the original entered value.

Example:

`Observed Temperature: 35.5 °C`

Optional calculated display:

`Equivalent: 95.9 °F`

The original observation remains authoritative.

---

# 23. DENSITY

Record Density as a dedicated numeric field.

Allow configurable decimal precision.

Do not automatically replace Density with Specific Gravity.

If future requirements require:

* Density @ observed temperature
* Density @ 15°C
* API Gravity
* Specific Gravity

these can be added later as separate controlled fields/calculations.

For V1, maintain the user-entered **Density** value.

---

# 24. DIP VERIFICATION SCREEN

Create a dedicated Shift In-Charge verification screen.

Display:

* Date
* Time
* Tank No.
* Product
* Reference Point
* Gross Dip
* Auto Dip
* Radar Dip
* Gross/Auto Difference
* Gross/Radar Difference
* Water Dip
* Sludge Dip
* Temperature
* Temperature Unit
* Density
* Tank Status
* Dip Performed By
* Remarks
* Entered By
* Evaluation
* Review Status

Actions:

* Approve
* Recheck Required
* Reject / Not OK
* Add Review Remarks

---

# 25. RECHECK WORKFLOW

If Shift In-Charge selects:

**Recheck Required**

retain the original record.

Supervisor can create a linked recheck observation.

Store:

* Original Gross Dip
* Original Auto Dip
* Original Radar Dip
* Original Water Dip
* Original Sludge Dip
* Original Temperature
* Original Density
* Original Operator
* Original Time

and separately:

* Recheck readings
* Recheck Operator
* Recheck Time
* Recheck Remarks
* Final reviewer
* Final decision

Never overwrite the initial observation.

---

# 26. RECORD STATUS WORKFLOW

Use:

* Draft
* Recorded
* Submitted
* Under Review
* Attention Required
* Recheck Required
* Rejected
* Approved
* Correction Requested
* Corrected
* Re-approved

Enforce valid transitions.

---

# 27. APPROVED RECORD IMMUTABILITY

Once approved, a Dip Record must not be silently modified.

If correction is required:

1. Correction request is created.
2. Reason is mandatory.
3. Original data remains stored.
4. Revised values are recorded separately.
5. Changed fields are highlighted.
6. Revised record requires approval.
7. Complete audit trail remains available.

Track changes to all relevant fields including:

* Date
* Time
* Tank
* Product
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature
* Temperature Unit
* Density
* Tank Status
* Operator
* Remarks

---

# 28. SHIFT CLOSING CONTROL CENTER

Create a dedicated:

# **Shift Closing Review**

Show all Tanks expected to be gauged.

Columns:

* Tank
* Product
* Gross Dip
* Auto Dip
* Radar Dip
* Gross/Auto Difference
* Gross/Radar Difference
* Water Dip
* Sludge Dip
* Tank Status
* Performed By
* Evaluation
* Review Status

Summary:

* Expected Tanks
* Completed
* Missing
* Approved
* Pending Review
* Attention Required
* Recheck Required
* Rejected

Do not allow Shift Closing where mandatory requirements remain unresolved.

Examples:

* Tank not gauged
* Record pending review
* Recheck pending
* Gross Dip missing
* Radar reading required but missing
* Auto Dip required but missing
* Operator missing
* Tank Status missing

Shift In-Charge explicitly closes the shift.

Store:

* Date
* Shift
* Closed By
* Closed At
* Closing Remarks
* Total Dips
* Total Exceptions
* Pending items
* Final status

---

# 29. TANK STATUS BOARD

Display all active Tanks using cards/table.

Show:

* Tank No.
* Product
* Reference Point
* Tank Status
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature
* Density
* Gross/Auto Difference
* Gross/Radar Difference
* Last Gauged
* Dip Performed By
* Approval Status

Clicking a Tank opens Tank Detail.

---

# 30. TANK DETAIL PAGE

Show:

### Master Information

* Tank No.
* Location
* Product
* Reference Point
* Tank Type
* Safe Fill Height

### Latest Observation

* Date
* Time
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature
* Temperature Unit
* Density
* Tank Status
* Dip Performed By
* Remarks

### Verification

* Gross vs Auto
* Gross vs Radar
* Evaluation
* Reviewed By
* Approval

### History

Show previous Dip records.

### Trends

Show Tank-specific charts.

---

# 31. DIP HISTORY

Provide filters:

* Date From
* Date To
* Tank
* Product
* Location
* Shift
* Operator / Dip Performed By
* Entered By
* Reviewed By
* Tank Status
* Approval Status
* Difference threshold

Results should include:

* Date
* Time
* Tank
* Product
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature
* Density
* Tank Status
* Operator
* Difference
* Status

---

# 32. TANK TRENDS

Provide trends for:

* Gross Dip
* Auto Dip
* Radar Dip
* Gross vs Auto Difference
* Gross vs Radar Difference
* Water Dip
* Sludge Dip
* Temperature
* Density

Allow filters:

* Current Shift
* 24 Hours
* 7 Days
* 30 Days
* Custom Date Range

Deviation trends should help identify potential systematic Radar/Auto Dip differences.

---

# 33. EXCEPTION CONTROL CENTER

Create dedicated exception monitoring.

Possible exception types:

* Gross vs Auto Difference
* Gross vs Radar Difference
* Auto vs Radar Difference
* Missing Gross Dip
* Missing Radar Dip
* Missing Auto Dip
* Unusual Water Dip
* Unusual Sludge Dip
* Missing Temperature
* Missing Density
* Missing Operator
* Missing Tank Status
* Tank overdue for gauging
* Dip not reviewed
* Recheck pending
* Correction pending
* Shift Closing pending

Display:

* Severity
* Tank
* Product
* Date
* Time
* Exception Type
* Actual Value
* Expected/Tolerance
* Status
* Action Required
* Resolution

---

# 34. AUDIT TRAIL

Create an append-only Audit Log.

Track:

* Login
* Logout
* Dip Created
* Dip Updated
* Dip Submitted
* Dip Reviewed
* Dip Approved
* Recheck Requested
* Dip Rejected
* Correction Requested
* Dip Corrected
* Dip Re-approved
* Shift Closed
* Tank Master Changed
* Reference Point Changed
* Operator Changed
* Tank Status Master Changed
* Tolerance Changed
* Backup Created
* Restore Performed
* User Created
* User Disabled

Store:

* Timestamp
* User
* Role
* Action
* Record ID
* Tank
* Old Value
* New Value
* Reason
* Remarks

Users must not be able to manually edit Audit Log records.

---

# 35. SQLITE DATABASE

Use SQLite.

Suggested logical tables:

* users
* roles
* locations
* shifts
* tanks
* products
* operators
* tank_statuses
* dip_records
* dip_reviews
* dip_rechecks
* dip_corrections
* shift_closings
* tolerance_settings
* exceptions
* audit_logs
* application_settings

A Dip Record should logically support fields such as:

* id
* record_number
* date
* time
* shift_id
* tank_id
* product_id
* reference_point_snapshot
* gross_dip_mm
* auto_dip_mm
* radar_dip_mm
* water_dip_mm
* sludge_dip_mm
* temperature
* temperature_unit
* density
* tank_status_id
* custom_tank_status
* operator_id
* remarks
* gross_auto_difference
* gross_radar_difference
* auto_radar_difference
* entered_by
* entered_at
* review_status
* reviewed_by
* reviewed_at
* approval_status
* approved_by
* approved_at
* record_status

Maintain a **Reference Point snapshot** in each historical Dip Record.

Even if Tank Master Reference Point is later changed, old records must continue showing the Reference Point that was applicable when that Dip was recorded.

---

# 36. RECORD NUMBER

Automatically generate a unique Record Number.

Example:

`DIP-20260808-0001`

Use database constraints to guarantee uniqueness.

---

# 37. LOCAL AUTHENTICATION

Use secure offline authentication.

Store:

* Username
* Password Hash
* Role
* Active/Inactive

Never store passwords in plain text.

Backend authorization should protect critical commands.

Do not depend only on hiding buttons in React.

---

# 38. DATA STORAGE

Store application data in an appropriate local application directory.

Example:

`%LOCALAPPDATA%\TankFarmDipControl\`

Subfolders:

`Data`

`Backup`

`Reports`

`Logs`

`Config`

Primary database:

`Data\tankfarm.db`

---

# 39. BACKUP & RESTORE

Provide:

### Manual Backup

`Create Backup Now`

### Automatic Backup

Options:

* Daily
* At Shift Closing
* Both

Display:

* Last Backup
* Database Size
* Records
* Backup Directory
* Backup Status

Backup filename example:

`TankDip_2026-08-08_211500.db`

Restore should:

* Require appropriate permission
* Validate selected database
* Create safety backup
* Restore database
* Log restore activity

---

# 40. REPORTS

Initial reports should include:

* Daily Dip Register
* Shift Dip Register
* Tank-Wise Dip History
* Gross vs Auto Dip Difference Report
* Gross vs Radar Difference Report
* Water Dip Report
* Sludge Dip Report
* Temperature Report
* Density Report
* Recheck Report
* Pending Approval Report
* Shift Closing Report
* Operator-Wise Gauging Report
* Tank Status Report

Future export options may include:

* PDF
* Excel
* CSV

The application must remain usable without Microsoft Office.

---

# 41. UI/UX

Use a professional industrial operations design.

Requirements:

* Left Navigation
* Compact operational tables
* Dashboard KPI cards
* Searchable dropdowns
* Clear badges
* Professional forms
* Confirmation dialogs
* Toast messages
* Keyboard-friendly data entry
* Clear error messages
* Responsive desktop layout
* Light/Dark Mode if practical

Do not make it look like a generic commercial website.

Prioritize speed and clarity for Shift personnel.

---

# 42. FORM VALIDATION

Validate:

* Date
* HH:MM time
* Tank selection
* Product
* Gross Dip
* Auto Dip when required
* Radar Dip when required
* Water Dip
* Sludge Dip
* Temperature
* Temperature Unit
* Density
* Tank Status
* Operator

Numeric readings cannot be negative unless a specific future operational requirement permits it.

Validate Dip values against reasonable Tank dimensions where Tank Master data is available.

---

# 43. DUPLICATE PROTECTION

Detect probable duplicate records based on:

* Tank
* Date
* Time
* Shift

Warn the Supervisor before saving.

Do not silently remove a duplicate record.

---

# 44. OFFLINE-FIRST

All normal operations must work when:

* Internet is disconnected
* Wi-Fi is disabled
* Corporate network is unavailable

No telemetry.

No cloud synchronization.

No external analytics.

No remote data transfer.

---

# 45. OT / DCS SECURITY

V1 must NOT directly connect to:

* DCS
* PLC
* SCADA
* OPC
* Historian
* Tank Radar network
* ATG network
* Modbus
* Process control network

Auto Dip and Radar Dip readings must initially be entered manually.

Design the code so a future read-only approved integration module can be added later without redesigning the entire application.

---

# 46. FUTURE PETROLEUM CALCULATION MODULE

Keep the architecture extensible for future Tank Calibration Tables and petroleum calculations.

Possible future calculations may include:

* Observed Volume
* Gross Observed Volume
* Free Water Volume
* Net Observed Volume
* Temperature Correction
* Standard Volume
* Density Correction
* Mass
* Ullage

Do NOT invent ASTM/API formulas.

Actual approved standards and Tank Calibration Tables will be provided separately.

V1 should focus on recording and verification.

---

# 47. CODE STRUCTURE

React:

`src/components`

`src/pages`

`src/features`

`src/layouts`

`src/hooks`

`src/store`

`src/services`

`src/types`

`src/utils`

`src/validation`

Feature modules:

* auth
* dashboard
* dips
* verification
* shift-closing
* tanks
* operators
* products
* tank-status
* exceptions
* history
* trends
* reports
* backup
* settings
* audit

Rust code should also be modular.

Do not place all backend/business logic into one file.

---

# 48. DATABASE MIGRATIONS

Implement schema migrations.

Application updates must not require deleting the existing database.

Maintain schema version and safe forward migrations.

---

# 49. ERROR HANDLING

Provide understandable errors.

Example:

`Unable to save Dip Record. Please verify the entered values.`

Do not expose raw SQL, Rust stack traces or JavaScript errors to normal users.

Store technical diagnostic information locally.

---

# 50. DEVELOPMENT PHASES

## PHASE 1 — CORE

Build:

* Tauri application
* React UI
* SQLite database
* Authentication
* Left Navigation
* Dashboard
* Tank Master
* Product Master
* Operator Master
* Tank Status Master
* New Dip Entry
* Reference Point handling
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature °C/°F
* Density
* Tank Status
* Dip Performed By
* Remarks
* Automatic difference calculation
* Verification
* Approval
* Dip History
* Audit Trail
* Backup/Restore

## PHASE 2 — SHIFT CONTROL

Add:

* Expected Dip List
* Missing Dip Detection
* Recheck Workflow
* Shift Closing
* Tank Status Board
* Exception Control Center

## PHASE 3 — ANALYTICS

Add:

* Gross Dip Trends
* Auto Dip Trends
* Radar Trends
* Difference Trends
* Water Dip Trends
* Sludge Dip Trends
* Temperature Trends
* Density Trends
* Advanced Reports

## PHASE 4 — CALCULATIONS

Only after approved Calibration Tables and petroleum standards are provided.

---

# 51. CORE ACCOUNTABILITY PRINCIPLE

Every Dip Record must clearly distinguish:

### DIP PERFORMED BY

The Operator who physically performed the Tank gauging.

### ENTERED BY

The Shift Supervisor or authorized user who entered the readings.

### REVIEWED / APPROVED BY

The Shift In-Charge who reviewed Gross Dip against Auto Dip and Radar Dip and accepted/rejected the observation.

These identities must remain separate.

---

# 52. CORE DATA-INTEGRITY PRINCIPLE

Every physical Dip must be traceable.

Every entered observation must have:

* Date
* Time
* Tank No.
* Product
* Reference Point
* Gross Dip
* Auto Dip
* Radar Dip
* Water Dip
* Sludge Dip
* Temperature and Unit
* Density
* Tank Status
* Dip Performed By
* Remarks

Every entry must identify its creator.

Every verification must identify its reviewer.

Every correction must have a reason.

Every approved record must remain historically immutable.

Every recheck must preserve the original observation.

Every Shift Closing must identify unresolved observations.

---

# 53. FINAL V1 NAVIGATION

## OPERATIONS

* Dashboard
* New Dip
* Dip Verification
* Shift Closing
* Tank Status
* Exceptions

## RECORDS

* Dip History
* Tank Trends
* Reports

## MASTER DATA

* Tank Master
* Product Master
* Operator Master
* Tank Status Master

## SYSTEM

* Users
* Settings
* Backup & Restore
* Audit Log

---

# 54. FINAL DELIVERABLE

Build a fully working application, not only UI mockups.

Deliver:

* Complete source code
* Working Tauri desktop application
* React + TypeScript frontend
* Rust backend
* SQLite database
* Database migrations
* Authentication
* Role-based authorization
* Tank Master
* Reference Point configuration
* Product Master
* Operator Master
* Tank Status Master
* Dip Entry
* Verification
* Shift Closing
* Tank Status
* Dip History
* Exceptions
* Audit Log
* Backup/Restore
* Sample Data
* README
* Build instructions
* Offline deployment instructions
* Database schema documentation

Verify that:

* App starts correctly
* No internet is required
* No administrator rights are required
* Database persists after restart
* Tank selection retrieves Reference Point
* Date and `HH:MM` Time save correctly
* Product selection works
* Gross Dip saves correctly
* Auto Dip saves correctly
* Radar Dip saves correctly
* Water Dip saves correctly
* Sludge Dip saves correctly
* °C/°F Temperature works correctly
* Density saves with proper decimal precision
* Tank Status dropdown works
* Custom Tank Status works where enabled
* Dip Performed By retrieves Operator names
* Remarks save correctly
* Gross/Auto difference calculates correctly
* Gross/Radar difference calculates correctly
* Shift In-Charge verification works
* Approved records cannot be silently modified
* Recheck workflow preserves original records
* Shift Closing validation works
* Audit Log works
* Backup and Restore work
* Historical search works

The objective is to create a reliable and professional:

# **Tank Farm & Terminal Dip Recording Control Center**

for Oil Movement operations, with emphasis on:

**Operational Traceability
Data Integrity
Gauging Verification
Shift Accountability
Offline Reliability
Simple Data Entry
Industrial UI/UX
No-Admin Deployment**
