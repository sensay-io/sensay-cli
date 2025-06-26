# Test Case: Explorer Delete Functionality

## Prerequisites
- Have at least one replica in your account that you can delete
- Have API key configured

## Test Steps

1. Launch the explorer:
   ```
   sensay explorer
   ```
   or
   ```
   sensay x
   ```

2. Navigate to a replica using arrow keys (↑/↓)

3. Press Enter or '.' to view details
   - Verify that "Owner ID" is displayed in the details view
   - Press any key to return to the list

4. Select a replica you want to delete

5. Press 'd' to delete the replica
   - A warning screen should appear showing:
     - Replica name
     - UUID
     - Owner ID
     - Warning that action cannot be undone

6. When prompted "Are you sure you want to delete this replica?"
   - First test: Select "No" (or press 'n')
     - Should clear the screen and return to the explorer list
     - The replica should still be in the list
     - You should be able to continue navigating normally
   
   - Second test: Select "Yes" (or press 'y')
     - Should show "Deleting replica..." message
     - Should show success message
     - List should refresh automatically
     - Deleted replica should no longer appear

7. Test permission error:
   - Try to delete a replica you don't own (if available)
   - Should show permission error message

8. Press 'q' to exit the explorer

## Expected Results
- Owner ID is displayed in replica details
- Delete confirmation dialog works correctly
- Replicas are successfully deleted when confirmed
- List refreshes after deletion
- Permission errors are handled gracefully