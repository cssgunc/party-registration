# 3.3. API Routes

_This document describes API endpoints conceptually. For exact request/response schemas, refer to the interactive API documentation at `/api/docs`_

## Student Routes

**Authentication:** All routes require student or admin role, except /me routes

**Base Path:** `/api`

### POST /parties

Submit a new party registration.

**Input:** Student Create Party DTO

**Output:** Party DTO

**Notes:**

- If Place ID is not present in the database, a new Location is created
- Performs address validation, citation validation, and eligibility checks
- Validates 2 business day advance notice requirement
- Validates Party Smart attendance
- Validates that Contact Two email/phone do not overlap current student

### PUT /parties/{party_id} ‼️

Edit an existing party registration

**Input:** Student Create Party DTO

**Output:** Party DTO

**Notes:**

- Does the exact same validation as **POST /parties**
- Also validates that the student is not editing
  - A cancelled party
  - Another student’s party
  - A party in the past

### DELETE /parties/{party_id} ‼️

Changes an existing party’s status to “cancelled”

**Output**: Party DTO

Notes:

- Validates that the student is not cancelling another’s party

### GET /students/me

Get the authenticated student's information.

**Output:** Student DTO

**Usage:** Student info component and form pre-population

### PUT /students/me

Update the authenticated student's information.

**Input:** Student Update Self ‼️

**Output:** Student DTO

### PUT /students/me/residence ‼️

Update the student’s affiliated residence

**Input:** Update Residence DTO

**Output:** Location DTO

**Notes:**

- If place ID is not present in the database, a new Location is created
- Validates that the student has not tried to register a residence twice in one academic year

### GET /students/me/parties

Get all parties registered by the authenticated student.

**Output:** List of Party DTOs

**Usage:** Registration tracker component

**Notes:**

- Excludes cancelled parties ‼️

### POST /locations/autocomplete

Get address autocomplete suggestions.

**Input:** Address string

**Output:** List of address suggestions with Google Place IDs

**Usage:** Party registration form address field

---

## Police Routes

**Authentication:** All routes require police or admin role

**Base Path:** `/api`

### GET /parties/nearby

Search for parties near a specific address within a date range.

**Input (Query Params):**

- Place ID - Google Maps place ID
- Start Date - Date string (YYYY-MM-DD)
- End Date - Date string (YYYY-MM-DD)

**Output:** List of Party DTOs within 0.25 mile radius

### GET /parties

Get all parties, with optional pagination.

**Input (Query Params):** List Query Params

**Output:** Paginated list of Party DTOs

**Default:** Returns all parties if pagination not specified

### GET /parties/csv

Export parties to Excel file.

**Input (Query Params):**

- Start Date - Date string (YYYY-MM-DD, required)
- End Date - Date string (YYYY-MM-DD, required)

**Output:** Excel file stream

**Format:** Flattened representation of Party DTO

### POST /locations/autocomplete

Get address autocomplete suggestions.

**Input:** Address string

**Output:** List of address suggestions with Google Place IDs

**Usage:** Proximity search address field

### **GET /locations/{location_id}/incidents**

Get all incidents for a location.

**Output:** List of Incident DTOs

### **POST /incidents ‼️**

Create a new incident.

**Input:** Create Incident DTO

**Output:** Incident DTO

Notes:

- If Place ID is not present in the database, a new Location is created

### **PUT /incidents/{incident_id} ‼️**

Update an incident.

**Input:** Update Incident DTO **‼️**

**Output:** Incident DTO

### **DELETE /incidents/{incident_id} ‼️**

Delete an incident.

**Output:** Deleted Incident DTO

---

## Staff Routes

**Authentication:** All routes require staff or admin role

**Base Path:** `/api`

### GET /parties

Get all parties, with optional pagination.

**Input (Query Params):** List Query Params

**Output:** Paginated list of Party DTOs

### GET /students

Get all students, with optional pagination.

**Input (Query Params):** List Query Params

**Output:** Paginated list of Student DTOs

### POST /students/autocomplete ‼️

Get student autocomplete suggestions.

**Input:** Query string

**Output:** List of Student Suggestion DTOs

**Usage:** Contact One field in admin party create/edit

### PATCH /students/{student_id}/is-registered

Update a student's Party Smart attendance status.

**Input:** Boolean indicating registration status

**Output:** Student DTO

**Usage:** Attendance checkbox in Students table

**Behavior:**

- If true: sets Last Registered to current datetime
- If false: clears Last Registered

### GET /locations

Get all locations.

**Input (Query Params):** List Query Params

**Output:** List of Location DTOs

### GET /locations/{location_id}/incidents

Get all incidents for a specific location.

**Output:** List of Incident DTOs

---

## Admin Routes

**Authentication:** All routes require admin role

**Base Path:** `/api`

**Note:** Admins have access to all Staff routes plus the following:

### Parties

**GET /parties**

Get all parties with optional pagination.

**Input (Query Params):** List Query Params

**Output:** Paginated list of Party DTOs

**POST /parties**

Create a new party registration.

**Input:** Admin Create Party DTO

**Output:** Party DTO

**PUT /parties/{party_id}**

Update an existing party.

**Input:** Admin Create Party DTO

**Output:** Party DTO

**DELETE /parties/{party_id}**

Delete a party.

**Output:** Deleted Party DTO

**GET /parties/{party_id}**

Get a specific party by ID.

**Output:** Party DTO

### Students

**GET /students**

Get all students with optional pagination.

**Input (Query Params):** List Query Params

**Output:** Paginated list of Student DTOs

**POST /students**

Create a new student (requires existing account).

**Input:** Create Student DTO ‼️

**Output:** Student DTO

**Notes:**

- If Residence Place ID is not present in the database, a new Location is created
- Residence related fields are derived from Residence Place ID

**PUT /students/{student_id}**

Update a student.

**Input:** Update Student DTO

**Output:** Student DTO ‼️

**Notes:**

- If Residence Place ID is not present in the database, a new Location is created
- Residence related fields are derived from Residence Place ID
- Validation preventing multiple residence changes in one academic year are overridden by admin privileges

**DELETE /students/{student_id}**

Delete a student.

**Output:** Deleted Student DTO

**GET /students/{student_id}**

Get a specific student by ID.

**Output:** Student DTO

### Locations

**GET /locations**

Get all locations.

**Input (Query Params):** List Query Params

**Output:** List of Location DTOs

**POST /locations**

Create a new location.

**Input:** Create Location DTO

**Output:** Location DTO

**Note:** Address data is fetched from Google Maps using Place ID

**PUT /locations/{location_id}**

Update a location.

**Input:** Create Location DTO

**Output:** Location DTO

**DELETE /locations/{location_id}**

Delete a location.

**Output:** Deleted Location DTO

**GET /locations/{location_id}**

Get a specific location by ID.

**Output:** Location DTO

**GET /locations/place-details/{place_id}**

Get address details from Google Maps Place ID.

**Output:** Address data including coordinates

### Incidents

**GET /locations/{location_id}/incidents**

Get all incidents for a location.

**Output:** List of Incident DTOs

**POST /incidents ‼️**

Create a new incident.

**Input:** Create Incident DTO

**Output:** Incident DTO

Notes:

- If Place ID is not present in the database, a new Location is created

**PUT /incidents/{incident_id} ‼️**

Update an incident.

**Input:** Update Incident DTO **‼️**

**Output:** Incident DTO

**DELETE /incidents/{incident_id} ‼️**

Delete an incident.

**Output:** Deleted Incident DTO

### Accounts

**GET /accounts**

Get accounts, optionally filtered by role.

**Input (Query Params):** List Query Params

**Output:** List of Account DTOs

**POST /accounts**

Create a new account.

**Input:** Create Account DTO

**Output:** Account DTO

**PUT /accounts/{account_id}**

Update an account.

**Input:** Update Account DTO ‼️

**Output:** Account DTO

**Notes:**

- Only Role is updated. IdP-owned fields are not accepted. ‼️

**DELETE /accounts/{account_id}**

Delete an account.

**Output:** Deleted Account DTO

**GET /accounts/police** ‼️

Get all police accounts.

**Output:** List of Police Account DTOs

**POST /accounts/police** ‼️

Create a new police account.

**Input:** Create Police Account DTO

**Output:** Police Account DTO

**PUT /accounts/police/{police_id}** ‼️

Update a police account.

**Input:** Update Police Account DTO

**Output:** Police Account DTO

**DELETE /accounts/police/{police_id}** ‼️

Delete a police account.

**Output:** Deleted Police Account DTO

---

## Authentication Routes ‼️

**Authentication:** Public, with specific requirements per route.

**Base Path:** `/api`

### POST /auth/exchange ‼️

Issues session tokens after validating or provisioning an account based on role.

**Authentication:** Requires a secret `X-Internal-Secret` header. This should only be called by the Next.js server.

**Input:** Create Account DTO

**Output:** Tokens DTO

**Notes:**

- Returns 403 Forbidden if the internal secret header is incorrect
- The role in the payload is set by the Next.js server based on which login portal was used, not by the IdP ‼️
- Behavior branches on role: ‼️
  - **Student:** Upserts the account by Onyen. Creates one with all provided IdP fields if not found. If found, overwrites IdP-owned fields (First Name, Last Name, Email, PID). Role is never modified.
  - **Staff/Admin:** Does not create accounts. Looks up the account by Onyen and verifies the role in the DB matches the role in the payload. Returns 403 Forbidden if no matching account exists or if the role does not match.

### POST /auth/police/login ‼️

Authenticates police credentials and issues internal session tokens.

**Authentication:** Requires a secret `X-Internal-Secret` header. This should only be called by the Next.js server.

**Input:** Police Credentials DTO

**Output:** Tokens DTO

### POST /auth/refresh ‼️

Refreshes an expired access token using a valid refresh token.

**Authentication:** Requires a secret `X-Internal-Secret` header. This should only be called by the Next.js server.

**Input:** Refresh Token DTO

**Output:** Access Token DTO

**Notes:**

- Checks the refresh token against the database allow list, and ensures it is not expired

### POST /auth/logout ‼️

Invalidates the user's current session by revoking their refresh token.

**Authentication:** Requires a valid JWT access token, just like a regular route

**Input:** Refresh Token DTO

**Output:** None (204 status code)

**Notes:**

- This logs the user out by ensuring their refresh token can no longer be used to generate new access tokens.
