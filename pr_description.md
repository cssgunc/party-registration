Admins currently assign Contact One in the party create/edit form by typing a raw email address, which is error-prone when many students exist in the system. This PR replaces that field with a fuzzy search autocomplete that matches across PID, email, Onyen, and phone number, and switches the underlying data model to use a student ID instead of email.

Changes:

- Added `StudentSuggestionDto` and `AutocompleteInput` models to `student_model.py` per TDD 3.2
- Added `autocomplete_students()` service method to `student_service.py` — case-insensitive partial match across PID, email, Onyen, and phone number, limited to 10 results
- Added `POST /students/autocomplete` route to `student_router.py` (staff/admin auth) per TDD 3.3
- Changed `AdminCreatePartyDto.contact_one_email: str` → `contact_one_student_id: int` in `party_model.py` and updated `party_service.py` to look up student by ID instead of email, removing the now-unused `_get_student_by_email` method
- Added `StudentSuggestionDto` / `StudentAutocompleteInput` types and `autocompleteStudents()` method to the frontend student service/types
- Changed `AdminCreatePartyDto.contact_one_email` → `contact_one_student_id: number` in `party.types.ts`
- Created reusable `StudentSearch.tsx` component — debounced autocomplete using Popover + Command pattern (mirroring `AddressSearch.tsx`), displays suggestions as `First Last — <matched value>` with matched substring bolded, uses refs for service/selection state to prevent debounce resets on parent re-renders
- Replaced the plain email `<Input>` for Contact One in `PartyTableForm.tsx` with `<StudentSearch>`, using `useMemo` for stable service instances
- Updated `PartyTable.tsx` to send `contact_one_student_id` in the request payload
- Updated all party tests and test utilities to use `contact_one_student_id` instead of `contact_one_email`
- Added `TestStudentAutocompleteRouter` with 10 tests covering all match fields, case-insensitivity, result limiting, and auth

Closes #XX
