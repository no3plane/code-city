# 代码城市可视化

基于 Bun 和 React 的现代化代码分析可视化工具。

## 功能特性

- 🚀 **现代化架构**: 使用 Bun 作为运行时，React 18 作为前端框架
- 📊 **数据可视化**: 基于 D3.js 的树形图可视化
- 🎨 **响应式设计**: 现代化的 UI 设计，支持移动端
- ⚡ **快速开发**: 热重载和快速构建
- 🔧 **TypeScript**: 完整的类型支持

## 技术栈

- **后端**: Bun + TypeScript
- **前端**: React 18 + TypeScript + D3.js
- **构建工具**: Bun (内置打包器)
- **样式**: CSS Modules

## 项目结构

```
code-city/
├── src/
│   ├── backend/          # 后端分析代码
│   ├── frontend/         # React 前端
│   │   ├── components/   # React 组件
│   │   ├── types.ts      # TypeScript 类型定义
│   │   ├── dataProcessor.ts  # 数据处理逻辑
│   │   ├── App.tsx       # 主应用组件
│   │   └── main.tsx      # React 入口文件
│   └── server.ts         # Bun 服务器
├── output/               # 分析结果输出
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 运行代码分析

```bash
bun run analyze
```

### 3. 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:3000 查看可视化界面。

## 开发命令

- `bun run analyze` - 运行代码分析
- `bun run dev` - 启动开发服务器（热重载）
- `bun run build` - 构建生产版本
- `bun run test` - 运行测试

## React 组件说明

### 主要组件

1. **App.tsx** - 主应用组件，管理全局状态
2. **CodeCityVisualizer.tsx** - D3.js 可视化组件
3. **ControlPanel.tsx** - 控制面板组件
4. **InfoPanel.tsx** - 信息显示面板

### 数据流

1. 后端分析代码生成 CSV 数据
2. 前端通过 `dataProcessor.ts` 处理数据
3. React 组件渲染可视化界面
4. 用户交互通过事件回调处理

## 特性说明

- **树形图可视化**: 矩形大小代表文件大小，颜色代表修改频率
- **交互功能**: 点击查看详情，鼠标悬停显示工具提示
- **缩放功能**: 支持鼠标滚轮缩放
- **响应式布局**: 自适应不同屏幕尺寸

## 开发指南

### 添加新组件

1. 在 `src/frontend/components/` 创建新组件
2. 创建对应的 CSS 文件
3. 在 `App.tsx` 中导入并使用

### 修改样式

- 组件样式在对应的 `.css` 文件中
- 全局样式在 `App.css` 中
- 支持 CSS 模块化

### 数据处理

- 数据加载逻辑在 `dataProcessor.ts` 中
- 类型定义在 `types.ts` 中
- 可视化逻辑在 `CodeCityVisualizer.tsx` 中

## 部署

```bash
# 构建生产版本
bun run build

# 启动生产服务器
bun run start
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC