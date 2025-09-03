```mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Do something]
    C -->|No| E[Do something else]
    D --> F[End]
    E --> F[End]
```