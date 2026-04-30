# CaulCo Cashflow Command Center — Local Setup

This app runs entirely on your local machine. No Manus account needed.

## Prerequisites

- **Node.js** 20+ and **pnpm** (`npm install -g pnpm`)
- **MySQL** 8+ running locally (or any hosted MySQL instance)

---

## 1. Create the database

```sql
CREATE DATABASE caulco CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=mysql://root:yourpassword@localhost:3306/caulco
JWT_SECRET=pick-any-long-random-string
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Tanya
ADMIN_EMAIL=info@aaumedical.net
```

---

## 3. Install dependencies

```bash
pnpm install
```

---

## 4. Run database migrations

```bash
pnpm db:push
```

---

## 5. Start the app

```bash
pnpm dev
```

Then open **http://localhost:3000** in your browser and log in with the `ADMIN_PASSWORD` you set.

---

## Uploading files

Drop QuickBooks export files (CSV, XLSX, PDF, DOCX) onto the upload zone in the sidebar.
The app auto-detects the report type and parses it immediately. Uploaded files are stored
locally in `data/uploads/` inside the project folder.

---

## Building for production

```bash
pnpm build
pnpm start
```
