# CMDB Dashboard Setup Guide

## Getting Started

### 1. Create Your First Admin Account

Since this is a fresh installation, you'll need to create the first admin account manually:

1. **Sign up** on the `/auth` page with any email and password
2. **Open the Backend** to access your database
3. Navigate to the `profiles` table
4. Find your newly created user
5. Set `approved = true` for your user
6. Navigate to the `user_roles` table
7. Insert a new row:
   - `user_id`: Your user ID (from profiles table)
   - `role`: `admin`

### 2. Approve New Users

Once you're logged in as admin:

1. Navigate to **User Management** from the header menu
2. You'll see all pending users with "Pending" status
3. Click **Approve** to grant them access
4. Click **Make Admin** to grant admin privileges (optional)

### 3. Add Servers

Admins can add servers to the CMDB:

1. Click **Add Server** button on the dashboard
2. Fill in server details:
   - Hostname
   - IP Address
   - SSH Port (default: 22)
   - SSH Username
   - Prometheus URL (for metrics)
   - Select a server group

### 4. Create Server Groups

Organize servers with groups/tags:

1. Navigate to **Server Groups** from the header menu
2. Click **Add Group**
3. Enter name, description, and choose a color
4. Assign servers to groups when adding/editing them

### 5. Manage User Permissions

Control which users can access which servers:

1. This feature is coming soon
2. Currently, admins see all servers
3. Regular users see only servers they have permission to access

## Features

- ✅ User authentication with admin approval
- ✅ Role-based access control (Admin/User)
- ✅ Server management
- ✅ Server grouping with color tags
- ✅ User management
- ✅ SSH terminal access
- ✅ Prometheus integration for metrics

## Security Notes

- Users must be approved by an admin before accessing the system
- Only admins can manage users, servers, and groups
- All data is secured with Row Level Security (RLS) policies
