// 文件数据接口
export interface FileData {
    filePath: string;
    revisions: number;
    lines: number;
}

// 树形图节点接口
export interface TreeNode {
    name: string;
    value: number;
    children?: TreeNode[];
    filePath?: string;
    revisions?: number;
    lines?: number;
}

// 可视化配置接口
export interface VisualizerConfig {
    width: number;
    height: number;
    colorScheme: string[];
    showLabels: boolean;
    enableZoom: boolean;
}

// 事件接口
export interface VisualizerEvents {
    onNodeClick?: (node: TreeNode) => void;
    onNodeHover?: (node: TreeNode) => void;
    onZoom?: (transform: any) => void;
}
