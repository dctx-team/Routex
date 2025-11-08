# Configuration Management

Routex supports flexible configuration through multiple methods with a clear priority chain.

## Configuration Priority

Configuration values are loaded with the following priority (highest to lowest):

1. **Configuration file** (`routex.config.json`)
2. **Environment variables**
3. **Default values**

## Configuration File Locations

Routex will automatically search for configuration files in the following locations:

1. `CONFIG_FILE` environment variable (explicit path)
2. `./routex.config.json` (project root)
3. `./config/routex.json`
4. `./.routex/config.json`

## Configuration Structure

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "database": {
    "path": "./data/routex.db",
    "autoMigration": true
  },
  "strategy": "priority",
  "dashboard": {
    "enabled": true,
    "password": "your-secure-password-here"
  },
  "i18n": {
    "locale": "en",
    "fallback": "en"
  }
}
```

## Environment Variables

All configuration values can be overridden with environment variables:

- `PORT` - Server port (default: 3000)
- `LOAD_BALANCE_STRATEGY` - Load balancing strategy: `priority`, `round_robin`, `weighted`, `least_used`
- `DASHBOARD_PASSWORD` - Optional password for dashboard access
- `LOCALE` - Interface language: `en` or `zh-CN`
- `CONFIG_FILE` - Explicit path to configuration file
- `DATA_DIR` - Data directory for database and logs (default: `./data` for local, `/data` for cloud)

### Database Configuration

- `DB_CACHE_TTL` - Cache TTL in milliseconds (default: 30000)

### Logging Configuration

- `LOG_LEVEL` - Global log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`)
- `LOG_FORMAT` - Log format: `json` or `pretty` (default: `pretty` in development, `json` in production)
- `LOG_LEVEL_<MODULE>` - Module-specific log level (e.g., `LOG_LEVEL_DATABASE=debug`)

**Module-specific logging examples:**

```bash
# Debug database queries only
LOG_LEVEL_DATABASE=debug npm start

# Debug multiple modules
LOG_LEVEL_DATABASE=debug LOG_LEVEL_PROXY=debug npm start

# Trace all proxy operations
LOG_LEVEL_PROXY=trace npm start
```

## Configuration API Endpoints

### Get Current Configuration

```bash
GET /api/config
```

Returns the current active configuration.

### Get Configuration File Path

```bash
GET /api/config/path
```

Returns the path to the configuration file being used.

### Update Configuration

```bash
PUT /api/config
Content-Type: application/json

{
  "server": {
    "port": 8080
  }
}
```

Updates configuration at runtime. Changes are validated before being applied.

### Reload Configuration

```bash
POST /api/config/reload
```

Reloads configuration from the file. Useful for applying changes made to the config file without restarting.

### Save Configuration

```bash
POST /api/config/save
Content-Type: application/json

{
  "path": "./my-config.json"  // Optional: specify custom path
}
```

Saves the current configuration to a file.

### Export Configuration

```bash
GET /api/config/export
```

Downloads the current configuration as a JSON file.

## Validation

All configuration updates are validated before being applied. The following validations are performed:

- **Server port**: Must be between 1 and 65535
- **Load balance strategy**: Must be one of `priority`, `round_robin`, `weighted`, `least_used`
- **Locale**: Must be one of `en`, `zh-CN`
- **CORS origins**: Must be an array

Invalid configurations will result in a validation error with a descriptive message.

## Hot Reloading

You can reload configuration at runtime using the API:

```bash
# Edit your config file
vim routex.config.json

# Reload without restarting
curl -X POST http://localhost:3000/api/config/reload
```

## Example Usage

### Create a Configuration File

```bash
# Copy the example file
cp routex.config.example.json routex.config.json

# Edit with your settings
vim routex.config.json
```

### Use Environment Variables

```bash
# Override specific settings
PORT=8080 LOAD_BALANCE_STRATEGY=weighted npm start
```

### Use Explicit Config Path

```bash
# Use a custom configuration file
CONFIG_FILE=/path/to/my-config.json npm start
```

### Runtime Updates via API

```bash
# Update port at runtime
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"server": {"port": 8080}}'

# Reload from file
curl -X POST http://localhost:3000/api/config/reload

# Export current config
curl http://localhost:3000/api/config/export > backup.json
```

## Deployment Environments

Routex automatically detects the deployment environment and adjusts defaults:

- **Local**: `host` defaults to `localhost`, data directory is `./data`
- **Cloud (Railway, Fly.io, Render, Claw)**: `host` defaults to `0.0.0.0`, data directory is `/data`

You can override these defaults with configuration files or environment variables.

## Best Practices

1. **Use configuration files for persistent settings** - Store environment-independent settings in `routex.config.json`
2. **Use environment variables for secrets** - Store sensitive data like `DASHBOARD_PASSWORD` in environment variables
3. **Version control your config** - Check `routex.config.json` into git, but add `routex.config.local.json` to `.gitignore` for local overrides
4. **Validate before deploying** - Use the validation API to check configuration before applying in production
5. **Back up configurations** - Use the export endpoint to regularly back up your configuration

## Configuration Examples

### Production Setup

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["https://your-domain.com"]
    }
  },
  "database": {
    "path": "/data/routex.db",
    "autoMigration": true
  },
  "strategy": "weighted",
  "dashboard": {
    "enabled": true
  },
  "i18n": {
    "locale": "en",
    "fallback": "en"
  }
}
```

### Development Setup

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "database": {
    "path": "./data/routex-dev.db",
    "autoMigration": true
  },
  "strategy": "priority",
  "dashboard": {
    "enabled": true,
    "password": null
  },
  "i18n": {
    "locale": "en",
    "fallback": "en"
  }
}
```
