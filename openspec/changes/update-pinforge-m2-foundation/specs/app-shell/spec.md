## ADDED Requirements

### Requirement: Settings Persistence
The system SHALL persist user interface settings locally and restore them on next launch.

#### Scenario: Restore language setting
- **WHEN** the user changes language and reloads the app
- **THEN** the selected language is restored without requiring network access

### Requirement: Error Boundary and Fallback UI
The system SHALL provide an error boundary with a user friendly fallback and a way to copy diagnostics.

#### Scenario: Runtime error shows fallback
- **WHEN** a runtime error occurs in the UI
- **THEN** the user is shown a fallback screen with a diagnostics summary

### Requirement: Toast Notifications
The system SHALL show lightweight toast notifications for import, export, save, and load operations.

#### Scenario: Export success toast
- **WHEN** an export completes successfully
- **THEN** a toast shows the exported file name or bundle name

### Requirement: Diagnostics Panel
The system SHALL provide a diagnostics panel that reports app version and environment details and allows exporting logs.

#### Scenario: Export diagnostics
- **WHEN** the user opens diagnostics and selects export
- **THEN** a diagnostics text file is generated locally

