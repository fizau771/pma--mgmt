# PMA Cadet Academic Tracking System

A Next.js web application for managing cadet registration, company/platoon assignments, four-term course assignments, exam marks, promotions, relegations, and academic results.

**Production data is stored in PostgreSQL through Prisma.** The application no longer seeds or displays fake cadet records. Dashboard charts and company counts are based on records returned by the database; they remain empty/zero until PMA data is entered or imported.

## Technology

- Next.js and React
- PostgreSQL database
- Prisma ORM
- Server-side administrator sign-in with an HTTP-only session cookie
- XLSX import for existing cadet spreadsheets

## Requirements

- Node.js 20 or newer (LTS recommended)
- npm
- A PostgreSQL database supplied/approved by PMA IT
- A server or hosting provider that can securely reach that database

## 1. Install on a PMA computer or server

1. Install Node.js LTS from https://nodejs.org/.
2. Install Git if you will clone the repository.
3. Open PowerShell/Terminal and clone the project:

   ```bash
   git clone https://github.com/fizau771/pma--mgmt.git
   cd pma--mgmt
   npm install
   ```

   If PMA receives the source as a ZIP, extract it, open a terminal in the extracted project folder, and run `npm install`.

## 2. Create/configure the PostgreSQL database

Ask the PMA database administrator to create a dedicated database and application user, for example a database named `pma_cadets`. Use a least-privilege database account and restrict network access to the application server.

Copy `.env.example` to a local file named `.env` in the project root. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace every placeholder:

```dotenv
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/pma_cadets?schema=public"
ADMIN_USERNAME="pma-admin"
ADMIN_PASSWORD="replace-with-a-long-unique-password"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

- `DATABASE_URL`: connection string provided by PMA IT. URL-encode special characters in the database username/password when required by PostgreSQL connection-string rules.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: application administrator credentials. Use a unique password and share it only through PMA's approved secure process.
- `SESSION_SECRET`: a random secret of at least 32 characters. Generate one rather than reusing a password. For example, with Node.js: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

**Never commit the real `.env` file, database credentials, or session secret to GitHub.** The repository contains only the safe template `.env.example`.

## 3. Create the database tables

After the database and `.env` are configured, run:

```bash
npx prisma db push
npx prisma generate
```

This creates/updates the tables described in `prisma/schema.prisma` and generates the Prisma client. For a controlled production release, PMA IT should review schema changes and establish a formal migration/backup procedure before later database upgrades.

## 4. Run locally and verify

```bash
npm run dev
```

Open http://localhost:3000 and sign in using the administrator credentials in `.env`.

Before accepting real records, verify that you can:
- Sign in and sign out.
- Register one test cadet and refresh the page; the record should still be present.
- Assign courses, save marks, promote a cadet, and relegate a test cadet.
- Import a small test spreadsheet and verify duplicate roll numbers are rejected.
- Sign in from another browser session (if allowed) and confirm the same database records appear.

Remove test records after verification if they were entered into the PMA database.

## 5. Deploy to a server or Vercel

### Server / intranet deployment

1. Deploy the repository to a PMA-approved Windows or Linux server.
2. Install Node.js 20+, copy the project, and run `npm install`.
3. Set `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` as protected server environment variables. Prefer the hosting platform's secret manager rather than a committed file.
4. Ensure the server can connect to PostgreSQL over the approved network.
5. Run `npx prisma db push` for the initial database setup (only after the DBA has approved the schema and backup plan).
6. Build and start:

   ```bash
   npm run build
   npm run start
   ```

7. Put the app behind PMA-approved HTTPS/reverse proxy or intranet access controls. Do not expose the database directly to the public internet.

### Vercel deployment

1. Import the GitHub repository into the PMA-approved Vercel account.
2. In **Project Settings → Environment Variables**, set the four variables listed above for the correct deployment environments.
3. Use a PostgreSQL provider/network configuration that the deployed app is authorized to access. If PMA's database is only available inside its private network, a public Vercel deployment will not be able to connect unless PMA IT provisions an approved secure connection; an intranet server may be the better choice.
4. Before first use, run `npx prisma db push` from a trusted machine with the production `DATABASE_URL` and approved DBA access, or use PMA's migration process. Never put the database URL in client-side code.
5. Deploy and test login plus a test record before importing operational data.

## Data model and behaviour

Each cadet record stores:
- Cadet/roll number (unique)
- Name, company, platoon, and current term
- Assigned courses
- Quiz, mid-term, final-term, assignment, and public-speaking marks
- Relegation status and timestamps

The weighted result is calculated by the application: Quiz 20%, Mid Term 25%, Final Term 35%, Assignments 15%, Public Speaking 5%. Grades are A (80+), B (70–79.99), C (60–69.99), D (50–59.99), and F (below 50).

The `/api/cadets` endpoint requires a valid administrator session. Cadet updates are written to PostgreSQL; browser local storage is not used as the application database.

## Excel import columns

Required columns:
- `Roll Number` (or `Roll No`, `Roll`, `Cadet Number`)
- `Name` (or `Cadet Name`, `Full Name`)

Optional columns:
- `Company`: Khalid, Tariq, Qasim, or Salahuddin
- `Platoon`: 1st, 2nd, or 3rd
- `Term`: 1st Term, 2nd Term, 3rd Term, or 4th Term

Use a copy of the PMA-approved spreadsheet format for the first import. Check the imported records before using them operationally.

## Security, backups, and operational handover

- The administrator login uses environment-configured credentials; there is no hard-coded demo login.
- Use HTTPS, strong credentials, a long random session secret, restricted database network access, and approved access controls.
- Configure automated PostgreSQL backups and periodically test restoration. This application does not itself create database backups.
- Decide with PMA IT who can administer accounts, rotate credentials, update the application, and restore data.
- Test on a staging database before upgrades. Do not run schema changes against the operational database without a backup and DBA approval.
- This repository is a deployment-ready application foundation, but final production acceptance still requires PMA IT to provision the database, configure secrets/networking, review security and access requirements, and perform acceptance testing.

## Project structure

```text
app/
  api/
    auth/route.js       # administrator sign-in/sign-out
    cadets/route.js     # authenticated PostgreSQL data API
  page.js               # application UI
  globals.css           # styles
lib/
  auth.js               # signed session validation
  prisma.js             # Prisma client
prisma/
  schema.prisma         # PostgreSQL data model
.env.example            # environment variable template
README.md               # installation and deployment guide
```
