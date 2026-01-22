# How to Make a User a Teacher

## Option 1: Using Convex Dashboard (Recommended)

1. **Sign up a new user** at `/auth/signup` (or use an existing user)

2. **Go to your Convex Dashboard**: https://dashboard.convex.dev

3. **Navigate to your project** → Select your deployment

4. **Get the Better Auth User ID**:
   - Go to the "Data" tab in Convex Dashboard
   - Click on the `betterAuth/user` table (NOT userProfiles, classrooms, or any other table)
   - Find the user by their email
   - Copy their `_id` field - it looks like `"kz1234567890abcdefghijk"` (a string, not an Id<> type)
   - **IMPORTANT**: This is a STRING value from Better Auth, not a Convex table ID

5. **Open the "Functions" tab**

6. **Find and run the internal function**: `web/userProfile:setUserRole`
   - Click on `setUserRole` in the function list
   - Enter the parameters:
     - `betterAuthUserId`: Paste the `_id` string from step 4 (e.g., `"kz1234567890abcdefghijk"`)
     - `role`: Type `"teacher"` or `"student"` (with quotes)
   - Click "Run"

## Option 2: Using the List Function

If you want to see all users with their current roles:

1. Go to Convex Dashboard → Functions
2. Run the internal query: `web/userProfile:listAllUsersWithProfiles`
3. This will show you all users with:
   - userId (the betterAuthUserId you need)
   - email
   - name
   - current role
   - createdAt timestamp

## Example

If you have a user with:

- Email: `teacher@example.com`
- betterAuthUserId: `"kz1a2b3c4d5e6f7g8h9i0j"` (from betterAuth/user table)

Run `setUserRole` with:

```json
{
  "betterAuthUserId": "kz1a2b3c4d5e6f7g8h9i0j",
  "role": "teacher"
}
```

**Common Mistake**: Don't use an ID from `classroomStudentsRelations` or any other table. Only use the `_id` from the `betterAuth/user` table.

## Verifying It Worked

After setting the role, you can verify by:

1. **Check the data**: Go to Data tab → `userProfiles` table → find the entry with matching `userId`
2. **Login as that user**: The user should now have teacher permissions
3. **Check their profile**: Navigate to `/app` while logged in as that user and their role should be reflected

## Notes

- `betterAuthUserId` is a string from Better Auth's user table (not a Convex Id)
- The Convex Dashboard might try to autocomplete with table IDs - ignore these suggestions and paste the raw string
- You can switch roles back and forth (teacher ↔ student)
- The function is idempotent - safe to run multiple times
- All teacher functions check that the user has a teacher role before allowing operations
