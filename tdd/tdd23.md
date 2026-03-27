# 2.3. Staff/Admin Dashboard

## Overview

The staff and admin dashboard provides OCSL personnel with comprehensive oversight of the party registration system. While the system automates most processing, staff retain full visibility and manual override capabilities.

**Access Levels:**

- **Staff:** View-only access with limited edit permissions (attendance tracking only)
- **Admin:** Full CRUD access to all data and system configuration

## Data Management Tables

The dashboard organizes data into four primary tables, accessible via tabs:

### Students

Tracks all registered students in the system.

**Columns:**

- PID
- First Name
- Last Name
- Email
- Phone Number
- Contact Preference
- **Is Registered** (Party Smart Attendance)
    - Rendered as an interactive checkbox
    - Clicking triggers confirmation popup before updating
    - Only field staff can modify
- **Residence** (Location Info Chip)
    - Displays the student's current residence short address
    - Uses the same Location Info Chip as **Parties**
    - *Info chip is only shown if the student's residence chosen date falls within the current academic year*

**New Student:**

Admin cannot create new students, as account data is provided by UNC SSO ‼️

**Edit Student:** ‼️

- IdP-owned fields (First Name, Last Name, Email, Onyen, PID) are displayed but disabled
- Each disabled field has a native browser tooltip explaining it is managed by UNC SSO
- Only Phone Number, Contact Preference, and Residence, fields are editable

### Parties

Shows all party registrations with linked location and contact data.

**Columns:**

- Short & Readable Address (Location Info Chip)
    - Displays street name and number only
- Date of Party
- Time of Party
- Contact One Name (Student Info Chip)
- Contact Two Name (Contact Info Chip)
    - *Note: Contact Two is not in the Students table but uses Info Chip pattern for consistency*

**Admin Party Create/Edit - Address Field:** ‼️

- Autocomplete is restricted to Chapel Hill addresses only
- A note below the field reads: "Only Chapel Hill addresses will appear in suggestions"

**Admin Party Create/Edit - Contact One Field:** ‼️

Instead of a plain text input, the Contact One field uses a student search autocomplete:

- Admin types any unique student field (PID, email, Onyen, or phone number)
- Suggestions appear as partial matches in the format "First Last - <matched value>"
    - Example: Search 9194 → “John Doe - **919-4**55-8822”
- The matched portion of the suggestion is bolded
- Selecting a suggestion populates Contact One with the chosen student

**Location Info Chip Detail View:**

When a Location Info Chip is clicked and the sidebar opens, the following fields are displayed:

- Fully formatted address, active hold expiration date

**Contact One Info Chip Detail View:**

When a Student Info Chip is clicked and the sidebar opens, the following fields are displayed:

- All standard student columns except for the following
- **Residence**
    - Displays the student's residence address
    - Shows a special message if the student does not have a current residence
    - *A student does not have a designated residence if the student's residence chosen date falls within the current academic year*

**Contact Two Info Chip Detail View:**

When a Contact Info Chip is clicked and the sidebar opens, the following fields are displayed:

- First name, last name, email, phone number, contact preference

### Locations

Tracks registration history and hold status for party locations.

**Columns:**

- Fully formatted address string (excluding state and country)
- Incidents (Info Chip)
    - Displays count of incidents at this location
    - Clicking opens sidebar with list of incident cards
    - Each card displays:
        - Incident DateTime
        - Severity (Remote Warning, In-Person Warning, or Citation)
        - Reference ID (if present) ‼️
        - Description (if present)
    - Above all the cards is a "Create Incident" button
        - On click: opens a centered modal popup with header "Create Incident" and empty fields for address, severity, date, time, an optional reference ID field ‼️, and an optional description field
        - Submitting the form creates the incident and closes the modal
    - Each card has a three dots menu very similar to table rows, which opens a dropdown with options to edit or delete
    - Choosing delete opens a confirmation popup before deletion
    - Choosing edit: opens the same modal but with header "Edit Incident" and fields pre-populated with the incident's current values; the card being edited is highlighted blue in the sidebar
- Active Hold
    - Displays "until [date]" or "no active hold"

### Incidents ‼️

Tracks all incidents across all locations.

**Columns:**

- Severity
    - Displayed as a colored flag next to the severity label
    - Remote Warning: Navy flag
    - In-Person Warning: Yellow flag
    - Citation: Red flag
- Address (Location Info Chip)
    - Displays the short address of the associated location
- Date
- Time
- Reference ID
    - Displays "—" if not present
- Description
    - Truncated to a fixed character limit with "..." if too long
    - Clicking the row opens the sidebar with full incident details ‼️

**New/Edit Incident:**

The create and edit sidebar contains the following fields:

- Severity (dropdown: Remote Warning, In-Person Warning, Citation)
- Address (autocomplete, same as party address field)
- Date
- Time
- Reference ID (optional)
- Description (optional)

### Accounts (Admin Only)

Manages system user accounts and police credentials.

**Columns:**

- Onyen
- Email
- First Name
- Last Name
- PID
- Role

Police accounts are mixed into this table. Fields that do not apply to police accounts (First Name, Last Name, Admin Type, etc.) display "-". ‼️

**New Account:** ‼️

The new account sidebar contains the following fields:

- First Name
- Last Name
- Email
- Onyen
- PID
- Role

Note: First Name, Last Name, Email, Onyen, and PID are placeholder values until the user logs in for the first time via SSO, at which point the IdP overwrites them with authoritative data. Role is preserved on login and is the only field that matters before first login. ‼️

**Edit Account:** ‼️

- IdP-owned fields (First Name, Last Name, Email, Onyen, PID) are displayed but disabled
- Each disabled field has a native browser tooltip explaining it is managed by UNC SSO
- Only Role is editable

## Interface Patterns

### Table Organization

- Tables are separated into tabs (one visible at a time)
- All tables share the same page context

### Sidebar

- Docked to right side of screen
- Collapsible
- Multi-purpose: detail views, create forms, edit forms
- Only one sidebar instance open at a time

### Info Chips & Detail View

When table columns reference other resources (e.g., a party references a student), they render as Info Chips.

**Appearance:**

- Small oval badge with key identifier text (e.g., student name, street address)

**Interaction:**

- Clicking an Info Chip opens the sidebar with full resource details
- Details display vertically with same structure as table columns
- Selected chip highlights with different color

**Mobile Behavior:**

- Sidebar expands to full screen width

### Table Operations

All tables support standard CRUD operations via consistent UI patterns.

**Create - New Item**

- Each table has "Add New" button
- Clicking opens sidebar with blank form fields for all columns
- Submit button validates and creates new record

**Read - View Details**

- Click Info Chip to open sidebar with full resource details

**Update - Row Options**

Each row has an action menu button with dropdown options:

- **Edit Item**
    - Opens sidebar with pre-populated form fields
    - Admin can modify any fields and submit to update
- **Delete Row**
    - Opens confirmation dialog before deletion

### Filter & Search

**Pagination**

- Display 50 resources per page
- Navigation controls
    - Previous/next arrows
    - Current page indicator
    - Total page count

**Sorting and Filtering**

- Column header button opens dropdown for each column
- Hovering column item reveals options: sort ascending, sort descending, add filter
- Sorted columns display directional icon
- Default sort: last created (most recent first)
- Filter option opens sidebar with column-specific input field

**Table-Wide Search**

- Search bar filters table to records where any column matches query
- Real-time filtering as user types

## Access Control

### Role-Based Permissions

**Staff:**

- View-only access to Students, Parties, and Locations tables
- Cannot access Create, Edit, or Delete operations
- Only exception is the ability to toggle Is Registered checkbox in Students table
- No access to Accounts table tab

**Admin:**

- Full CRUD access to all tables
- Access to Accounts table for user management
- Can manage police credentials

**Authentication:**

- Staff and Admin authenticate via Onyen SSO
- Role ("admin" or "staff") attached to account data

### Account Management

**Creating Staff/Admin Accounts:**

- Admins add new staff/admin users via Accounts table
- Uses same Create interface as other tables
- IdP-owned fields (First Name, Last Name, Email, Onyen, PID) are pre-seeded by the admin and will be overwritten on the user's first SSO login ‼️
- Role is the only field the admin sets that persists after first login ‼️
- The pre-seeded account is required for staff and admin users to log in at all. Without a matching account in the DB, the backend will reject their login with 403 Forbidden. ‼️

**Police Account Management:** ‼️

- Multiple police accounts supported
- Managed by admins via the Accounts table
- Partial CRUD: admins can view, edit, and delete police accounts
