/**
 * Conversion and Encoding Tools
 */
const crypto = require('crypto');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ConversionTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'base64_encode',
          description: 'Encode text or file to Base64',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Text or file path to encode' },
              is_file: { type: 'boolean', description: 'Whether input is a file path' }
            },
            required: ['input']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'base64_decode',
          description: 'Decode Base64 to text or file',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Base64 string to decode' },
              output_file: { type: 'string', description: 'Output file path (optional)' }
            },
            required: ['input']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'hash_generate',
          description: 'Generate hash (MD5, SHA1, SHA256, etc.)',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Text or file to hash' },
              algorithm: { type: 'string', description: 'Hash algorithm: md5, sha1, sha256, sha512' },
              is_file: { type: 'boolean', description: 'Whether input is a file path' }
            },
            required: ['input']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'url_encode',
          description: 'URL encode/decode text',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Text to encode/decode' },
              action: { type: 'string', description: 'encode or decode' }
            },
            required: ['text', 'action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'json_format',
          description: 'Format, minify, or validate JSON',
          parameters: {
            type: 'object',
            properties: {
              json: { type: 'string', description: 'JSON string to process' },
              action: { type: 'string', description: 'format, minify, or validate' }
            },
            required: ['json', 'action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'text_case',
          description: 'Convert text case',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Text to convert' },
              case_type: { type: 'string', description: 'upper, lower, title, camel, snake, kebab' }
            },
            required: ['text', 'case_type']
          }
        }
      }
    ];
  }

  static async base64Encode(input, isFile = false) {
    try {
      let data;
      if (isFile) {
        data = await fs.readFile(input);
        const encoded = data.toString('base64');
        return `🔐 Base64 encoded (${input}):\n\n${encoded}`;
      } else {
        const encoded = Buffer.from(input, 'utf8').toString('base64');
        return `🔐 Base64 encoded:\n\n${encoded}`;
      }
    } catch (error) {
      throw new Error(`Failed to encode: ${error.message}`);
    }
  }

  static async base64Decode(input, outputFile) {
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      
      if (outputFile) {
        await fs.writeFile(outputFile, decoded, 'utf8');
        return `🔓 Base64 decoded and saved to: ${outputFile}`;
      } else {
        return `🔓 Base64 decoded:\n\n${decoded}`;
      }
    } catch (error) {
      throw new Error(`Failed to decode: ${error.message}`);
    }
  }

  static async hashGenerate(input, algorithm = 'sha256', isFile = false) {
    try {
      const hash = crypto.createHash(algorithm);
      
      if (isFile) {
        const data = await fs.readFile(input);
        hash.update(data);
      } else {
        hash.update(input, 'utf8');
      }
      
      const result = hash.digest('hex');
      const source = isFile ? `file: ${input}` : 'text input';
      return `🔐 ${algorithm.toUpperCase()} hash (${source}):\n\n${result}`;
    } catch (error) {
      throw new Error(`Failed to generate hash: ${error.message}`);
    }
  }

  static async urlEncode(text, action) {
    try {
      if (action === 'encode') {
        const encoded = encodeURIComponent(text);
        return `🌐 URL encoded:\n\n${encoded}`;
      } else if (action === 'decode') {
        const decoded = decodeURIComponent(text);
        return `🌐 URL decoded:\n\n${decoded}`;
      } else {
        throw new Error('Action must be "encode" or "decode"');
      }
    } catch (error) {
      throw new Error(`Failed to ${action} URL: ${error.message}`);
    }
  }

  static async jsonFormat(json, action) {
    try {
      const parsed = JSON.parse(json);
      
      switch (action) {
        case 'format':
          const formatted = JSON.stringify(parsed, null, 2);
          return `📄 JSON formatted:\n\n${formatted}`;
        
        case 'minify':
          const minified = JSON.stringify(parsed);
          return `📦 JSON minified:\n\n${minified}`;
        
        case 'validate':
          return `✅ JSON is valid (${Object.keys(parsed).length} root keys)`;
        
        default:
          throw new Error('Action must be "format", "minify", or "validate"');
      }
    } catch (error) {
      throw new Error(`JSON ${action} failed: ${error.message}`);
    }
  }

  static async textCase(text, caseType) {
    try {
      let result;
      
      switch (caseType) {
        case 'upper':
          result = text.toUpperCase();
          break;
        case 'lower':
          result = text.toLowerCase();
          break;
        case 'title':
          result = text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          break;
        case 'camel':
          result = text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
            index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
          break;
        case 'snake':
          result = text.toLowerCase().replace(/\s+/g, '_');
          break;
        case 'kebab':
          result = text.toLowerCase().replace(/\s+/g, '-');
          break;
        default:
          throw new Error('Case type must be: upper, lower, title, camel, snake, kebab');
      }
      
      return `📝 Text converted to ${caseType} case:\n\n${result}`;
    } catch (error) {
      throw new Error(`Failed to convert case: ${error.message}`);
    }
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'base64_encode':
        return await this.base64Encode(args.input, args.is_file);
      case 'base64_decode':
        return await this.base64Decode(args.input, args.output_file);
      case 'hash_generate':
        return await this.hashGenerate(args.input, args.algorithm, args.is_file);
      case 'url_encode':
        return await this.urlEncode(args.text, args.action);
      case 'json_format':
        return await this.jsonFormat(args.json, args.action);
      case 'text_case':
        return await this.textCase(args.text, args.case_type);
      default:
        throw new Error(`Unknown conversion tool: ${toolName}`);
    }
  }
}

module.exports = ConversionTools;