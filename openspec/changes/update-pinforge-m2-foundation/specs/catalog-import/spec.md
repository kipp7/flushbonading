## ADDED Requirements

### Requirement: Catalog Schema Versioning
The system SHALL include a schema version in catalog templates and validate schema version compatibility on import.

#### Scenario: Reject incompatible schema version
- **WHEN** the user imports a catalog with an incompatible schema version
- **THEN** the system reports a clear error and does not apply the import

### Requirement: Import Preview and Summary
The system SHALL provide a preview and summary of import changes including counts and errors before applying changes.

#### Scenario: Preview import with errors
- **WHEN** the user selects a catalog file that contains invalid items
- **THEN** the preview shows error rows and totals
- **AND** applying the import excludes invalid items or blocks based on severity rules

### Requirement: Merge or Replace Semantics
The system SHALL support explicit merge or replace modes for sensor and MCU imports.

#### Scenario: Merge import keeps existing
- **WHEN** the user imports a sensor catalog in merge mode
- **THEN** existing sensors remain and new sensors are appended or updated per ID rules

