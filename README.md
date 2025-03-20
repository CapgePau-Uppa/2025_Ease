# 2025_Ease

## Project Explanation

This project aims to create a website where you can search for non-European brands and receive alternative European brands. This can help promote European brands and encourage local consumption, which can have beneficial effects on the environment.

### Features

On our website, you can:

- Search for a brand/category or products and receive alternative European brands/products similar to those you've searched for,
- Suggest a product/brand you think is a good alternative,
- Rate the alternative to give other users product advice.

## Project Setup Guide

### Prerequisites

Before starting, ensure you have the following installed on your system:

- **Node.js** (latest LTS version recommended)
- **Angular CLI** (for the frontend)
- **Git** (to clone the repository)
- **CouchBase** (if you want to run the project in development mode)

### Installation Steps

#### Clone the Repository

```sh
git clone <https://github.com/CapgePau-Uppa/2025_Ease.git>
cd <2025_Ease>
```

#### Install Dependencies

Navigate to the root of your directory and install the required dependencies:

```sh
npm run install:all
```

#### Import the Environment File

Place the `.env.production` file at the project root (place your .env file where the `.env.sample` file is). If necessary, you may need to modify this part of the `\2025_Ease\backend\src\main.ts` file to adapt it to your .env file:

```sh
// Load the right .env
const envFile = path.resolve(
  __dirname,
  "../../.env." + (process.env.NODE_ENV || "development")
);
dotenv.config({ path: envFile });
console.log(`🚀 Running in ${process.env.NODE_ENV} mode`);
```

#### Couchbase
1. for the production mode :

    As far as production mode is concerned, you don't need to install anything as you'll be accessing the deployed database, just make sure that in your `.env.production` all your variables are correct.

2. for development mode :

    For development mode, you need to install couchbase, create your server, bucket and index.

    - To install couchbase locally, go to this url: `https://www.couchbase.com/downloads/?family=couchbase-server` and install the couchbase serve community (the free one).
    - Once installed, log in, follow the steps and create a server (the server itself isn't very important, but make sure you remember your access codes).
    - Create a user (make sure it's an admin user, and note the login ID - it's very important).
    - Create all the buckets you need, making sure that the names of the buckets you've just created match those of your `.env.development`.
    - Create your index on your bucket products

  #### Note:

  - Make sur all your variables in your `.env.development` match those in your couchbase database, including the bucket's name and index's name. 
  - For development mode, the `DB_HOST` of the `.env` must be the IP of the machine hosting couchbase (if you're local then you must put your IP).
  - /!\ If you can't connect to the database, check that you don't have a VPN. CouchBase prevents connection if you have one, so use a private connection such as your connection share or a personal Wifi.

## Starting the Project

You have several options for launching the project, depending on your needs and workflow.

### Option 1: Launch the Entire Project via the Global package.json

This method allows you to start both the frontend and the backend from a single terminal. To do this, navigate to the root directory of the project and run:

```sh
npm run start:prod
```

### Option 2: Launch the Frontend and Backend in Separate Terminals

This approach is especially suitable for development mode and offers greater flexibility.

1. Starting the Frontend

    Open a terminal, navigate to the frontend folder, and run:

    ```sh
    ng serve
    ```

2. Starting the Backend

    Open another terminal, navigate to the backend folder, and choose one of the following commands:

    To start in development mode:
    ```sh
    npm run start:dev
    ```

    To start in production mode:
      ```sh
      npm run start:prod
      ```

    #### Notes:
    You can launch the project components either via the global `package.json` or by using the specific scripts in the frontend and backend folders, depending on which method suits you best.
    In this case, you may need to take a look at each `package.json` to find out which script to run according to your needs (in the `package.json` files, look for the `scripts` section).

### Additional Notes

- Ensure that all dependencies are properly installed before starting the applications.
- Make sure that the `.env.production` file contains all required environment variables for the backend.
- If any issues arise, check the logs and ensure that the ports used by both frontend and backend are not occupied.
- Sometimes, you'll get an error message saying:

```sh
NOTE: Raw file sizes do not reflect development server per-request transformations.
An unhandled exception occurred: EBUSY: resource busy or locked, rmdir 'your_path\ProjetTutore_CapG\frontend\.angular\cache\19.1.5\frontend\vite\deps_ssr'
See "your_path\AppData\Local\Temp\ng-RHFVO8\angular-errors.log" for further details.
```

To solve this problem, you need to go to this folder `your_path\ProjetTutore_CapG\frontend\.angular\cache\19.1.5\frontend\vite\` and delete it. You can delete the entire `\vite\` folder, or just the `deps_ssr` and `deps` files, depending on the error message you have.

# Docker Deployment Guide

This section explains how to deploy the complete application (frontend, backend, and Couchbase) using Docker.

## Prerequisites

- Docker installed on your machine
- Docker Compose installed on your machine

## Project Structure for Docker

```
projetCapG/
├── backend/                # NestJS Application
├── frontend/               # Angular Application
├── couchbase-setup/        # Couchbase initialization scripts
├── .env.development        # Environment variables for Docker
├── docker-compose.yml      # Docker Compose configuration
├── start-docker.cmd        # Launch script for Windows
└── README.md               # This file
```

## Configuration

All environment variables are defined in the `.env.development` file at the project root. If you want to modify parameters (ports, bucket names, etc.), you can edit this file.

## Starting the Project with Docker

To start the entire application, including the backend, frontend, and Couchbase:

### On Windows

Run the `start-docker.cmd` script at the project root:

```
.\start-docker.cmd
```

Note the `.\` prefix which is required in PowerShell to run scripts in the current directory.

Or you can start manually by specifying the environment file:

```
docker-compose --env-file .env.development up -d
```

This command will:
1. Download the Couchbase image
2. Build Docker images for the backend, frontend, and initialization scripts
3. Start all services
4. Initialize Couchbase with the necessary buckets and indexes

## Accessing Services

Once the containers are started, you can access the following services:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000/data
- **Couchbase Admin Interface**: http://localhost:8091
  - Default credentials: user1 / password (configured in the .env.development file)

## Stopping Containers

To stop all containers without removing them:

```
docker-compose stop
```

To stop and remove containers (Couchbase data will be preserved in the volume):

```
docker-compose down
```

To completely remove all containers and volumes (caution: this will delete all Couchbase data):

```
docker-compose down -v
```

## Troubleshooting

If you encounter issues with Couchbase initialization, you can check the logs:

```
docker-compose logs couchbase-setup
```

For backend or frontend issues:

```
docker-compose logs backend
docker-compose logs frontend
```
## Environment Configuration

This project uses Docker Compose to deploy multiple services:
- Angular Frontend (port 4200)
- Nestjs Backend (port 3000)
- Couchbase Database (port 8091)

## Manual Couchbase Configuration

The Couchbase database needs to be configured manually. Follow these steps after launching the containers:

1. **Access the Couchbase Administration Interface**:
   - Open your browser at http://localhost:8091
   - The Couchbase initialization screen will appear

2. **Configure a New Cluster**:
   - Cluster name: `cluster1` (or a name of your choice)
   - Create an administrator account:
     - Username: `yourUsername`
     - Password: `yourMDP`
   - Click "Next"

3. **Create Buckets**:
   - Once logged into the administration interface, go to the "Buckets" tab
   - Create the following buckets (for each one, click on "Add Bucket"):
     - Name: `ProductsBDD`, RAM Quota: 100 MB
     - Name: `UsersBDD`, RAM Quota: 100 MB
     - Name: `CategoryBDD`, RAM Quota: 100 MB
     - Name: `BrandsBDD`, RAM Quota: 100 MB

5. **Create an Administrative User**:
   - This user will be referenced in your .env file
   - Go to the "Security" tab, then click "Add User"
   - Use the following credentials to match the configuration:
     - Username: `user1`
     - Password: `password`
   - Make sure to select Administrative permissions!

6. **Create an Index**:
   - Before creating the index, you need to add at least one product to ProductsBDD
   - In the "Documents" tab of ProductsBDD, add a document with this following structure:
   
   ```json
   {
     "FK_Brands": "brand::0903ec71-6f5f-4623-968e-f0f3dc4035ec",
     "category": "Electronics",
     "createdAt": "2025-03-10T13:26:37.801Z",
     "description": "dfdfsf",
     "ecoscore": "d",
     "id": "13f63a7e-44df-4aa9-830b-03d276d2fad8",
     "image": "",
     "manufacturing_places": "",
     "name": "testEelect",
     "origin": "France",
     "source": "Internal",
     "status": "add-product",
     "tags": [
       "test",
       "brand"
     ],
     "updatedAt": "2025-03-10T13:26:37.801Z"
   }
   ```
   
   - Then go to the "Search" tab and select "Quick Index"
   - Name the index: `IndexTest`
   - Select keyspace: `ProductsBDD`
   - In the field selection, choose: category, FK_Brands, name, status, tags, description one after the other
   - Select type: text
   - Select the first French and 4 first checkboxes for indexing options

## Important Notes About Couchbase Configuration

### Persistence of Couchbase Configuration

Couchbase configuration is persistent across Docker restarts due to the volume defined in the docker-compose.yml file:

```yaml
volumes:
  couchbase_data:
    driver: local
```

This means:

- **You only need to configure Couchbase once**. The configuration will persist across container restarts and even after running `docker-compose down` (as long as you don't delete the volume).

- **If you run `docker-compose down -v`**, this will delete the volume and you will need to reconfigure Couchbase from scratch according to the manual configuration steps above.

- **If you modify bucket names or structure** in your application, you will need to manually update the Couchbase configuration to match these changes.

This is precisely why we've opted for a manual configuration approach - once configured, Couchbase will work correctly without additional intervention during normal restarts.

### When to Reconfigure Couchbase

You only need to reconfigure Couchbase in the following scenarios:

1. After executing `docker-compose down -v` (which removes all volumes)
2. If you delete the `couchbase_data` volume manually
3. If you change bucket names or structure in your application
4. If you're setting up the application on a new machine

In all other cases, including regular application restarts with `.\start-docker.cmd`, your Couchbase configuration will remain intact.
