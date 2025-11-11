# New Features

## 1. Automatic User Approval

### What Changed
- Modified `backend/internal/api/handlers.go` to automatically approve new users upon signup
- Users no longer need manual admin approval to access the system

### How It Works
When a new user signs up through the frontend:
1. User account is created
2. User is **automatically approved** in the same transaction
3. User receives a JWT token and can immediately access the dashboard
4. No waiting for admin approval

### Benefits
- Faster onboarding for new users
- Eliminates the need for manual user approval
- Seamless user experience

## 2. Network Mappings Visualization

### What Was Added
- New "Mappings" tab next to "Servers" and "SSL Certificates" tabs
- Visual network map showing relationships between servers
- Canvas-based rendering with interactive elements

### Features
1. **Server Nodes**: Each server is displayed as a node with:
   - Color-coded status (green=online, amber=warning, red=offline)
   - Server hostname and IP address labels
   - Group-based coloring (outer ring shows group membership)

2. **Network Relationships**: 
   - Dashed lines connect servers in the same group
   - Helps visualize server clusters and dependencies

3. **Layout**:
   - Servers arranged in a circular pattern
   - Central connections based on group membership
   - Automatic positioning based on server count

### How to Use
1. Navigate to the dashboard
2. Click on the "Mappings" tab
3. View the network visualization of all your servers
4. Servers in the same group are connected with dashed lines

### Technical Implementation
- Created `src/components/NetworkMap.tsx` component
- Uses HTML5 Canvas for rendering
- Automatically generates node positions in a circular layout
- Connects servers based on group membership

## Files Modified

### Backend
- `backend/internal/api/handlers.go`: Added auto-approval logic to signup

### Frontend
- `src/pages/Index.tsx`: Added Mappings tab and integrated NetworkMap component
- `src/components/NetworkMap.tsx`: New component for network visualization

## Testing the Changes

### 1. Test Auto-Approval
```bash
# 1. Navigate to http://localhost:3001
# 2. Click "Sign Up" tab
# 3. Fill in details and create account
# 4. Should be immediately logged in (no approval message)
```

### 2. Test Network Mappings
```bash
# 1. Login to the dashboard
# 2. Click "Mappings" tab
# 3. See network visualization with all servers
# 4. Verify dashed lines connect servers in same group
```

## Database Changes
No database schema changes were needed for these features.

## Next Steps
To use these features effectively:

1. **Add Real Servers**: Use the "Add Server" button to add your actual infrastructure
2. **Create Groups**: Organize servers into logical groups
3. **View Network**: Use the Mappings tab to visualize your infrastructure topology

## Troubleshooting

### Network Map Not Showing
- Ensure you have at least one server added
- Check browser console for errors (F12)

### Servers Not Connecting
- Verify servers are assigned to the same group
- Check that `group_id` field is properly set

### User Still Pending Approval
- Clear browser cache and localStorage
- Re-signup or restart backend container

## Commands Reference

### Restart Application
```bash
docker-compose restart
```

### Rebuild with Changes
```bash
docker-compose up -d --build
```

### View Logs
```bash
docker logs cmdb-backend --tail 50
docker logs cmdb-frontend --tail 50
```

### Check Users
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT email, username, approved FROM users;"
```

