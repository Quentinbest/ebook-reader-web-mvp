# Ebook Reader MVP (Web First)

一个可运行的 Web 端电子书阅读器 MVP，覆盖以下主能力：

- 本地导入 `EPUB/PDF`
- 本地书架（IndexedDB）
- 阅读器路由：`/library`、`/reader/:bookId`、`/notes/:bookId`
- 阅读进度自动保存
- 阅读偏好（主题、字号、行距、页边距）
- 批注新增/删除/编辑
- 书内全文检索（导入时建立索引）
- 匿名遥测事件记录与开关
- Service Worker 基础离线缓存

## 技术栈

- React + TypeScript + Vite
- IndexedDB（自实现轻量数据访问层）
- `epubjs`（EPUB 渲染）
- `pdfjs-dist`（PDF 文本提取索引）
- `jszip`（EPUB 文本索引与元数据读取）

## 本地启动

```bash
npm install
npm run dev
```

## 测试

```bash
npm run test
```

## E2E 冒烟测试

```bash
npx playwright install
npm run test:e2e
```

## PRD 对应状态（P0）

- FR-001/002：已实现
- FR-003：已实现（EPUB 渲染+进度定位）
- FR-004：已实现（PDF 页码/缩放基础能力）
- FR-005：已实现（设置实时生效并持久化）
- FR-006：已实现（批注增删改与定位）
- FR-007：已实现（本地全文检索）
- FR-008：已实现（离线可读已导入内容，基于本地存储 + SW）
- FR-009：已实现（刷新恢复书架与阅读进度）
- FR-010：已实现（关键事件本地记录，支持开关）

## 后续建议

- 接入真实遥测后端与仪表盘
- 增加 EPUB 选中文本高亮能力
- 补充 PDF 高性能渲染层（Canvas 虚拟化）
- 引入账号体系与云同步
