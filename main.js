const yargs = require('yargs');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const Analyzer = require('./analyzers');
const stringify = require('csv-stringify/sync');
const merge = require('./merge');

const execAsync = util.promisify(exec);

const argv = yargs
    .usage('用法: $0 [--dir <目录>]')
    .option('dir', {
        alias: 'd',
        describe: '指定要执行git命令的目录',
        type: 'string',
        default: process.cwd(),
    })
    .option('out', {
        alias: 'o',
        describe: '指定输出目录',
        type: 'string',
        default: path.resolve(__dirname, 'output'),
    })
    .help('h')
    .alias('h', 'help').argv;

async function main() {
    const targetDir = path.resolve(argv.dir).replaceAll('\\', '/');
    const outputDir = path.resolve(argv.out).replaceAll('\\', '/');
    const clocPath = path
        .resolve(__dirname, 'node_modules', 'cloc', 'lib', 'cloc')
        .replaceAll('\\', '/');

    await fs.ensureDir(outputDir);

    const execGitLog = async () => {
        const { stdout } = await execAsync(
            // FIXIT 这个命令和 Analyzer 是耦合的，Analyzer 只认这个命令输出的 Git Log，后期要把这个关系整合起来
            `git log --all --numstat --date=short --pretty=format:"--%h--%ad--%aN" --no-renames`,
            { cwd: targetDir }
        );
        const analyzer = await Analyzer.fromString(stdout);
        return analyzer.revisions();
    };

    const execCloc = async () => {
        const EXCLUDE_DIR = ['node_modules'];
        const { stdout } = await execAsync(
            `bash -c "${clocPath} ./ --by-file --json --exclude-dir=${EXCLUDE_DIR.join(',')}"`,
            { cwd: targetDir }
        );
        return JSON.parse(stdout);
    };

    const result = merge(await execGitLog(), await execCloc());
    await fs.writeFile(
        path.resolve(outputDir, 'result.csv'),
        stringify.stringify(result, { header: true })
    );
}

// TODO ts

main();
