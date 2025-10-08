# Party Registration System

A CS+SG project for the Office of Off-Campus Student Life at UNC.

## About the Office of Off-Campus Student Life

The Office of Off-Campus Student Life serves as a vital resource for students living off-campus, providing support, programs, and services to enhance the off-campus living experience. This office works to connect off-campus students with campus resources, facilitate community building, and ensure student safety and well-being in off-campus environments. Through various initiatives and programs, the office aims to bridge the gap between on-campus and off-campus student experiences, fostering a sense of belonging and engagement for all students regardless of their housing situation.

## Project Mission

We aim to facilitate and better secure the party registration process at UNC.

## Team Members

| Name             | Role            |
| ---------------- | --------------- |
| Nicolas Asanov   | Technical Lead  |
| Abhimanyu Agashe | Product Manager |
| Arnav Murthi     | Developer       |
| Matthew Barghout | Developer       |
| Raymond Jiang    | Developer       |
| Aileen Rashid    | Developer       |
| Mason Mines      | Developer       |
| Vidur Shah       | Developer       |
| Shlok Bhutani    | Developer       |
| Caleb Han        | Developer       |

## Tech Stack

- Backend
  - FastAPI
  - PostgreSQL
  - SQLAlchemy
  - Pytest
- Frontend
  - Next.js
  - ShadCN
  - Typescript

## File Structure

```
\backend\src
  \core // Shared code and infrastructure
  \modules // Modular file system to keep related files close together
    \[module]
      \[module]_entity.py // Database entities
      \[module]_model.py // Pydantic models for logic and export
      \[module]_router.py // API routes with service integration
      \[module]_service.py // Services for business logic
    ...
  \script // Scripts for database lifecycle
  \test // Testing suite

\frontend\src
  \app // Website pages
  \components // Components to be reused across pages
  \lib // Shared code, infrastructure, and utils
```

## Onboarding

Clone the repository into your preferred directory

```
git clone https://github.com/cssgunc/party-registration.git
```

Open a terminal at the project root and run the following commands

```
cd frontend
cp .env.template .env.local # duplicates the template and renames it to .env.local

cd ../backend
cp .env.template .env # duplicates the template and renames it to .env
```

Or you can do the actions manually. Then,

- Ensure you have Docker and the Dev Containers extension installed
- Open the VS Code Command Palette (Mac - Cmd+Shift+P and Windows - Ctrl+Shift+P)
- Run the command **Dev Containers: Rebuild and Reopen in Container**
- This should open the dev container with the same file directory mounted so any changes in the dev container will be seen in the local repo
- The dev container is fully built once the file directory is populated and the post create script finished running

## Starting the dev servers

Open a new terminal and run these commands to start the backend

```
cd backend/src
fastapi dev
```

Open another new terminal and run these commands to start the frontend

```
cd frontend
npm run dev
```

Navigate to [http://localhost:3000]() to view the website

## Running backend tests

The best way to run tests is by using the "Testing" window on the sidebar. This provides an intuitive GUI for running tests within the IDE.  
You can also run all tests by opening a new terminal and simply running

```sh
pytest
```

## Accessing the database

- Navigate to the PostgreSQL Explorer tab on the sidebar in VSCode
- Click the plus icon in the top right
- Enter these values as you are prompted
  - Hostname: db
  - User: postgres
  - Password: admin
  - Port: 5432 (default)
  - Connection: Standard Connection
  - Database: ocsl
  - Display Name: party-reg
- You should see a new entry appear in the sidebar
- In this interface, you can explore the database, make queries, etc.
