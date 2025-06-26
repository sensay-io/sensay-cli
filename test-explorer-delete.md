# Test Case: Explorer Navigation, Delete Functionality and Pagination

⚠️ **WARNING**: This test includes a DELETE ALL operation. Only test this feature with test/disposable replicas!

## Prerequisites
- Have at least one replica in your account that you can delete
- Have API key configured
- Ideally have more than 50 replicas to test pagination

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

3. Test navigation into Knowledge Base:
   - Press Enter on a replica to navigate into its Knowledge Base items
   - Should see breadcrumb change to "Replicas > [Replica Name] > Knowledge Base"
   - Should see list of knowledge base items (files, text, websites, YouTube)
   - Each item shows: name/preview, status, and type
   - Press ESC to go back to replicas list
   - Verify breadcrumb returns to "Replicas"

4. Press '.' to view details (works on both replicas and knowledge base items)
   - Verify that "Owner ID" is displayed in the details view
   - Press any key to return to the list

5. Test Knowledge Base item deletion:
   - Navigate into a replica's Knowledge Base (Press Enter)
   - Select a knowledge base item
   - Press 'd' to delete
   - Should show item details (type, status, ID, filename/URL if applicable)
   - Test both confirming and canceling deletion

6. Select a replica you want to delete

7. Press 'd' to delete the replica
   - A warning screen should appear showing:
     - Replica name
     - UUID
     - Owner ID
     - Warning that action cannot be undone

8. When prompted "Are you sure you want to delete this replica?"
   - First test: Select "No" (or press 'n')
     - Should clear the screen and return to the explorer list
     - The replica should still be in the list
     - You should be able to continue navigating normally
   
   - Second test: Select "Yes" (or press 'y')
     - Should show "Deleting replica..." message
     - Should briefly show "✅ Replica deleted successfully!" (for ~1 second)
     - Should automatically return to the explorer list
     - List should refresh with the deleted replica removed
     - No key press required after successful deletion

9. Test permission error:
   - Try to delete a replica you don't own (if available)
   - Should show permission error message

10. Test pagination (if you have > 50 replicas):
   - Note the total count shown (e.g., "Item: 1/50 (75 total)")
   - Scroll down near the bottom of the list
   - Should see "↓ Scroll down to load more (50 of 75 loaded)"
   - Continue scrolling down past item 45
   - Should see "Loading more replicas..." briefly
   - Additional replicas should load automatically
   - Total loaded count should update

11. Test delete ALL (D key) - USE WITH EXTREME CAUTION:
   - Press 'D' (shift+d) to delete all replicas
   - Should show warning with total count of replicas
   - First confirmation: "Are you ABSOLUTELY SURE..." - try No first
     - Should return to explorer without deleting
   - Try again with 'D', select Yes for first confirmation
   - Second confirmation: Must type "deleteeverything" exactly
     - Try typing wrong text first - should show validation error
     - Type "deleteeverything" correctly (all lowercase, no spaces)
   - Should show progress for each deletion
   - Should show summary with success/failure counts
   - List should refresh showing empty state

12. Press 'q' to exit the explorer

## Expected Results
- Owner ID is displayed in replica details
- Delete confirmation dialog works correctly
- Replicas are successfully deleted when confirmed
- List refreshes after deletion
- Permission errors are handled gracefully