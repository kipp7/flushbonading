## ADDED Requirements

### Requirement: SPL Helper Stubs
The system SHALL include helper stubs for common peripheral operations in the exported SPL code templates.

#### Scenario: Export includes I2C helper stubs
- **WHEN** the user exports SPL code with an allocated I2C bus
- **THEN** the exported code includes I2C read and write helper stubs

### Requirement: Speed Presets
The system SHALL support configurable speed presets for generated peripheral initialization code.

#### Scenario: Export uses selected speed preset
- **WHEN** the user selects a speed preset before exporting code
- **THEN** the generated init code uses preset parameters for that bus

