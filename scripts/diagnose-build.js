#!/usr/bin/env node

/**
 * Windows 构建诊断脚本
 * 检查常见的构建问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

function success(message) {
  log('green', '✅', message);
}

function error(message) {
  log('red', '❌', message);
}

function warning(message) {
  log('yellow', '⚠️ ', message);
}

function info(message) {
  log('blue', 'ℹ️ ', message);
}

function section(title) {
  console.log(`\n${colors.magenta}━━━ ${title} ━━━${colors.reset}\n`);
}

async function diagnose() {
  console.log(`${colors.blue}
╔═══════════════════════════════════════════╗
║   Cursor 账号管理器 - 构建诊断工具        ║
╚═══════════════════════════════════════════╝
${colors.reset}`);

  const issues = [];
  const warnings_list = [];

  // 1. 检查平台
  section('平台信息');
  const platform = process.platform;
  info(`当前平台: ${platform}`);
  info(`Node 版本: ${process.version}`);
  info(`架构: ${process.arch}`);

  // 2. 检查 package.json
  section('检查 package.json');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json 不存在');
    issues.push('package.json 不存在');
  } else {
    success('package.json 存在');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // 检查 better-sqlite3
    if (pkg.dependencies && pkg.dependencies['better-sqlite3']) {
      success(`better-sqlite3 版本: ${pkg.dependencies['better-sqlite3']}`);
    } else {
      error('better-sqlite3 未在 dependencies 中');
      issues.push('better-sqlite3 未安装');
    }

    // 检查 postinstall
    if (pkg.scripts && pkg.scripts.postinstall) {
      success(`postinstall 脚本: ${pkg.scripts.postinstall}`);
    } else {
      warning('缺少 postinstall 脚本');
      warnings_list.push('建议添加 postinstall 脚本');
    }

    // 检查 build 配置
    if (pkg.build) {
      success('electron-builder 配置存在');
      
      if (pkg.build.asarUnpack) {
        if (pkg.build.asarUnpack.some(p => p.includes('better-sqlite3'))) {
          success('asarUnpack 包含 better-sqlite3');
        } else {
          error('asarUnpack 未包含 better-sqlite3');
          issues.push('asarUnpack 配置不正确');
        }
      } else {
        error('缺少 asarUnpack 配置');
        issues.push('缺少 asarUnpack 配置');
      }

      if (pkg.build.npmRebuild !== undefined) {
        success(`npmRebuild: ${pkg.build.npmRebuild}`);
      } else {
        warning('未设置 npmRebuild');
      }
    } else {
      error('缺少 electron-builder 配置');
      issues.push('缺少 build 配置');
    }
  }

  // 3. 检查 node_modules
  section('检查依赖安装');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    error('node_modules 不存在');
    issues.push('依赖未安装');
    info('请运行: npm install');
  } else {
    success('node_modules 存在');

    // 检查 better-sqlite3
    const sqlitePath = path.join(nodeModulesPath, 'better-sqlite3');
    if (!fs.existsSync(sqlitePath)) {
      error('better-sqlite3 未安装');
      issues.push('better-sqlite3 未安装');
    } else {
      success('better-sqlite3 已安装');

      // 检查编译产物
      const buildPath = path.join(sqlitePath, 'build', 'Release');
      if (!fs.existsSync(buildPath)) {
        error('better-sqlite3 未编译');
        issues.push('better-sqlite3 未编译');
        info('请运行: npm rebuild better-sqlite3');
      } else {
        success('better-sqlite3 编译目录存在');

        // 检查 .node 文件
        const nodeFile = platform === 'win32' 
          ? 'better_sqlite3.node' 
          : 'better_sqlite3.node';
        const nodeFilePath = path.join(buildPath, nodeFile);
        
        if (fs.existsSync(nodeFilePath)) {
          const stats = fs.statSync(nodeFilePath);
          success(`原生模块存在: ${nodeFile} (${(stats.size / 1024).toFixed(2)} KB)`);
        } else {
          error(`原生模块不存在: ${nodeFile}`);
          issues.push('better-sqlite3 原生模块缺失');
        }
      }
    }

    // 检查 electron
    const electronPath = path.join(nodeModulesPath, 'electron');
    if (fs.existsSync(electronPath)) {
      const electronPkg = JSON.parse(
        fs.readFileSync(path.join(electronPath, 'package.json'), 'utf-8')
      );
      success(`Electron 版本: ${electronPkg.version}`);
    } else {
      error('Electron 未安装');
      issues.push('Electron 未安装');
    }
  }

  // 4. 检查构建输出
  section('检查构建输出');
  const outPath = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outPath)) {
    warning('构建输出目录不存在');
    info('请运行: npm run build');
  } else {
    success('out 目录存在');

    const mainPath = path.join(outPath, 'main', 'index.js');
    if (fs.existsSync(mainPath)) {
      success('主进程代码已构建');
    } else {
      error('主进程代码未构建');
      issues.push('代码未构建');
    }

    const rendererPath = path.join(outPath, 'renderer', 'index.html');
    if (fs.existsSync(rendererPath)) {
      success('渲染进程代码已构建');
    } else {
      error('渲染进程代码未构建');
      issues.push('代码未构建');
    }
  }

  // 5. 检查源代码
  section('检查源代码');
  const srcPath = path.join(__dirname, '..', 'src');
  if (fs.existsSync(srcPath)) {
    success('src 目录存在');

    // 检查关键文件
    const criticalFiles = [
      'main/index.ts',
      'main/cursor-paths.ts',
      'main/token-injector.ts',
      'main/database.ts',
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(srcPath, file);
      if (fs.existsSync(filePath)) {
        success(`${file} 存在`);
      } else {
        error(`${file} 不存在`);
        issues.push(`缺少源文件: ${file}`);
      }
    }
  }

  // 6. Windows 特定检查
  if (platform === 'win32') {
    section('Windows 特定检查');
    
    try {
      execSync('node-gyp --version', { stdio: 'pipe' });
      success('node-gyp 已安装');
    } catch (e) {
      warning('node-gyp 未安装或不在 PATH 中');
      warnings_list.push('建议安装 windows-build-tools');
    }

    try {
      const vsInfo = execSync('where cl.exe', { stdio: 'pipe' }).toString();
      success('Visual Studio 编译器已安装');
    } catch (e) {
      warning('未检测到 Visual Studio 编译器');
      warnings_list.push('建议安装 Visual Studio Build Tools');
    }
  }

  // 7. 总结
  section('诊断总结');
  
  if (issues.length === 0 && warnings_list.length === 0) {
    console.log(`${colors.green}
╔═══════════════════════════════════════════╗
║   ✅ 所有检查通过！可以开始构建           ║
╚═══════════════════════════════════════════╝
${colors.reset}`);

    info('运行以下命令构建应用:');
    console.log('  npm run build');
    console.log('  npm run dist:win');
  } else {
    if (issues.length > 0) {
      console.log(`${colors.red}
╔═══════════════════════════════════════════╗
║   ❌ 发现 ${issues.length} 个严重问题                    ║
╚═══════════════════════════════════════════╝
${colors.reset}`);
      issues.forEach((issue, i) => {
        error(`${i + 1}. ${issue}`);
      });
    }

    if (warnings_list.length > 0) {
      console.log(`${colors.yellow}
╔═══════════════════════════════════════════╗
║   ⚠️  发现 ${warnings_list.length} 个警告                     ║
╚═══════════════════════════════════════════╝
${colors.reset}`);
      warnings_list.forEach((warn, i) => {
        warning(`${i + 1}. ${warn}`);
      });
    }

    console.log('\n');
    section('建议的修复步骤');
    
    if (issues.includes('依赖未安装') || issues.includes('better-sqlite3 未安装')) {
      info('1. 安装依赖:');
      console.log('   npm install\n');
    }

    if (issues.includes('better-sqlite3 未编译') || issues.includes('better-sqlite3 原生模块缺失')) {
      info('2. 重新编译 better-sqlite3:');
      console.log('   npm rebuild better-sqlite3');
      console.log('   或');
      console.log('   npx electron-rebuild -f -w better-sqlite3\n');
    }

    if (issues.includes('代码未构建')) {
      info('3. 构建代码:');
      console.log('   npm run build\n');
    }

    if (warnings_list.some(w => w.includes('windows-build-tools'))) {
      info('4. 安装 Windows 构建工具 (仅 Windows):');
      console.log('   npm install --global windows-build-tools\n');
    }
  }

  console.log('\n');
}

// 运行诊断
diagnose().catch(err => {
  console.error('诊断过程出错:', err);
  process.exit(1);
});

