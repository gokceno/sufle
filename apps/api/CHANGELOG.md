# @sufle/api

## 0.5.3

### Patch Changes

- ff403bd: Make tools and mcp config optional and expose port

  Install runtime system dependencies and Node/NPM in the API image. Install npx globally, create /usr/bin/python symlink to python3 and set PYTHON=/usr/bin/python3 for node-gyp. Move apt installs out of the build stage.

## 0.5.2

### Patch Changes

- Dockerfile and compose file refactor.

## 0.5.1

### Patch Changes

- 38351aa: Ability to add instructions to MCP servers via the config file.

## 0.5.0

### Minor Changes

- 24f180a: Added MCP Server support.

## 0.4.1

### Patch Changes

- Updated versions.

## 0.4.0

### Minor Changes

- 78699d3: Moved tools to individual packages. Tool calling became optional.
- dbfa041: Sufle now offers multiple output models with different inference configurations. It's now possible to use different vendors for output models.
- dfd2ec5: Implemented tool calling with two embedded tools.

### Patch Changes

- e1f050d: Fixed type errors.

## 0.3.1

### Patch Changes

- 4dfc4ed: Included entire chat context in the RAG pipeline. Added validations to chat completions to prevent abuse.

## 0.3.0

### Minor Changes

- f645c6f: Fine-tuned permissions with separate read-write access levels.

## 0.2.0

### Minor Changes

- 17df165: Upgraded to Zod 4, replaced basic if-checks with Zod.

### Patch Changes

- Updated dependencies [17df165]
  - @sufle/config@0.1.0

## 0.1.0

### Minor Changes

- 4b7be8e: Implemented "config" package.

### Patch Changes

- f073cf5: Linked DB migrations to DB_MIGRATIONS_APPLY env. variable.
- Updated dependencies [9c010dc]
  - @sufle/config@0.0.2
