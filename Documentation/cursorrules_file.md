Cursor Rules for Project

## Project Overview

**Project Name:** Professional Invoice System **Description:** This system enables freelancers and contractors to track tasks and generate professional invoices with ease. Designed for simplicity and adaptability for various business needs. **Tech Stack:** Next.js 14, Convex, Clerk, Shadcn UI, Tailwind CSS, React Hook Form, Zod, React Email, Puppeteer **Key Features:**

*   User profile customization
*   Client management
*   Task tracking
*   Invoice preview and PDF generation
*   Real-time updates

## Project Structure

### Root Directory:

*   Contains main configuration files and documentation, such as `README.md`, `.gitignore`, `package.json`, `next.config.js`.

### /frontend:

*   **Contains all frontend-related code, including components, styles, and assets.**

/components:

*   **TaskEntry:** Component for adding tasks quickly (`task-entry.tsx`)
*   **InvoiceDashboard:** Overview of invoices (`dashboard.tsx`)
*   **InvoiceStatusManager:** Manage invoice statuses (`status-management.tsx`)
*   **InvoiceList:** List of invoices with filtering options (`list.tsx`)

/assets:

*   Placeholder for common assets such as icons or logos used across the app.

/styles:

*   General styles including `globals.css` and `print.css` for PDF styles.

### /backend:

*   **Contains backend-related code, including API routes and database models.**

/controllers:

*   **InvoiceController:** Handles invoice logic such as creation and updates.
*   **TaskController:** Manages tasks and their states.

/models:

*   **UserModel:** Defines user details and preferences.
*   **ClientModel:** Contains client information and management.
*   **TaskModel:** Schema for task details and associations.
*   **InvoiceModel:** Structure for invoice data.

/routes:

*   **API Routes:** Endpoint definitions for tasks and invoices, such as `tasks.ts`, `invoices.ts`.

/config:

*   **Environment Configurations:** For environment variables and application settings, `env.ts`.

### /tests:

*   **Contains unit and integration tests for both frontend and backend.**

## Development Guidelines

**Coding Standards:**

*   Follow TypeScript best practices
*   Use ESLint and Prettier configurations provided in the root.

**Component Organization:**

*   Separate presentational and container logic where applicable
*   Use hooks and context for state management

## Cursor IDE Integration

**Setup Instructions:**

1.  Clone the repository.
2.  Install dependencies using `npm install` or `yarn install`.
3.  Start the development server with `npm run dev`.
4.  Run any necessary database migrations.

**Key Commands:**

*   `npm run dev` - Starts the development server
*   `npm run build` - Builds the project for production
*   `npm test` - Runs tests
*   `npm lint` - Checks for linting issues

## Additional Context

**User Roles:**

*   Primarily a single-owner user model, focused on freelancers without a need for multi-user accounts.

**Accessibility Considerations:**

*   Ensure the app is navigable via keyboard
*   Use Tailwind CSS to maintain consistent color contrast ratios for readability.
