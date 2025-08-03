import fs from 'fs';
import readline from 'readline';
import { stringify } from 'csv-stringify/sync';
import iconv from 'iconv-lite';

/**
 * 分析 Git Log
 */
class GitLogAnalyzer {
    constructor(records) {
        this.records = records;
    }

    // 该类只能分析该 Git 命令生成的日志
    static getCommandLine() {
        return `git log --all --numstat --date=short --pretty=format:"--%h--%ad--%aN" --no-renames`;
    }

    // 优雅的异步工厂👍
    static async fromFile(filePath) {
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
            crlfDelay: Infinity,
        });
        const records = await GitLogAnalyzer._parseLines(rl);
        return new GitLogAnalyzer(records);
    }

    // 优雅的异步工厂👍
    static async fromString(str) {
        const lines = str.split(/\r?\n/).filter(Boolean);
        async function* gen() {
            for (const line of lines) {
                yield line;
            }
        }
        const records = await GitLogAnalyzer._parseLines(gen());
        return new GitLogAnalyzer(records);
    }

    static async _parseLines(lineIterable) {
        const result = [];
        let currentCommit = null;
        for await (const line of lineIterable) {
            // 匹配 commit 头部: --hash--date--author
            const commitHeader = /^--([0-9a-f]+)--(\d{4}-\d{2}-\d{2})--(.+)$/.exec(line);
            if (commitHeader) {
                // 遇到新 commit，重置当前 commit
                currentCommit = {
                    rev: commitHeader[1],
                    date: commitHeader[2],
                    author: commitHeader[3],
                    changes: [],
                };
                continue;
            }
            // 匹配变更行: added<TAB>deleted<TAB>file
            const changeLine = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
            if (changeLine && currentCommit) {
                result.push({
                    entity: changeLine[3],
                    date: currentCommit.date,
                    author: currentCommit.author,
                    rev: currentCommit.rev,
                    loc_added: changeLine[1] === '-' ? 0 : parseInt(changeLine[1], 10),
                    loc_deleted: changeLine[2] === '-' ? 0 : parseInt(changeLine[2], 10),
                });
            }
        }
        return result;
    }

    /** 统计每个文件的增删行数 */
    churn() {
        const churnMap = {};
        for (const r of this.records) {
            if (!churnMap[r.entity]) {
                churnMap[r.entity] = { entity: r.entity, added: 0, deleted: 0, commits: 0 };
            }
            churnMap[r.entity].added += r.loc_added;
            churnMap[r.entity].deleted += r.loc_deleted;
            churnMap[r.entity].commits += 1;
        }
        return Object.values(churnMap);
    }

    /** 统计每个文件的作者及其提交次数 */
    authors() {
        const authorMap = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            if (!authorMap[key]) {
                authorMap[key] = { entity: r.entity, author: r.author, commits: 0 };
            }
            authorMap[key].commits += 1;
        }
        return Object.values(authorMap);
    }

    /** 统计每个文件的最新提交日期 */
    codeAge() {
        const ageMap = {};
        for (const r of this.records) {
            if (!ageMap[r.entity] || r.date > ageMap[r.entity].date) {
                ageMap[r.entity] = { entity: r.entity, date: r.date };
            }
        }
        return Object.values(ageMap);
    }

    /** 统计文件间的耦合度 */
    coupling() {
        const revToEntities = {};
        for (const r of this.records) {
            if (!revToEntities[r.rev]) revToEntities[r.rev] = new Set();
            revToEntities[r.rev].add(r.entity);
        }
        const pairCount = {};
        const entityRevCount = {};
        for (const entities of Object.values(revToEntities)) {
            const arr = Array.from(entities);
            for (let i = 0; i < arr.length; i++) {
                entityRevCount[arr[i]] = (entityRevCount[arr[i]] || 0) + 1;
                for (let j = i + 1; j < arr.length; j++) {
                    const [a, b] = arr[i] < arr[j] ? [arr[i], arr[j]] : [arr[j], arr[i]];
                    const key = a + '|' + b;
                    pairCount[key] = (pairCount[key] || 0) + 1;
                }
            }
        }
        const result = [];
        for (const key in pairCount) {
            const [a, b] = key.split('|');
            const shared = pairCount[key];
            const avg = (entityRevCount[a] + entityRevCount[b]) / 2;
            const degree = Math.round((shared / avg) * 100);
            result.push({
                entity: a,
                coupled: b,
                degree,
                average_revs: Math.round(avg),
                shared_revs: shared,
            });
        }
        return result.sort((x, y) => y.degree - x.degree);
    }

    /** 统计每个文件每个作者的提交次数和总提交次数 */
    effort() {
        const entityAuthor = {};
        const entityTotal = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            entityAuthor[key] = (entityAuthor[key] || 0) + 1;
            entityTotal[r.entity] = (entityTotal[r.entity] || 0) + 1;
        }
        const result = [];
        for (const key in entityAuthor) {
            const [entity, author] = key.split('|');
            result.push({
                entity,
                author,
                author_revs: entityAuthor[key],
                total_revs: entityTotal[entity],
            });
        }
        return result.sort(
            (a, b) => b.author_revs - a.author_revs || a.entity.localeCompare(b.entity)
        );
    }

    /** 统计每个文件主要开发者 */
    mainDev() {
        const entityAuthor = {};
        const entityTotal = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            entityAuthor[key] = (entityAuthor[key] || 0) + r.loc_added;
            entityTotal[r.entity] = (entityTotal[r.entity] || 0) + r.loc_added;
        }
        const entityAuthors = {};
        for (const key in entityAuthor) {
            const [entity, author] = key.split('|');
            if (!entityAuthors[entity]) entityAuthors[entity] = [];
            entityAuthors[entity].push({ author, added: entityAuthor[key] });
        }
        const result = [];
        for (const entity in entityAuthors) {
            const authors = entityAuthors[entity];
            authors.sort((a, b) => b.added - a.added);
            const main = authors[0];
            const total = entityTotal[entity];
            const ownership = total ? +((main.added / total) * 100).toFixed(2) : 0;
            result.push({
                entity,
                'main-dev': main.author,
                added: main.added,
                total_added: total,
                ownership,
            });
        }
        return result;
    }

    /** 统计每个文件的修订次数 */
    revisions() {
        const entityCount = {};
        for (const r of this.records) {
            entityCount[r.entity] = (entityCount[r.entity] || 0) + 1;
        }
        return Object.entries(entityCount).map(([entity, n_revs]) => ({ entity, n_revs }));
    }

    /** 汇总统计 */
    summary() {
        const stat = {};
        stat['number-of-commits'] = new Set(this.records.map((r) => r.rev)).size;
        stat['number-of-entities'] = new Set(this.records.map((r) => r.entity)).size;
        stat['number-of-entities-changed'] = this.records.length;
        stat['number-of-authors'] = new Set(this.records.map((r) => r.author)).size;
        return Object.entries(stat).map(([statistic, value]) => ({ statistic, value }));
    }

    /** 统计每个文件每个作者的增删行数 */
    entityOwnership() {
        const map = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            if (!map[key]) map[key] = { entity: r.entity, author: r.author, added: 0, deleted: 0 };
            map[key].added += r.loc_added;
            map[key].deleted += r.loc_deleted;
        }
        return Object.values(map);
    }

    /** 统计作者协作强度 */
    communication() {
        const entityAuthors = {};
        for (const r of this.records) {
            if (!entityAuthors[r.entity]) entityAuthors[r.entity] = new Set();
            entityAuthors[r.entity].add(r.author);
        }
        const pairCount = {};
        const authorCommits = {};
        for (const authors of Object.values(entityAuthors)) {
            const arr = Array.from(authors);
            for (let i = 0; i < arr.length; i++) {
                authorCommits[arr[i]] = (authorCommits[arr[i]] || 0) + 1;
                for (let j = i + 1; j < arr.length; j++) {
                    const [a, b] = arr[i] < arr[j] ? [arr[i], arr[j]] : [arr[j], arr[i]];
                    const key = a + '|' + b;
                    pairCount[key] = (pairCount[key] || 0) + 1;
                }
            }
        }
        const result = [];
        for (const key in pairCount) {
            const [a, b] = key.split('|');
            const shared = pairCount[key];
            const avg = Math.round((authorCommits[a] + authorCommits[b]) / 2);
            const strength = avg ? Math.round((shared / avg) * 100) : 0;
            result.push({ author: a, peer: b, shared, average: avg, strength });
        }
        return result.sort((x, y) => y.strength - x.strength);
    }

    /** 统计每个文件的碎片化度 */
    fractalValue() {
        const entityAuthor = {};
        const entityTotal = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            entityAuthor[key] = (entityAuthor[key] || 0) + 1;
            entityTotal[r.entity] = (entityTotal[r.entity] || 0) + 1;
        }
        const entityAuthors = {};
        for (const key in entityAuthor) {
            const [entity, author] = key.split('|');
            if (!entityAuthors[entity]) entityAuthors[entity] = [];
            entityAuthors[entity].push({ author, revs: entityAuthor[key] });
        }
        const result = [];
        for (const entity in entityAuthors) {
            const authors = entityAuthors[entity];
            const total = entityTotal[entity];
            let fv1 = 0;
            for (const a of authors) {
                fv1 += Math.pow(a.revs / total, 2);
            }
            const fv = +(1 - fv1).toFixed(4);
            result.push({ entity, 'fractal-value': fv, total_revs: total });
        }
        return result.sort((a, b) => b['fractal-value'] - a['fractal-value']);
    }

    /** 按删除行数统计主要开发者 */
    refactoringMainDev() {
        const entityAuthor = {};
        const entityTotal = {};
        for (const r of this.records) {
            const key = r.entity + '|' + r.author;
            entityAuthor[key] = (entityAuthor[key] || 0) + r.loc_deleted;
            entityTotal[r.entity] = (entityTotal[r.entity] || 0) + r.loc_deleted;
        }
        const entityAuthors = {};
        for (const key in entityAuthor) {
            const [entity, author] = key.split('|');
            if (!entityAuthors[entity]) entityAuthors[entity] = [];
            entityAuthors[entity].push({ author, removed: entityAuthor[key] });
        }
        const result = [];
        for (const entity in entityAuthors) {
            const authors = entityAuthors[entity];
            authors.sort((a, b) => b.removed - a.removed);
            const main = authors[0];
            const total = entityTotal[entity];
            const ownership = total ? +((main.removed / total) * 100).toFixed(2) : 0;
            result.push({
                entity,
                'main-dev': main.author,
                removed: main.removed,
                total_removed: total,
                ownership,
            });
        }
        return result;
    }
}

const demo = async (filePath) => {
    const analyzer = await GitLogAnalyzer.fromFile(filePath);
    fs.writeFileSync('output/result.txt', JSON.stringify(analyzer.records, null, 2), 'utf-8');
    const analyzersMap = {
        churn: () => analyzer.churn(),
        authors: () => analyzer.authors(),
        codeAge: () => analyzer.codeAge(),
        coupling: () => analyzer.coupling(),
        effort: () => analyzer.effort(),
        mainDev: () => analyzer.mainDev(),
        revisions: () => analyzer.revisions(),
        summary: () => analyzer.summary(),
        entityOwnership: () => analyzer.entityOwnership(),
        communication: () => analyzer.communication(),
        fractalValue: () => analyzer.fractalValue(),
        refactoringMainDev: () => analyzer.refactoringMainDev(),
    };
    for (const [type, fn] of Object.entries(analyzersMap)) {
        const result = fn();
        const csv = stringify.stringify(result, { header: true });
        const buf = iconv.encode(csv, 'gbk');
        fs.writeFileSync(`output/${type}.csv`, buf);
    }
};

// demo('output/gitlog.txt');

export default GitLogAnalyzer;
