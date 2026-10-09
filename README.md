# PMA Cadet Academic Tracking System

A Next.js application for cadet registration, company/platoon assignments, four-term course assignments, exam marks, promotions, relegations, and academic results.

**Database:** MySQL, accessed using Prisma ORM. No fake cadet records are seeded. Dashboard counts and charts reflect actual database records and remain empty until PMA data is entered or imported.

## Requirements

- Node.js 20+ (LTS recommended) and npm
- MySQL 8.x database supplied/approved by PMA IT
- A PMA-approved server/intranet host or hosting provider authorized to connect to that database

## 1. Get the application

```bash
git clone https://github.com/fizau771/pma--mgmt.git
cd pma--mgmt
npm install
```

If you receive a ZIP, extract it and run `npm install` from the project directory.

## 2. Configure MySQL and environment variables

Ask PMA IT/DBA to create a dedicated database (for example `pma_cadets`) and an application database user with only the permissions it needs. Restrict database network access to the application host.

Copy the template:

PowerShell:
```powershell
Copy-Item .env.example .env
```

Linux/macOS:
```bash
cp .env.example .env
```

Edit `.env` and replace all placeholders:

```dotenv
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/pma_cadets"
ADMIN_USERNAME="pma-admin"
ADMIN_PASSWORD="replace-with-a-long-unique-password"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

- Use the exact MySQL host, port, database name, username, and password supplied by PMA IT.
- URL-encode special characters in database usernames/passwords when required by the connection URL format.
- Set a unique administrator password and a random session secret of at least 32 characters. Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Never commit the real `.env` file or production credentials to GitHub. Only the placeholder `.env.example` belongs in source control.

## 3. Create the database tables

After PMA IT provisions MySQL and `.env` is configured, run:

```bash
npx prisma db push
npx prisma generate
```

Review schema changes with the DBA before running them against an operational database. Arrange a backup before schema changes.

## 4. Run and test locally

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the configured administrator credentials.

Before importing official records, test with a small temporary dataset:
- Sign in and sign out.
- Register a test cadet and refresh to confirm persistence.
- Assign courses, save marks, promote and relegate a test cadet.
- Import a test Excel file and verify duplicate roll numbers are rejected.
- Confirm the data remains available after signing in again.

Remove test records from the database after testing.

## 5. Deploy to a PMA server

1. Deploy the repository to a PMA-approved Windows or Linux server.
2. Install Node.js 20+, then run `npm install`.
3. Configure `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` as protected server environment variables.
4. Confirm the server can securely connect to the MySQL host on the approved port (usually 3306).
5. Run `npx prisma db push` only after DBA approval and a backup.
6. Build and start:

   ```bash
   npm run build
   npm run start
   ```

7. Put the site behind PMA-approved HTTPS and access controls. Do not expose MySQL directly to the public internet.

## Data stored

Each cadet record includes roll number, name, company, platoon, current term, assigned courses, marks, relegation status, and timestamps. Roll numbers are unique.

Weighted marks:
- Quiz: 20%
- Mid Term: 25%
- Final Term: 35%
- Assignments: 15%
- Public Speaking: 5%

Grades: A (80+), B (70–79.99), C (60–69.99), D (50–59.99), F (below 50).

The authenticated `/api/cadets` endpoint reads and writes records through Prisma to MySQL. Browser local storage is not the database.

## Excel import

Required columns: `Roll Number` (or `Roll No`, `Roll`, `Cadet Number`) and `Name` (or `Cadet Name`, `Full Name`).

Optional columns: `Company` (Khalid, Tariq, Qasim, Salahuddin), `Platoon` (1st, 2nd, 3rd), and `Term` (1st Term to 4th Term).

Use a PMA-approved spreadsheet and verify the imported data before operational use.

## Security and handover checklist

- Use HTTPS, strong administrator credentials, a random session secret, and least-privilege database access.
- Configure automated MySQL backups and periodically test restoring them. The application does not make database backups itself.
- Decide who is responsible for user administration, secret rotation, database backups, upgrades, and recovery.
- Test updates on a staging database before applying them to the operational system.
- Production handover requires PMA IT to configure the actual MySQL instance, environment secrets, network access, backups, and acceptance testing.

## Project structure

```text
app/api/auth/route.js    # administrator sign-in/sign-out
app/api/cadets/route.js  # authenticated cadet data API
app/page.js              # application UI
app/globals.css          # UI styles
lib/auth.js              # signed session validation
lib/prisma.js            # Prisma client
prisma/schema.prisma     # MySQL data model
.env.example             # safe environment template
README.md                # setup and deployment guide
```
