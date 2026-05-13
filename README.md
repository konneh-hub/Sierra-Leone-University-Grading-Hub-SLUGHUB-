# System Admin Dashboard

The system admin dashboard is a backend-served web application accessible at `/system-admin/dashboard`. It provides a comprehensive interface for managing the SRMS/SLUGHUB platform.

## Features

- **Overview**: Summary cards for all platform metrics
- **Universities**: Manage university registrations and details
- **Admin Accounts**: View and manage university administrators
- **Subscriptions**: Monitor subscription status and revenue
- **Billing**: Track invoices and payments
- **Analytics**: Platform-wide analytics and insights
- **Users**: User management and role statistics
- **Logs**: Activity logs with filtering
- **Settings**: Platform configuration management

## Access

1. Navigate to `http://localhost:4000/system-admin/dashboard` (assuming server runs on port 4000)
2. Authenticate with system admin credentials
3. The dashboard will load with the Overview page by default

## Authentication

The dashboard requires JWT authentication. System admin users can access all features. The frontend (React app) remains separate for university users.

## Technical Details

- Served directly from Express backend
- Uses vanilla HTML/CSS/JavaScript
- Consumes existing API endpoints under `/api/system-admin/dashboard/*`
- Responsive design with mobile support
- Static assets served from `backend/public/system-admin/`

## Development

To modify the dashboard:
- Edit `backend/public/system-admin/index.html` for structure
- Update `backend/public/system-admin/css/styles.css` for styling
- Modify `backend/public/system-admin/js/dashboard.js` for functionality
- Routes are handled in `backend/routes/systemAdminDashboard.js`