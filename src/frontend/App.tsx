import React, { useEffect, useState } from 'react';
import './App.css';
import { Visualizer } from './visualizer';
import { loadCSVFile, processFileData } from './dataProcessor';
import type { TreeNode } from './types';

export const App: React.FC = () => {
    const [data, setData] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const fileData = await loadCSVFile('/data');
        if (fileData.length > 0) {
            setData(processFileData(fileData));
        }
        setLoading(false);
    };

    const handleNodeClick = (node: TreeNode) => {
        if (node.filePath) {
            alert(`文件: ${node.filePath}\n代码行数: ${node.value}\n修改次数: ${node.revisions}`);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="app">
            {data && !loading && <Visualizer data={data} onNodeClick={handleNodeClick} />}
        </div>
    );
};
