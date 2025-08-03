import type { FileData, TreeNode } from './types.ts';

// 将 CSV 数据转换为树形结构
export function processFileData(data: FileData[]): TreeNode {
    const root: TreeNode = {
        name: 'root',
        value: 0,
        children: [],
    };

    // 按目录分组
    const directoryMap = new Map<string, FileData[]>();

    for (const file of data) {
        const pathParts = file.filePath.split('/');
        const directory = pathParts.slice(0, -1).join('/') || 'root';

        if (!directoryMap.has(directory)) {
            directoryMap.set(directory, []);
        }
        directoryMap.get(directory)!.push(file);
    }

    // 构建树形结构
    for (const [directory, files] of directoryMap) {
        const directoryNode: TreeNode = {
            name: directory === 'root' ? '根目录' : directory,
            value: files.reduce((sum, file) => sum + file.lines, 0),
            children: files.map((file) => ({
                name: file.filePath.split('/').pop() || file.filePath,
                value: file.lines,
                filePath: file.filePath,
                revisions: file.revisions,
                lines: file.lines,
            })),
        };

        root.children!.push(directoryNode);
    }

    // 计算根节点的总大小
    root.value = root.children!.reduce((sum, child) => sum + child.value, 0);

    return root;
}

export function parseCSV(csvText: string): FileData[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data: FileData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: any = {};

        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim();
        });

        data.push({
            filePath: row.filePath || '',
            revisions: parseInt(row.revisions) || 0,
            lines: parseInt(row.lines) || 0,
        });
    }

    return data;
}

export async function loadCSVFile(filePath: string): Promise<FileData[]> {
    try {
        const response = await fetch(filePath);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('加载 CSV 文件失败:', error);
        return [];
    }
}

export function getColorByRevisions(revisions: number, maxRevisions: number): string {
    const intensity = Math.min(revisions / maxRevisions, 1);
    const hue = 200 + intensity * 160; // 从蓝色到红色
    const saturation = 70 + intensity * 30;
    const lightness = 50 + intensity * 20;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
