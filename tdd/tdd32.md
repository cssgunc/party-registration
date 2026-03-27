# 3.2. API Models

_This document describes the conceptual API model. For exact field names and types, refer to the API documentation at `/api/docs`_

## Output

Data Transfer Objects returned by API endpoints.

### Account DTO

- ID - Integer
- Email - String
- PID - String
- Onyen - String
- First Name - String
- Last Name - String
- Role - "staff" | "admin" | "student"

### Police Account DTO ‼️

- ID - Integer
- Email - String

### Student DTO

- ID - Integer (account id)
- PID - String
- Onyen - String
- Email - String
- First Name - String
- Last Name - String
- Phone Number - String
- Contact Preference - "call" | "text"
- Last Registered - DateTime | null
- Residence - Residence DTO | null ‼️

### Residence DTO ‼️

- Location - Location DTO
- Residence Chosen Date - DateTime

### Contact DTO

_Used for Contact Two (non-student contacts)_

- Email - String
- First Name - String
- Last Name - String
- Phone Number - String
- Contact Preference - "call" | "text"

### Location DTO

- ID - Integer
- Hold Expiration - DateTime | null

**Google Maps Data:**

- Google Place ID - String
- Formatted Address - String

**Geographic Coordinates:**

- Latitude - Float
- Longitude - Float

**Address Components (all nullable):**

- Street Number - String | null
- Street Name - String | null
- Unit - String | null
- City - String | null
- County - String | null
- State - String | null
- Country - String | null
- Zip Code - String | null

**Incidents:**

- Incidents - List of Incident DTOs

### Party DTO

- ID - Integer
- Status - “confirmed” | “cancelled” ‼️
- Party DateTime - DateTime
- Location - Location DTO
- Contact One - Student DTO
- Contact Two - Contact DTO

### Student Suggestion DTO ‼️

_Used for student autocomplete suggestions_

- Student ID - Integer
- First Name - String
- Last Name - String
- Matched Field Name - String
  - The name of the field that matched the query (e.g., "phone_number", "email", "onyen", "pid")
- Matched Field Value - String
  - The value of the matched field (e.g., "9194558222", "[jdoe@unc.edu](mailto:jdoe@unc.edu)")

### Incident DTO

- ID - Integer
- Location ID - Integer
- Incident DateTime - DateTime
- Description - String
- Severity - "remote_warning" | "in_person_warning" | "citation" ‼️
- Reference ID - String | null ‼️

---

## Input

Data Transfer Objects sent to API endpoints.

### Account Management

**Create Account DTO** ‼️

- Email - String
- PID - String
- Onyen - String
- First Name - String
- Last Name - String
- Role - "staff" | "admin" | "student"

Note: All fields except Role are placeholder values. They will be overwritten by the IdP on the user's first SSO login. For staff and admin accounts, this pre-seeded account must exist before the user can log in. ‼️

**Update Account DTO** ‼️

- Role - "staff" | "admin" | "student"

Note: Only Role is editable. All IdP-owned fields are managed by UNC SSO and updated on every login. ‼️

**Create Police Account DTO** ‼️

- Email - String
- Password - String

**Update Police Account DTO** ‼️

- Email - String
- Password - String

### Student Management

**Create Student DTO**

Creates both an account and student record.

- Account ID - Integer
- Phone Number - String
- Contact Preference - "call" | "text"
- Last Registered - DateTime | null (optional, default null)
- Residence Place ID - String | null (optional, default null) ‼️

**Update Student DTO**

Updates student information and optionally account name.

- First Name - String (optional)
- Last Name - String (optional)
- Phone Number - String
- Contact Preference - "call" | "text"
- Last Registered - DateTime | null
- Residence Place ID - String | null ‼️

**Self Update Student DTO** ‼️

Updates only the information the students are allowed to update themselves

- Phone Number - String
- Contact Preference - "call" | "text"

**Residence Update DTO** ‼️

Updates the student’s residence

- Residence Place ID - String

### Location Management

**Create Location DTO**

- Google Place ID - String
- Hold Expiration - DateTime (optional)

### Party Registration

**Student Create Party DTO**

_Contact One data is derived from authenticated user_

_Party location is derived from the authenticated user's residence_ ‼️

_Status is automatically set as confirmed_ ‼️

- Party DateTime - DateTime
- Contact Two - Contact DTO

**Admin Create Party DTO** ‼️

_Both contacts must be explicitly specified_

_Status is automatically set as confirmed_ ‼️

- Party DateTime - DateTime
- Google Place ID - String
- Contact One Student ID - Integer ‼️
- Contact Two - Contact DTO

### Incident Management

**Create Incident DTO**

- Location Place ID - String ‼️
- Incident DateTime - DateTime
- Description - String (default: empty string)
- Severity - "remote_warning" | "in_person_warning" | "citation" ‼️
- Reference ID - String | null (optional, default null) ‼️

**Update Incident DTO** ‼️

- Incident DateTime - DateTime
- Description - String (default: empty string)
- Severity - "remote_warning" | "in_person_warning" | "citation" ‼️
- Reference ID - String | null (optional, default null) ‼️

## Meta

### **List Query Parameters ‼️**

Standard parameters used for endpoints that return paginated lists of data.

All parameters are optional

**Pagination**

- Page Number - Integer
  - 1-indexed.
  - Default: 1
  - Minimum: 1
- Page Size - Integer
  - Number of items to return per page.
  - Range: 1 to 100.
  - Default: All items (if not specified).

**Sorting**

- Sort By - String
  - The specific field name to sort the results by.
- Sort Order - "asc" | "desc"
  - Direction of the sort.
  - Default: "asc"

**Filtering**

Any number of query parameters

- Key - Specifies the field and filter operator (equal, greater than, less than, etc.) to apply to the field
- Value - Specifies the content to compare the field to

_Refer to the generated API docs at `/api/docs` to see specific syntax details_

---

## Authentication

### Access Token DTO

- Access Token: String
- Access Token Expires: Datetime

### Refresh Token DTO

- Refresh Token: String

### Tokens DTO

- Refresh Token: String
- Refresh Token Expires: Datetime
- Access Token: String
- Access Token Expires: Datetime

### Police Credentials DTO

- Email: String
- Password: String

### Refresh Token Contents

_The data carried within the signed JWT_

- `iat`: Issued at time, Unix time stamp
- `exp`: Expiration time, Unix time stamp
- `jit`: Unique identifier that will be hashed, UUID4
- `sub`: ID of the related account, Integer or “police” for Police

### Access Token Contents

_The data carried within the signed JWT_

**Account**

- `iat`: Issued at time, Unix time stamp
- `exp`: Expiration time, Unix time stamp
- `sub`: ID of the related account, Integer
- All fields of Account DTO (excluding id, which is already included as `sub` )

**Police**

- `iat`: Issued at time, Unix time stamp
- `exp`: Expiration time, Unix time stamp
- `sub`: ID of the police account, Integer ‼️
- `role`: Always the literal string `police`
