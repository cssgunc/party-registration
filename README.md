# Party Registration System

A CS + SG project for the Office of Off-campus Student Life at UNC.

## About the Office of Off-campus Student Life

The Office of Off-campus Student Life serves as a vital resource for students living off-campus, providing support, programming, and services to enhance the off-campus living experience. This office works to connect off-campus students with campus resources, facilitate community building, and ensure student safety and well-being in off-campus environments. Through various initiatives and programs, the office aims to bridge the gap between on-campus and off-campus student experiences, fostering a sense of belonging and engagement for all students regardless of their housing situation.

## Project Mission

We aim to facilitate and better secure the party registration process at UNC.

## Team Members

| Name | Role |
|------|------|
| Nicolas Asanov | Technical Lead |
| Abhimanyu Agashe | Product Manager |
| Arnav Murthi | Developer |
| Matthew Barghout | Developer |
| Raymond Jiang | Developer |
| Aileen Rashid | Developer |
| Mason Mines | Developer |
| Vidur Shah | Developer |
| Shlok Bhutani | Developer |

## Onboarding
Clone the repository into your preferred directory
```
git clone https://github.com/cssgunc/party-registration.git
```
Open a terminal at the project root and run the following commands
```
cd frontend
cp .env.template .env // duplicates the template and renames it to .env

cd ../backend
cp .env.template .env // duplicates the template and renames it to .env
```
Or, you can do the actions manually  
Then,
- Ensure you have Docker and the Dev Containers extension installed
- Open the VS Code Command Palette (Mac - Cmd+Shift+P and Windows - Ctrl+Shift+P)
- Run the command **Dev Containers: Rebuild and Reopen in Container**
- This should open the dev container with the same file directory mounted so any changes in the dev container will be seen in the local repo
- The dev container is sucessfully opened once you can see file directory getting populated

test