import path from 'path';

declare module 'bun' {
    interface Env {
        BASH_PATH: string;
    }
}

class ClocAnalyzer {
    /** 注，cloc 依赖 perl */
    static getCommandLine() {
        const bashPath = process.env.BASH_PATH;
        const clocPath = path
            .resolve(__dirname, '..', '..', 'node_modules', 'cloc', 'lib', 'cloc')
            .replaceAll('\\', '/');
        const excludeDir = ['node_modules'].join(',');
        // return `bash -c "${clocPath} ./ --by-file --json --exclude-dir=${EXCLUDE_DIRS}"`;
        return `"${bashPath}" -c "${clocPath} ./ --by-file --json --exclude-dir=${excludeDir}"`;
    }

    static parse(clocResult: string) {
        return JSON.parse(clocResult);
    }
}

export default ClocAnalyzer;
