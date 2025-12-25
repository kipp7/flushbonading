## ADDED Requirements
### Requirement: Critical Pin Constraints
The system SHALL enforce critical pin constraints (e.g., SWD, BOOT, oscillator pins) and mark conflicts when allocations violate them.

#### Scenario: Sensor allocation conflicts with SWD pins
- **WHEN** a sensor requires a pin that is reserved for SWD
- **THEN** the allocator reports a conflict with a clear constraint reason

### Requirement: Configurable Constraint Set
The system SHALL allow the constraint set to be updated from local data files.

#### Scenario: Local constraint file is updated
- **WHEN** a local constraint definition is modified
- **THEN** the allocator uses the updated constraints without requiring network access
