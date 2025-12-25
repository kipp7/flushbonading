## ADDED Requirements
### Requirement: SPL Template Code Generation
The system SHALL generate SPL-only C templates for allocated buses and sensor placeholders based on the current pin allocation.

#### Scenario: Generate SPL templates for allocated I2C and SPI
- **WHEN** the user exports SPL templates with an MCU and sensors selected
- **THEN** the output includes SPL-based init code for I2C and SPI buses that are allocated
- **AND** the output includes placeholder functions for each selected sensor

### Requirement: SPL Output Scope
The system SHALL NOT generate HAL or LL code.

#### Scenario: User requests SPL export
- **WHEN** the user exports SPL templates
- **THEN** the output contains SPL-only symbols and includes no HAL/LL headers or APIs
