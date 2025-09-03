/**
 * Project Awareness System
 * Understands project structure, conventions, and provides contextual help
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectAwareness {
  constructor() {
    this.projectCache = new Map();
    this.conventionPatterns = {
      // Framework detection
      react: {
        indicators: ['package.json:react', 'src/App.js', 'src/components'],
        conventions: {
          components: 'src/components',
          tests: '__tests__ or *.test.js',
          styles: 'CSS modules or styled-components',
          state: 'Context API, Redux, or Zustand'
        }
      },
      
      vue: {
        indicators: ['package.json:vue', 'src/App.vue', 'src/components'],
        conventions: {
          components: 'src/components/*.vue',
          tests: 'tests/unit',
          styles: 'Scoped styles in .vue files',
          state: 'Vuex or Pinia'
        }
      },
      
      angular: {
        indicators: ['package.json:@angular/core', 'angular.json', 'src/app'],
        conventions: {
          components: 'src/app/components',
          services: 'src/app/services',
          tests: '*.spec.ts files',
          styles: 'Component-specific SCSS'
        }
      },
      
      nextjs: {
        indicators: ['package.json:next', 'pages/', 'app/'],
        conventions: {
          pages: 'pages/ or app/ directory',
          api: 'pages/api or app/api',
          components: 'components/',
          styles: 'CSS Modules or Tailwind'
        }
      },
      
      express: {
        indicators: ['package.json:express', 'routes/', 'app.js'],
        conventions: {
          routes: 'routes/',
          models: 'models/',
          controllers: 'controllers/',
          middleware: 'middleware/'
        }
      },
      
      django: {
        indicators: ['manage.py', 'requirements.txt:django', 'settings.py'],
        conventions: {
          apps: 'Individual app directories',
          models: 'models.py in each app',
          views: 'views.py in each app',
          templates: 'templates/'
        }
      },
      
      rails: {
        indicators: ['Gemfile', 'config/routes.rb', 'app/'],
        conventions: {
          models: 'app/models',
          controllers: 'app/controllers',
          views: 'app/views',
          tests: 'test/ or spec/'
        }
      }
    };
    
    this.filePatterns = {
      configuration: /^(package\.json|tsconfig|webpack|vite|rollup|babel|eslint|prettier)/i,
      documentation: /^(README|CHANGELOG|LICENSE|CONTRIBUTING|ARCHITECTURE)/i,
      testing: /(test|spec|cypress|jest|mocha|karma)/i,
      deployment: /(dockerfile|docker-compose|\.github\/workflows|netlify|vercel)/i,
      development: /(\.env|\.gitignore|\.editorconfig|\.vscode)/i
    };
    
    this.smartSuggestions = new Map();
  }
  
  /**
   * Analyze project structure and conventions
   */
  async analyzeProject(projectPath = process.cwd()) {
    // Check cache first
    if (this.projectCache.has(projectPath)) {
      const cached = this.projectCache.get(projectPath);
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.analysis;
      }
    }
    
    const analysis = {
      type: 'unknown',
      framework: null,
      language: null,
      structure: {},
      conventions: {},
      dependencies: {},
      scripts: {},
      suggestions: [],
      files: {
        total: 0,
        byType: {}
      }
    };
    
    try {
      // Analyze package.json if exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        analysis.type = 'node';
        analysis.dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        analysis.scripts = packageJson.scripts || {};
        
        // Detect framework
        analysis.framework = this.detectFramework(analysis.dependencies);
        analysis.language = this.detectLanguage(projectPath, analysis.dependencies);
      }
      
      // Analyze project structure
      analysis.structure = await this.analyzeStructure(projectPath);
      
      // Detect conventions
      analysis.conventions = this.detectConventions(analysis);
      
      // Generate smart suggestions
      analysis.suggestions = this.generateProjectSuggestions(analysis);
      
      // Analyze file distribution
      analysis.files = await this.analyzeFileDistribution(projectPath);
      
      // Cache the analysis
      this.projectCache.set(projectPath, {
        analysis,
        timestamp: Date.now()
      });
      
    } catch (error) {
      analysis.error = error.message;
    }
    
    return analysis;
  }
  
  /**
   * Detect project framework
   */
  detectFramework(dependencies) {
    const deps = Object.keys(dependencies || {});
    
    // React ecosystem
    if (deps.includes('react')) {
      if (deps.includes('next')) return 'nextjs';
      if (deps.includes('gatsby')) return 'gatsby';
      if (deps.includes('react-native')) return 'react-native';
      return 'react';
    }
    
    // Vue ecosystem
    if (deps.includes('vue')) {
      if (deps.includes('nuxt')) return 'nuxt';
      return 'vue';
    }
    
    // Angular
    if (deps.some(d => d.startsWith('@angular/'))) {
      return 'angular';
    }
    
    // Backend frameworks
    if (deps.includes('express')) return 'express';
    if (deps.includes('fastify')) return 'fastify';
    if (deps.includes('@nestjs/core')) return 'nestjs';
    if (deps.includes('koa')) return 'koa';
    
    // Testing frameworks
    if (deps.includes('jest')) return 'jest-project';
    if (deps.includes('mocha')) return 'mocha-project';
    
    return null;
  }
  
  /**
   * Detect primary language
   */
  async detectLanguage(projectPath, dependencies) {
    const deps = Object.keys(dependencies || {});
    
    // TypeScript
    if (deps.includes('typescript') || await this.fileExists(path.join(projectPath, 'tsconfig.json'))) {
      return 'typescript';
    }
    
    // Python
    if (await this.fileExists(path.join(projectPath, 'requirements.txt')) || 
        await this.fileExists(path.join(projectPath, 'Pipfile'))) {
      return 'python';
    }
    
    // Go
    if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
      return 'go';
    }
    
    // Rust
    if (await this.fileExists(path.join(projectPath, 'Cargo.toml'))) {
      return 'rust';
    }
    
    // Default to JavaScript for Node projects
    return 'javascript';
  }
  
  /**
   * Analyze project structure
   */
  async analyzeStructure(projectPath) {
    const structure = {
      hasSrc: false,
      hasTests: false,
      hasDocs: false,
      hasConfig: false,
      directories: []
    };
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          structure.directories.push(entry.name);
          
          // Check common directories
          if (entry.name === 'src') structure.hasSrc = true;
          if (['test', 'tests', '__tests__', 'spec'].includes(entry.name)) structure.hasTests = true;
          if (['docs', 'documentation'].includes(entry.name)) structure.hasDocs = true;
          if (['config', '.config'].includes(entry.name)) structure.hasConfig = true;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return structure;
  }
  
  /**
   * Detect project conventions
   */
  detectConventions(analysis) {
    const conventions = {
      naming: 'unknown',
      structure: 'unknown',
      testing: 'unknown',
      style: 'unknown'
    };
    
    // Detect naming conventions
    if (analysis.structure.directories.some(d => d.includes('-'))) {
      conventions.naming = 'kebab-case';
    } else if (analysis.structure.directories.some(d => d.includes('_'))) {
      conventions.naming = 'snake_case';
    } else {
      conventions.naming = 'camelCase';
    }
    
    // Detect structure pattern
    if (analysis.structure.hasSrc) {
      conventions.structure = 'src-based';
    } else if (analysis.framework === 'nextjs') {
      conventions.structure = 'page-based';
    } else {
      conventions.structure = 'flat';
    }
    
    // Detect testing
    if (analysis.dependencies) {
      if ('jest' in analysis.dependencies) conventions.testing = 'jest';
      else if ('mocha' in analysis.dependencies) conventions.testing = 'mocha';
      else if ('vitest' in analysis.dependencies) conventions.testing = 'vitest';
      else if ('cypress' in analysis.dependencies) conventions.testing = 'cypress';
    }
    
    // Detect style
    if (analysis.dependencies) {
      if ('prettier' in analysis.dependencies) conventions.style = 'prettier';
      if ('eslint' in analysis.dependencies) {
        conventions.style = conventions.style ? `${conventions.style}+eslint` : 'eslint';
      }
    }
    
    return conventions;
  }
  
  /**
   * Generate smart project-specific suggestions
   */
  generateProjectSuggestions(analysis) {
    const suggestions = [];
    
    // Framework-specific suggestions
    if (analysis.framework === 'react') {
      suggestions.push('Use functional components with hooks');
      suggestions.push('Consider React.memo for performance optimization');
      if (!analysis.dependencies['react-router-dom']) {
        suggestions.push('Add react-router-dom for routing');
      }
    } else if (analysis.framework === 'vue') {
      suggestions.push('Use Composition API for new components');
      suggestions.push('Consider Pinia for state management');
    } else if (analysis.framework === 'express') {
      suggestions.push('Use middleware for cross-cutting concerns');
      suggestions.push('Implement proper error handling middleware');
    }
    
    // Testing suggestions
    if (!analysis.structure.hasTests) {
      suggestions.push('Add a test directory for unit tests');
    }
    if (!analysis.conventions.testing) {
      suggestions.push('Consider adding Jest or Vitest for testing');
    }
    
    // Code quality suggestions
    if (!('eslint' in (analysis.dependencies || {}))) {
      suggestions.push('Add ESLint for code quality');
    }
    if (!('prettier' in (analysis.dependencies || {}))) {
      suggestions.push('Add Prettier for consistent formatting');
    }
    
    // TypeScript suggestion
    if (analysis.language !== 'typescript' && analysis.type === 'node') {
      suggestions.push('Consider migrating to TypeScript for better type safety');
    }
    
    // Documentation
    if (!analysis.structure.hasDocs) {
      suggestions.push('Create a docs folder for documentation');
    }
    
    return suggestions;
  }
  
  /**
   * Analyze file distribution
   */
  async analyzeFileDistribution(projectPath) {
    const distribution = {
      total: 0,
      byType: {
        javascript: 0,
        typescript: 0,
        json: 0,
        markdown: 0,
        css: 0,
        html: 0,
        other: 0
      }
    };
    
    try {
      await this.countFiles(projectPath, distribution);
    } catch (error) {
      // Ignore errors
    }
    
    return distribution;
  }
  
  /**
   * Recursively count files by type
   */
  async countFiles(dir, distribution, depth = 0) {
    if (depth > 3) return; // Limit depth to avoid deep recursion
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        if (entry.isFile()) {
          distribution.total++;
          const ext = path.extname(entry.name).toLowerCase();
          
          switch (ext) {
            case '.js':
            case '.jsx':
              distribution.byType.javascript++;
              break;
            case '.ts':
            case '.tsx':
              distribution.byType.typescript++;
              break;
            case '.json':
              distribution.byType.json++;
              break;
            case '.md':
              distribution.byType.markdown++;
              break;
            case '.css':
            case '.scss':
            case '.sass':
              distribution.byType.css++;
              break;
            case '.html':
              distribution.byType.html++;
              break;
            default:
              distribution.byType.other++;
          }
        } else if (entry.isDirectory()) {
          await this.countFiles(path.join(dir, entry.name), distribution, depth + 1);
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  /**
   * Get contextual help for current project
   */
  async getContextualHelp(query, projectPath = process.cwd()) {
    const analysis = await this.analyzeProject(projectPath);
    const help = {
      suggestions: [],
      commands: [],
      resources: []
    };
    
    // Framework-specific help
    if (analysis.framework) {
      const frameworkHelp = this.getFrameworkHelp(analysis.framework, query);
      help.suggestions.push(...frameworkHelp.suggestions);
      help.commands.push(...frameworkHelp.commands);
    }
    
    // Script suggestions
    if (analysis.scripts) {
      for (const [name, command] of Object.entries(analysis.scripts)) {
        if (query.toLowerCase().includes(name) || name.includes('test') || name.includes('build')) {
          help.commands.push({
            command: `npm run ${name}`,
            description: command
          });
        }
      }
    }
    
    // Convention-based suggestions
    if (analysis.conventions.testing && query.includes('test')) {
      help.suggestions.push(`This project uses ${analysis.conventions.testing} for testing`);
      help.commands.push({
        command: `npm test`,
        description: 'Run tests'
      });
    }
    
    return help;
  }
  
  /**
   * Get framework-specific help
   */
  getFrameworkHelp(framework, query) {
    const help = {
      suggestions: [],
      commands: []
    };
    
    switch (framework) {
      case 'react':
        help.suggestions.push('Create components in src/components');
        help.suggestions.push('Use useState and useEffect for state management');
        help.commands.push({ command: 'npm start', description: 'Start development server' });
        help.commands.push({ command: 'npm run build', description: 'Build for production' });
        break;
        
      case 'nextjs':
        help.suggestions.push('Create pages in pages/ or app/ directory');
        help.suggestions.push('Use getServerSideProps or getStaticProps for data fetching');
        help.commands.push({ command: 'npm run dev', description: 'Start Next.js dev server' });
        help.commands.push({ command: 'npm run build && npm start', description: 'Production build' });
        break;
        
      case 'vue':
        help.suggestions.push('Create components as .vue files');
        help.suggestions.push('Use <template>, <script>, and <style> sections');
        help.commands.push({ command: 'npm run serve', description: 'Start Vue dev server' });
        break;
        
      case 'express':
        help.suggestions.push('Define routes in routes/ directory');
        help.suggestions.push('Use middleware for authentication and validation');
        help.commands.push({ command: 'npm start', description: 'Start Express server' });
        help.commands.push({ command: 'npm run dev', description: 'Start with nodemon' });
        break;
    }
    
    return help;
  }
  
  /**
   * Suggest file locations based on project structure
   */
  suggestFileLocation(fileName, fileType, analysis) {
    const suggestions = [];
    
    // Component files
    if (fileType === 'component') {
      if (analysis.framework === 'react' || analysis.framework === 'vue') {
        if (analysis.structure.hasSrc) {
          suggestions.push('src/components/' + fileName);
        } else {
          suggestions.push('components/' + fileName);
        }
      }
    }
    
    // Test files
    if (fileType === 'test') {
      if (analysis.structure.hasTests) {
        const testDir = analysis.structure.directories.find(d => 
          ['test', 'tests', '__tests__', 'spec'].includes(d)
        );
        suggestions.push(`${testDir}/${fileName}`);
      } else {
        suggestions.push(`__tests__/${fileName}`);
      }
    }
    
    // API routes
    if (fileType === 'api') {
      if (analysis.framework === 'nextjs') {
        suggestions.push(`pages/api/${fileName}`);
        suggestions.push(`app/api/${fileName}/route.js`);
      } else if (analysis.framework === 'express') {
        suggestions.push(`routes/${fileName}`);
      }
    }
    
    // Style files
    if (fileType === 'style') {
      if (analysis.structure.hasSrc) {
        suggestions.push(`src/styles/${fileName}`);
      } else {
        suggestions.push(`styles/${fileName}`);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get smart completion suggestions
   */
  async getSmartCompletions(partial, context) {
    const completions = [];
    const analysis = await this.analyzeProject();
    
    // File path completions
    if (partial.includes('/') || partial.includes('.')) {
      const dir = path.dirname(partial) || '.';
      const prefix = path.basename(partial);
      
      try {
        const files = await fs.readdir(dir);
        const matches = files.filter(f => f.startsWith(prefix));
        completions.push(...matches.map(f => path.join(dir, f)));
      } catch {
        // Ignore errors
      }
    }
    
    // Script completions
    if (partial.startsWith('npm ')) {
      const scriptName = partial.replace('npm run ', '').replace('npm ', '');
      for (const name of Object.keys(analysis.scripts)) {
        if (name.startsWith(scriptName)) {
          completions.push(`npm run ${name}`);
        }
      }
    }
    
    // Framework-specific completions
    if (analysis.framework) {
      const frameworkCompletions = this.getFrameworkCompletions(
        analysis.framework, 
        partial
      );
      completions.push(...frameworkCompletions);
    }
    
    return completions;
  }
  
  /**
   * Get framework-specific completions
   */
  getFrameworkCompletions(framework, partial) {
    const completions = [];
    
    if (framework === 'react' && partial.includes('use')) {
      completions.push('useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo');
    }
    
    if (framework === 'vue' && partial.includes('v-')) {
      completions.push('v-if', 'v-for', 'v-show', 'v-model', 'v-on', 'v-bind');
    }
    
    return completions.filter(c => c.startsWith(partial));
  }
}

module.exports = ProjectAwareness;