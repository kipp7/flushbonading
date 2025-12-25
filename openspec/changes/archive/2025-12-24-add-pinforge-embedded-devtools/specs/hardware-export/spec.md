## ADDED Requirements
### Requirement: Hardware Exports
The system SHALL export a pin usage table, wiring list, and BOM summary for the current project.

#### Scenario: Export hardware outputs
- **WHEN** the user exports hardware data
- **THEN** the export includes a pin usage table and a wiring list
- **AND** the export includes a BOM summary based on selected sensors

### Requirement: Offline Exports
The system SHALL export hardware outputs without requiring network access.

#### Scenario: Offline export
- **WHEN** the system is offline
- **THEN** export actions still succeed using local data
