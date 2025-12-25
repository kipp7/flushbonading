## ADDED Requirements

### Requirement: Planning Intelligence Checks
The system SHALL detect common integration issues and surface them as conflicts or warnings.

#### Scenario: I2C address collision warning
- **WHEN** two selected sensors share the same I2C address on the same bus
- **THEN** the system reports a warning with the colliding sensors and address

#### Scenario: UART exclusivity conflict
- **WHEN** two sensors require a single UART bus
- **THEN** the system reports a conflict that one UART cannot serve two devices

### Requirement: Canvas Navigation
The system SHALL support zoom and pan for the board canvas while keeping wiring aligned.

#### Scenario: Zoom preserves wire alignment
- **WHEN** the user zooms in and out
- **THEN** sensor boards, MCU pins, and wires remain visually aligned

### Requirement: Sensor Orientation Control
The system SHALL allow changing a sensor board orientation and retain that choice in the project.

#### Scenario: Orientation persists after save and load
- **WHEN** the user changes a sensor orientation and saves and reloads the project
- **THEN** the orientation is restored

