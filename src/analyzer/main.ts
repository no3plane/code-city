import { stringify } from 'csv-stringify/sync';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import GitLogAnalyzer from './gitlog-analyzer';
import merge from './merge';
import ClocAnalyzer from './cloc-analyzer';

interface Args {
    dir: string;
    out: string;
}

const argv = yargs(hideBin(process.argv))
    .usage('用法: $0 [--dir <目录>]')
    .option('dir', {
        alias: 'd',
        describe: '指定要分析的目录',
        type: 'string',
        default: process.cwd(),
    })
    .option('out', {
        alias: 'o',
        describe: '指定输出文件路径',
        type: 'string',
        default: path.resolve(process.cwd(), 'code-city-analysis.csv'),
    })
    .help('h')
    .alias('h', 'help').argv as Args;

async function main() {
    const targetDir = path.resolve(argv.dir).replaceAll('\\', '/');
    const outputPath = path.resolve(argv.out).replaceAll('\\', '/');

    // 确保输出文件的目录存在
    const outputDir = path.dirname(outputPath);
    await Bun.$`mkdir -p ${outputDir}`;

    const execGitAnalyse = async () => {
        const command = GitLogAnalyzer.getCommandLine();
        const { stdout } = await Bun.$`${command}`.cwd(targetDir);
        const analyzer = await GitLogAnalyzer.fromString(stdout.toString());
        return analyzer.revisions();
    };

    const execClocAnalyse = async () => {
        const command = ClocAnalyzer.getCommandLine();
        const { stdout } = await Bun.$`${command}`.cwd(targetDir);
        return ClocAnalyzer.parse(stdout.toString());
    };

    console.log('开始分析代码...');
    const result = merge(await execGitAnalyse(), await execClocAnalyse());

    await Bun.write(outputPath, stringify(result, { header: true }) as string);

    console.log(`分析完成，结果已保存到: ${outputPath}`);
    console.log(`共分析了 ${result.length} 个文件`);
}

main();
