# Frontend

The user interface for the WAF Test Platform, built with React.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router
- **Icons**: Lucide React

## Key Features

- **User Authentication**: Login, registration, and session management using JWT.
- **Post Management**: A full CRUD interface for managing posts.
- **WAF Testing UI**: A dedicated page to send test payloads for various vulnerabilities (XSS, SQLi, etc.).
- **Log Monitoring Dashboard**: An interface to view and filter parsed WAF logs from the backend.

## Project Structure

```
src/
├── components/    # Reusable UI components
├── context/       # React Context for state management (e.g., AuthContext)
├── pages/         # Top-level page components
├── types/         # TypeScript type definitions
├── utils/         # Utility functions (e.g., api.ts client)
├── App.tsx        # Main application component with routing
└── main.tsx       # Application entry point
```

## Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` by default.

## Build

To create a production build, run:
```bash
npm run build
```
The output will be in the `dist` directory.
