import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { TreeNode } from './types';
import { getColorByRevisions } from './dataProcessor';
import './visualizer.css';

interface CodeCityVisualizerProps {
    data: TreeNode;
    onNodeClick?: (node: TreeNode) => void;
    onNodeHover?: (node: TreeNode) => void;
    onZoom?: (transform: any) => void;
}

// 扩展HierarchyNode类型以包含treemap布局属性
interface TreemapNode extends d3.HierarchyNode<TreeNode> {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export const Visualizer: React.FC<CodeCityVisualizerProps> = ({
    data,
    onNodeClick,
    onNodeHover,
    onZoom,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const getMaxRevisions = useCallback((node: d3.HierarchyNode<TreeNode>): number => {
        let max = 0;
        node.each((d) => {
            if (d.data.revisions && d.data.revisions > max) {
                max = d.data.revisions;
            }
        });
        return max;
    }, []);

    const showTooltip = useCallback((event: MouseEvent, d: TreemapNode) => {
        if (!tooltipRef.current) return;

        const data = d.data;
        const content = `
            <div class="tooltip-content">
                <div class="tooltip-title">${data.name}</div>
                <div class="tooltip-details">
                    <div><strong>文件路径:</strong> ${data.filePath || 'N/A'}</div>
                    <div><strong>代码行数:</strong> ${data.value.toLocaleString()}</div>
                    <div><strong>修改次数:</strong> ${data.revisions || 0}</div>
                </div>
            </div>
        `;

        tooltipRef.current.innerHTML = content;
        tooltipRef.current.style.opacity = '1';
        tooltipRef.current.style.left = event.pageX + 10 + 'px';
        tooltipRef.current.style.top = event.pageY - 10 + 'px';
    }, []);

    const hideTooltip = useCallback(() => {
        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current || !svgRef.current || !data) {
            return;
        }

        const container = containerRef.current;
        const svg = d3.select(svgRef.current);
        const width = container.clientWidth;
        const height = container.clientHeight;

        // 设置SVG尺寸
        svg.attr('width', width).attr('height', height);

        // 清除现有内容
        svg.selectAll('*').remove();

        // 创建层次结构
        const root = d3
            .hierarchy(data)
            .sum((d) => d.value)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // 获取最大修改次数用于颜色计算
        const maxRevisions = getMaxRevisions(root);

        // 创建treemap布局
        const treemap = d3
            .treemap<TreeNode>()
            .size([width, height])
            .paddingTop(28)
            .paddingRight(7)
            .paddingInner(3);

        treemap(root);

        // 创建颜色比例尺
        const color = d3
            .scaleLinear<string>()
            .domain([0, maxRevisions])
            .range(['#e8f4fd', '#0066cc']);

        // 创建文本包装函数
        const wrap = (text: any, width: number) => {
            text.each(function (this: SVGTextElement) {
                const textElement = d3.select(this);
                const words = textElement.text().split(/\s+/).reverse();
                const lineHeight = 1.1;
                const y = textElement.attr('y');
                const dy = parseFloat(textElement.attr('dy') || '0');

                let tspan = textElement
                    .text(null)
                    .append('tspan')
                    .attr('x', 0)
                    .attr('y', y)
                    .attr('dy', dy + 'em');

                let line: string[] = [];
                let lineNumber = 0;

                while (words.length > 0) {
                    line.push(words.pop()!);
                    tspan.text(line.join(' '));
                    if (tspan.node()!.getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(' '));
                        line = [words.pop()!];
                        tspan = textElement
                            .append('tspan')
                            .attr('x', 0)
                            .attr('y', y)
                            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                            .text(line.join(' '));
                    }
                }
            });
        };

        // 创建节点组
        const node = svg
            .append('g')
            .selectAll('rect')
            .data(root.descendants().slice(1) as TreemapNode[])
            .join('rect')
            .attr('x', (d) => d.x0)
            .attr('y', (d) => d.y0)
            .attr('width', (d) => d.x1 - d.x0)
            .attr('height', (d) => d.y1 - d.y0)
            .attr('fill', (d) => {
                if (d.children) {
                    // 父节点使用浅色
                    const colorValue = color(d.data.revisions || 0);
                    return d3.color(colorValue)?.darker(0.5)?.toString() || '#f0f0f0';
                } else {
                    // 叶子节点使用正常颜色
                    return color(d.data.revisions || 0);
                }
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', (d) => (d.children ? 2 : 1))
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('stroke', '#333')
                    .attr('stroke-width', d.children ? 3 : 2);
                showTooltip(event, d);
                if (onNodeHover) {
                    onNodeHover(d.data);
                }
            })
            .on('mouseout', function (d) {
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', d.children ? 2 : 1);
                hideTooltip();
            })
            .on('click', (event, d) => {
                if (onNodeClick) {
                    onNodeClick(d.data);
                }
            });

        // 添加文本标签
        const text = svg
            .append('g')
            .selectAll('text')
            .data(root.descendants().slice(1) as TreemapNode[])
            .join('text')
            .attr('x', (d) => d.x0 + 6)
            .attr('y', (d) => d.y0 + 6)
            .attr('dy', '0.32em')
            .attr('font-size', (d) => (d.children ? '12px' : '10px'))
            .attr('font-weight', (d) => (d.children ? 'bold' : 'normal'))
            .attr('fill', (d) => (d.children ? '#333' : '#666'))
            .text((d) => d.data.name)
            .each(function (d) {
                const width = d.x1 - d.x0 - 12;
                wrap(d3.select(this), width);
            });

        // 添加层次结构指示器
        const hierarchyIndicator = svg
            .append('g')
            .selectAll('text')
            .data(root.descendants().filter((d) => d.children) as TreemapNode[])
            .join('text')
            .attr('x', (d) => d.x0 + 6)
            .attr('y', (d) => d.y0 + 20)
            .attr('font-size', '8px')
            .attr('fill', '#999')
            .text((d) => `${d.children?.length || 0} 个子项`);

        // 添加缩放和平移功能
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 8])
            .on('zoom', (event) => {
                svg.selectAll('g').attr('transform', event.transform);
                if (onZoom) {
                    onZoom(event.transform);
                }
            });

        svg.call(zoom);

        // 添加双击重置缩放
        svg.on('dblclick.zoom', null);

        return () => {
            svg.selectAll('*').remove();
        };
    }, [data, onNodeClick, onNodeHover, onZoom, getMaxRevisions, showTooltip, hideTooltip]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && svgRef.current) {
                const container = containerRef.current;
                const svg = d3.select(svgRef.current);
                svg.attr('width', container.clientWidth).attr('height', container.clientHeight);

                // 重新计算布局
                if (data) {
                    const width = container.clientWidth;
                    const height = container.clientHeight;

                    const root = d3
                        .hierarchy(data)
                        .sum((d) => d.value)
                        .sort((a, b) => (b.value || 0) - (a.value || 0));

                    const treemap = d3
                        .treemap<TreeNode>()
                        .size([width, height])
                        .paddingTop(28)
                        .paddingRight(7)
                        .paddingInner(3);

                    treemap(root);

                    // 更新节点位置
                    svg.selectAll('rect')
                        .data(root.descendants().slice(1) as TreemapNode[])
                        .attr('x', (d) => d.x0)
                        .attr('y', (d) => d.y0)
                        .attr('width', (d) => d.x1 - d.x0)
                        .attr('height', (d) => d.y1 - d.y0);

                    // 更新文本位置
                    svg.selectAll('text')
                        .data(root.descendants().slice(1) as TreemapNode[])
                        .attr('x', (d) => d.x0 + 6)
                        .attr('y', (d) => d.y0 + 6);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [data]);

    return (
        <div className="code-city-visualizer" ref={containerRef}>
            <svg ref={svgRef} />
            <div className="tooltip" ref={tooltipRef} />
        </div>
    );
};
