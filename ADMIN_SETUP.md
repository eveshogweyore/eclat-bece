# Admin Setup Guide

## Creating the First Super Admin

Since this is the first admin account, you'll need to create it manually through the Supabase SQL editor. After this, super admins can create other admins through the UI.

### Step 1: Create an Auth User

First, create a regular user account:
1. Go to `/auth` on your application
2. Sign up with an email and password
3. Verify the email address
4. **Important**: Note the email address used

### Step 2: Get the User ID

1. Log into Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Find the user you just created
4. Copy the **User ID** (UUID format)

### Step 3: Create Admin Role

Run the following SQL in the Supabase SQL Editor:

```sql
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from Step 2
-- Replace 'YOUR_FULL_NAME' with the admin's full name

DO $$
DECLARE
  v_user_id UUID := '75ae9b85-bd50-40d2-af63-a337c20ebd46';
  v_full_name TEXT := 'Solab Academy';
  v_admin_id UUID;
BEGIN
  -- Insert or update user_roles to include admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert admin record with super admin privileges
  INSERT INTO public.admins (user_id, full_name, is_super_admin, is_active)
  VALUES (v_user_id, v_full_name, TRUE, TRUE)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_super_admin = TRUE,
    is_active = TRUE,
    updated_at = NOW()
  RETURNING id INTO v_admin_id;

  -- Log the action
  INSERT INTO public.admin_audit_log (admin_id, action, resource_type, details)
  VALUES (v_admin_id, 'created_super_admin', 'admin', 
    jsonb_build_object('message', 'Initial super admin account created'));

  RAISE NOTICE 'Super admin created successfully with ID: %', v_admin_id;
END $$;
```

### Step 4: Verify Admin Access

1. Log out and log back in with the admin account
2. You should be automatically redirected to `/admin`
3. You should see a "Super Admin" badge on the dashboard

## Admin Permissions

### Super Admin
- Can manage other admin users (create, edit, delete)
- Can manage quiz questions
- Can view and manage all platform users
- Can access analytics and reports
- Can access system settings
- Full access to all admin features

### Regular Admin
- Can manage quiz questions
- Can view platform users
- Can access analytics and reports
- Cannot manage other admins
- Cannot access system settings

## Common Tasks

### Creating Additional Admins

As a super admin:
1. Navigate to **Admin Users** from the sidebar
2. Click **Add Admin**
3. Fill in the required information:
   - Email (must match an existing user account)
   - Full Name
   - Super Admin toggle (if needed)
   - Permissions
4. Click **Create Admin**

### Managing Quiz Questions

1. Navigate to **Question Bank** from the sidebar
2. Use filters to find questions
3. Click **Add Question** to create new questions
4. Edit or delete existing questions as needed
5. Use **Bulk Import** for importing multiple questions

### Viewing Platform Analytics

1. Navigate to **Analytics** from the sidebar
2. View platform-wide statistics
3. Export reports as needed

### Managing Platform Users

1. Navigate to **Platform Users** from the sidebar
2. Switch between Students, Parents, and Schools tabs
3. Search and filter users
4. View user details and statistics
5. Perform actions like linking students to parents/schools

## Security Best Practices

1. **Regular Backups**: Ensure regular database backups are in place
2. **Audit Logs**: Regularly review admin audit logs for suspicious activity
3. **Least Privilege**: Grant regular admin access unless super admin is required
4. **Secure Passwords**: Use strong passwords for all admin accounts
5. **2FA**: Enable two-factor authentication for admin accounts (if available)
6. **Regular Updates**: Keep the platform updated with latest security patches

## Troubleshooting

### Can't Access Admin Dashboard

1. Verify the user has `admin` role in `user_roles` table
2. Verify the user has an active record in `admins` table
3. Check browser console for any errors
4. Clear browser cache and try again

### RLS Errors

If you see Row Level Security errors:
1. Verify the migration has been applied
2. Check that RLS policies are enabled
3. Ensure the user is authenticated
4. Check the `is_admin()` function exists

### Performance Issues

For better performance with large datasets:
1. Ensure database indexes are created
2. Use pagination for large tables
3. Implement caching where appropriate
4. Monitor query performance

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migration Guide](https://supabase.com/docs/guides/cli/managing-environments)
- [Security Best Practices](https://supabase.com/docs/guides/auth/managing-user-data)
