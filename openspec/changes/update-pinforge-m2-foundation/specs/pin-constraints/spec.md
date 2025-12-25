## ADDED Requirements

### Requirement: Constraint Editor
The system SHALL provide a constraint editor that allows enabling and disabling rules and creating custom rules.

#### Scenario: Disable a rule changes allocation
- **WHEN** the user disables a hard constraint rule and reruns allocation
- **THEN** the allocator no longer blocks pins from that rule

### Requirement: Soft Constraints and Warnings
The system SHALL support soft constraints that produce warnings but do not block allocation.

#### Scenario: Soft constraint emits warning
- **WHEN** an allocation violates a soft constraint
- **THEN** the system displays a warning with the constraint reason

### Requirement: Per Project Constraint Overrides
The system SHALL allow per project overrides of constraint enablement and severity.

#### Scenario: Project override disables SWD rule
- **WHEN** the user disables SWD constraints for a specific project
- **THEN** only that project permits allocation to SWD pins

