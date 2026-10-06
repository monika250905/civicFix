# CivicFix

CivicFix is a full-stack civic complaint reporting and resolution portal. The frontend is React + Vite. The API is Spring Boot 3 / Java 21 with MySQL persistence, JWT authentication and role-aware complaint operations.

## Included features

- **AI-assisted complaint triage:** a local explainable classifier suggests category and department, calculates urgency from issue and safety signals, returns a priority band, confidence, rationale, review flag and triage version. It runs without an external model service or API key.
- **Location-aware reporting and analytics:** optional validated latitude/longitude and address/ward text are saved with each report. The geospatial screen plots actual coordinates and groups reports by submitted location text. Analytics are calculated from records the signed-in role can access.
- **Role dashboards:** citizens see and track their own reports; department officers see reports routed to their configured department and can update status; administrators see citywide complaints and manage account roles and department assignments.
- **Resolution management:** complaint states are validated; accepted changes are saved to a status activity history. Complaint details include triage and status history.
- **JWT access control:** public registration always creates a citizen. The API uses signed JWTs, server-side role checks, citizen ownership checks and officer department scoping.

## Requirements

- Java 21 and Maven 3.8+.
- Node.js 20+ and npm.
- A running MySQL server.

## Configure and start the API

Create a MySQL database named `civicfix` (or let the configured JDBC URL create it) and set the environment variables in the shell used to start Spring Boot. The JWT secret must contain at least 32 bytes.

PowerShell example:

```powershell
$env:MYSQL_URL = 'jdbc:mysql://localhost:3306/civicfix?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC'
$env:MYSQL_USERNAME = 'root'
$env:MYSQL_PASSWORD = 'your-local-mysql-password'
$env:JWT_SECRET = 'replace-this-with-a-long-random-secret-value'
mvn spring-boot:run
```

The API listens on `http://localhost:8080/api`. `application.yml` updates the schema for local development. Use reviewed schema migrations before deploying to production.

## Configure and start the frontend

In a second terminal, from this project directory:

```powershell
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`. Vite forwards `/api` requests to the local Spring API.

## First administrator and officer setup

Register a normal account in CivicFix. To bootstrap the first administrator, update that account directly in the local database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Sign out and sign back in to refresh the account's role. The administrator's **Team** page can then grant department officer access and assign a department such as `Water Works`, `Public Works`, `Electrical Services`, `Sanitation`, `Public Safety`, or `General Services`. Department names must match the AI triage routing name for those complaints to appear in the officer queue.

Public account registration cannot choose an elevated role.

## API overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a citizen account |
| POST | `/api/auth/login` | Public | Issue a JWT |
| POST | `/api/complaints/triage` | Public | Preview triage from title and description |
| POST | `/api/complaints` | Citizen | Save a complaint and its triage result |
| GET | `/api/complaints` | Authenticated | List own, department-scoped, or citywide complaints by role |
| GET | `/api/complaints/mine` | Authenticated | List complaints visible to the signed-in user |
| GET | `/api/complaints/{id}/events` | Authorized viewer | Read complaint activity history |
| PATCH | `/api/complaints/{id}/status` | Officer / admin | Validate and record a status change |
| GET | `/api/admin/users` | Admin | List account roles and department scopes |
| PATCH | `/api/admin/users/{id}/role` | Admin | Update role and department scope |

Protected API calls use `Authorization: Bearer <token>`. Complaint create requests may include `latitude` and `longitude`; both must be supplied together and within valid coordinate ranges.

## Triage behavior

The built-in `AiTriageService` is a deterministic local language-signal classifier. It recognizes civic issue categories and impact / safety phrases, calculates a 0-100 urgency score, maps score bands to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`, and provides confidence and a plain-language rationale. Critical safety cues and uncertain classifications are marked for staff review. The recommendation is decision support; an authorized human manages complaint status and resolution. Update the category vocabulary and scoring rules against local service definitions before production use.

## Geospatial behavior and limitations

The project intentionally requires no third-party map key. It plots submitted latitude/longitude on a relative coordinate canvas and summarizes complaints by address/landmark text. It does not geocode addresses, load a basemap, or have official ward boundary polygons. To use ward-level GIS analysis, add a trusted geocoder and jurisdiction boundary dataset, document location consent and retention, and test coordinate-to-ward assignment before relying on ward counts.

## Security and deployment notes

- Keep database credentials and `JWT_SECRET` out of source control. `.env.example` is a template; Spring Boot does not automatically load it as an environment file.
- Registration assigns `CITIZEN` only. The first administrator is provisioned explicitly; later role changes are admin-only.
- JWT roles are looked up against the current database user on each request so a role change takes effect on the next request.
- The included CORS policy is for local Vite development. Set production origins explicitly before deployment.
- The local rules triage engine is not an externally hosted generative model and does not transmit complaint text to a third party.
