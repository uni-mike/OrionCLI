/**
 * Database Tools - Essential operations only
 * Simple, practical database operations that complement AI capabilities
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DatabaseTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'db_query',
          description: 'Execute database query (MySQL, PostgreSQL, SQLite)',
          parameters: {
            type: 'object',
            properties: {
              database: { type: 'string', description: 'Database connection string or path' },
              query: { type: 'string', description: 'SQL query to execute' },
              db_type: { type: 'string', description: 'mysql, postgres, sqlite' }
            },
            required: ['database', 'query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'db_backup',
          description: 'Create database backup',
          parameters: {
            type: 'object',
            properties: {
              database: { type: 'string', description: 'Database to backup' },
              output_path: { type: 'string', description: 'Backup file path' },
              db_type: { type: 'string', description: 'mysql, postgres, sqlite' }
            },
            required: ['database', 'output_path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'db_restore',
          description: 'Restore database from backup',
          parameters: {
            type: 'object',
            properties: {
              backup_file: { type: 'string', description: 'Path to backup file' },
              database: { type: 'string', description: 'Target database' },
              db_type: { type: 'string', description: 'mysql, postgres, sqlite' }
            },
            required: ['backup_file', 'database']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'db_schema',
          description: 'Get database schema information',
          parameters: {
            type: 'object',
            properties: {
              database: { type: 'string', description: 'Database connection' },
              table: { type: 'string', description: 'Specific table (optional)' },
              db_type: { type: 'string', description: 'mysql, postgres, sqlite' }
            },
            required: ['database']
          }
        }
      }
    ];
  }

  static async dbQuery(database, query, dbType = 'sqlite') {
    try {
      let command;
      
      switch (dbType) {
        case 'sqlite':
          command = `sqlite3 "${database}" "${query}"`;
          break;
        case 'mysql':
          command = `mysql -e "${query}" ${database}`;
          break;
        case 'postgres':
          command = `psql -c "${query}" ${database}`;
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      return `📊 Query Results:\n\n${stdout || 'Query executed successfully'}${stderr ? `\n⚠️ Warnings: ${stderr}` : ''}`;
      
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  static async dbBackup(database, outputPath, dbType = 'sqlite') {
    try {
      let command;
      
      switch (dbType) {
        case 'sqlite':
          command = `sqlite3 "${database}" ".backup '${outputPath}'"`;
          break;
        case 'mysql':
          command = `mysqldump ${database} > "${outputPath}"`;
          break;
        case 'postgres':
          command = `pg_dump ${database} > "${outputPath}"`;
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
      
      await execAsync(command);
      
      return `✅ Database backup created successfully at: ${outputPath}`;
      
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  static async dbRestore(backupFile, database, dbType = 'sqlite') {
    try {
      let command;
      
      switch (dbType) {
        case 'sqlite':
          command = `sqlite3 "${database}" ".restore '${backupFile}'"`;
          break;
        case 'mysql':
          command = `mysql ${database} < "${backupFile}"`;
          break;
        case 'postgres':
          command = `psql ${database} < "${backupFile}"`;
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
      
      await execAsync(command);
      
      return `✅ Database restored successfully from: ${backupFile}`;
      
    } catch (error) {
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  static async dbSchema(database, table, dbType = 'sqlite') {
    try {
      let command;
      
      switch (dbType) {
        case 'sqlite':
          command = table 
            ? `sqlite3 "${database}" ".schema ${table}"`
            : `sqlite3 "${database}" ".tables"`;
          break;
        case 'mysql':
          command = table
            ? `mysql -e "DESCRIBE ${table}" ${database}`
            : `mysql -e "SHOW TABLES" ${database}`;
          break;
        case 'postgres':
          command = table
            ? `psql -c "\\d ${table}" ${database}`
            : `psql -c "\\dt" ${database}`;
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
      
      const { stdout } = await execAsync(command);
      
      return `📋 Database Schema:\n\n${stdout}`;
      
    } catch (error) {
      throw new Error(`Failed to get schema: ${error.message}`);
    }
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'db_query':
        return await this.dbQuery(args.database, args.query, args.db_type);
      case 'db_backup':
        return await this.dbBackup(args.database, args.output_path, args.db_type);
      case 'db_restore':
        return await this.dbRestore(args.backup_file, args.database, args.db_type);
      case 'db_schema':
        return await this.dbSchema(args.database, args.table, args.db_type);
      default:
        throw new Error(`Unknown database tool: ${toolName}`);
    }
  }
}

module.exports = DatabaseTools;