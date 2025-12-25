## ADDED Requirements

### Requirement: Project Schema Versioning
The system SHALL include a schema version in the saved project file and migrate older versions on load.

#### Scenario: Load older project version
- **WHEN** the user loads a project saved with an older schema version
- **THEN** the project is migrated to the latest schema without losing allocation intent

### Requirement: Autosave and Recent Projects
The system SHALL support local autosave and a recent projects list for faster iteration.

#### Scenario: Autosave creates a recent entry
- **WHEN** the user modifies a project and autosave runs
- **THEN** the project is persisted locally and appears in the recent projects list

