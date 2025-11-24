---
"@sufle/api": patch
---

Make tools and mcp config optional and expose port

Install runtime system dependencies and Node/NPM in the API image. Install npx globally, create /usr/bin/python symlink to python3 and set PYTHON=/usr/bin/python3 for node-gyp. Move apt installs out of the build stage.
