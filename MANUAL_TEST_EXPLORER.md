# Manual Test Plan for Explorer Delete Fix

## Test Setup
1. Ensure you have built the latest version:
   ```bash
   npm run build
   ```

2. Run the explorer:
   ```bash
   npm run dev -- explorer
   ```

## Test Case 1: Cancel Delete Operation
1. Navigate to any replica using arrow keys
2. Press 'd' to delete
3. When prompted "Are you sure you want to delete this replica?", select **No**
4. **Expected Result**: 
   - Screen should clear
   - You should return to the explorer list
   - You should be able to continue navigating with arrow keys
   - The program should NOT exit

## Test Case 2: Complete Delete Operation
1. Navigate to a test replica you can delete
2. Press 'd' to delete
3. When prompted, select **Yes**
4. After "Replica deleted successfully!" message, press any key
5. **Expected Result**:
   - Screen should clear
   - You should return to the explorer list (with the deleted replica removed)
   - You should be able to continue navigating
   - The program should NOT exit

## Test Case 3: Navigation After Operations
1. After either test case above, verify:
   - Arrow keys (↑/↓) still work
   - 'r' refreshes the list
   - '.' or Enter shows details
   - 'q' exits the program

## Known Issues to Check
- If the program exits immediately after the delete dialog, the readline interface is not being properly reinitialized
- If keyboard input stops working, the raw mode is not being restored correctly

## Debug Tips
If the issue persists:
1. Check console for any error messages
2. Try adding debug logging to the pause/resume methods
3. Verify that inquirer is properly releasing stdin control