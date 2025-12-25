## ADDED Requirements

### Requirement: MCU Selection and Pin Map
The system SHALL allow the user to select an MCU and render its pin map with pin labels and reserved/power markings.

#### Scenario: Select MCU and view pins
- **WHEN** the user selects an MCU model
- **THEN** the UI displays the MCU name, package, and visible pins

### Requirement: Sensor Library and Selection
The system SHALL provide a sensor library grouped by interface, with search and multi-select.

#### Scenario: Select sensors from the library
- **WHEN** the user searches and toggles sensors
- **THEN** the selected sensors are shown as active in the library list

### Requirement: Auto Allocation and Conflict Reporting
The system SHALL auto-assign required sensor signals to available MCU pins and report conflicts when allocation is not possible.

#### Scenario: Allocate pins for selected sensors
- **WHEN** the user selects sensors
- **THEN** the system assigns pins for each required signal or records a conflict reason

### Requirement: Manual Pin Locking
The system SHALL allow users to lock a sensor signal to a specific MCU pin.

#### Scenario: Lock a signal to a pin
- **WHEN** the user selects a fixed pin for a signal
- **THEN** the allocator uses it or reports a conflict if unavailable

### Requirement: Visual Wiring
The system SHALL render sensor boards and draw connection wires from MCU pins to sensor signals.

#### Scenario: Wiring updates after selection
- **WHEN** the user adds or removes sensors
- **THEN** the wire paths update to match the current allocation

### Requirement: Placement Near Relevant Pins
The system SHALL place each sensor board near the dominant MCU pin side used by its assigned signals.

#### Scenario: Place sensor near matched pins
- **WHEN** a sensor is assigned mostly to right-side MCU pins
- **THEN** the sensor board is placed on the right side of the MCU board

### Requirement: Board Dragging and Position Retention
The system SHALL allow users to drag MCU and sensor boards and retain their positions during the session.

#### Scenario: Drag and keep board position
- **WHEN** the user drags a board to a new position
- **THEN** the board remains at that position until the layout is recomputed or reset

### Requirement: Export Pin Map
The system SHALL export the current allocation as JSON and CSV.

#### Scenario: Export JSON
- **WHEN** the user clicks Export JSON
- **THEN** a `pinmap.json` file is downloaded with the current pin assignments

### Requirement: Standard Library Code Generation
The system SHALL generate starter code using the STM32 Standard Peripheral Library (SPL) based on the current pin allocation.

#### Scenario: Generate SPL code
- **WHEN** the user requests code generation
- **THEN** the system outputs SPL initialization code for GPIO and selected peripherals

### Requirement: Project Save and Load
The system SHALL allow saving and loading a project that includes MCU selection, sensor selection, and board positions.

#### Scenario: Save and reload project
- **WHEN** the user saves a project and later loads it
- **THEN** the MCU, sensors, and board positions are restored

### Requirement: Offline-First Operation
The system SHALL run fully offline with local data and local project files.

#### Scenario: Run without network
- **WHEN** the application is used without network access
- **THEN** all core planning, allocation, and export functions remain available

### Requirement: Custom Sensor Templates
The system SHALL allow users to define custom sensors with interface type and required signals.

#### Scenario: Create a custom sensor
- **WHEN** the user adds a custom sensor template
- **THEN** it appears in the sensor library and can be selected
