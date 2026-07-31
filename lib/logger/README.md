# SchoolMesh Logging Conventions

- Use `info` for successful user or system operations.
- Use `warn` for recoverable problems, denied access, retries, and degraded external services.
- Use `error` for failed requests, failed jobs, and caught exceptions.
- Use `fatal` only when the process cannot continue safely.
- Include `requestId`, `tenantId` or `schoolSlug`, `userId`, and `role` whenever they are available.
- Use stable `operation` names such as `school.create`, `auth.login`, or `proxy.schoolmesh_route_guard`.
- Never log passwords, cookies, authorization headers, access tokens, refresh tokens, or secrets.
