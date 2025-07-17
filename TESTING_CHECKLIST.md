# Admin Portal & Faculty Portal Testing Checklist

## Pre-Test Setup
- [ ] Verify database is populated with PRN data
- [ ] Clear any existing attendance records for clean testing
- [ ] Ensure geolocation is enabled in browser

## Faculty Portal Testing

### Login/Logout Tests
- [ ] **Faculty Login with Correct Password**
  - Navigate to Faculty Portal tab
  - Enter password: `admin123`
  - Verify successful login toast message
  - Verify UI changes to faculty control panel
  
- [ ] **Faculty Login with Incorrect Password**
  - Enter wrong password
  - Verify error toast appears
  - Verify access is denied

- [ ] **Faculty Logout**
  - After successful login, click logout
  - Verify logout toast message
  - Verify UI returns to login form

### Location Management Tests
- [ ] **Set Initial Location**
  - Click "Get Current Location" button
  - Wait for location to be fetched
  - Verify current coordinates are displayed
  - Click "Update Location" to set as allowed location
  - Verify success toast message

- [ ] **Update Location Settings**
  - Change radius value (default: 100m)
  - Update location again
  - Verify new radius is saved
  - Check that students outside new radius are rejected

### Attendance Window Control Tests
- [ ] **Close Attendance Window**
  - Toggle attendance window to OFF
  - Verify toggle state changes
  - Check student portal shows "Attendance Window Closed" message
  - Attempt attendance marking from student portal - should fail

- [ ] **Open Attendance Window**
  - Toggle attendance window to ON
  - Verify toggle state changes
  - Check student portal allows attendance marking
  - Test successful attendance marking

- [ ] **Window Control Persistence**
  - Close window, refresh page
  - Verify window remains closed after refresh
  - Open window, refresh page
  - Verify window remains open after refresh

### Attendance Records Management Tests
- [ ] **View Attendance Summary**
  - After some attendance records exist
  - Verify summary shows correct counts:
    - Total records
    - Successful attendances
    - Failed attempts

- [ ] **View Attendance Table**
  - Verify table displays recent records
  - Check columns: Name, PRN, Time, Location, Distance, Status
  - Verify status indicators (success/failed) are correct
  - Verify distance calculations are accurate

- [ ] **Export to CSV**
  - Click "Export to CSV" button
  - Verify CSV file downloads
  - Open CSV and verify data integrity:
    - All columns present
    - Data matches what's shown in table
    - Timestamps are correctly formatted

- [ ] **Clear All Records**
  - Click "Clear All Records" button
  - Verify confirmation dialog appears
  - Cancel first, verify no records deleted
  - Confirm deletion, verify all records removed
  - Verify summary shows zero counts

## Admin Portal Testing

### Login/Logout Tests
- [ ] **Admin Login with Correct Password**
  - Navigate to Admin Portal tab
  - Enter password: `superadmin123`
  - Verify successful login toast message
  - Verify UI changes to admin control panel

- [ ] **Admin Login with Incorrect Password**
  - Enter wrong password
  - Verify error toast appears
  - Verify access is denied

- [ ] **Admin Logout**
  - After successful login, click logout
  - Verify logout toast message
  - Verify UI returns to login form

### Analytics & Overview Tests
- [ ] **View System Overview**
  - Verify attendance statistics are displayed
  - Check if location status is shown correctly
  - Verify system status indicators

- [ ] **View Analytics Charts/Graphs**
  - If analytics visualizations exist, verify they load
  - Check data accuracy against actual records
  - Test any filtering or date range options

### Advanced Management Tests
- [ ] **Student Data Management**
  - View list of registered students (PRNs)
  - Verify all students from database are shown
  - Test any search/filter functionality

- [ ] **System Settings**
  - Test any system-level configuration options
  - Verify settings are saved and persist

- [ ] **Audit Trail**
  - If available, check logs of faculty/admin actions
  - Verify timestamps and action descriptions

## Integration Tests

### Multi-User Scenario Tests
- [ ] **Faculty & Student Interaction**
  - Faculty closes attendance window
  - Student attempts attendance - should fail
  - Faculty opens window
  - Student marks attendance - should succeed

- [ ] **Real-time Updates**
  - Faculty updates location settings
  - Verify student panel reflects new location immediately
  - Faculty toggles window status
  - Verify student panel updates in real-time

### Data Consistency Tests
- [ ] **Cross-Panel Data Verification**
  - Mark attendance from student portal
  - Verify record appears in faculty portal immediately
  - Verify admin portal shows updated statistics
  - Check database directly for data integrity

### Error Handling Tests
- [ ] **Network Interruption**
  - Disconnect network during operation
  - Verify appropriate error messages
  - Reconnect and verify system recovers

- [ ] **Invalid Data Input**
  - Test with missing PRN selection
  - Test with corrupted location data
  - Verify graceful error handling

## Performance Tests
- [ ] **Large Dataset Handling**
  - Test with 100+ attendance records
  - Verify table loading performance
  - Check CSV export with large datasets

- [ ] **Concurrent Usage**
  - Multiple students marking attendance simultaneously
  - Faculty updating settings during student usage
  - Verify system remains stable

## Security Tests
- [ ] **Password Protection**
  - Verify different passwords for faculty/admin
  - Test session timeout (if implemented)
  - Test direct URL access without login

- [ ] **Data Isolation**
  - Verify faculty can only access appropriate data
  - Test admin access controls
  - Check for any data leakage between users

## Bug Verification Tests
- [ ] **Fixed Issues Verification**
  - Attendance window closed - students cannot mark attendance ✓
  - PRN selection is mandatory ✓
  - Full name field is read-only ✓
  - Panel names changed to "Portal" ✓

## Final System Test
- [ ] **Complete Workflow Test**
  1. Admin logs in and reviews system status
  2. Faculty logs in and sets location
  3. Faculty opens attendance window
  4. Students mark attendance (successful and failed cases)
  5. Faculty reviews attendance records
  6. Faculty exports data
  7. Faculty closes attendance window
  8. Verify system integrity throughout process

## Success Criteria
- All login/logout functions work correctly
- Attendance window control prevents/allows student access
- Location-based attendance validation is accurate
- Data export/import functions work properly
- Real-time updates function across all panels
- All fixed bugs remain resolved
- System performance is acceptable under normal load

## Notes
- Document any issues found during testing
- Include screenshots for visual verification
- Test on multiple browsers if possible
- Verify mobile responsiveness