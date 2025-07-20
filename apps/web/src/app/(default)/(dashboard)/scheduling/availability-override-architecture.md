# Date Overrides - Refined Architecture

This document outlines the new architecture for the "Date Overrides" feature, designed to replace the existing implementation with a more intuitive, modal-based workflow.

## 1. Overview

The current date override system will be refactored to improve user experience and align with modern web application best practices. The new design centers around a list of existing overrides, with clear "Edit" and "Delete" actions, and a "Create Override" button that launches a modal for adding new overrides.

This architecture prioritizes:

- **Server-Side Logic:** Using server components for data fetching and server actions for mutations.
- **Modularity:** Breaking down the UI into smaller, reusable components.
- **Maintainability:** Ensuring the new components are easy to understand and modify.

## 2. Component Structure

The feature will be composed of the following components:

- **`DateOverridesManager` (Server Component):**

  - **Purpose:** The main container for the feature. Fetches the initial list of date overrides and passes them to the `OverrideList`.
  - **Children:** `OverrideList`

- **`OverrideList` (Client Component):**

  - **Purpose:** Displays the list of date overrides and includes the "Create Override" button. Manages the state for the `SaveOverrideModal`.
  - **Props:** `initialOverrides: DateOverride[]`
  - **State:** `isModalOpen`, `editingOverride`
  - **Children:** `OverrideListItem`, `SaveOverrideModal`, `DeleteOverrideDialog`

- **`OverrideListItem` (Client Component):**

  - **Purpose:** Renders a single override with its date, time intervals, and "Edit" / "Delete" buttons.
  - **Props:** `override: DateOverride`, `onEdit: () => void`, `onDelete: () => void`

- **`SaveOverrideModal` (Client Component):**

  - **Purpose:** A modal for creating and editing overrides. Contains a calendar for date selection and inputs for time intervals.
  - **Props:** `isOpen`, `onClose`, `overrideToEdit`, `existingOverrideDates`
  - **Logic:**
    - If `overrideToEdit` is provided, the modal is in "edit" mode.
    - On save, it calls the appropriate server action (`createDateOverride` or `updateDateOverride`).

- **`DeleteOverrideDialog` (Client Component):**
  - **Purpose:** A confirmation dialog to prevent accidental deletions.
  - **Props:** `isOpen`, `onClose`, `onConfirm`
  - **Logic:** On confirmation, it calls the `deleteDateOverride` server action.

### Component Diagram

```mermaid
graph TD
    A[DateOverridesManager (Server)] -- initialOverrides --> B[OverrideList (Client)];
    B -- "Create" opens --> C[SaveOverrideModal (Client)];
    B -- Renders --> D[OverrideListItem (Client)];
    D -- "Edit" opens --> C;
    D -- "Delete" opens --> E[DeleteOverrideDialog (Client)];
    C -- Calls action --> F[Server Actions];
    E -- Calls action --> F;
```

## 3. Data Flow & State Management

The data flow is designed to be unidirectional and primarily driven by server actions.

1.  **Initial Load:**

    - The `DateOverridesManager` (server component) fetches the full availability schedule via `getSchedule()`.
    - It passes the `dateOverrides` array to the `OverrideList` component.

2.  **Create/Update Override:**

    - The user interacts with the `SaveOverrideModal`.
    - On form submission, the modal calls either the `createDateOverride` or `updateDateOverride` server action.
    - The server action updates the data in the database and calls `revalidatePath('/scheduling')`.
    - Next.js re-renders the `DateOverridesManager`, which fetches the updated data and passes it down the component tree.

3.  **Delete Override:**
    - The user clicks the "Delete" button in `OverrideListItem`, which opens the `DeleteOverrideDialog`.
    - On confirmation, the dialog calls the `deleteDateOverride` server action.
    - The server action removes the override and revalidates the path, triggering a re-render with the updated data.

This approach keeps client-side state minimal and ensures a consistent data flow.

## 4. Server Actions

The following server actions will be added to `apps/web/src/app/(default)/(dashboard)/scheduling/actions.ts`:

- **`createDateOverride(override: DateOverride): Promise<void>`**

  - **Description:** Adds a new date override to the user's schedule.
  - **Implementation:** Fetches the current schedule, adds the new override, and calls `updateSchedule()`.

- **`updateDateOverride(override: DateOverride): Promise<void>`**

  - **Description:** Updates an existing date override.
  - **Implementation:** Fetches the schedule, finds and replaces the existing override, and calls `updateSchedule()`.

- **`deleteDateOverride(date: string): Promise<void>`**
  - **Description:** Deletes a date override.
  - **Implementation:** Fetches the schedule, removes the specified override, and calls `updateSchedule()`.

## 5. File Structure

The new components will be organized as follows, replacing the existing `DateOverrides.tsx`, `OverrideCalendar.tsx`, and `OverrideForm.tsx`:

```
apps/web/src/app/(default)/(dashboard)/scheduling/
└── components/
    └── availability/
        ├── DateOverridesManager.tsx      // New container
        ├── OverrideList.tsx              // New
        ├── OverrideListItem.tsx          // New
        ├── SaveOverrideModal.tsx         // New (replaces form/calendar)
        └── DeleteOverrideDialog.tsx      // New
```

This refined architecture will provide a more robust and user-friendly experience for managing date overrides.
