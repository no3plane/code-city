import path from 'path';

const merge = (revisionArr: any[], complexityObj: any) => {
    const normalizePath = (filePath) => {
        let result = filePath;
        if (result.startsWith('./')) {
            result = result.slice(2);
        }
        result = path.normalize(result);
        return result;
    };
    // 处理 complexity
    const complexityMap = {};
    for (const [key, value] of Object.entries(complexityObj)) {
        if (key === 'header' || key === 'SUM') {
            continue;
        }
        const filePath = normalizePath(key);
        const lines = value.code;
        complexityMap[filePath] = lines;
    }
    // 处理 revisions
    const result = [];
    for (const { entity, n_revs } of revisionArr) {
        const filePath = normalizePath(entity);
        // FIXIT 依赖相对路径修订数的文件和复杂度的文件都是相对路径，需要统一说明函数前置要求（使用规范）
        if (!complexityMap[filePath]) {
            continue;
        }
        result.push({
            filePath: filePath,
            revisions: n_revs,
            lines: complexityMap[filePath],
        });
    }
    // 排序
    return result.sort((a, b) => parseInt(b.revisions) - parseInt(a.revisions));
};

export default merge;
