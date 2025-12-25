## ADDED Requirements

### Requirement: Hardware CSV Exports
The system SHALL export hardware outputs in CSV formats for pin usage, wiring list, and BOM.

#### Scenario: Export pin usage CSV
- **WHEN** the user exports hardware CSV outputs
- **THEN** a pin usage CSV file is generated locally

### Requirement: Export Bundle
The system SHALL export a bundle that includes all enabled outputs with consistent naming and metadata.

#### Scenario: Export bundle contains all outputs
- **WHEN** the user exports an export bundle
- **THEN** the bundle includes pinmap outputs, hardware outputs, and code outputs as selected

