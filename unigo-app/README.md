# UniGo – React + Node booking app

A runnable starter project based on the supplied UniGo prototype. It has separate Admin and User login screens, a shared API/database, admin catalogue management, user directory and booking views.

## Requirements
- Node.js 18 or newer
- VS Code (recommended)
- Internet connection for first-time npm install and remote catalogue images/fonts

## Run in VS Code
1. Extract the `unigo-app` folder.
2. Open the `unigo-app` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:
   ```bash
   npm run install:all
   ```
5. Start both frontend and backend:
   ```bash
   npm run dev
   ```
6. Open **http://localhost:5173** in your browser.

## Demo logins
**Admin**
- Email: `admin@unigo.com`
- Password: `Admin@123`

**User**
- Choose User → Create account, then register with your own details.

## What the admin can do
- Add, edit and remove Movie, Food, Transport and Event listings.
- Change prices and descriptions.
- View registered user names, emails, phone numbers, join dates and booking counts.
- View all bookings and summary totals.

Changes to active listings are served by the backend and appear in the user catalogue after refresh. Existing bookings keep the price charged at the time of booking.

## Data storage and limitations
The demo backend stores data in `server/db.json`, shared by all browsers/devices that connect to this same running server. This is suitable for a local project demonstration, not production hosting. For production, use a managed database (e.g. PostgreSQL), HTTPS, a strong `JWT_SECRET`, rate limiting, input validation, backups, and proper payment integration. “Active users” in this demo means registered users who have at least one booking; it is not live online-presence tracking. Passwords are hashed; the admin demo credentials must be changed before deployment.

## API
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/items`
- `POST /api/bookings`, `GET /api/bookings/mine`
- Admin: `GET /api/admin/summary`, `/api/admin/users`, `/api/admin/bookings`
- Admin catalogue: `POST /api/admin/items`, `PUT /api/admin/items/:id`, `DELETE /api/admin/items/:id`
