---
"@sufle/api": patch
---

Increase embedding size and use local DB volumes.

Change embedding F32_BLOB length from 768 to 3072 Replace named Docker volumes (cli_data, api_data) with ./apps/cli/db and ./apps/api/db host mounts for services.
