# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-03-01

### Added

- Revision workflow: propose changes (pending) then accept or reject. Only another user can accept; proposer can reject their own.
- Required comment for every revision action (save, accept, reject); each is posted to Comments.
- DynamoDB store for pages, revisions, and comments with optional parquet ingestion.
- Cognito auth for write operations; Hosted UI sign-in/sign-out.
- Revision history and comments UI with workflow hints.

### Changed

- README: removed legacy Pet Store docs; updated revision workflow and API description; marked clean up and release done.

## [0.1.0]

- Initial standalone wiki: Node/Express server, static frontend, resort-entry layout, Markdown edit/preview.
