# Capability: Catalog Import

## Purpose
Allow importing local MCU, sensor, and constraint catalogs from files so PinForge remains usable offline and can be extended without vendor APIs.

## Requirements

### Requirement: Catalog Import Templates
The system SHALL support importing MCU and sensor catalogs from local JSON or CSV files.

#### Scenario: Import a sensor catalog from CSV
- **WHEN** the user selects a valid CSV catalog file
- **THEN** the sensors are added to the local catalog

### Requirement: Import Validation
The system SHALL validate imported catalogs and report schema errors.

#### Scenario: Import file is missing required fields
- **WHEN** the user imports a malformed catalog
- **THEN** the system reports validation errors and does not apply the import

### Requirement: Offline Import
The system SHALL support catalog imports without network access.

#### Scenario: Offline catalog import
- **WHEN** the system is offline
- **THEN** imports work using local files only
