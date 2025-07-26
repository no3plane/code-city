import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import Analyzer from './analyzers.ts';
import { stringify } from 'csv-stringify/sync';
import merge from './merge.ts';

interface Args {
    dir: string;
    out: string;
}

const argv = yargs(hideBin(process.argv))
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
        default: path.resolve(process.cwd(), 'output'),
    })
    .help('h')
    .alias('h', 'help').argv as Args;

async function main(): Promise<void> {
    const targetDir = path.resolve(argv.dir).replaceAll('\\', '/');
    const outputDir = path.resolve(argv.out).replaceAll('\\', '/');
    const clocPath = path
        .resolve(__dirname, '..', '..', 'node_modules', 'cloc', 'lib', 'cloc')
        .replaceAll('\\', '/');

    // 确保输出目录存在
    await Bun.$`mkdir -p ${outputDir}`;

    const execGitLog = async () => {
        const { stdout } =
            await Bun.$`git log --all --numstat --date=short --pretty=format:"--%h--%ad--%aN" --no-renames`.cwd(
                targetDir
            );
        const analyzer = await Analyzer.fromString(stdout.toString());
        return analyzer.revisions();
    };

    const execCloc = async () => {
        const EXCLUDE_DIR = ['node_modules'];
        const { stdout } =
            await Bun.$`bash -c "${clocPath} ./ --by-file --json --exclude-dir=${EXCLUDE_DIR.join(
                ','
            )}"`.cwd(targetDir);
        return JSON.parse(stdout.toString());
    };

    console.log('开始分析代码...');
    const result = merge(await execGitLog(), await execCloc());

    const outputPath = path.resolve(outputDir, 'result.csv');
    await Bun.write(outputPath, stringify(result, { header: true }) as string);

    console.log(`分析完成，结果已保存到: ${outputPath}`);
    console.log(`共分析了 ${result.length} 个文件`);
}

main();
