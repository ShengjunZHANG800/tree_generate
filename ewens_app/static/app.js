const state = {
  lastSample: null,
  lastSimulation: null,
  lastScan: null,
  lastSmallN: null,
  smallNRowsByRank: new Map(),
  smallNRowsByCode: new Map(),
  smallNGroupsBySignature: new Map(),
  history: [],
  activeTask: null,
  selectedNodeId: null,
  selectedSubtree: null,
  treeHighlightMode: "none",
  treeHighlightValue: "",
  treeHighlightSet: null,
  treeHighlightLabel: "",
  treeChartBars: {},
  treeRender: null,
  treeLayout: "centered-upward",
  scanMetric: "offset",
  smallNSort: "rank",
  smallNSelectedRank: null,
  smallNDistributionMetric: "height",
  smallNDistributionModel: "uniform_recursive",
  smallNShapeFilter: null,
  smallNMetricFilter: null,
  smallNPreviewShapeSignature: null,
  smallNDistributionBars: [],
  smallNSearchType: "parent_code",
  smallNTopKTarget: "shape",
  smallNTopKModel: "uniform_recursive",
  smallNTopKValue: 10,
  smallNDiffTarget: "shape",
  smallNDiffModelA: "plancherel_recursive",
  smallNDiffModelB: "ewens",
  smallNVisibleLimit: 2000,
  freeThetaValue: "2",
  language: "en",
  statusKey: null,
  statusValues: {},
  statusVisible: false,
  treeView: { scale: 1, offsetX: 0, offsetY: 0, dragging: false, moved: false, lastX: 0, lastY: 0 },
  treeDrawPending: false,
  limits: { max_n: 10000000, default_draw_limit: 50000, max_draw_limit: 100000 },
};

let fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
let compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const HISTORY_STORAGE_KEY = "ewens-tree-lab-history-v1";
const HISTORY_LIMIT = 30;
const SMALL_N_TABLE_CHUNK_SIZE = 2000;
const SMALL_N_STATE_STORAGE_KEY = "ewens-tree-lab-small-n-state-v1";

const I18N = {
  en: {
    subtitle: "Second-order height comparison, random sampling, statistics, and visualization",
    sourceCode: "trees code",
    tabLab: "Tree Lab",
    tabSmallN: "Small-n Explorer",
    model: "Model",
    modelEwens: "Ewens recursive",
    modelUniform: "Uniform recursive",
    modelPlancherel: "Plancherel recursive",
    drawLimit: "Draw limit",
    performanceNote: "{model}: max n {maxN}; draw cap {drawLimit}; current run {mode}. {note}",
    performanceDrawable: "will draw nodes",
    performanceDataOnly: "will use data-only statistics",
    generate: "Generate",
    simulationSamples: "Simulation samples",
    simulate: "Simulate",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    treePlot: "Tree plot",
    treeHelp: "Mouse wheel zooms, drag pans, double-click resets",
    layout: "Layout",
    layoutCentered: "Centered upward",
    layoutMass: "Subtree-mass upward",
    layoutLeft: "Level left-aligned",
    layoutCircular: "Circular",
    layoutLogCircular: "Log circular",
    nodeSearch: "Node id",
    locateNode: "Locate",
    resetView: "Reset view",
    exportCurrentPng: "Export current PNG",
    exportFullPng: "Export full-tree PNG",
    exportSvg: "Export SVG",
    nodeInspectorEmpty: "Click a node in the tree plot to inspect its subtree",
    treeHighlightMode: "Highlight",
    treeHighlightNone: "None",
    treeHighlightRootPath: "Root path",
    treeHighlightSelectedSubtree: "Selected subtree",
    treeHighlightLeaves: "Leaves",
    treeHighlightDegreeEquals: "Degree = value",
    treeHighlightDegreeAtLeast: "Degree >= value",
    treeHighlightDepthEquals: "Depth = value",
    treeHighlightSubtreeEquals: "Subtree size = value",
    treeHighlightSubtreeAtLeast: "Subtree size >= value",
    treeHighlightValue: "Value",
    treeHighlightApply: "Apply",
    treeHighlightClear: "Clear",
    treeHighlightNoteNone: "No structural highlight",
    treeHighlightNote: "{label}: {count} nodes",
    treeHighlightNeedsNode: "Select or locate a node first.",
    treeHighlightNeedsValue: "Enter a non-negative integer value.",
    chartProfile: "Profile",
    chartDegree: "Degree",
    chartSubtreeSize: "Subtree size",
    chartSubtreeTopCounts: "Subtree size top counts",
    simulationChartEmpty: "Run simulation to show height distribution",
    theoryComparison: "Theory comparison",
    theoryUnavailable: "Ewens second-order theory is not available for this model",
    theoryReferenceNote: "Ewens reference center for comparison",
    parameterScan: "Parameter scan",
    scanNoteDefault: "Enter comma-separated lists to scan theta, n, or a two-dimensional grid",
    scanModels: "Models",
    thetaList: "theta list",
    nList: "n list",
    samplesPerGroup: "Samples per group",
    runScan: "Run scan",
    exportScanCsv: "Export scan CSV",
    experimentHistory: "Experiment history",
    historyEmpty: "No experiments recorded yet",
    exportBundle: "Export bundle",
    exportHistory: "Export history",
    clearHistory: "Clear history",
    cancelTask: "Cancel",
    useHistoryParams: "Use parameters",
    sampleType: "sample",
    simulationType: "simulation",
    scanType: "scan",
    historyCount: "{count} experiments recorded",
    historySampleMain: "theta={theta}, n={n}, height={height}",
    historySimulationMain: "theta={theta}, n={n}, samples={samples}",
    historyScanMain: "{groups} groups, {rows} runs",
    historySeed: "seed {seed}",
    historyNoSeed: "no seed",
    historyModel: "model {model}",
    historyTime: "{ms} ms",
    historyOffset: "offset",
    historyLeaves: "leaves",
    historyMean: "mean",
    historyStd: "std",
    historyMedian: "median",
    historyDrawn: "drawn",
    historyDataOnly: "data only",
    scanChartTitle: "Mean height offset by theta",
    scanChartSubtitle: "y = height - Ewens reference center",
    scanMetric: "Metric",
    scanMetricOffset: "Mean offset",
    scanMetricHeight: "Mean height",
    scanMetricStd: "Height std",
    scanMetricElapsed: "Mean ms",
    scanChartYAxis: "mean height offset",
    scanChartYAxisHeight: "mean height",
    scanChartYAxisStd: "height std",
    scanChartYAxisElapsed: "mean ms",
    scanChartXAxis: "log n",
    scanSummaryGroups: "groups",
    scanSummaryRows: "runs",
    scanSummaryOffsetRange: "offset range",
    scanSummaryClosest: "closest center",
    scanSummaryFastest: "fastest group",
    smallNTitle: "Small-n Explorer",
    smallNNote: "Enumerate recursive trees and compare model probabilities",
    smallNRun: "Explore",
    smallNExport: "Export CSV",
    smallNCount: "trees",
    smallNEwensMean: "Ewens mean height",
    smallNUniformMean: "Uniform mean height",
    smallNPlancherelMean: "Plancherel mean height",
    smallNTheta: "theta",
    smallNComplete: "Enumerated {count} trees for n={n}",
    smallNSort: "Sort",
    smallNFilterHeight: "Height",
    smallNFilterRootDegree: "Root degree",
    smallNLocateCode: "Parent code",
    searchValueParentCode: "Parent code",
    searchValueRank: "Rank",
    searchValueShape: "Shape signature",
    searchValueRootPartition: "Root partition",
    searchPlaceholderParentCode: "0,0,1",
    searchPlaceholderRank: "42",
    searchPlaceholderShape: "((())())",
    searchPlaceholderRootPartition: "3,2,1",
    smallNLocate: "Locate",
    smallNSearchType: "Search",
    searchParentCode: "parent code",
    searchRank: "rank",
    searchShape: "shape",
    searchRootPartition: "root partition",
    smallNClearFilters: "Clear filters",
    smallNPreview: "Tree preview",
    smallNTreeDetails: "Tree details",
    smallNPreviewEmpty: "Select a row to preview the tree",
    smallNShown: "showing {shown} of {filtered}; total {total}",
    smallNTableStatus: "{shown} of {filtered} table rows rendered",
    smallNTableLoadMore: "Load 2,000 more",
    smallNTableShowAll: "Show all",
    smallNActiveFilters: "filters: {filters}",
    smallNShapeFilter: "shape",
    statusSmallNFilterApplied: "Filtered by {filter}",
    statusSmallNFiltersCleared: "Small-n filters cleared.",
    smallNDistribution: "Distribution",
    smallNMetric: "Metric",
    smallNCountWeight: "count",
    smallNShapeGroups: "Shape groups",
    smallNShapeNote: "{groups} unlabeled shapes",
    smallNTopK: "Top-k probability mass",
    smallNTopKTarget: "Target",
    smallNTopKModel: "Model",
    smallNTopKValue: "k",
    smallNTopKTree: "trees",
    smallNTopKShape: "shapes",
    smallNTopKSummary: "top {k} {target}: {fraction} ({decimal})",
    smallNDifference: "Model difference",
    smallNDiffA: "A",
    smallNDiffB: "B",
    smallNDiffSummary: "largest absolute shifts for {target}: {modelA} - {modelB}",
    smallNDiffEwensUniform: "Ewens / Uniform",
    smallNDiffPlancherelUniform: "Plancherel / Uniform",
    smallNDiffPlancherelEwens: "Plancherel - Ewens",
    sortRank: "Enumeration order",
    sortEwensDesc: "Ewens probability",
    sortUniformDesc: "Uniform probability",
    sortPlancherelDesc: "Plancherel probability",
    sortHeightDesc: "Height high to low",
    sortHeightAsc: "Height low to high",
    sortLeavesDesc: "Leaves high to low",
    sortRootDegreeDesc: "Root degree high to low",
    sortEwensUniformDesc: "Ewens / Uniform high to low",
    sortPlancherelUniformDesc: "Plancherel / Uniform high to low",
    sortPlancherelMinusEwensDesc: "Plancherel - Ewens high to low",
    statusSmallNRunning: "Exploring small n...",
    statusSmallNDone: "Small-n explorer complete: {count} trees",
    statusSmallNLocated: "Located {code}: rank #{rank}",
    statusSmallNCodeInvalid: "Parent code must contain {expected} parents; each parent id must be smaller than the node id.",
    statusSmallNCodeNotFound: "Parent code {code} was not found for n={n}.",
    nodeData: "Node data",
    nodeDataLookup: "Node id",
    nodeDataShow: "Show node",
    nodeDataEmpty: "Enter a node id to inspect its row data.",
    nodeDataUnavailable: "This sample did not transfer per-node data.",
    nodeDataOutOfRange: "Node id must be between 0 and {max}.",
    nodeDataCount: "{count} drawable nodes available",
    nodeFieldId: "node id",
    nodeFieldParent: "parent",
    nodeFieldDepth: "depth",
    nodeFieldDepthReference: "depth - reference",
    nodeFieldSubtreeSize: "subtree size",
    nodeFieldSubtreeHeight: "subtree height",
    nodeFieldSubtreeLeaves: "subtree leaves",
    nodeFieldSubtreeMaxDegree: "subtree max degree",
    nodeFieldSubtreeAvgDepth: "subtree avg depth",
    nodeFieldDescendantsDrawn: "descendants drawn",
    nodeFieldDegree: "degree",
    nodeFieldLongestPath: "longest path",
    nodeFieldPathToRoot: "path to root",
    nodeFieldChildren: "children",
    valueRoot: "root",
    valueYes: "yes",
    valueNo: "no",
    metricHeight: "height",
    metricSecondOrder: "c log n - d log log n",
    metricHeightMinusSecond: "height - second",
    metricSecondOrderReference: "Ewens reference center",
    metricHeightMinusReference: "height - reference",
    metricRootDegree: "root degree",
    metricLeaves: "leaves",
    metricMaxDegree: "max degree",
    metricGenerateMs: "generate ms",
    metricTotalMs: "total ms",
    treeTooLarge: "n = {n} exceeds the draw limit {limit}; showing data only",
    treeMissingData: "Node-level plot data was not transferred for this sample",
    treeComplete: "Full plot: {n} nodes, draw limit {limit}",
    tableNoNodes: "Large-n sample did not transfer the per-node table",
    tableRowsPrefix: "Showing first {rows} rows",
    tableRows: "{rows} rows",
    scanEmptyChart: "Run a scan to show the trend",
    invalidList: "List format is invalid. Use comma-separated numbers.",
    scanNoteDone: "Completed {groups} groups and {rows} samples; total time {ms} ms",
    statusScanRunning: "Running parameter scan...",
    statusScanDone: "Scan complete: {groups} groups, {rows} runs, total time {ms} ms",
    statusGenerateRunning: "Generating Ewens tree...",
    statusGenerateDone: "Done: n={n}, height={height}",
    statusSimulationRunning: "Running height simulation...",
    statusSimulationDone: "Simulation complete: mean={mean}, std={std}, median={median}",
    statusCancelRequested: "Cancelling current task...",
    statusTaskCancelled: "Task cancelled.",
    statusTaskFailed: "Task failed: {message}",
    statusTaskProgress: "{label} {percent}%",
    statusTaskLost: "This background task was interrupted or expired. Please run it again; use a smaller n if it repeats.",
    statusTaskBusy: "The server is still working on another run. Please wait or cancel the current task before starting another.",
    statusNodeLocated: "Located node {id}: depth={depth}, subtree size={subtree}",
    statusNodeUnavailable: "Node-level plot data is not available for this sample.",
    statusNodeInvalid: "Enter a node id between 0 and {max}.",
    statusTreeHighlightApplied: "Highlighted {count} nodes: {label}",
    statusTreeHighlightCleared: "Tree highlight cleared.",
    statusTreeChartLinked: "{chart} bucket {value}: highlighted {count} nodes",
    error: "Error: {message}",
  },
  zh: {
    subtitle: "高度二阶项、随机采样、统计与可视化",
    sourceCode: "trees 代码",
    tabLab: "树实验",
    tabSmallN: "小 n 枚举",
    model: "模型",
    modelEwens: "Ewens 递归树",
    modelUniform: "均匀递归树",
    modelPlancherel: "Plancherel 递归树",
    drawLimit: "绘图阈值",
    performanceNote: "{model}：n 上限 {maxN}；绘图上限 {drawLimit}；当前运行 {mode}。{note}",
    performanceDrawable: "会绘制节点",
    performanceDataOnly: "仅生成数据统计",
    generate: "生成",
    simulationSamples: "模拟次数",
    simulate: "批量模拟",
    exportJson: "导出 JSON",
    exportCsv: "导出 CSV",
    treePlot: "树图",
    treeHelp: "滚轮缩放，拖拽平移，双击复位",
    layout: "布局",
    layoutCentered: "居中向上",
    layoutMass: "子树规模向上",
    layoutLeft: "按层左对齐",
    layoutCircular: "圆形",
    layoutLogCircular: "对数圆形",
    nodeSearch: "节点 id",
    locateNode: "定位",
    resetView: "复位视图",
    exportCurrentPng: "导出当前 PNG",
    exportFullPng: "导出全树 PNG",
    exportSvg: "导出 SVG",
    nodeInspectorEmpty: "点击树图中的节点查看子树信息",
    treeHighlightMode: "高亮",
    treeHighlightNone: "无",
    treeHighlightRootPath: "根路径",
    treeHighlightSelectedSubtree: "选中子树",
    treeHighlightLeaves: "叶子",
    treeHighlightDegreeEquals: "度 = 数值",
    treeHighlightDegreeAtLeast: "度 >= 数值",
    treeHighlightDepthEquals: "深度 = 数值",
    treeHighlightSubtreeEquals: "子树规模 = 数值",
    treeHighlightSubtreeAtLeast: "子树规模 >= 数值",
    treeHighlightValue: "数值",
    treeHighlightApply: "应用",
    treeHighlightClear: "清除",
    treeHighlightNoteNone: "无结构高亮",
    treeHighlightNote: "{label}：{count} 个节点",
    treeHighlightNeedsNode: "请先选择或定位一个节点。",
    treeHighlightNeedsValue: "请输入非负整数。",
    chartProfile: "Profile",
    chartDegree: "Degree",
    chartSubtreeSize: "子树规模",
    chartSubtreeTopCounts: "子树规模 Top counts",
    simulationChartEmpty: "运行批量模拟后显示高度分布",
    theoryComparison: "理论对照",
    theoryUnavailable: "当前模型没有 Ewens 二阶理论对照",
    theoryReferenceNote: "用于比较的 Ewens 参考中心",
    parameterScan: "参数扫描",
    scanNoteDefault: "输入逗号分隔列表，可扫描 theta、n 或二维网格",
    scanModels: "模型",
    thetaList: "theta 列表",
    nList: "n 列表",
    samplesPerGroup: "每组样本数",
    runScan: "运行扫描",
    exportScanCsv: "导出扫描 CSV",
    experimentHistory: "实验历史",
    historyEmpty: "暂无实验记录",
    exportBundle: "导出 bundle",
    exportHistory: "导出历史",
    clearHistory: "清空历史",
    cancelTask: "取消",
    useHistoryParams: "使用参数",
    sampleType: "样本",
    simulationType: "模拟",
    scanType: "扫描",
    historyCount: "已记录 {count} 次实验",
    historySampleMain: "theta={theta}，n={n}，height={height}",
    historySimulationMain: "theta={theta}，n={n}，samples={samples}",
    historyScanMain: "{groups} 组，{rows} 次运行",
    historySeed: "seed {seed}",
    historyNoSeed: "无 seed",
    historyModel: "模型 {model}",
    historyTime: "{ms} ms",
    historyOffset: "偏移",
    historyLeaves: "叶子",
    historyMean: "均值",
    historyStd: "标准差",
    historyMedian: "中位数",
    historyDrawn: "已绘图",
    historyDataOnly: "仅数据",
    scanChartTitle: "按 theta 对照平均高度偏移",
    scanChartSubtitle: "y = height - Ewens 参考中心",
    scanMetric: "指标",
    scanMetricOffset: "平均偏移",
    scanMetricHeight: "平均高度",
    scanMetricStd: "高度标准差",
    scanMetricElapsed: "平均 ms",
    scanChartYAxis: "平均高度偏移",
    scanChartYAxisHeight: "平均高度",
    scanChartYAxisStd: "高度标准差",
    scanChartYAxisElapsed: "平均 ms",
    scanChartXAxis: "log n",
    scanSummaryGroups: "分组数",
    scanSummaryRows: "运行数",
    scanSummaryOffsetRange: "偏移范围",
    scanSummaryClosest: "最接近中心",
    scanSummaryFastest: "最快分组",
    smallNTitle: "小 n 枚举",
    smallNNote: "枚举递归树并比较模型概率",
    smallNRun: "枚举",
    smallNExport: "导出 CSV",
    smallNCount: "树数量",
    smallNEwensMean: "Ewens 平均高度",
    smallNUniformMean: "均匀平均高度",
    smallNPlancherelMean: "Plancherel 平均高度",
    smallNTheta: "theta",
    smallNComplete: "已枚举 n={n} 的 {count} 棵树",
    smallNSort: "排序",
    smallNFilterHeight: "高度",
    smallNFilterRootDegree: "根度",
    smallNLocateCode: "parent code",
    searchValueParentCode: "parent code",
    searchValueRank: "rank",
    searchValueShape: "shape",
    searchValueRootPartition: "root partition",
    searchPlaceholderParentCode: "0,0,1",
    searchPlaceholderRank: "42",
    searchPlaceholderShape: "((())())",
    searchPlaceholderRootPartition: "3,2,1",
    smallNLocate: "定位",
    smallNSearchType: "搜索",
    searchParentCode: "parent code",
    searchRank: "rank",
    searchShape: "shape",
    searchRootPartition: "root partition",
    smallNClearFilters: "清除筛选",
    smallNPreview: "树预览",
    smallNPreviewEmpty: "选择一行预览树",
    smallNShown: "显示 {shown}/{filtered}；总数 {total}",
    smallNTableStatus: "已渲染 {shown}/{filtered} 行",
    smallNTableLoadMore: "再加载 2,000 行",
    smallNTableShowAll: "显示全部",
    smallNActiveFilters: "筛选：{filters}",
    smallNShapeFilter: "shape",
    statusSmallNFilterApplied: "已按 {filter} 筛选",
    statusSmallNFiltersCleared: "Small-n 筛选已清除。",
    smallNDistribution: "分布",
    smallNMetric: "指标",
    smallNCountWeight: "count",
    smallNShapeGroups: "Shape 分组",
    smallNShapeNote: "{groups} 个无标号 shape",
    smallNTreeDetails: "树详情",
    smallNTopK: "Top-k 概率质量",
    smallNTopKTarget: "目标",
    smallNTopKModel: "模型",
    smallNTopKValue: "k",
    smallNTopKTree: "树",
    smallNTopKShape: "shape",
    smallNTopKSummary: "前 {k} 个 {target}: {fraction} ({decimal})",
    smallNDifference: "模型差异",
    smallNDiffA: "A",
    smallNDiffB: "B",
    smallNDiffSummary: "{target} 的最大绝对变化：{modelA} - {modelB}",
    smallNDiffEwensUniform: "Ewens / Uniform",
    smallNDiffPlancherelUniform: "Plancherel / Uniform",
    smallNDiffPlancherelEwens: "Plancherel - Ewens",
    sortRank: "枚举顺序",
    sortEwensDesc: "Ewens 概率",
    sortUniformDesc: "均匀概率",
    sortPlancherelDesc: "Plancherel 概率",
    sortHeightDesc: "高度从高到低",
    sortHeightAsc: "高度从低到高",
    sortLeavesDesc: "叶子数从高到低",
    sortRootDegreeDesc: "根度从高到低",
    sortEwensUniformDesc: "Ewens / Uniform 从高到低",
    sortPlancherelUniformDesc: "Plancherel / Uniform 从高到低",
    sortPlancherelMinusEwensDesc: "Plancherel - Ewens 从高到低",
    statusSmallNRunning: "正在枚举小 n...",
    statusSmallNDone: "小 n 枚举完成：{count} 棵树",
    statusSmallNLocated: "已定位 {code}: rank #{rank}",
    statusSmallNCodeInvalid: "Parent code 必须包含 {expected} 个父节点；每个父节点 id 必须小于节点 id。",
    statusSmallNCodeNotFound: "n={n} 中没有找到 parent code {code}。",
    nodeData: "节点数据",
    nodeDataLookup: "节点 id",
    nodeDataShow: "显示节点",
    nodeDataEmpty: "输入节点 id 查看该节点数据。",
    nodeDataUnavailable: "当前样本未传输逐节点数据。",
    nodeDataOutOfRange: "节点 id 必须在 0 到 {max} 之间。",
    nodeDataCount: "可查询 {count} 个绘图节点",
    nodeFieldId: "节点 id",
    nodeFieldParent: "父节点",
    nodeFieldDepth: "深度",
    nodeFieldDepthReference: "深度 - 参考中心",
    nodeFieldSubtreeSize: "子树规模",
    nodeFieldSubtreeHeight: "子树高度",
    nodeFieldSubtreeLeaves: "子树叶子",
    nodeFieldSubtreeMaxDegree: "子树最大度",
    nodeFieldSubtreeAvgDepth: "子树平均深度",
    nodeFieldDescendantsDrawn: "已绘制后代",
    nodeFieldDegree: "度",
    nodeFieldLongestPath: "最长路径",
    nodeFieldPathToRoot: "到根路径",
    nodeFieldChildren: "子节点",
    valueRoot: "root",
    valueYes: "是",
    valueNo: "否",
    metricHeight: "height",
    metricSecondOrder: "c log n - d log log n",
    metricHeightMinusSecond: "height - second",
    metricSecondOrderReference: "Ewens 参考中心",
    metricHeightMinusReference: "height - reference",
    metricRootDegree: "root degree",
    metricLeaves: "leaves",
    metricMaxDegree: "max degree",
    metricGenerateMs: "generate ms",
    metricTotalMs: "total ms",
    treeTooLarge: "n = {n} 超过绘图阈值 {limit}，仅显示数据",
    treeMissingData: "当前样本未传输节点图数据",
    treeComplete: "完整绘图：{n} 个节点，阈值 {limit}",
    tableNoNodes: "大 n 样本未传输逐节点表",
    tableRowsPrefix: "显示前 {rows} 行",
    tableRows: "{rows} 行",
    scanEmptyChart: "运行扫描后显示趋势",
    invalidList: "列表格式不正确，请使用逗号分隔数字。",
    scanNoteDone: "完成 {groups} 组、{rows} 次样本，总耗时 {ms} ms",
    statusScanRunning: "正在运行参数扫描...",
    statusScanDone: "扫描完成：{groups} 组，{rows} 次，总耗时 {ms} ms",
    statusGenerateRunning: "正在生成 Ewens 树...",
    statusGenerateDone: "完成：n={n}，height={height}",
    statusSimulationRunning: "正在批量模拟高度...",
    statusSimulationDone: "模拟完成：mean={mean}，std={std}，median={median}",
    statusCancelRequested: "正在取消当前任务...",
    statusTaskCancelled: "任务已取消。",
    statusTaskFailed: "任务失败：{message}",
    statusTaskProgress: "{label} {percent}%",
    statusTaskLost: "后台任务已中断或过期。请重新运行；如果重复出现，请先减小 n。",
    statusTaskBusy: "服务器仍在处理其它运行。请等待或取消当前任务后再开始新的任务。",
    statusNodeLocated: "已定位节点 {id}：depth={depth}，子树大小={subtree}",
    statusNodeUnavailable: "当前样本没有可定位的逐节点图数据。",
    statusNodeInvalid: "请输入 0 到 {max} 之间的节点 id。",
    statusTreeHighlightApplied: "已高亮 {count} 个节点：{label}",
    statusTreeHighlightCleared: "树高亮已清除。",
    statusTreeChartLinked: "{chart} 分布项 {value}：已高亮 {count} 个节点",
    error: "错误：{message}",
  },
};

function el(id) {
  return document.getElementById(id);
}

function t(key, values = {}) {
  const dictionary = I18N[state.language] || I18N.en;
  const template = dictionary[key] || I18N.en[key] || key;
  return template.replaceAll(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function updateFormatters() {
  const locale = state.language === "zh" ? "zh-CN" : "en-US";
  fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 });
}

function applyLanguage(language) {
  state.language = language === "zh" ? "zh" : "en";
  updateFormatters();
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  el("lang-en").classList.toggle("active", state.language === "en");
  el("lang-zh").classList.toggle("active", state.language === "zh");
  updateModelControls();
  updateSmallNSearchInputMeta();
  updateTreeHighlightControls();
  if (state.lastSample) {
    if (state.treeHighlightMode !== "none") {
      const result = computeTreeHighlight(state.treeHighlightMode, state.treeHighlightValue);
      if (!result.error) {
        state.treeHighlightSet = result.nodes;
        state.treeHighlightLabel = result.label;
        updateTreeHighlightNote();
      }
    }
    renderMetrics(state.lastSample);
    renderTheory(state.lastSample);
    drawTree(state.lastSample);
    renderCharts(state.lastSample);
    renderTable(state.lastSample);
    renderNodeInspector(state.selectedNodeId);
  }
  if (state.lastSimulation) drawSimulation(state.lastSimulation);
  if (state.lastScan) renderScan(state.lastScan);
  else drawLineChart("scan-chart", []);
  if (state.lastSmallN) renderSmallN(state.lastSmallN, { resetFilters: false });
  renderHistory();
  refreshStatusValues();
  if (state.statusKey) {
    const target = el("status");
    el("status-text").textContent = t(state.statusKey, state.statusValues);
    target.classList.toggle("show", state.statusVisible && Boolean(target.textContent));
  }
}

function refreshStatusValues() {
  if (state.statusKey === "statusGenerateDone" && state.lastSample) {
    state.statusValues = {
      n: fmt.format(state.lastSample.parameters.n),
      height: fmt.format(state.lastSample.summary.height),
    };
  } else if (state.statusKey === "statusScanDone" && state.lastScan) {
    state.statusValues = {
      groups: state.lastScan.groups.length,
      rows: state.lastScan.rows.length,
      ms: fmt.format(state.lastScan.timing.total_ms),
    };
  } else if (state.statusKey === "statusSimulationDone" && state.lastSimulation) {
    state.statusValues = {
      mean: fmt.format(state.lastSimulation.stats.mean),
      std: fmt.format(state.lastSimulation.stats.std),
      median: fmt.format(state.lastSimulation.stats.median),
    };
  } else if (state.statusKey === "statusNodeLocated" && state.selectedNodeId != null && state.treeRender) {
    const node = state.treeRender.nodes[state.selectedNodeId];
    state.statusValues = {
      id: fmt.format(node.id),
      depth: fmt.format(node.depth),
      subtree: fmt.format(node.subtree_size),
    };
  } else if (state.statusKey === "statusNodeInvalid" && state.treeRender) {
    state.statusValues = { max: fmt.format(state.treeRender.nodes.length - 1) };
  }
}

function setStatusMessage(key, values = {}, visible = true) {
  state.statusKey = key;
  state.statusValues = values;
  state.statusVisible = visible;
  const target = el("status");
  el("status-text").textContent = t(key, values);
  target.classList.remove("task-active");
  el("task-progress-bar").style.width = "0%";
  target.classList.toggle("show", visible && Boolean(el("status-text").textContent));
}

function taskLabel(kind) {
  if (kind === "scan") return t("statusScanRunning");
  if (kind === "simulation") return t("statusSimulationRunning");
  return t("statusGenerateRunning");
}

function renderTaskProgress(task) {
  state.activeTask = task && ["queued", "running"].includes(task.status) ? task : null;
  const target = el("status");
  const cancelButton = el("cancel-task");
  const progress = task?.progress || {};
  const fraction = Math.max(0, Math.min(1, Number(progress.fraction) || 0));
  target.classList.toggle("show", Boolean(task));
  target.classList.toggle("task-active", Boolean(state.activeTask));
  el("task-progress-bar").style.width = `${Math.round(fraction * 100)}%`;
  cancelButton.disabled = !state.activeTask || task.cancel_requested;
  if (!task) return;
  const percent = Math.round(fraction * 100);
  el("status-text").textContent = t("statusTaskProgress", {
    label: task.cancel_requested ? t("statusCancelRequested") : taskLabel(task.kind),
    percent,
  });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runTask(path, payload) {
  let task = await api(path, { method: "POST", body: JSON.stringify(payload) });
  renderTaskProgress(task);
  while (["queued", "running"].includes(task.status)) {
    await delay(350);
    try {
      task = await api(`/api/tasks/${task.id}`);
    } catch (error) {
      if (error.status === 404) throw new Error(t("statusTaskLost"));
      throw error;
    }
    renderTaskProgress(task);
  }
  renderTaskProgress(null);
  if (task.status === "completed") return task.result;
  if (task.status === "cancelled") {
    const error = new Error(t("statusTaskCancelled"));
    error.cancelled = true;
    throw error;
  }
  throw new Error(task.error || t("statusTaskFailed", { message: "unknown" }));
}

async function cancelActiveTask() {
  if (!state.activeTask) return;
  const taskId = state.activeTask.id;
  el("cancel-task").disabled = true;
  setStatusMessage("statusCancelRequested");
  try {
    const task = await api(`/api/tasks/${taskId}/cancel`, { method: "POST" });
    renderTaskProgress(task);
  } catch (error) {
    setStatusMessage("error", { message: error.message });
  }
}

function numberValue(id) {
  const value = el(id).value.trim();
  return value === "" ? null : Number(value);
}

function intOrNull(id) {
  const value = el(id).value.trim();
  return value === "" ? null : Number.parseInt(value, 10);
}

function selectedModel() {
  return el("model")?.value || "ewens";
}

function selectedScanModels() {
  const models = [...document.querySelectorAll('input[name="scan-model"]:checked')].map((input) => input.value);
  return models.length ? models : ["ewens"];
}

function modelLabel(model = selectedModel()) {
  const option = [...(el("model")?.options || [])].find((item) => item.value === model);
  return option?.textContent || model;
}

function updateModelControls() {
  const model = selectedModel();
  const modelMaxN = state.limits.model_max_n?.[model] || state.limits.max_n;
  const fixedTheta = state.limits.model_fixed_theta?.[model];
  const thetaInput = el("theta");
  el("n").max = modelMaxN;
  if (fixedTheta == null) {
    thetaInput.disabled = false;
    if (thetaInput.dataset.fixedTheta === "true") thetaInput.value = state.freeThetaValue;
    thetaInput.dataset.fixedTheta = "false";
    state.freeThetaValue = thetaInput.value;
    renderPerformanceNote();
    return;
  }
  if (thetaInput.dataset.fixedTheta !== "true") state.freeThetaValue = thetaInput.value;
  thetaInput.value = fixedTheta;
  thetaInput.disabled = true;
  thetaInput.dataset.fixedTheta = "true";
  renderPerformanceNote();
}

function searchValueLabelKey(searchType = state.smallNSearchType) {
  return {
    rank: "searchValueRank",
    shape: "searchValueShape",
    root_partition: "searchValueRootPartition",
    parent_code: "searchValueParentCode",
  }[searchType] || "searchValueParentCode";
}

function searchPlaceholderKey(searchType = state.smallNSearchType) {
  return {
    rank: "searchPlaceholderRank",
    shape: "searchPlaceholderShape",
    root_partition: "searchPlaceholderRootPartition",
    parent_code: "searchPlaceholderParentCode",
  }[searchType] || "searchPlaceholderParentCode";
}

function updateSmallNSearchInputMeta() {
  const searchType = state.smallNSearchType || "parent_code";
  const label = el("smalln-search-value-label");
  const input = el("smalln-locate-code");
  if (label) label.textContent = t(searchValueLabelKey(searchType));
  if (input) input.placeholder = t(searchPlaceholderKey(searchType));
}

function renderPerformanceNote() {
  const model = selectedModel();
  const n = intOrNull("n") || 0;
  const drawLimit = intOrNull("draw-limit") || state.limits.default_draw_limit;
  const modelMaxN = state.limits.model_max_n?.[model] || state.limits.max_n;
  const note = state.limits.model_performance_notes?.[model] || "";
  const mode = n <= drawLimit ? t("performanceDrawable") : t("performanceDataOnly");
  el("performance-note").textContent = t("performanceNote", {
    model: modelLabel(model),
    maxN: compact.format(modelMaxN),
    drawLimit: compact.format(Math.min(drawLimit, state.limits.max_draw_limit || drawLimit)),
    mode,
    note,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = response.status === 429 ? t("statusTaskBusy") : body.detail || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function metric(label, value) {
  return `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderMetrics(data) {
  const s = data.summary;
  const c = data.centering;
  const offsets = data.height_offsets || {};
  const timing = data.timing || {};
  const referenceOnly = data.parameters?.model && data.parameters.model !== "ewens";
  el("metrics-grid").innerHTML = [
    metric(t("metricHeight"), fmt.format(s.height)),
    metric(referenceOnly ? t("metricSecondOrderReference") : t("metricSecondOrder"), c.second_order == null ? "-" : fmt.format(c.second_order)),
    metric(referenceOnly ? t("metricHeightMinusReference") : t("metricHeightMinusSecond"), offsets.height_minus_second_order == null ? "-" : fmt.format(offsets.height_minus_second_order)),
    metric(t("metricRootDegree"), fmt.format(s.root_degree)),
    metric(t("metricLeaves"), fmt.format(s.leaves)),
    metric(t("metricMaxDegree"), fmt.format(s.max_degree)),
    metric(t("metricGenerateMs"), timing.generate_ms == null ? "-" : fmt.format(timing.generate_ms)),
    metric(t("metricTotalMs"), timing.total_ms == null ? "-" : fmt.format(timing.total_ms)),
  ].join("");
}

function renderTheory(data) {
  const th = data.theory;
  if (!th) {
    el("theta-label").textContent = data.parameters.model_label || modelLabel(data.parameters.model);
    el("theory-values").innerHTML = `<div class="theory-item theory-empty"><span>${t("theoryUnavailable")}</span><strong>-</strong></div>`;
    return;
  }
  const referenceOnly = data.parameters?.model && data.parameters.model !== "ewens";
  const suffix = referenceOnly ? `; ${t("theoryReferenceNote")}` : "";
  el("theta-label").textContent = `${data.parameters.model_label || t("modelEwens")}; theta = ${fmt.format(th.theta)}${suffix}`;
  el("theory-values").innerHTML = [
    ["t_theta", th.t],
    ["L_theta", th.L],
    ["c_*(theta)", th.c],
    ["d_theta", th.d],
    ["beta_theta(t_theta)", th.beta],
    ["a_theta = 1 / c", th.a],
  ]
    .map(([label, value]) => `<div class="theory-item"><span>${label}</span><strong>${fmt.format(value)}</strong></div>`)
    .join("");
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = Math.max(1, Math.floor(rect.width * ratio));
  const targetHeight = Math.max(1, Math.floor(rect.height * ratio));
  const resized = canvas.width !== targetWidth || canvas.height !== targetHeight;
  if (resized) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height, ratio, resized };
}

function drawEmptyTree(message) {
  const canvas = el("tree-canvas");
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#6b7785";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}

function maxNodeDepth(nodes) {
  let maxDepth = 1;
  for (const node of nodes) {
    if (node.depth > maxDepth) maxDepth = node.depth;
  }
  return maxDepth;
}

function maxListValue(values) {
  let maxValue = 1;
  for (const value of values) {
    if (value > maxValue) maxValue = value;
  }
  return maxValue;
}

function computeCenteredUpwardPositions(nodes, width, height) {
  const maxDepth = maxNodeDepth(nodes);
  const levelCounts = Array.from({ length: maxDepth + 1 }, () => 0);
  for (const node of nodes) levelCounts[node.depth] += 1;
  const levelSeen = Array.from({ length: maxDepth + 1 }, () => 0);
  const maxLevelCount = maxListValue(levelCounts);
  const leftPad = 24;
  const rightPad = 24;
  const topPad = 34;
  const bottomPad = 34;
  const usableW = Math.max(1, width - leftPad - rightPad);
  const usableH = Math.max(1, height - topPad - bottomPad);
  const centerX = width / 2;
  const stepX = maxLevelCount <= 1 ? 0 : usableW / (maxLevelCount - 1);
  const xs = new Float32Array(nodes.length);
  const ys = new Float32Array(nodes.length);
  for (const node of nodes) {
    const count = levelCounts[node.depth];
    const index = levelSeen[node.depth]++;
    xs[node.id] = centerX + (index - (count - 1) / 2) * stepX;
    ys[node.id] = height - bottomPad - (node.depth / maxDepth) * usableH;
  }
  return { xs, ys, maxDepth };
}

function buildChildren(nodes) {
  const children = Array.from({ length: nodes.length }, () => []);
  for (const node of nodes) {
    if (node.parent >= 0) children[node.parent].push(node.id);
  }
  return children;
}

function computeMassUpwardPositions(nodes, children, width, height) {
  const maxDepth = maxNodeDepth(nodes);
  const leftPad = 24;
  const rightPad = 24;
  const topPad = 34;
  const bottomPad = 34;
  const usableW = Math.max(1, width - leftPad - rightPad);
  const usableH = Math.max(1, height - topPad - bottomPad);
  const xs = new Float32Array(nodes.length);
  const ys = new Float32Array(nodes.length);
  const stack = [{ id: 0, min: leftPad, max: leftPad + usableW }];
  while (stack.length) {
    const item = stack.pop();
    const node = nodes[item.id];
    xs[item.id] = (item.min + item.max) / 2;
    ys[item.id] = height - bottomPad - (node.depth / maxDepth) * usableH;
    const childIds = children[item.id] || [];
    if (!childIds.length) continue;
    const total = childIds.reduce((sum, childId) => sum + Math.max(1, nodes[childId].subtree_size), 0);
    let cursor = item.min;
    for (const childId of childIds) {
      const span = ((item.max - item.min) * Math.max(1, nodes[childId].subtree_size)) / total;
      stack.push({ id: childId, min: cursor, max: cursor + span });
      cursor += span;
    }
  }
  return { xs, ys, maxDepth };
}

function computeLeftUpwardPositions(nodes, width, height) {
  const maxDepth = maxNodeDepth(nodes);
  const levelCounts = Array.from({ length: maxDepth + 1 }, () => 0);
  for (const node of nodes) levelCounts[node.depth] += 1;
  const levelSeen = Array.from({ length: maxDepth + 1 }, () => 0);
  const maxLevelCount = maxListValue(levelCounts);
  const leftPad = 24;
  const rightPad = 24;
  const topPad = 34;
  const bottomPad = 34;
  const usableW = Math.max(1, width - leftPad - rightPad);
  const usableH = Math.max(1, height - topPad - bottomPad);
  const stepX = maxLevelCount <= 1 ? 0 : usableW / (maxLevelCount - 1);
  const xs = new Float32Array(nodes.length);
  const ys = new Float32Array(nodes.length);
  for (const node of nodes) {
    const index = levelSeen[node.depth]++;
    xs[node.id] = maxLevelCount <= 1 ? width / 2 : leftPad + index * stepX;
    ys[node.id] = height - bottomPad - (node.depth / maxDepth) * usableH;
  }
  return { xs, ys, maxDepth };
}

function computeCircularPositions(nodes, children, width, height, useLogRadius = false) {
  const maxDepth = maxNodeDepth(nodes);
  const xs = new Float32Array(nodes.length);
  const ys = new Float32Array(nodes.length);
  const cx = width / 2;
  const cy = height / 2;
  const radiusMax = Math.max(1, Math.min(width, height) * 0.46);
  const stack = [{ id: 0, min: -Math.PI, max: Math.PI }];
  while (stack.length) {
    const item = stack.pop();
    const node = nodes[item.id];
    const angle = (item.min + item.max) / 2;
    const depthRatio = useLogRadius
      ? Math.log1p(node.depth) / Math.log1p(maxDepth)
      : node.depth / maxDepth;
    const radius = depthRatio * radiusMax;
    xs[item.id] = cx + Math.cos(angle) * radius;
    ys[item.id] = cy + Math.sin(angle) * radius;
    const childIds = children[item.id] || [];
    if (!childIds.length) continue;
    const parentSpan = item.max - item.min;
    const innerMin = item.id === 0 ? item.min : item.min + parentSpan * 0.08;
    const innerMax = item.id === 0 ? item.max : item.max - parentSpan * 0.08;
    const total = childIds.reduce((sum, childId) => sum + Math.max(1, nodes[childId].subtree_size), 0);
    let cursor = innerMin;
    for (const childId of childIds) {
      const span = ((innerMax - innerMin) * Math.max(1, nodes[childId].subtree_size)) / total;
      stack.push({ id: childId, min: cursor, max: cursor + span });
      cursor += span;
    }
  }
  return { xs, ys, maxDepth };
}

function computeTreePositions(nodes, children, width, height, layout) {
  if (layout === "mass-upward") return computeMassUpwardPositions(nodes, children, width, height);
  if (layout === "left-upward") return computeLeftUpwardPositions(nodes, width, height);
  if (layout === "circular") return computeCircularPositions(nodes, children, width, height, false);
  if (layout === "log-circular") return computeCircularPositions(nodes, children, width, height, true);
  return computeCenteredUpwardPositions(nodes, width, height);
}

function buildTreeArrays(nodes) {
  const parent = new Int32Array(nodes.length);
  const depth = new Uint32Array(nodes.length);
  const longest = new Uint8Array(nodes.length);
  for (const node of nodes) {
    parent[node.id] = node.parent;
    depth[node.id] = node.depth;
    longest[node.id] = node.on_longest_path ? 1 : 0;
  }
  return { parent, depth, longest };
}

function buildNodeColors(nodes, maxDepth) {
  const colors = new Array(nodes.length);
  const safeMaxDepth = maxDepth || 1;
  const alpha = nodes.length > 10000 ? 0.55 : 0.8;
  for (const node of nodes) {
    const depthRatio = node.depth / safeMaxDepth;
    colors[node.id] = `rgba(${Math.round(35 + 65 * depthRatio)}, ${Math.round(39 + 65 * depthRatio)}, ${Math.round(43 + 65 * depthRatio)}, ${alpha})`;
  }
  return colors;
}

function buildEdgePath(nodes, positions, predicate = null) {
  if (typeof Path2D === "undefined") return null;
  const path = new Path2D();
  for (const node of nodes) {
    if (node.parent < 0) continue;
    if (predicate && !predicate(node)) continue;
    path.moveTo(positions.xs[node.parent], positions.ys[node.parent]);
    path.lineTo(positions.xs[node.id], positions.ys[node.id]);
  }
  return path;
}

function buildRenderCaches(nodes, positions) {
  const arrays = buildTreeArrays(nodes);
  return {
    ...arrays,
    nodeColors: buildNodeColors(nodes, positions.maxDepth),
    basePath: buildEdgePath(nodes, positions),
    longestPath: buildEdgePath(nodes, positions, (node) => {
      const parentId = arrays.parent[node.id];
      return arrays.longest[node.id] && parentId >= 0 && arrays.longest[parentId];
    }),
    selectedPath: null,
    selectedPathNodeId: null,
  };
}

function visibleWorldBounds(width, height, padding = 28) {
  const view = state.treeView;
  const pad = padding / Math.max(view.scale, 0.001);
  return {
    minX: (-view.offsetX) / view.scale - pad,
    maxX: (width - view.offsetX) / view.scale + pad,
    minY: (-view.offsetY) / view.scale - pad,
    maxY: (height - view.offsetY) / view.scale + pad,
  };
}

function pointIsVisible(positions, id, bounds) {
  const x = positions.xs[id];
  const y = positions.ys[id];
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function strokeEdgeLoop(ctx, render, predicate = null) {
  const { nodes, positions } = render;
  const bounds = visibleWorldBounds(render.width, render.height, 48);
  ctx.beginPath();
  for (const node of nodes) {
    if (node.parent < 0) continue;
    if (predicate && !predicate(node)) continue;
    if (!pointIsVisible(positions, node.id, bounds) && !pointIsVisible(positions, node.parent, bounds)) continue;
    ctx.moveTo(positions.xs[node.parent], positions.ys[node.parent]);
    ctx.lineTo(positions.xs[node.id], positions.ys[node.id]);
  }
  ctx.stroke();
}

function strokeCachedPath(ctx, render, path, predicate = null) {
  if (path && !(render.nodes.length > 5000 && state.treeView.scale > 4)) {
    ctx.stroke(path);
    return;
  }
  strokeEdgeLoop(ctx, render, predicate);
}

function getSelectedPath(render) {
  const selected = state.selectedSubtree;
  if (!selected?.size || typeof Path2D === "undefined") return null;
  if (render.selectedPath && render.selectedPathNodeId === state.selectedNodeId) return render.selectedPath;
  render.selectedPathNodeId = state.selectedNodeId;
  render.selectedPath = buildEdgePath(render.nodes, render.positions, (node) => selected.has(node.id) && selected.has(node.parent));
  return render.selectedPath;
}

function drawOverviewBitmapLayer(render, ratio) {
  if (render.overviewBitmap && render.overviewBitmapRatio === ratio) return render.overviewBitmap;
  const bitmap = document.createElement("canvas");
  bitmap.width = Math.max(1, Math.floor(render.width * ratio));
  bitmap.height = Math.max(1, Math.floor(render.height * ratio));
  const ctx = bitmap.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.lineWidth = 0.22;
  ctx.strokeStyle = "rgba(25, 28, 31, 0.2)";
  if (render.basePath) {
    ctx.stroke(render.basePath);
  } else {
    strokeEdgeLoop(ctx, render);
  }

  const baseRadius = render.nodes.length > 20000 ? 0.55 : 0.8;
  const size = Math.max(0.8, baseRadius);
  ctx.fillStyle = "rgba(55, 61, 67, 0.52)";
  for (let id = 0; id < render.nodes.length; id += 1) {
    if (render.longest[id]) continue;
    ctx.fillRect(render.positions.xs[id] - size / 2, render.positions.ys[id] - size / 2, size, size);
  }

  ctx.lineWidth = 1.15;
  ctx.strokeStyle = "rgba(218, 45, 82, 0.92)";
  if (render.longestPath) {
    ctx.stroke(render.longestPath);
  } else {
    strokeEdgeLoop(ctx, render, (node) => render.longest[node.id] && render.parent[node.id] >= 0 && render.longest[render.parent[node.id]]);
  }

  ctx.fillStyle = "rgba(218, 45, 82, 1)";
  for (let id = 0; id < render.nodes.length; id += 1) {
    if (!render.longest[id]) continue;
    ctx.beginPath();
    ctx.arc(render.positions.xs[id], render.positions.ys[id], baseRadius + 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  render.overviewBitmap = bitmap;
  render.overviewBitmapRatio = ratio;
  return bitmap;
}

function buildHitIndex(positions) {
  const cellSize = 18;
  const cells = new Map();
  for (let id = 0; id < positions.xs.length; id += 1) {
    const cx = Math.floor(positions.xs[id] / cellSize);
    const cy = Math.floor(positions.ys[id] / cellSize);
    const key = `${cx},${cy}`;
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(id);
  }
  return { cellSize, cells };
}

function computeSubtree(children, rootId) {
  const result = new Set();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (result.has(id)) continue;
    result.add(id);
    for (const child of children[id] || []) stack.push(child);
  }
  return result;
}

function computeSubtreeStats(render, rootId) {
  if (!render || rootId == null || rootId < 0 || rootId >= render.nodes.length) return null;
  const nodes = render.nodes;
  const subtree = computeSubtree(render.children, rootId);
  const rootDepth = nodes[rootId].depth;
  let height = 0;
  let leaves = 0;
  let maxDegree = 0;
  let relativeDepthTotal = 0;
  for (const id of subtree) {
    const node = nodes[id];
    const relativeDepth = node.depth - rootDepth;
    height = Math.max(height, relativeDepth);
    relativeDepthTotal += relativeDepth;
    if (node.degree === 0) leaves += 1;
    maxDegree = Math.max(maxDegree, node.degree);
  }
  return {
    nodes: subtree,
    size: subtree.size,
    height,
    leaves,
    maxDegree,
    avgDepth: subtree.size ? relativeDepthTotal / subtree.size : 0,
  };
}

function treeHighlightRequiresValue(mode = state.treeHighlightMode) {
  return ["degree_eq", "degree_ge", "depth_eq", "subtree_eq", "subtree_ge"].includes(mode);
}

function treeHighlightModeLabel(mode = state.treeHighlightMode, value = state.treeHighlightValue) {
  const labels = {
    root_path: t("treeHighlightRootPath"),
    selected_subtree: t("treeHighlightSelectedSubtree"),
    leaves: t("treeHighlightLeaves"),
    degree_eq: `${t("nodeFieldDegree")} = ${value}`,
    degree_ge: `${t("nodeFieldDegree")} >= ${value}`,
    depth_eq: `${t("nodeFieldDepth")} = ${value}`,
    subtree_eq: `${t("nodeFieldSubtreeSize")} = ${value}`,
    subtree_ge: `${t("nodeFieldSubtreeSize")} >= ${value}`,
  };
  return labels[mode] || t("treeHighlightNone");
}

function parseTreeHighlightValue() {
  const raw = String(el("tree-highlight-value")?.value ?? state.treeHighlightValue ?? "").trim();
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function updateTreeHighlightNote() {
  const note = el("tree-highlight-note");
  if (!note) return;
  if (!state.treeHighlightSet?.size) {
    note.textContent = t("treeHighlightNoteNone");
    return;
  }
  note.textContent = t("treeHighlightNote", {
    label: state.treeHighlightLabel,
    count: fmt.format(state.treeHighlightSet.size),
  });
}

function updateTreeHighlightControls() {
  const mode = state.treeHighlightMode || "none";
  if (el("tree-highlight-mode")) el("tree-highlight-mode").value = mode;
  const valueInput = el("tree-highlight-value");
  if (valueInput) {
    valueInput.disabled = !treeHighlightRequiresValue(mode);
    valueInput.value = state.treeHighlightValue ?? "";
  }
  updateTreeHighlightNote();
}

function computeTreeHighlight(mode = state.treeHighlightMode, value = state.treeHighlightValue) {
  const render = ensureTreeRender();
  if (!render || mode === "none") return { nodes: null, label: t("treeHighlightNone") };
  const nodes = render.nodes;
  const numericValue = treeHighlightRequiresValue(mode) ? Number.parseInt(value, 10) : null;
  if (treeHighlightRequiresValue(mode) && (!Number.isInteger(numericValue) || numericValue < 0)) {
    return { error: t("treeHighlightNeedsValue") };
  }
  if (mode === "root_path") {
    if (state.selectedNodeId == null) return { error: t("treeHighlightNeedsNode") };
    return { nodes: new Set(pathToRoot(nodes, state.selectedNodeId)), label: treeHighlightModeLabel(mode, value) };
  }
  if (mode === "selected_subtree") {
    if (state.selectedNodeId == null) return { error: t("treeHighlightNeedsNode") };
    const stats = computeSubtreeStats(render, state.selectedNodeId);
    return { nodes: stats?.nodes || null, label: treeHighlightModeLabel(mode, value) };
  }
  const highlighted = new Set();
  for (const node of nodes) {
    if (mode === "leaves" && node.degree === 0) highlighted.add(node.id);
    if (mode === "degree_eq" && node.degree === numericValue) highlighted.add(node.id);
    if (mode === "degree_ge" && node.degree >= numericValue) highlighted.add(node.id);
    if (mode === "depth_eq" && node.depth === numericValue) highlighted.add(node.id);
    if (mode === "subtree_eq" && node.subtree_size === numericValue) highlighted.add(node.id);
    if (mode === "subtree_ge" && node.subtree_size >= numericValue) highlighted.add(node.id);
  }
  return { nodes: highlighted, label: treeHighlightModeLabel(mode, value) };
}

function applyTreeHighlight(mode = state.treeHighlightMode, value = state.treeHighlightValue, options = {}) {
  state.treeHighlightMode = mode || "none";
  state.treeHighlightValue = value ?? "";
  const result = computeTreeHighlight(state.treeHighlightMode, state.treeHighlightValue);
  if (result.error) {
    setStatusMessage("error", { message: result.error });
    updateTreeHighlightControls();
    return false;
  }
  state.treeHighlightSet = result.nodes;
  state.treeHighlightLabel = result.label;
  updateTreeHighlightControls();
  if (state.lastSample) {
    drawTree(state.lastSample);
    renderCharts(state.lastSample);
  }
  if (options.status !== false) {
    if (state.treeHighlightSet?.size) {
      setStatusMessage("statusTreeHighlightApplied", {
        count: fmt.format(state.treeHighlightSet.size),
        label: state.treeHighlightLabel,
      });
    } else {
      setStatusMessage("statusTreeHighlightCleared");
    }
  }
  return true;
}

function applyTreeHighlightFromControls() {
  const mode = el("tree-highlight-mode").value;
  const value = treeHighlightRequiresValue(mode) ? parseTreeHighlightValue() : "";
  if (treeHighlightRequiresValue(mode) && value == null) {
    setStatusMessage("error", { message: t("treeHighlightNeedsValue") });
    return;
  }
  applyTreeHighlight(mode, value);
}

function clearTreeHighlight() {
  state.treeHighlightMode = "none";
  state.treeHighlightValue = "";
  state.treeHighlightSet = null;
  state.treeHighlightLabel = "";
  updateTreeHighlightControls();
  if (state.lastSample) {
    drawTree(state.lastSample);
    renderCharts(state.lastSample);
  }
  setStatusMessage("statusTreeHighlightCleared");
}

function resetTreeView() {
  state.treeView = { scale: 1, offsetX: 0, offsetY: 0, dragging: false, moved: false, lastX: 0, lastY: 0 };
  if (state.lastSample) drawTree(state.lastSample);
}

function ensureTreeRender() {
  if (!state.treeRender && state.lastSample?.drawable) drawTree(state.lastSample);
  return state.treeRender;
}

function selectNode(nodeId) {
  const render = ensureTreeRender();
  if (!render || nodeId == null || nodeId < 0 || nodeId >= render.nodes.length) return false;
  state.selectedNodeId = nodeId;
  state.selectedSubtree = computeSubtree(render.children, nodeId);
  showNodeDataById(nodeId, { silent: true });
  if (["root_path", "selected_subtree"].includes(state.treeHighlightMode)) {
    applyTreeHighlight(state.treeHighlightMode, state.treeHighlightValue, { status: false });
  }
  return true;
}

function centerTreeOnNode(nodeId, minScale = 8) {
  const render = ensureTreeRender();
  if (!render || nodeId < 0 || nodeId >= render.nodes.length) return false;
  const canvas = el("tree-canvas");
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(minScale, Math.min(80, state.treeView.scale < 1 ? minScale : state.treeView.scale));
  state.treeView = {
    scale,
    offsetX: rect.width / 2 - render.positions.xs[nodeId] * scale,
    offsetY: rect.height / 2 - render.positions.ys[nodeId] * scale,
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  };
  return true;
}

function locateNodeById(rawId = el("node-search-id").value) {
  const render = ensureTreeRender();
  if (!render) {
    setStatusMessage("statusNodeUnavailable");
    return;
  }
  const nodeId = Number.parseInt(String(rawId).trim(), 10);
  if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId >= render.nodes.length) {
    setStatusMessage("statusNodeInvalid", { max: fmt.format(render.nodes.length - 1) });
    return;
  }
  el("node-search-id").value = nodeId;
  selectNode(nodeId);
  centerTreeOnNode(nodeId);
  drawTree(state.lastSample);
  renderNodeInspector(nodeId);
  const node = render.nodes[nodeId];
  setStatusMessage("statusNodeLocated", {
    id: fmt.format(node.id),
    depth: fmt.format(node.depth),
    subtree: fmt.format(node.subtree_size),
  });
}

function requestTreeRedraw() {
  if (state.treeDrawPending) return;
  state.treeDrawPending = true;
  requestAnimationFrame(() => {
    state.treeDrawPending = false;
    if (state.lastSample) drawTree(state.lastSample);
  });
}

function toScreenPoint(x, y) {
  const view = state.treeView;
  return {
    x: x * view.scale + view.offsetX,
    y: y * view.scale + view.offsetY,
  };
}

function toWorldPoint(x, y) {
  const view = state.treeView;
  return {
    x: (x - view.offsetX) / view.scale,
    y: (y - view.offsetY) / view.scale,
  };
}

function drawTree(data) {
  const n = data.parameters.n;
  const limit = data.parameters.draw_limit;
  const note = el("draw-note");
  if (!data.drawable || !data.nodes) {
    note.textContent = t("treeTooLarge", { n: compact.format(n), limit: compact.format(limit) });
    drawEmptyTree(t("treeMissingData"));
    state.treeRender = null;
    return;
  }
  note.textContent = t("treeComplete", { n: compact.format(n), limit: compact.format(limit) });
  const canvas = el("tree-canvas");
  const { ctx, width, height, ratio } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const nodes = data.nodes;
  let render = state.treeRender;
  const layout = state.treeLayout;
  if (!render || render.data !== data || render.width !== width || render.height !== height || render.layout !== layout) {
    const children = render?.data === data ? render.children : buildChildren(nodes);
    const positions = computeTreePositions(nodes, children, width, height, layout);
    const hitIndex = buildHitIndex(positions);
    const caches = buildRenderCaches(nodes, positions);
    render = { data, nodes, positions, children, width, height, layout, hitIndex, ...caches };
    state.treeRender = render;
  }
  const { positions, parent, longest, nodeColors } = render;
  const selected = state.selectedSubtree;
  const highlighted = state.treeHighlightSet;
  const view = state.treeView;
  const scale = Math.max(view.scale, 0.001);
  const selectedPath = getSelectedPath(render);
  const canUseOverviewBitmap = nodes.length > 20000 && scale < 1.8 && !selected?.size && !highlighted?.size;
  if (canUseOverviewBitmap) {
    const bitmap = drawOverviewBitmapLayer(render, ratio);
    ctx.save();
    ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * view.offsetX, ratio * view.offsetY);
    ctx.imageSmoothingEnabled = scale > 1;
    ctx.drawImage(bitmap, 0, 0, render.width, render.height);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * view.offsetX, ratio * view.offsetY);

  ctx.lineWidth = (nodes.length > 10000 ? 0.22 : nodes.length > 3000 ? 0.35 : 0.65) / scale;
  ctx.strokeStyle = nodes.length > 3000 ? "rgba(25, 28, 31, 0.2)" : "rgba(25, 28, 31, 0.32)";
  strokeCachedPath(ctx, render, render.basePath);

  if (selected?.size) {
    ctx.lineWidth = (nodes.length > 10000 ? 0.75 : nodes.length > 3000 ? 1.0 : 1.45) / scale;
    ctx.strokeStyle = "rgba(0, 127, 137, 0.75)";
    strokeCachedPath(ctx, render, selectedPath, (node) => selected.has(node.id) && selected.has(node.parent));
  }

  if (highlighted?.size) {
    ctx.lineWidth = (nodes.length > 10000 ? 0.9 : nodes.length > 3000 ? 1.15 : 1.75) / scale;
    ctx.strokeStyle = "rgba(196, 124, 0, 0.78)";
    strokeEdgeLoop(ctx, render, (node) => highlighted.has(node.id) && highlighted.has(node.parent));
  }

  ctx.lineWidth = (nodes.length > 10000 ? 1.15 : nodes.length > 3000 ? 1.45 : 2.0) / scale;
  ctx.strokeStyle = "rgba(218, 45, 82, 0.92)";
  strokeCachedPath(ctx, render, render.longestPath, (node) => longest[node.id] && parent[node.id] >= 0 && longest[parent[node.id]]);

  const maxDepth = positions.maxDepth;
  const baseRadius = nodes.length > 20000 ? 0.55 : nodes.length > 5000 ? 0.8 : nodes.length > 1500 ? 1.35 : 2.4;
  const radiusFactor = Math.min(1.8, Math.sqrt(scale));
  const bounds = visibleWorldBounds(width, height, 24 + (baseRadius + 3) * radiusFactor);
  for (let id = 0; id < nodes.length; id += 1) {
    if (!pointIsVisible(positions, id, bounds)) continue;
    ctx.fillStyle = id === state.selectedNodeId
      ? "rgba(0, 127, 137, 1)"
      : longest[id]
        ? "rgba(218, 45, 82, 1)"
      : highlighted?.has(id)
        ? "rgba(196, 124, 0, 0.95)"
      : selected?.has(id)
        ? "rgba(0, 127, 137, 0.7)"
        : nodeColors[id];
    ctx.beginPath();
    const screenRadius = (id === state.selectedNodeId || longest[id] || highlighted?.has(id) ? baseRadius + 1.8 : id === 0 ? baseRadius + 1.8 : baseRadius) * radiusFactor;
    ctx.arc(positions.xs[id], positions.ys[id], screenRadius / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (nodes.length <= 300) {
    ctx.font = `${10 / scale}px system-ui, sans-serif`;
    ctx.fillStyle = "#17202a";
    for (const node of nodes) {
      if (!pointIsVisible(positions, node.id, bounds)) continue;
      ctx.fillText(String(node.id), positions.xs[node.id] + 4 / scale, positions.ys[node.id] - 4 / scale);
    }
  }
  ctx.restore();
}

function pathToRoot(nodes, id) {
  const path = [];
  let current = id;
  while (current >= 0 && current < nodes.length) {
    path.push(current);
    current = nodes[current].parent;
  }
  return path.reverse();
}

function renderNodeInspector(nodeId) {
  const target = el("node-inspector");
  const render = state.treeRender;
  if (!render || nodeId == null) {
    target.innerHTML = `<div class="inspector-empty">${t("nodeInspectorEmpty")}</div>`;
    return;
  }
  const { nodes, children } = render;
  const node = nodes[nodeId];
  const stats = computeSubtreeStats(render, nodeId);
  const path = pathToRoot(nodes, nodeId);
  const childList = children[nodeId] || [];
  target.innerHTML = `
    <div class="inspector-grid">
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldId"))}</span><strong>${node.id}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldDepth"))}</span><strong>${node.depth}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldDegree"))}</span><strong>${node.degree}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldSubtreeSize"))}</span><strong>${fmt.format(node.subtree_size)}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldSubtreeHeight"))}</span><strong>${stats?.height ?? 0}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldSubtreeLeaves"))}</span><strong>${fmt.format(stats?.leaves ?? 0)}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldSubtreeMaxDegree"))}</span><strong>${fmt.format(stats?.maxDegree ?? 0)}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldSubtreeAvgDepth"))}</span><strong>${fmt.format(stats?.avgDepth ?? 0)}</strong></div>
      <div class="inspector-item"><span>${escapeHtml(t("nodeFieldDescendantsDrawn"))}</span><strong>${fmt.format(stats?.size ?? 0)}</strong></div>
    </div>
    <div class="inspector-path">
      ${escapeHtml(t("nodeFieldPathToRoot"))}: ${path.join(" -> ")}
      ${childList.length ? `<br>${escapeHtml(t("nodeFieldChildren"))}: ${childList.slice(0, 36).join(", ")}${childList.length > 36 ? ", ..." : ""}` : ""}
    </div>
  `;
}

function handleTreeClick(event) {
  const render = state.treeRender;
  if (!render) return;
  if (state.treeView.moved) {
    state.treeView.moved = false;
    return;
  }
  const rect = el("tree-canvas").getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const { x, y } = toWorldPoint(screenX, screenY);
  const { nodes, positions, hitIndex } = render;
  const threshold = (nodes.length > 20000 ? 9 : nodes.length > 5000 ? 11 : 15) / state.treeView.scale;
  const cellSize = hitIndex?.cellSize || 18;
  const baseCx = Math.floor(x / cellSize);
  const baseCy = Math.floor(y / cellSize);
  const radiusCells = Math.max(1, Math.ceil(threshold / cellSize));
  let bestId = null;
  let bestDistance = Infinity;
  if (hitIndex) {
    for (let dxCell = -radiusCells; dxCell <= radiusCells; dxCell += 1) {
      for (let dyCell = -radiusCells; dyCell <= radiusCells; dyCell += 1) {
        const bucket = hitIndex.cells.get(`${baseCx + dxCell},${baseCy + dyCell}`);
        if (!bucket) continue;
        for (const id of bucket) {
          const dx = positions.xs[id] - x;
          const dy = positions.ys[id] - y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDistance) {
            bestDistance = dist;
            bestId = id;
          }
        }
      }
    }
  } else {
    for (const node of nodes) {
      const dx = positions.xs[node.id] - x;
      const dy = positions.ys[node.id] - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDistance) {
        bestDistance = dist;
        bestId = node.id;
      }
    }
  }
  if (bestId == null || bestDistance > threshold * threshold) return;
  selectNode(bestId);
  drawTree(state.lastSample);
  renderNodeInspector(bestId);
}

function handleTreeWheel(event) {
  if (!state.treeRender) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = el("tree-canvas").getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const before = toWorldPoint(mouseX, mouseY);
  const steps = Math.min(10, Math.max(1, Math.abs(event.deltaY) / 120));
  const factor = event.deltaY < 0 ? 1.22 ** steps : 1 / 1.22 ** steps;
  const view = state.treeView;
  view.scale = Math.max(0.35, Math.min(240, view.scale * factor));
  view.offsetX = mouseX - before.x * view.scale;
  view.offsetY = mouseY - before.y * view.scale;
  requestTreeRedraw();
}

function handleTreePointerDown(event) {
  if (!state.treeRender) return;
  const canvas = el("tree-canvas");
  canvas.setPointerCapture?.(event.pointerId);
  canvas.classList.add("dragging");
  state.treeView.dragging = true;
  state.treeView.moved = false;
  state.treeView.lastX = event.clientX;
  state.treeView.lastY = event.clientY;
}

function handleTreePointerMove(event) {
  if (!state.treeView.dragging) return;
  const view = state.treeView;
  const dx = event.clientX - view.lastX;
  const dy = event.clientY - view.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 1) view.moved = true;
  view.offsetX += dx;
  view.offsetY += dy;
  view.lastX = event.clientX;
  view.lastY = event.clientY;
  requestTreeRedraw();
}

function handleTreePointerUp(event) {
  const canvas = el("tree-canvas");
  canvas.releasePointerCapture?.(event.pointerId);
  canvas.classList.remove("dragging");
  state.treeView.dragging = false;
}

function sortedChartRows(rows, xField) {
  return [...(rows || [])].sort((a, b) => Number(a[xField]) - Number(b[xField]));
}

function drawBarChart(canvasId, rows, xField, yField, color = "#007f89", options = {}) {
  const canvas = el(canvasId);
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  state.treeChartBars[canvasId] = [];
  const chartRows = sortedChartRows(rows, xField);
  const pad = { left: 42, right: 12, top: 18, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxY = Math.max(...chartRows.map((row) => row[yField]), 1);
  ctx.strokeStyle = "#dce3e8";
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
  const barW = Math.max(1, plotW / Math.max(chartRows.length, 1));
  ctx.fillStyle = color;
  chartRows.forEach((row, i) => {
    const h = (row[yField] / maxY) * plotH;
    const x = pad.left + i * barW;
    const y = pad.top + plotH - h;
    const widthForBar = Math.max(1, barW - 1);
    ctx.fillRect(x, y, widthForBar, h);
    state.treeChartBars[canvasId].push({
      x,
      y: pad.top,
      width: barW,
      height: plotH,
      value: row[xField],
      metric: options.metric || xField,
      chartLabel: options.chartLabel || canvasId,
    });
    if (options.selectedValue != null && row[xField] === options.selectedValue) {
      ctx.strokeStyle = "#17202a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, widthForBar, h);
    }
  });
  ctx.fillStyle = "#6b7785";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(compact.format(maxY), pad.left - 5, pad.top + 4);
  ctx.fillText("0", pad.left - 5, pad.top + plotH);
  ctx.textAlign = "center";
  if (chartRows.length) {
    ctx.fillText(String(chartRows[0][xField]), pad.left, height - 10);
    ctx.fillText(String(chartRows[chartRows.length - 1][xField]), pad.left + plotW, height - 10);
  }
}

function renderCharts(data) {
  drawBarChart("profile-chart", data.summary.profile, "depth", "count", "#007f89", {
    metric: "depth",
    chartLabel: t("chartProfile"),
    selectedValue: state.treeHighlightMode === "depth_eq" ? Number.parseInt(state.treeHighlightValue, 10) : null,
  });
  drawBarChart("degree-chart", data.summary.degree_distribution, "value", "count", "#2457a6", {
    metric: "degree",
    chartLabel: t("chartDegree"),
    selectedValue: state.treeHighlightMode === "degree_eq" ? Number.parseInt(state.treeHighlightValue, 10) : null,
  });
  drawBarChart("depth-chart", data.summary.subtree_size_top_counts || [], "value", "count", "#2f8c58", {
    metric: "subtree_size",
    chartLabel: t("chartSubtreeTopCounts"),
    selectedValue: state.treeHighlightMode === "subtree_eq" ? Number.parseInt(state.treeHighlightValue, 10) : null,
  });
}

function handleTreeDistributionClick(event, canvasId) {
  if (!state.lastSample?.nodes) return;
  const bars = state.treeChartBars[canvasId] || [];
  if (!bars.length) return;
  const rect = el(canvasId).getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const candidates = bars.filter((item) => (
    x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height
  ));
  const bar = candidates.sort((a, b) => Math.abs((a.x + a.width / 2) - x) - Math.abs((b.x + b.width / 2) - x))[0];
  if (!bar) return;
  const modeByMetric = {
    depth: "depth_eq",
    degree: "degree_eq",
    subtree_size: "subtree_eq",
  };
  const mode = modeByMetric[bar.metric];
  if (!mode) return;
  el("tree-highlight-mode").value = mode;
  el("tree-highlight-value").value = bar.value;
  applyTreeHighlight(mode, bar.value, { status: false });
  setStatusMessage("statusTreeChartLinked", {
    chart: bar.chartLabel,
    value: fmt.format(bar.value),
    count: fmt.format(state.treeHighlightSet?.size || 0),
  });
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    state.history = Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === "object" && entry.id && entry.type && entry.params && entry.result).slice(0, HISTORY_LIMIT)
      : [];
  } catch {
    state.history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(0, HISTORY_LIMIT)));
  } catch {
    // History is a convenience feature; ignore storage quota/privacy failures.
  }
}

function historyTimeLabel(timestamp) {
  return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function buildSampleHistoryEntry(data) {
  const offsets = data.height_offsets || {};
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "sample",
    timestamp: Date.now(),
    params: {
      model: data.parameters.model || "ewens",
      model_label: data.parameters.model_label || "Ewens recursive",
      theta: data.parameters.theta,
      n: data.parameters.n,
      seed: data.parameters.seed,
      draw_limit: data.parameters.draw_limit,
    },
    result: {
      height: data.summary.height,
      root_degree: data.summary.root_degree,
      leaves: data.summary.leaves,
      offset: offsets.height_minus_second_order,
      total_ms: data.timing?.total_ms,
      drawable: data.drawable,
    },
  };
}

function buildSimulationHistoryEntry(data) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "simulation",
    timestamp: Date.now(),
    params: data.parameters,
    result: {
      mean: data.stats.mean,
      std: data.stats.std,
      median: data.stats.median,
      min: data.stats.min,
      max: data.stats.max,
      total_ms: data.timing?.total_ms,
    },
  };
}

function buildScanHistoryEntry(data) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "scan",
    timestamp: Date.now(),
    params: data.parameters,
    result: {
      groups: data.groups.length,
      rows: data.rows.length,
      mean_offset_range: data.groups
        .map((group) => group.mean_offset_second_order)
        .filter((value) => value != null),
      total_ms: data.timing?.total_ms,
    },
  };
}

function addHistoryEntry(entry) {
  state.history = [entry, ...state.history.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
  saveHistory();
  renderHistory();
}

function historyTypeLabel(type) {
  if (type === "simulation") return t("simulationType");
  if (type === "scan") return t("scanType");
  return t("sampleType");
}

function historyMain(entry) {
  if (entry.type === "simulation") {
    return t("historySimulationMain", {
      theta: fmt.format(Number(entry.params.theta) || 0),
      n: compact.format(Number(entry.params.n) || 0),
      samples: entry.params.samples ?? "-",
    });
  }
  if (entry.type === "scan") {
    return t("historyScanMain", {
      groups: entry.result.groups,
      rows: entry.result.rows,
    });
  }
  return t("historySampleMain", {
    theta: fmt.format(Number(entry.params.theta) || 0),
    n: compact.format(Number(entry.params.n) || 0),
    height: fmt.format(Number(entry.result.height) || 0),
  });
}

function historyMeta(entry) {
  const seed = entry.params.seed == null ? t("historyNoSeed") : t("historySeed", { seed: escapeHtml(entry.params.seed) });
  const model = entry.params.model_label || entry.params.model || "Ewens recursive";
  if (entry.type === "scan") {
    const thetaValues = (entry.params.theta_values || []).map((value) => escapeHtml(fmt.format(Number(value) || 0))).join(", ");
    const nValues = (entry.params.n_values || []).map((value) => escapeHtml(compact.format(Number(value) || 0))).join(", ");
    return `theta: ${thetaValues}<br>n: ${nValues}; ${escapeHtml(seed)}`;
  }
  return `${escapeHtml(t("historyModel", { model }))}; ${escapeHtml(seed)}; ${escapeHtml(t("historyTime", { ms: fmt.format(Number(entry.result.total_ms) || 0) }))}`;
}

function historyStats(entry) {
  if (entry.type === "simulation") {
    return `${t("historyMean")} ${fmt.format(Number(entry.result.mean) || 0)}, ${t("historyStd")} ${fmt.format(Number(entry.result.std) || 0)}, ${t("historyMedian")} ${fmt.format(Number(entry.result.median) || 0)}`;
  }
  if (entry.type === "scan") {
    const offsets = entry.result.mean_offset_range || [];
    if (!offsets.length) return t("historyTime", { ms: fmt.format(Number(entry.result.total_ms) || 0) });
    return `${t("historyOffset")} ${fmt.format(Math.min(...offsets))} ... ${fmt.format(Math.max(...offsets))}; ${t("historyTime", { ms: fmt.format(Number(entry.result.total_ms) || 0) })}`;
  }
  const offset = entry.result.offset == null ? "-" : fmt.format(Number(entry.result.offset) || 0);
  return `${t("historyOffset")} ${offset}; ${t("historyLeaves")} ${compact.format(Number(entry.result.leaves) || 0)}; ${entry.result.drawable ? t("historyDrawn") : t("historyDataOnly")}`;
}

function renderHistory() {
  const list = el("history-list");
  const note = el("history-note");
  note.textContent = state.history.length ? t("historyCount", { count: state.history.length }) : t("historyEmpty");
  if (!state.history.length) {
    list.innerHTML = `<div class="history-empty">${t("historyEmpty")}</div>`;
    return;
  }
  list.innerHTML = state.history
    .map(
      (entry) => `<article class="history-item">
        <div class="history-item-header">
          <span class="history-type">${escapeHtml(historyTypeLabel(entry.type))}</span>
          <span class="history-time">${escapeHtml(historyTimeLabel(entry.timestamp))}</span>
        </div>
        <div class="history-main" title="${escapeHtml(historyMain(entry))}">${escapeHtml(historyMain(entry))}</div>
        <div class="history-meta">${historyMeta(entry)}</div>
        <div class="history-stats">${escapeHtml(historyStats(entry))}</div>
        <button type="button" data-history-use="${escapeHtml(entry.id)}">${escapeHtml(t("useHistoryParams"))}</button>
      </article>`,
    )
    .join("");
}

function useHistoryParams(id) {
  const entry = state.history.find((item) => item.id === id);
  if (!entry) return;
  if (entry.type === "scan") {
    el("scan-theta-values").value = entry.params.theta_values.join(",");
    el("scan-n-values").value = entry.params.n_values.join(",");
    el("scan-samples").value = entry.params.samples;
    const models = entry.params.models || ["ewens"];
    for (const input of document.querySelectorAll('input[name="scan-model"]')) {
      input.checked = models.includes(input.value);
    }
    if (entry.params.seed != null) el("seed").value = entry.params.seed;
    return;
  }
  el("theta").value = entry.params.theta;
  el("n").value = entry.params.n;
  if (entry.params.model) {
    el("model").value = entry.params.model;
    updateModelControls();
  }
  if (entry.params.seed != null) el("seed").value = entry.params.seed;
  if (entry.type === "sample" && entry.params.draw_limit != null) el("draw-limit").value = entry.params.draw_limit;
  if (entry.type === "simulation" && entry.params.samples != null) el("samples").value = entry.params.samples;
}

function clearHistory() {
  state.history = [];
  saveHistory();
  renderHistory();
}

function currentExperimentControls() {
  return {
    sample: {
      model: selectedModel(),
      theta: numberValue("theta"),
      n: intOrNull("n"),
      seed: intOrNull("seed"),
      draw_limit: intOrNull("draw-limit"),
    },
    simulation: {
      samples: intOrNull("samples"),
    },
    scan: {
      models: selectedScanModels(),
      theta_values: parseNumberList(el("scan-theta-values").value, Number),
      n_values: parseNumberList(el("scan-n-values").value, (value) => Number.parseInt(value, 10)),
      samples: intOrNull("scan-samples"),
    },
    small_n: {
      n: intOrNull("smalln-n"),
      theta: numberValue("smalln-theta"),
      sort: state.smallNSort,
      selected_rank: state.smallNSelectedRank,
      shape_filter: state.smallNShapeFilter,
      metric_filter: state.smallNMetricFilter,
      distribution_metric: state.smallNDistributionMetric,
      distribution_model: state.smallNDistributionModel,
      top_k_target: state.smallNTopKTarget,
      top_k_model: state.smallNTopKModel,
      top_k_value: state.smallNTopKValue,
      diff_target: state.smallNDiffTarget,
      diff_model_a: state.smallNDiffModelA,
      diff_model_b: state.smallNDiffModelB,
    },
  };
}

function exportExperimentBundle() {
  let controls = {};
  try {
    controls = currentExperimentControls();
  } catch (error) {
    setStatusMessage("error", { message: error.message });
    return;
  }
  const bundle = {
    schema: "ewens-tree-lab-bundle-v1",
    exported_at: new Date().toISOString(),
    controls,
    limits: state.limits,
    results: {
      sample: state.lastSample,
      simulation: state.lastSimulation,
      scan: state.lastScan,
      small_n: state.lastSmallN,
    },
    history: state.history,
  };
  download("ewens-tree-lab-bundle.json", JSON.stringify(bundle, null, 2), "application/json");
}

function exportHistory() {
  download("ewens-experiment-history.json", JSON.stringify(state.history, null, 2), "application/json");
}

function renderTable(data) {
  const details = el("node-data-details");
  if (!data.nodes) {
    el("node-data-id").value = "";
    el("node-data-id").max = 0;
    details.innerHTML = `<div class="node-data-empty">${escapeHtml(t("nodeDataUnavailable"))}</div>`;
    el("table-note").textContent = t("tableNoNodes");
    return;
  }
  el("node-data-id").max = Math.max(0, data.nodes.length - 1);
  el("table-note").textContent = t("nodeDataCount", { count: fmt.format(data.nodes.length) });
  const selected = state.selectedNodeId != null ? state.selectedNodeId : 0;
  showNodeDataById(selected, { silent: true });
}

function showNodeDataById(rawId = el("node-data-id").value, options = {}) {
  const details = el("node-data-details");
  const nodes = state.lastSample?.nodes;
  if (!nodes) {
    details.innerHTML = `<div class="node-data-empty">${escapeHtml(t("nodeDataUnavailable"))}</div>`;
    return null;
  }
  const max = nodes.length - 1;
  const nodeId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId > max) {
    details.innerHTML = `<div class="node-data-empty">${escapeHtml(t("nodeDataOutOfRange", { max }))}</div>`;
    if (!options.silent) setStatusMessage("statusNodeInvalid", { max });
    return null;
  }
  const node = nodes[nodeId];
  el("node-data-id").value = nodeId;
  const parentLabel = node.parent < 0 ? t("valueRoot") : node.parent;
  const render = ensureTreeRender();
  const stats = render ? computeSubtreeStats(render, nodeId) : null;
  const offset = state.lastSample?.centering?.second_order == null
    ? "-"
    : fmt.format(node.depth - state.lastSample.centering.second_order);
  details.innerHTML = `
    <div class="node-data-grid">
      ${metric(t("nodeFieldId"), fmt.format(node.id))}
      ${metric(t("nodeFieldParent"), parentLabel)}
      ${metric(t("nodeFieldDepth"), fmt.format(node.depth))}
      ${metric(t("nodeFieldDepthReference"), offset)}
      ${metric(t("nodeFieldSubtreeSize"), compact.format(node.subtree_size))}
      ${metric(t("nodeFieldDegree"), fmt.format(node.degree))}
      ${metric(t("nodeFieldLongestPath"), node.on_longest_path ? t("valueYes") : t("valueNo"))}
      ${metric(t("nodeFieldSubtreeHeight"), fmt.format(stats?.height ?? 0))}
      ${metric(t("nodeFieldSubtreeLeaves"), fmt.format(stats?.leaves ?? 0))}
      ${metric(t("nodeFieldSubtreeMaxDegree"), fmt.format(stats?.maxDegree ?? 0))}
      ${metric(t("nodeFieldSubtreeAvgDepth"), fmt.format(stats?.avgDepth ?? 0))}
    </div>
    <div class="node-data-path">${escapeHtml(t("nodeFieldPathToRoot"))}: ${escapeHtml(pathToRoot(nodes, node.id).join(" -> "))}</div>
  `;
  return node;
}

function drawSimulation(sim) {
  const canvas = el("simulation-canvas");
  if (!sim) {
    const { ctx, width, height } = fitCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    state.treeChartBars["simulation-canvas"] = [];
    ctx.fillStyle = "#6b7785";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("simulationChartEmpty"), width / 2, height / 2);
    return;
  }
  const rows = [];
  const counts = new Map();
  for (const h of sim.heights) counts.set(h, (counts.get(h) || 0) + 1);
  for (const value of [...counts.keys()].sort((a, b) => a - b)) rows.push({ value, count: counts.get(value) });
  drawBarChart("simulation-canvas", rows, "value", "count", "#c43c65");
}

function scanMetricValue(group, metricName = state.scanMetric) {
  if (metricName === "height") return group.mean_height;
  if (metricName === "std") return group.std_height;
  if (metricName === "elapsed") return group.mean_elapsed_ms;
  return group.mean_offset_second_order ?? group.mean_height;
}

function scanMetricRange(group, metricName = state.scanMetric) {
  if (metricName === "height") return [group.q25_height, group.q75_height];
  if (metricName === "offset") return [group.q25_offset_second_order, group.q75_offset_second_order];
  return [null, null];
}

function scanYAxisLabel(metricName = state.scanMetric) {
  if (metricName === "height") return t("scanChartYAxisHeight");
  if (metricName === "std") return t("scanChartYAxisStd");
  if (metricName === "elapsed") return t("scanChartYAxisElapsed");
  return t("scanChartYAxis");
}

function drawLineChart(canvasId, groups) {
  const canvas = el(canvasId);
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  if (!groups?.length) {
    ctx.fillStyle = "#6b7785";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("scanEmptyChart"), width / 2, height / 2);
    return;
  }
  const pad = { left: 58, right: 18, top: 22, bottom: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const rows = groups.map((group) => ({
    ...group,
    x: Math.log(group.n),
    y: scanMetricValue(group),
    range: scanMetricRange(group),
  }));
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.model || "ewens"}:${row.theta}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  for (const series of grouped.values()) series.sort((a, b) => a.n - b.n);
  const xs = rows.map((row) => row.x);
  const ys = rows.flatMap((row) => [
    row.y,
    ...(row.range || []).filter((value) => value != null),
  ]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const xFor = (x) => pad.left + (rows.length === 1 ? plotW / 2 : ((x - minX) / spanX) * plotW);
  const yFor = (y) => pad.top + plotH - ((y - minY) / spanY) * plotH;
  const palette = ["#007f89", "#c43c65", "#2457a6", "#2f8c58", "#8a5a00", "#6c4bb5", "#a33f2a"];

  ctx.strokeStyle = "#dce3e8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  [...grouped.entries()].forEach(([, series], seriesIndex) => {
    const firstRow = series[0] || {};
    const label = `${firstRow.model_label || modelLabel(firstRow.model || "ewens")} theta ${fmt.format(Number(firstRow.theta))}`;
    const color = palette[seriesIndex % palette.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((row, index) => {
      const x = xFor(row.x);
      const y = yFor(row.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    for (const row of series) {
      const x = xFor(row.x);
      const y = yFor(row.y);
      const [rangeLow, rangeHigh] = row.range || [];
      if (rangeLow != null && rangeHigh != null) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yFor(rangeLow));
        ctx.lineTo(x, yFor(rangeHigh));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 4, yFor(rangeLow));
        ctx.lineTo(x + 4, yFor(rangeLow));
        ctx.moveTo(x - 4, yFor(rangeHigh));
        ctx.lineTo(x + 4, yFor(rangeHigh));
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const legendX = pad.left + 6 + (seriesIndex % 3) * 172;
    const legendY = pad.top - 8 + Math.floor(seriesIndex / 3) * 16;
    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY - 7, 10, 2);
    ctx.fillStyle = "#46535f";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, legendX + 14, legendY - 3);
  });

  ctx.fillStyle = "#6b7785";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(fmt.format(maxY), pad.left - 6, pad.top + 4);
  ctx.fillText(fmt.format(minY), pad.left - 6, pad.top + plotH);
  ctx.textAlign = "center";
  ctx.fillText(t("scanChartXAxis"), pad.left + plotW / 2, height - 12);
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(scanYAxisLabel(), 0, 0);
  ctx.restore();
  ctx.textAlign = "left";
  ctx.fillText(`n ${compact.format(Math.exp(minX))}`, pad.left, height - 28);
  ctx.textAlign = "right";
  ctx.fillText(`n ${compact.format(Math.exp(maxX))}`, pad.left + plotW, height - 28);
}

function parseNumberList(raw, parser = Number) {
  const values = raw
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parser);
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error(t("invalidList"));
  }
  return values;
}

function scanAnalysisCard(label, value) {
  return `<div class="scan-analysis-card"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`;
}

function renderScanAnalysis(scan) {
  const target = el("scan-analysis");
  if (!scan?.groups?.length) {
    target.innerHTML = "";
    return;
  }
  const offsets = scan.groups
    .map((group) => group.mean_offset_second_order)
    .filter((value) => value != null);
  const closest = scan.groups
    .filter((group) => group.mean_offset_second_order != null)
    .sort((a, b) => Math.abs(a.mean_offset_second_order) - Math.abs(b.mean_offset_second_order))[0];
  const fastest = [...scan.groups].sort((a, b) => a.mean_elapsed_ms - b.mean_elapsed_ms)[0];
  const offsetRange = offsets.length
    ? `${fmt.format(Math.min(...offsets))} ... ${fmt.format(Math.max(...offsets))}`
    : "-";
  const closestLabel = closest
    ? `${closest.model_label || modelLabel(closest.model)}, theta ${fmt.format(closest.theta)}, n ${compact.format(closest.n)}`
    : "-";
  const fastestLabel = fastest
    ? `${fastest.model_label || modelLabel(fastest.model)}, theta ${fmt.format(fastest.theta)}, n ${compact.format(fastest.n)} (${fmt.format(fastest.mean_elapsed_ms)} ms)`
    : "-";
  target.innerHTML = [
    scanAnalysisCard(t("scanSummaryGroups"), fmt.format(scan.groups.length)),
    scanAnalysisCard(t("scanSummaryRows"), fmt.format(scan.rows.length)),
    scanAnalysisCard(t("scanSummaryOffsetRange"), offsetRange),
    scanAnalysisCard(t("scanSummaryClosest"), closestLabel),
    scanAnalysisCard(t("scanSummaryFastest"), fastestLabel),
  ].join("");
}

function renderScan(scan) {
  state.lastScan = scan;
  renderScanAnalysis(scan);
  drawLineChart("scan-chart", scan.groups);
  el("scan-note").textContent = t("scanNoteDone", {
    groups: scan.groups.length,
    rows: scan.rows.length,
    ms: fmt.format(scan.timing.total_ms),
  });
  el("scan-group-table").innerHTML = scan.groups
    .map(
      (group) => `<tr>
        <td>${escapeHtml(group.model_label || modelLabel(group.model))}</td>
        <td>${fmt.format(group.theta)}</td>
        <td>${fmt.format(group.n)}</td>
        <td>${group.samples}</td>
        <td>${fmt.format(group.mean_height)}</td>
        <td>${fmt.format(group.std_height)}</td>
        <td>${group.mean_offset_second_order == null ? "-" : fmt.format(group.mean_offset_second_order)}</td>
        <td>${group.q25_offset_second_order == null ? "-" : `${fmt.format(group.q25_offset_second_order)} ... ${fmt.format(group.q75_offset_second_order)}`}</td>
        <td>${fmt.format(group.mean_elapsed_ms)}</td>
        <td>${fmt.format(group.total_elapsed_ms)}</td>
      </tr>`,
    )
    .join("");
  el("scan-row-table").innerHTML = scan.rows
    .slice(0, 800)
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.model_label || modelLabel(row.model))}</td>
        <td>${fmt.format(row.theta)}</td>
        <td>${fmt.format(row.n)}</td>
        <td>${row.sample_index}</td>
        <td>${row.seed}</td>
        <td>${row.height}</td>
        <td>${row.height_minus_second_order == null ? "-" : fmt.format(row.height_minus_second_order)}</td>
        <td>${fmt.format(row.elapsed_ms)}</td>
      </tr>`,
    )
    .join("");
}

function setActiveTab(targetId) {
  for (const view of document.querySelectorAll(".tab-view")) {
    view.classList.toggle("active", view.id === targetId);
  }
  for (const button of document.querySelectorAll("[data-tab-target]")) {
    button.classList.toggle("active", button.dataset.tabTarget === targetId);
  }
  if (targetId === "smalln-view" && !state.lastSmallN) runSmallNExplorer();
}

function smallNCard(label, value) {
  return `<div class="scan-analysis-card"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`;
}

function smallNProbabilityCell(row, model) {
  const fraction = row.probability_fractions?.[model] ?? "-";
  const decimal = row.probabilities?.[model];
  return `<td class="probability-cell">
    <span class="probability-fraction">${escapeHtml(fraction)}</span>
    <span class="probability-decimal">${decimal == null ? "-" : fmt.format(decimal)}</span>
  </td>`;
}

function smallNProbabilityDetail(row, model) {
  const fraction = row.probability_fractions?.[model] ?? "-";
  const decimal = row.probabilities?.[model];
  return `<span class="smalln-preview-probability">
    <strong>${escapeHtml(modelLabel(model))}</strong>
    <span class="probability-fraction">${escapeHtml(fraction)}</span>
    <span class="probability-decimal">${decimal == null ? "-" : fmt.format(decimal)}</span>
  </span>`;
}

function smallNComparisonCell(row, key) {
  const comparison = row.probability_comparisons?.[key];
  return `<td class="probability-cell">${comparison ? `<span class="probability-fraction">${escapeHtml(comparison.fraction)}</span><span class="probability-decimal">${fmt.format(comparison.value)}</span>` : "-"}</td>`;
}

function smallNFilteredRows() {
  const data = state.lastSmallN;
  if (!data) return [];
  const heightFilter = intOrNull("smalln-filter-height");
  const rootDegreeFilter = intOrNull("smalln-filter-root-degree");
  const metricFilter = state.smallNMetricFilter;
  const rows = data.rows.filter((row) => {
    if (heightFilter != null && row.height !== heightFilter) return false;
    if (rootDegreeFilter != null && row.root_degree !== rootDegreeFilter) return false;
    if (state.smallNShapeFilter && row.shape_signature !== state.smallNShapeFilter) return false;
    if (metricFilter && row[metricFilter.metric] !== metricFilter.value) return false;
    return true;
  });
  const sortKey = state.smallNSort || "rank";
  const probabilitySort = {
    ewens_desc: "ewens",
    uniform_desc: "uniform_recursive",
    plancherel_desc: "plancherel_recursive",
  }[sortKey];
  const comparisonSort = {
    ewens_uniform_desc: "ewens_over_uniform",
    plancherel_uniform_desc: "plancherel_over_uniform",
    plancherel_minus_ewens_desc: "plancherel_minus_ewens",
  }[sortKey];
  return rows.sort((a, b) => {
    if (probabilitySort) {
      return (b.probabilities?.[probabilitySort] ?? 0) - (a.probabilities?.[probabilitySort] ?? 0) || a.rank - b.rank;
    }
    if (comparisonSort) {
      return (b.probability_comparisons?.[comparisonSort]?.value ?? 0) - (a.probability_comparisons?.[comparisonSort]?.value ?? 0) || a.rank - b.rank;
    }
    if (sortKey === "height_desc") return b.height - a.height || a.rank - b.rank;
    if (sortKey === "height_asc") return a.height - b.height || a.rank - b.rank;
    if (sortKey === "leaves_desc") return b.leaves - a.leaves || a.rank - b.rank;
    if (sortKey === "root_degree_desc") return b.root_degree - a.root_degree || a.rank - b.rank;
    return a.rank - b.rank;
  });
}

function smallNActiveFilterText() {
  const filters = [];
  const heightFilter = intOrNull("smalln-filter-height");
  const rootDegreeFilter = intOrNull("smalln-filter-root-degree");
  if (heightFilter != null) filters.push(`${smallNMetricLabel("height")}=${heightFilter}`);
  if (rootDegreeFilter != null) filters.push(`${smallNMetricLabel("root_degree")}=${rootDegreeFilter}`);
  if (state.smallNShapeFilter) filters.push(t("smallNShapeFilter"));
  if (state.smallNMetricFilter) filters.push(`${smallNMetricLabel(state.smallNMetricFilter.metric)}=${state.smallNMetricFilter.value}`);
  return filters.join("; ");
}

function smallNMetricLabel(metric) {
  return {
    height: t("metricHeight"),
    leaves: t("metricLeaves"),
    root_degree: t("metricRootDegree"),
    max_degree: t("metricMaxDegree"),
  }[metric] || metric;
}

function normalizeSmallNParentCode(value, n) {
  const cleaned = String(value || "").replaceAll(/[\[\]()]/g, " ").trim();
  if (!cleaned || cleaned.toLowerCase() === "root") return n === 1 ? "" : null;
  let parents = cleaned
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((part) => Number(part));
  if (parents.length === n && parents[0] === -1) parents = parents.slice(1);
  if (parents.length !== Math.max(0, n - 1)) return null;
  for (let index = 0; index < parents.length; index += 1) {
    const parent = parents[index];
    const node = index + 1;
    if (!Number.isInteger(parent) || parent < 0 || parent >= node) return null;
  }
  return parents.join(",");
}

function normalizeSmallNRootPartition(value) {
  const parts = String(value || "")
    .replaceAll(/[\[\]()]/g, " ")
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isInteger(part) || part <= 0)) return null;
  return parts.sort((a, b) => b - a).join(",");
}

function scrollSmallNSelectedIntoView() {
  const row = document.querySelector(`#smalln-table tr[data-smalln-rank="${state.smallNSelectedRank}"]`);
  row?.scrollIntoView({ block: "center", inline: "nearest" });
}

function resetSmallNVisibleLimit() {
  state.smallNVisibleLimit = SMALL_N_TABLE_CHUNK_SIZE;
}

function smallNVisibleLimit(rowCount) {
  return Math.min(rowCount, Math.max(SMALL_N_TABLE_CHUNK_SIZE, state.smallNVisibleLimit || SMALL_N_TABLE_CHUNK_SIZE));
}

function smallNTreeRowHtml(row) {
  return `<tr data-smalln-rank="${row.rank}" class="${row.rank === state.smallNSelectedRank ? "selected" : ""}">
    <td>${row.rank}</td>
    <td>${escapeHtml(row.code || t("valueRoot"))}</td>
    <td>${row.height}</td>
    <td>${row.root_degree}</td>
    <td>${row.leaves}</td>
    ${smallNProbabilityCell(row, "ewens")}
    ${smallNProbabilityCell(row, "uniform_recursive")}
    ${smallNProbabilityCell(row, "plancherel_recursive")}
    ${smallNComparisonCell(row, "ewens_over_uniform")}
    ${smallNComparisonCell(row, "plancherel_over_uniform")}
    ${smallNComparisonCell(row, "plancherel_minus_ewens")}
    <td>${escapeHtml(row.root_partition.join(","))}</td>
  </tr>`;
}

function renderSmallNTableControls(filteredCount, shownCount) {
  const fullyRendered = filteredCount <= SMALL_N_TABLE_CHUNK_SIZE || shownCount >= filteredCount;
  el("smalln-table-status").textContent = t("smallNTableStatus", {
    shown: fmt.format(shownCount),
    filtered: fmt.format(filteredCount),
  });
  el("smalln-load-more").disabled = fullyRendered;
  el("smalln-show-all").disabled = fullyRendered;
}

function refreshSmallNTableControlState() {
  if (!state.lastSmallN) return;
  const filteredCount = smallNFilteredRows().length;
  const shownCount = document.querySelectorAll("#smalln-table tr").length;
  renderSmallNTableControls(filteredCount, shownCount);
}

function renderSmallNTable() {
  const data = state.lastSmallN;
  if (!data) return;
  const rows = smallNFilteredRows();
  let selectedRow = rows.find((row) => row.rank === state.smallNSelectedRank) || null;
  if (rows.length && !selectedRow) {
    state.smallNSelectedRank = rows[0].rank;
    selectedRow = rows[0];
  }
  if (!rows.length) state.smallNSelectedRank = null;
  const visibleLimit = smallNVisibleLimit(rows.length);
  let visibleRows = rows.slice(0, visibleLimit);
  if (selectedRow && !visibleRows.some((row) => row.rank === selectedRow.rank)) {
    visibleRows = [selectedRow, ...visibleRows.slice(0, Math.max(0, visibleLimit - 1))];
  }
  const activeFilterText = smallNActiveFilterText();
  el("smalln-preview-note").textContent = t("smallNShown", {
    shown: fmt.format(visibleRows.length),
    filtered: fmt.format(rows.length),
    total: fmt.format(data.rows.length),
  }) + (activeFilterText ? `; ${t("smallNActiveFilters", { filters: activeFilterText })}` : "");
  el("smalln-table").innerHTML = visibleRows.map(smallNTreeRowHtml).join("");
  renderSmallNTableControls(rows.length, visibleRows.length);
  renderSmallNCurrentPreview(selectedRow);
  renderSmallNShapeGroups();
}

function selectedSmallNRow() {
  return state.smallNRowsByRank.get(state.smallNSelectedRank) || null;
}

function renderSmallNShapeGroups() {
  const data = state.lastSmallN;
  if (!data) return;
  const selectedShape = state.smallNShapeFilter || selectedSmallNRow()?.shape_signature || null;
  const groups = data.shape_groups || [];
  el("smalln-shape-note").textContent = t("smallNShapeNote", { groups: fmt.format(groups.length) });
  el("smalln-shape-table").innerHTML = groups
    .map((group) => `<tr data-smalln-shape-rank="${group.representative_rank}" data-smalln-shape-signature="${escapeHtml(group.shape_signature)}" class="${group.shape_signature === selectedShape ? "selected" : ""}">
      <td><span class="shape-signature" title="${escapeHtml(group.shape_signature)}">${escapeHtml(group.shape_signature)}</span></td>
      <td>${fmt.format(group.count)}</td>
      <td>${fmt.format(group.representative_rank)}</td>
      <td>${group.height_min === group.height_max ? fmt.format(group.height_min) : `${fmt.format(group.height_min)}-${fmt.format(group.height_max)}`}</td>
      ${smallNProbabilityCell(group, "ewens")}
      ${smallNProbabilityCell(group, "uniform_recursive")}
      ${smallNProbabilityCell(group, "plancherel_recursive")}
      ${smallNComparisonCell(group, "ewens_over_uniform")}
      ${smallNComparisonCell(group, "plancherel_over_uniform")}
      ${smallNComparisonCell(group, "plancherel_minus_ewens")}
    </tr>`)
    .join("");
}

function drawSmallNDistribution() {
  const canvas = el("smalln-distribution-canvas");
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const data = state.lastSmallN;
  const metric = state.smallNDistributionMetric || "height";
  const model = state.smallNDistributionModel || "uniform_recursive";
  const rows = data?.distributions?.[metric] || [];
  if (!rows.length) {
    state.smallNDistributionBars = [];
    ctx.fillStyle = "#6b7785";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("scanEmptyChart"), width / 2, height / 2);
    return;
  }
  const values = rows.map((row) => (model === "count" ? row.count : row.probabilities?.[model] ?? 0));
  const maxY = Math.max(...values, 1e-12);
  const pad = { top: 18, right: 14, bottom: 36, left: 42 };
  const plotW = Math.max(1, width - pad.left - pad.right);
  const plotH = Math.max(1, height - pad.top - pad.bottom);
  ctx.strokeStyle = "#d7e0e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
  const gap = Math.min(6, plotW / Math.max(1, rows.length) * 0.18);
  const slotW = plotW / rows.length;
  const barW = Math.max(4, slotW - gap);
  state.smallNDistributionBars = [];
  rows.forEach((row, index) => {
    const value = model === "count" ? row.count : row.probabilities?.[model] ?? 0;
    const barH = (value / maxY) * plotH;
    const slotX = pad.left + index * slotW;
    const x = slotX + gap / 2;
    const y = pad.top + plotH - barH;
    ctx.fillStyle = model === "count" ? "#46535f" : model === "ewens" ? "#007f89" : model === "plancherel_recursive" ? "#c43c65" : "#2457a6";
    ctx.fillRect(x, y, barW, barH);
    state.smallNDistributionBars.push({
      x: slotX,
      y: pad.top,
      width: slotW,
      height: plotH,
      value: row.value,
      metric,
      barX: x,
      barY: y,
      barWidth: barW,
      barHeight: barH,
    });
    if (state.smallNMetricFilter?.metric === metric && state.smallNMetricFilter?.value === row.value) {
      ctx.strokeStyle = "#17202a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barW, barH);
    }
  });
  ctx.fillStyle = "#46535f";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(model === "count" ? fmt.format(maxY) : fmt.format(maxY), pad.left - 6, pad.top + 4);
  ctx.fillText("0", pad.left - 6, pad.top + plotH);
  ctx.textAlign = "center";
  const first = rows[0]?.value;
  const last = rows[rows.length - 1]?.value;
  ctx.fillText(String(first), pad.left, height - 12);
  ctx.fillText(String(last), pad.left + plotW, height - 12);
  ctx.fillText(t(`metric${metric.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}`) || metric, pad.left + plotW / 2, height - 12);
}

function parseFractionLabel(value) {
  const text = String(value || "0");
  if (!text.includes("/")) return { numerator: BigInt(text || "0"), denominator: 1n };
  const [numerator, denominator] = text.split("/");
  return { numerator: BigInt(numerator), denominator: BigInt(denominator) };
}

function gcdBigInt(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1n;
}

function addFractions(left, right) {
  const numerator = left.numerator * right.denominator + right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = gcdBigInt(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function subtractFractions(left, right) {
  const numerator = left.numerator * right.denominator - right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = gcdBigInt(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function fractionToLabel(value) {
  return value.denominator === 1n ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
}

function fractionToNumber(value) {
  return Number(value.numerator) / Number(value.denominator);
}

function renderSmallNTopK() {
  const data = state.lastSmallN;
  if (!data) return;
  const target = state.smallNTopKTarget || "shape";
  const model = state.smallNTopKModel || "uniform_recursive";
  const k = Number(state.smallNTopKValue) || 10;
  const source = target === "tree" ? data.rows : data.shape_groups || [];
  const rows = [...source]
    .sort((a, b) => (b.probabilities?.[model] ?? 0) - (a.probabilities?.[model] ?? 0) || (a.rank ?? a.representative_rank) - (b.rank ?? b.representative_rank))
    .slice(0, k);
  let cumulative = { numerator: 0n, denominator: 1n };
  const body = rows.map((row, index) => {
    cumulative = addFractions(cumulative, parseFractionLabel(row.probability_fractions?.[model]));
    const cumulativeLabel = fractionToLabel(cumulative);
    const item = target === "tree"
      ? `#${row.rank}; ${row.code || "root"}`
      : `${row.shape_signature} (#${row.representative_rank})`;
    const rankAttr = target === "tree" ? `data-smalln-rank="${row.rank}"` : `data-smalln-shape-signature="${escapeHtml(row.shape_signature)}" data-smalln-shape-rank="${row.representative_rank}"`;
    return `<tr ${rankAttr}>
      <td>${index + 1}</td>
      <td><span class="shape-signature" title="${escapeHtml(item)}">${escapeHtml(item)}</span></td>
      <td class="probability-cell"><span class="probability-fraction">${escapeHtml(row.probability_fractions?.[model] ?? "-")}</span><span class="probability-decimal">${fmt.format(row.probabilities?.[model] ?? 0)}</span></td>
      <td class="probability-cell"><span class="probability-fraction">${escapeHtml(cumulativeLabel)}</span><span class="probability-decimal">${fmt.format(fractionToNumber(cumulative))}</span></td>
    </tr>`;
  });
  const summaryFraction = rows.reduce(
    (total, row) => addFractions(total, parseFractionLabel(row.probability_fractions?.[model])),
    { numerator: 0n, denominator: 1n },
  );
  el("smalln-topk-summary").textContent = t("smallNTopKSummary", {
    k: fmt.format(rows.length),
    target: target === "tree" ? t("smallNTopKTree") : t("smallNTopKShape"),
    fraction: fractionToLabel(summaryFraction),
    decimal: fmt.format(fractionToNumber(summaryFraction)),
  });
  el("smalln-topk-table").innerHTML = body.join("");
}

function renderSmallNDifference() {
  const data = state.lastSmallN;
  if (!data) return;
  const target = state.smallNDiffTarget || "shape";
  const modelA = state.smallNDiffModelA || "plancherel_recursive";
  const modelB = state.smallNDiffModelB || "ewens";
  const source = target === "tree" ? data.rows : data.shape_groups || [];
  const rows = [...source]
    .map((row) => {
      const a = parseFractionLabel(row.probability_fractions?.[modelA]);
      const b = parseFractionLabel(row.probability_fractions?.[modelB]);
      const diff = subtractFractions(a, b);
      return { row, a, b, diff, diffValue: fractionToNumber(diff) };
    })
    .sort((a, b) => Math.abs(b.diffValue) - Math.abs(a.diffValue) || (a.row.rank ?? a.row.representative_rank) - (b.row.rank ?? b.row.representative_rank))
    .slice(0, 12);
  el("smalln-diff-summary").textContent = t("smallNDiffSummary", {
    target: target === "tree" ? t("smallNTopKTree") : t("smallNTopKShape"),
    modelA: modelLabel(modelA),
    modelB: modelLabel(modelB),
  });
  el("smalln-diff-table").innerHTML = rows
    .map(({ row, diff, diffValue }, index) => {
      const item = target === "tree"
        ? `#${row.rank}; ${row.code || "root"}`
        : `${row.shape_signature} (#${row.representative_rank})`;
      const rankAttr = target === "tree" ? `data-smalln-rank="${row.rank}"` : `data-smalln-shape-signature="${escapeHtml(row.shape_signature)}" data-smalln-shape-rank="${row.representative_rank}"`;
      const direction = diffValue > 0 ? "+" : "";
      return `<tr ${rankAttr}>
        <td>${index + 1}</td>
        <td><span class="shape-signature" title="${escapeHtml(item)}">${escapeHtml(item)}</span></td>
        <td class="probability-cell"><span class="probability-fraction">${escapeHtml(row.probability_fractions?.[modelA] ?? "-")}</span><span class="probability-decimal">${fmt.format(row.probabilities?.[modelA] ?? 0)}</span></td>
        <td class="probability-cell"><span class="probability-fraction">${escapeHtml(row.probability_fractions?.[modelB] ?? "-")}</span><span class="probability-decimal">${fmt.format(row.probabilities?.[modelB] ?? 0)}</span></td>
        <td class="probability-cell"><span class="probability-fraction">${escapeHtml(`${direction}${fractionToLabel(diff)}`)}</span><span class="probability-decimal">${direction}${fmt.format(diffValue)}</span></td>
      </tr>`;
    })
    .join("");
}

function applySmallNMetricFilter(metric, value) {
  if (metric === "height") el("smalln-filter-height").value = "";
  if (metric === "root_degree") el("smalln-filter-root-degree").value = "";
  state.smallNMetricFilter = { metric, value };
  state.smallNPreviewShapeSignature = null;
  resetSmallNVisibleLimit();
  renderSmallNTable();
  drawSmallNDistribution();
  setStatusMessage("statusSmallNFilterApplied", { filter: `${smallNMetricLabel(metric)}=${value}` });
  saveSmallNState();
}

function applySmallNShapeFilter(signature, representativeRank) {
  resetSmallNFilters({ keepSearch: true });
  state.smallNShapeFilter = signature;
  state.smallNPreviewShapeSignature = signature;
  state.smallNSort = "rank";
  el("smalln-sort").value = "rank";
  state.smallNSelectedRank = Number.parseInt(representativeRank, 10);
  resetSmallNVisibleLimit();
  renderSmallNTable();
  drawSmallNDistribution();
  requestAnimationFrame(scrollSmallNSelectedIntoView);
  setStatusMessage("statusSmallNFilterApplied", { filter: t("smallNShapeFilter") });
  saveSmallNState();
}

function handleSmallNDistributionClick(event) {
  if (!state.lastSmallN) return;
  const rect = el("smalln-distribution-canvas").getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const candidates = state.smallNDistributionBars.filter((item) => (
    x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height
  ));
  const bar = candidates.sort((a, b) => Math.abs((a.x + a.width / 2) - x) - Math.abs((b.x + b.width / 2) - x))[0];
  if (!bar) return;
  applySmallNMetricFilter(bar.metric, bar.value);
}

function parentFromShapeSignature(signature) {
  const parent = [];
  let index = 0;
  function parse(parentId) {
    if (signature[index] !== "(") throw new Error("invalid shape signature");
    index += 1;
    const node = parent.length;
    parent.push(parentId);
    while (signature[index] === "(") parse(node);
    if (signature[index] !== ")") throw new Error("invalid shape signature");
    index += 1;
  }
  parse(-1);
  if (index !== signature.length) throw new Error("invalid shape signature");
  return parent;
}

function drawSmallNParentPreview(parent) {
  const canvas = el("smalln-preview-canvas");
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  if (!parent?.length) {
    ctx.fillStyle = "#6b7785";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("smallNPreviewEmpty"), width / 2, height / 2);
    return;
  }
  const n = parent.length;
  const children = Array.from({ length: n }, () => []);
  for (let node = 1; node < n; node += 1) children[parent[node]].push(node);
  for (const nodes of children) nodes.sort((a, b) => a - b);
  const depth = Array(n).fill(0);
  for (let node = 1; node < n; node += 1) depth[node] = depth[parent[node]] + 1;
  const maxDepth = Math.max(1, ...depth);
  const marginX = Math.min(42, width * 0.14);
  const marginY = Math.min(38, height * 0.14);
  const positions = Array(n);
  const leafSlots = [];
  const slotByNode = Array(n);
  function assignSlots(node) {
    if (!children[node].length) {
      const slot = leafSlots.length;
      leafSlots.push(node);
      slotByNode[node] = slot;
      return slot;
    }
    const childSlots = children[node].map(assignSlots);
    const slot = (childSlots[0] + childSlots[childSlots.length - 1]) / 2;
    slotByNode[node] = slot;
    return slot;
  }
  assignSlots(0);
  const slotCount = Math.max(1, leafSlots.length - 1);
  const xSpan = Math.max(1, width - marginX * 2);
  function slotToX(slot) {
    return leafSlots.length === 1 ? width / 2 : marginX + (slot / slotCount) * xSpan;
  }
  for (let node = 0; node < n; node += 1) {
    positions[node] = {
      x: slotToX(slotByNode[node]),
      y: height - marginY - (depth[node] / maxDepth) * Math.max(1, height - marginY * 2),
    };
  }
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#8fa1ad";
  for (let node = 1; node < n; node += 1) {
    const from = positions[parent[node]];
    const to = positions[node];
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  const radius = Math.max(8, Math.min(15, 22 - n));
  for (let node = 0; node < n; node += 1) {
    const point = positions[node];
    ctx.beginPath();
    ctx.fillStyle = node === 0 ? "#007f89" : "#ffffff";
    ctx.strokeStyle = node === 0 ? "#007f89" : "#5d6b78";
    ctx.lineWidth = node === 0 ? 1.8 : 1.2;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawSmallNPreview(row) {
  drawSmallNParentPreview(row?.parent || []);
}

function renderSmallNShapePreview(group) {
  try {
    drawSmallNParentPreview(parentFromShapeSignature(group.shape_signature));
  } catch {
    drawSmallNParentPreview([]);
  }
  el("smalln-preview-details").innerHTML = [
    `shape=${escapeHtml(group.shape_signature || "-")}`,
    `count=${fmt.format(group.count)}; representative #${fmt.format(group.representative_rank)}`,
    `height=${group.height_min === group.height_max ? fmt.format(group.height_min) : `${fmt.format(group.height_min)}-${fmt.format(group.height_max)}`}`,
    smallNProbabilityDetail(group, "ewens"),
    smallNProbabilityDetail(group, "uniform_recursive"),
    smallNProbabilityDetail(group, "plancherel_recursive"),
  ].map((line) => line.startsWith("<span") ? line : `<span>${line}</span>`).join("");
}

function renderSmallNCurrentPreview(row) {
  if (state.smallNPreviewShapeSignature) {
    const group = state.smallNGroupsBySignature.get(state.smallNPreviewShapeSignature);
    if (group) {
      renderSmallNShapePreview(group);
      return;
    }
    state.smallNPreviewShapeSignature = null;
  }
  renderSmallNPreview(row);
}

function renderSmallNPreview(row) {
  drawSmallNPreview(row);
  if (!row) {
    el("smalln-preview-details").innerHTML = `<span>${escapeHtml(t("smallNPreviewEmpty"))}</span>`;
    return;
  }
  el("smalln-preview-details").innerHTML = [
    `#${row.rank}; parent=${escapeHtml(row.code || t("valueRoot"))}`,
    `shape=${escapeHtml(row.shape_signature || "-")}`,
    `height=${fmt.format(row.height)}; root degree=${fmt.format(row.root_degree)}; leaves=${fmt.format(row.leaves)}`,
    smallNProbabilityDetail(row, "ewens"),
    smallNProbabilityDetail(row, "uniform_recursive"),
    smallNProbabilityDetail(row, "plancherel_recursive"),
  ].map((line) => line.startsWith("<span") ? line : `<span>${line}</span>`).join("");
}

function renderSmallN(data, options = {}) {
  state.lastSmallN = data;
  state.smallNRowsByRank = new Map(data.rows.map((row) => [row.rank, row]));
  state.smallNRowsByCode = new Map(data.rows.map((row) => [row.code, row]));
  state.smallNGroupsBySignature = new Map((data.shape_groups || []).map((group) => [group.shape_signature, group]));
  if (state.smallNShapeFilter && !state.smallNGroupsBySignature.has(state.smallNShapeFilter)) {
    state.smallNShapeFilter = null;
    state.smallNPreviewShapeSignature = null;
  }
  if (options.resetFilters !== false) {
    state.smallNShapeFilter = null;
    state.smallNMetricFilter = null;
    state.smallNPreviewShapeSignature = null;
  }
  resetSmallNVisibleLimit();
  const aggregate = data.aggregate || {};
  el("smalln-note").textContent = t("smallNComplete", {
    count: fmt.format(data.rows.length),
    n: data.parameters.n,
  });
  el("smalln-summary").innerHTML = [
    smallNCard(t("smallNCount"), fmt.format(data.parameters.total_trees)),
    smallNCard(t("smallNTheta"), fmt.format(data.parameters.theta)),
    smallNCard(t("smallNEwensMean"), fmt.format(aggregate.ewens?.mean_height ?? 0)),
    smallNCard(t("smallNUniformMean"), fmt.format(aggregate.uniform_recursive?.mean_height ?? 0)),
    smallNCard(t("smallNPlancherelMean"), fmt.format(aggregate.plancherel_recursive?.mean_height ?? 0)),
  ].join("");
  if (!state.smallNRowsByRank.has(state.smallNSelectedRank)) {
    state.smallNSelectedRank = data.rows[0]?.rank ?? null;
  }
  renderSmallNTable();
  drawSmallNDistribution();
  renderSmallNTopK();
  renderSmallNDifference();
  saveSmallNState();
}

async function runSmallNExplorer() {
  setStatusMessage("statusSmallNRunning");
  toggleButtons(true);
  try {
    const payload = {
      n: intOrNull("smalln-n"),
      theta: numberValue("smalln-theta"),
    };
    const data = await api("/api/small-n/recursive", { method: "POST", body: JSON.stringify(payload) });
    renderSmallN(data, { resetFilters: false });
    setStatusMessage("statusSmallNDone", { count: fmt.format(data.rows.length) });
  } catch (error) {
    setStatusMessage("error", { message: error.message });
  } finally {
    toggleButtons(false);
    refreshSmallNTableControlState();
  }
}

async function locateSmallNParentCode() {
  if (!state.lastSmallN) {
    await runSmallNExplorer();
  }
  const data = state.lastSmallN;
  if (!data) return;
  const rawValue = el("smalln-locate-code").value;
  const searchType = state.smallNSearchType || "parent_code";
  let match = null;
  let statusCode = rawValue;
  if (searchType === "rank") {
    const rank = Number.parseInt(rawValue, 10);
    match = Number.isInteger(rank) ? state.smallNRowsByRank.get(rank) : null;
    statusCode = `#${rank}`;
  } else if (searchType === "shape") {
    const signature = rawValue.trim();
    const group = state.smallNGroupsBySignature.get(signature);
    if (group) {
      applySmallNShapeFilter(signature, group.representative_rank);
      return;
    }
  } else if (searchType === "root_partition") {
    const partition = normalizeSmallNRootPartition(rawValue);
    match = partition == null ? null : data.rows.find((row) => row.root_partition.join(",") === partition);
    statusCode = partition || rawValue;
  } else {
    const code = normalizeSmallNParentCode(rawValue, data.parameters.n);
    if (code == null) {
      setStatusMessage("statusSmallNCodeInvalid", { expected: Math.max(0, data.parameters.n - 1) });
      return;
    }
    match = state.smallNRowsByCode.get(code);
    statusCode = code || "root";
  }
  if (!match) {
    setStatusMessage("statusSmallNCodeNotFound", { code: statusCode, n: data.parameters.n });
    return;
  }
  resetSmallNFilters({ keepSearch: true });
  state.smallNSort = "rank";
  el("smalln-sort").value = "rank";
  state.smallNSelectedRank = match.rank;
  renderSmallNTable();
  requestAnimationFrame(scrollSmallNSelectedIntoView);
  setStatusMessage("statusSmallNLocated", { code: statusCode, rank: fmt.format(match.rank) });
  saveSmallNState();
}

function clearSmallNFilters() {
  resetSmallNFilters({ keepSearch: true });
  renderSmallNTable();
  drawSmallNDistribution();
  setStatusMessage("statusSmallNFiltersCleared");
  saveSmallNState();
}

function clearSmallNMetricFilter(metric) {
  if (state.smallNMetricFilter?.metric === metric) {
    state.smallNMetricFilter = null;
    drawSmallNDistribution();
    saveSmallNState();
  }
}

function resetSmallNFilters(options = {}) {
  const keepSearch = options.keepSearch === true;
  if (!keepSearch) el("smalln-locate-code").value = "";
  el("smalln-filter-height").value = "";
  el("smalln-filter-root-degree").value = "";
  state.smallNShapeFilter = null;
  state.smallNMetricFilter = null;
  state.smallNPreviewShapeSignature = null;
  resetSmallNVisibleLimit();
}

function loadMoreSmallNRows(showAll = false) {
  if (!state.lastSmallN) return;
  const filteredCount = smallNFilteredRows().length;
  const currentLimit = smallNVisibleLimit(filteredCount);
  if (!showAll && (filteredCount <= SMALL_N_TABLE_CHUNK_SIZE || currentLimit >= filteredCount)) {
    renderSmallNTableControls(filteredCount, filteredCount);
    return;
  }
  state.smallNVisibleLimit = showAll
    ? filteredCount
    : Math.min(filteredCount, currentLimit + SMALL_N_TABLE_CHUNK_SIZE);
  renderSmallNTable();
}

function loadSmallNState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SMALL_N_STATE_STORAGE_KEY) || "{}");
    if (!saved || typeof saved !== "object") return;
    if (saved.n != null) el("smalln-n").value = saved.n;
    if (saved.theta != null) el("smalln-theta").value = saved.theta;
    if (saved.sort) {
      state.smallNSort = saved.sort;
      el("smalln-sort").value = saved.sort;
    }
    if (saved.searchType) {
      state.smallNSearchType = saved.searchType;
      el("smalln-search-type").value = saved.searchType;
    }
    if (saved.searchValue != null) el("smalln-locate-code").value = saved.searchValue;
    if (saved.heightFilter != null) el("smalln-filter-height").value = saved.heightFilter;
    if (saved.rootDegreeFilter != null) el("smalln-filter-root-degree").value = saved.rootDegreeFilter;
    if (saved.distributionMetric) {
      state.smallNDistributionMetric = saved.distributionMetric;
      el("smalln-dist-metric").value = saved.distributionMetric;
    }
    if (saved.distributionModel) {
      state.smallNDistributionModel = saved.distributionModel;
      el("smalln-dist-model").value = saved.distributionModel;
    }
    if (saved.topKTarget) {
      state.smallNTopKTarget = saved.topKTarget;
      el("smalln-topk-target").value = saved.topKTarget;
    }
    if (saved.topKModel) {
      state.smallNTopKModel = saved.topKModel;
      el("smalln-topk-model").value = saved.topKModel;
    }
    if (saved.topKValue) {
      state.smallNTopKValue = Number(saved.topKValue) || 10;
      el("smalln-topk-value").value = String(state.smallNTopKValue);
    }
    if (saved.diffTarget) {
      state.smallNDiffTarget = saved.diffTarget;
      el("smalln-diff-target").value = saved.diffTarget;
    }
    if (saved.diffModelA) {
      state.smallNDiffModelA = saved.diffModelA;
      el("smalln-diff-model-a").value = saved.diffModelA;
    }
    if (saved.diffModelB) {
      state.smallNDiffModelB = saved.diffModelB;
      el("smalln-diff-model-b").value = saved.diffModelB;
    }
    state.smallNShapeFilter = saved.shapeFilter || null;
    state.smallNMetricFilter = saved.metricFilter || null;
    state.smallNPreviewShapeSignature = saved.previewShapeSignature || null;
    state.smallNSelectedRank = saved.selectedRank ?? null;
    updateSmallNSearchInputMeta();
  } catch {
    // Ignore invalid saved UI state.
  }
}

function saveSmallNState() {
  try {
    localStorage.setItem(SMALL_N_STATE_STORAGE_KEY, JSON.stringify({
      n: el("smalln-n").value,
      theta: el("smalln-theta").value,
      sort: state.smallNSort,
      searchType: state.smallNSearchType,
      searchValue: el("smalln-locate-code").value,
      heightFilter: el("smalln-filter-height").value,
      rootDegreeFilter: el("smalln-filter-root-degree").value,
      distributionMetric: state.smallNDistributionMetric,
      distributionModel: state.smallNDistributionModel,
      topKTarget: state.smallNTopKTarget,
      topKModel: state.smallNTopKModel,
      topKValue: state.smallNTopKValue,
      diffTarget: state.smallNDiffTarget,
      diffModelA: state.smallNDiffModelA,
      diffModelB: state.smallNDiffModelB,
      shapeFilter: state.smallNShapeFilter,
      metricFilter: state.smallNMetricFilter,
      previewShapeSignature: state.smallNPreviewShapeSignature,
      selectedRank: state.smallNSelectedRank,
    }));
  } catch {
    // Persistence is optional.
  }
}

function exportSmallNCsv() {
  if (!state.lastSmallN) return;
  const header = [
    "rank",
    "parent_code",
    "height",
    "root_degree",
    "leaves",
    "shape_signature",
    "ewens_probability_fraction",
    "ewens_probability_decimal",
    "uniform_probability_fraction",
    "uniform_probability_decimal",
    "plancherel_probability_fraction",
    "plancherel_probability_decimal",
    "ewens_over_uniform_fraction",
    "ewens_over_uniform_decimal",
    "plancherel_over_uniform_fraction",
    "plancherel_over_uniform_decimal",
    "plancherel_minus_ewens_fraction",
    "plancherel_minus_ewens_decimal",
    "root_partition",
  ].join(",");
  const rows = smallNFilteredRows().map((row) => csvRow([
    row.rank,
    row.code,
    row.height,
    row.root_degree,
    row.leaves,
    row.shape_signature,
    row.probability_fractions?.ewens ?? "",
    row.probabilities.ewens,
    row.probability_fractions?.uniform_recursive ?? "",
    row.probabilities.uniform_recursive,
    row.probability_fractions?.plancherel_recursive ?? "",
    row.probabilities.plancherel_recursive,
    row.probability_comparisons?.ewens_over_uniform?.fraction ?? "",
    row.probability_comparisons?.ewens_over_uniform?.value ?? "",
    row.probability_comparisons?.plancherel_over_uniform?.fraction ?? "",
    row.probability_comparisons?.plancherel_over_uniform?.value ?? "",
    row.probability_comparisons?.plancherel_minus_ewens?.fraction ?? "",
    row.probability_comparisons?.plancherel_minus_ewens?.value ?? "",
    row.root_partition.join(" "),
  ]));
  download("small-n-recursive-trees.csv", [header, ...rows].join("\n"), "text/csv");
}

async function runScan() {
  setStatusMessage("statusScanRunning");
  toggleButtons(true);
  try {
    const payload = {
      models: selectedScanModels(),
      theta_values: parseNumberList(el("scan-theta-values").value, Number),
      n_values: parseNumberList(el("scan-n-values").value, (value) => Number.parseInt(value, 10)),
      samples: intOrNull("scan-samples"),
      seed: intOrNull("seed"),
    };
    const data = await runTask("/api/tasks/scan", payload);
    renderScan(data);
    addHistoryEntry(buildScanHistoryEntry(data));
    setStatusMessage("statusScanDone", {
      groups: data.groups.length,
      rows: data.rows.length,
      ms: fmt.format(data.timing.total_ms),
    });
  } catch (error) {
    setStatusMessage(error.cancelled ? "statusTaskCancelled" : "error", { message: error.message });
  } finally {
    toggleButtons(false);
  }
}

function renderSample(data) {
  state.lastSample = data;
  state.selectedNodeId = null;
  state.selectedSubtree = null;
  state.treeHighlightMode = "none";
  state.treeHighlightValue = "";
  state.treeHighlightSet = null;
  state.treeHighlightLabel = "";
  state.treeView = { scale: 1, offsetX: 0, offsetY: 0, dragging: false, moved: false, lastX: 0, lastY: 0 };
  state.treeRender = null;
  updateTreeHighlightControls();
  el("node-search-id").value = "";
  el("node-search-id").max = data.nodes ? Math.max(0, data.nodes.length - 1) : 0;
  renderMetrics(data);
  renderTheory(data);
  drawTree(data);
  renderCharts(data);
  renderTable(data);
  renderNodeInspector(null);
  drawSimulation(state.lastSimulation);
}

async function generateSample(options = {}) {
  const recordHistory = options.recordHistory !== false;
  setStatusMessage("statusGenerateRunning");
  toggleButtons(true);
  try {
    const payload = {
      model: selectedModel(),
      theta: numberValue("theta"),
      n: intOrNull("n"),
      seed: intOrNull("seed"),
      draw_limit: intOrNull("draw-limit"),
    };
    const data = await runTask("/api/tasks/sample", payload);
    renderSample(data);
    if (recordHistory) addHistoryEntry(buildSampleHistoryEntry(data));
    setStatusMessage("statusGenerateDone", {
      n: fmt.format(data.parameters.n),
      height: fmt.format(data.summary.height),
    });
  } catch (error) {
    setStatusMessage(error.cancelled ? "statusTaskCancelled" : "error", { message: error.message });
  } finally {
    toggleButtons(false);
  }
}

async function runSimulation() {
  setStatusMessage("statusSimulationRunning");
  toggleButtons(true);
  try {
    const payload = {
      model: selectedModel(),
      theta: numberValue("theta"),
      n: intOrNull("n"),
      samples: intOrNull("samples"),
      seed: intOrNull("seed"),
    };
    const data = await runTask("/api/tasks/simulate", payload);
    state.lastSimulation = data;
    drawSimulation(data);
    addHistoryEntry(buildSimulationHistoryEntry(data));
    setStatusMessage(
      "statusSimulationDone",
      {
        mean: fmt.format(data.stats.mean),
        std: fmt.format(data.stats.std),
        median: fmt.format(data.stats.median),
      },
    );
  } catch (error) {
    setStatusMessage(error.cancelled ? "statusTaskCancelled" : "error", { message: error.message });
  } finally {
    toggleButtons(false);
  }
}

function toggleButtons(disabled) {
  for (const button of document.querySelectorAll("button")) {
    if (button.id === "cancel-task") continue;
    button.disabled = disabled;
  }
  el("cancel-task").disabled = !state.activeTask || state.activeTask.cancel_requested;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(",");
}

function exportJson() {
  if (!state.lastSample) return;
  download("ewens-tree-sample.json", JSON.stringify(state.lastSample, null, 2), "application/json");
}

function exportCsv() {
  if (!state.lastSample?.nodes) return;
  const header = "model,id,parent,depth,subtree_size,degree,on_longest_path";
  const model = state.lastSample.parameters.model || "ewens";
  const rows = state.lastSample.nodes.map((node) =>
    [model, node.id, node.parent, node.depth, node.subtree_size, node.degree, node.on_longest_path].join(","),
  );
  download("ewens-tree-nodes.csv", [header, ...rows].join("\n"), "text/csv");
}

function exportScanCsv() {
  if (!state.lastScan) return;
  const groupHeader = "type,model,model_label,theta,n,samples,mean_height,std_height,mean_offset_second_order,std_offset_second_order,q25_offset_second_order,median_offset_second_order,q75_offset_second_order,mean_elapsed_ms,total_elapsed_ms";
  const groupRows = state.lastScan.groups.map((group) =>
    csvRow([
      "group",
      group.model,
      group.model_label,
      group.theta,
      group.n,
      group.samples,
      group.mean_height,
      group.std_height,
      group.mean_offset_second_order,
      group.std_offset_second_order,
      group.q25_offset_second_order,
      group.median_offset_second_order,
      group.q75_offset_second_order,
      group.mean_elapsed_ms,
      group.total_elapsed_ms,
    ]),
  );
  const rowHeader = "type,model,model_label,theta,n,sample_index,seed,height,height_minus_second_order,root_degree,leaves,max_degree,elapsed_ms";
  const rows = state.lastScan.rows.map((row) =>
    csvRow([
      "run",
      row.model,
      row.model_label,
      row.theta,
      row.n,
      row.sample_index,
      row.seed,
      row.height,
      row.height_minus_second_order,
      row.root_degree,
      row.leaves,
      row.max_degree,
      row.elapsed_ms,
    ]),
  );
  download("ewens-scan-results.csv", [groupHeader, ...groupRows, rowHeader, ...rows].join("\n"), "text/csv");
}

function exportTreeViewPng() {
  const canvas = el("tree-canvas");
  if (!state.treeRender) return;
  exportCanvasWithWhiteBackground(canvas).toBlob((blob) => {
    if (blob) downloadBlob("ewens-tree-current-view.png", blob);
  }, "image/png");
}

function exportTreeFullPng() {
  if (!state.treeRender || !state.lastSample) return;
  const oldView = { ...state.treeView };
  state.treeView = { scale: 1, offsetX: 0, offsetY: 0, dragging: false, moved: false, lastX: 0, lastY: 0 };
  drawTree(state.lastSample);
  exportCanvasWithWhiteBackground(el("tree-canvas")).toBlob((blob) => {
    if (blob) downloadBlob("ewens-tree-full.png", blob);
    state.treeView = oldView;
    drawTree(state.lastSample);
  }, "image/png");
}

function exportCanvasWithWhiteBackground(sourceCanvas) {
  const output = document.createElement("canvas");
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;
  const ctx = output.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return output;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportTreeSvg() {
  const render = state.treeRender;
  if (!render) return;
  const { nodes, positions, width, height, layout } = render;
  const selected = state.selectedSubtree;
  const lines = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}">`,
  );
  lines.push(`<metadata>layout: ${escapeXml(layout || "centered-upward")}</metadata>`);
  lines.push(`<rect width="100%" height="100%" fill="#fcfdfe"/>`);
  lines.push(`<g fill="none" stroke="rgba(25,28,31,0.28)" stroke-width="0.45">`);
  for (const node of nodes) {
    if (node.parent < 0) continue;
    lines.push(
      `<line x1="${positions.xs[node.parent].toFixed(3)}" y1="${positions.ys[node.parent].toFixed(3)}" x2="${positions.xs[node.id].toFixed(3)}" y2="${positions.ys[node.id].toFixed(3)}"/>`,
    );
  }
  lines.push(`</g>`);

  if (selected?.size) {
    lines.push(`<g fill="none" stroke="rgba(0,127,137,0.82)" stroke-width="1.1">`);
    for (const node of nodes) {
      if (node.parent < 0 || !selected.has(node.id) || !selected.has(node.parent)) continue;
      lines.push(
        `<line x1="${positions.xs[node.parent].toFixed(3)}" y1="${positions.ys[node.parent].toFixed(3)}" x2="${positions.xs[node.id].toFixed(3)}" y2="${positions.ys[node.id].toFixed(3)}"/>`,
      );
    }
    lines.push(`</g>`);
  }

  lines.push(`<g fill="none" stroke="rgba(218,45,82,0.95)" stroke-width="1.5">`);
  for (const node of nodes) {
    if (!node.on_longest_path || node.parent < 0 || !nodes[node.parent]?.on_longest_path) continue;
    lines.push(
      `<line x1="${positions.xs[node.parent].toFixed(3)}" y1="${positions.ys[node.parent].toFixed(3)}" x2="${positions.xs[node.id].toFixed(3)}" y2="${positions.ys[node.id].toFixed(3)}"/>`,
    );
  }
  lines.push(`</g>`);

  const maxDepth = positions.maxDepth || 1;
  const radius = nodes.length > 20000 ? 0.65 : nodes.length > 5000 ? 0.9 : nodes.length > 1500 ? 1.35 : 2.4;
  lines.push(`<g>`);
  for (const node of nodes) {
    const t = node.depth / maxDepth;
    const color = node.id === state.selectedNodeId
      ? "rgb(0,127,137)"
      : node.on_longest_path
        ? "rgb(218,45,82)"
        : selected?.has(node.id)
          ? "rgb(0,127,137)"
          : `rgb(${Math.round(35 + 65 * t)},${Math.round(39 + 65 * t)},${Math.round(43 + 65 * t)})`;
    const r = node.id === state.selectedNodeId || node.on_longest_path || node.id === 0 ? radius + 1.6 : radius;
    lines.push(
      `<circle cx="${positions.xs[node.id].toFixed(3)}" cy="${positions.ys[node.id].toFixed(3)}" r="${r.toFixed(3)}" fill="${escapeXml(color)}">` +
        `<title>node ${node.id}, parent ${node.parent}, depth ${node.depth}, subtree size ${node.subtree_size}, degree ${node.degree}</title></circle>`,
    );
  }
  lines.push(`</g>`);
  lines.push(`</svg>`);
  download("ewens-tree.svg", lines.join("\n"), "image/svg+xml");
}

async function init() {
  loadHistory();
  try {
    state.limits = await api("/api/limits");
    el("draw-limit").value = state.limits.default_draw_limit;
    el("draw-limit").max = state.limits.max_draw_limit;
    updateModelControls();
  } catch {
    // Defaults are already set.
  }
  loadSmallNState();
  el("sample-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generateSample();
  });
  el("generate-button").addEventListener("click", generateSample);
  el("simulate-button").addEventListener("click", runSimulation);
  el("scan-button").addEventListener("click", runScan);
  el("smalln-run").addEventListener("click", runSmallNExplorer);
  el("smalln-export").addEventListener("click", exportSmallNCsv);
  el("smalln-load-more").addEventListener("click", () => loadMoreSmallNRows(false));
  el("smalln-show-all").addEventListener("click", () => loadMoreSmallNRows(true));
  el("smalln-locate").addEventListener("click", locateSmallNParentCode);
  el("smalln-clear-filters").addEventListener("click", clearSmallNFilters);
  el("smalln-n").addEventListener("input", saveSmallNState);
  el("smalln-theta").addEventListener("input", saveSmallNState);
  el("smalln-search-type").addEventListener("change", (event) => {
    state.smallNSearchType = event.target.value;
    updateSmallNSearchInputMeta();
    saveSmallNState();
  });
  el("smalln-locate-code").addEventListener("input", saveSmallNState);
  el("smalln-locate-code").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      locateSmallNParentCode();
    }
  });
  el("smalln-dist-metric").addEventListener("change", (event) => {
    state.smallNDistributionMetric = event.target.value;
    state.smallNMetricFilter = null;
    resetSmallNVisibleLimit();
    drawSmallNDistribution();
    renderSmallNTable();
    saveSmallNState();
  });
  el("smalln-dist-model").addEventListener("change", (event) => {
    state.smallNDistributionModel = event.target.value;
    drawSmallNDistribution();
    saveSmallNState();
  });
  el("smalln-distribution-canvas").addEventListener("click", handleSmallNDistributionClick);
  el("smalln-sort").addEventListener("change", (event) => {
    state.smallNSort = event.target.value;
    resetSmallNVisibleLimit();
    renderSmallNTable();
    saveSmallNState();
  });
  el("smalln-filter-height").addEventListener("input", () => {
    clearSmallNMetricFilter("height");
    resetSmallNVisibleLimit();
    renderSmallNTable();
    saveSmallNState();
  });
  el("smalln-filter-root-degree").addEventListener("input", () => {
    clearSmallNMetricFilter("root_degree");
    resetSmallNVisibleLimit();
    renderSmallNTable();
    saveSmallNState();
  });
  for (const id of ["smalln-topk-target", "smalln-topk-model", "smalln-topk-value"]) {
    el(id).addEventListener("change", (event) => {
      if (id === "smalln-topk-target") state.smallNTopKTarget = event.target.value;
      if (id === "smalln-topk-model") state.smallNTopKModel = event.target.value;
      if (id === "smalln-topk-value") state.smallNTopKValue = Number(event.target.value) || 10;
      renderSmallNTopK();
      saveSmallNState();
    });
  }
  for (const id of ["smalln-diff-target", "smalln-diff-model-a", "smalln-diff-model-b"]) {
    el(id).addEventListener("change", (event) => {
      if (id === "smalln-diff-target") state.smallNDiffTarget = event.target.value;
      if (id === "smalln-diff-model-a") state.smallNDiffModelA = event.target.value;
      if (id === "smalln-diff-model-b") state.smallNDiffModelB = event.target.value;
      renderSmallNDifference();
      saveSmallNState();
    });
  }
  el("smalln-view").addEventListener("click", (event) => {
    const topKRow = event.target.closest("#smalln-topk-table tr");
    if (topKRow) {
      const topKTreeRank = topKRow.dataset.smallnRank;
      const topKShapeSignature = topKRow.dataset.smallnShapeSignature;
      if (topKTreeRank) {
        resetSmallNFilters({ keepSearch: true });
        state.smallNSelectedRank = Number.parseInt(topKTreeRank, 10);
        state.smallNPreviewShapeSignature = null;
        renderSmallNTable();
        drawSmallNDistribution();
        requestAnimationFrame(scrollSmallNSelectedIntoView);
        saveSmallNState();
      } else if (topKShapeSignature) {
        applySmallNShapeFilter(topKShapeSignature, topKRow.dataset.smallnShapeRank);
      }
      return;
    }

    const diffRow = event.target.closest("#smalln-diff-table tr");
    if (diffRow) {
      const diffTreeRank = diffRow.dataset.smallnRank;
      const diffShapeSignature = diffRow.dataset.smallnShapeSignature;
      if (diffTreeRank) {
        resetSmallNFilters({ keepSearch: true });
        state.smallNSelectedRank = Number.parseInt(diffTreeRank, 10);
        state.smallNPreviewShapeSignature = null;
        renderSmallNTable();
        drawSmallNDistribution();
        requestAnimationFrame(scrollSmallNSelectedIntoView);
        saveSmallNState();
      } else if (diffShapeSignature) {
        applySmallNShapeFilter(diffShapeSignature, diffRow.dataset.smallnShapeRank);
      }
      return;
    }

    const shapeRow = event.target.closest("#smalln-shape-table tr[data-smalln-shape-rank]");
    if (shapeRow) {
      applySmallNShapeFilter(shapeRow.dataset.smallnShapeSignature, shapeRow.dataset.smallnShapeRank);
      return;
    }

    const treeRow = event.target.closest("#smalln-table tr[data-smalln-rank]");
    if (treeRow) {
      state.smallNSelectedRank = Number.parseInt(treeRow.dataset.smallnRank, 10);
      state.smallNPreviewShapeSignature = null;
      renderSmallNTable();
      saveSmallNState();
    }
  });
  el("cancel-task").addEventListener("click", cancelActiveTask);
  el("export-json").addEventListener("click", exportJson);
  el("export-csv").addEventListener("click", exportCsv);
  el("export-scan-csv").addEventListener("click", exportScanCsv);
  el("export-bundle").addEventListener("click", exportExperimentBundle);
  el("export-history").addEventListener("click", exportHistory);
  el("clear-history").addEventListener("click", clearHistory);
  el("history-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-use]");
    if (button) useHistoryParams(button.dataset.historyUse);
  });
  el("export-tree-view-png").addEventListener("click", exportTreeViewPng);
  el("export-tree-full-png").addEventListener("click", exportTreeFullPng);
  el("export-tree-svg").addEventListener("click", exportTreeSvg);
  el("lang-en").addEventListener("click", () => applyLanguage("en"));
  el("lang-zh").addEventListener("click", () => applyLanguage("zh"));
  for (const button of document.querySelectorAll("[data-tab-target]")) {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  }
  el("model").addEventListener("change", updateModelControls);
  el("theta").addEventListener("input", () => {
    if (!el("theta").disabled) state.freeThetaValue = el("theta").value;
  });
  el("n").addEventListener("input", renderPerformanceNote);
  el("draw-limit").addEventListener("input", renderPerformanceNote);
  el("tree-layout").addEventListener("change", (event) => {
    state.treeLayout = event.target.value;
    state.treeRender = null;
    resetTreeView();
  });
  el("tree-highlight-mode").addEventListener("change", (event) => {
    state.treeHighlightMode = event.target.value;
    if (!treeHighlightRequiresValue(state.treeHighlightMode)) state.treeHighlightValue = "";
    updateTreeHighlightControls();
  });
  el("tree-highlight-value").addEventListener("input", (event) => {
    state.treeHighlightValue = event.target.value;
  });
  el("tree-highlight-apply").addEventListener("click", applyTreeHighlightFromControls);
  el("tree-highlight-clear").addEventListener("click", clearTreeHighlight);
  for (const chartId of ["profile-chart", "degree-chart", "depth-chart"]) {
    el(chartId).addEventListener("click", (event) => handleTreeDistributionClick(event, chartId));
  }
  el("scan-metric").addEventListener("change", (event) => {
    state.scanMetric = event.target.value;
    drawLineChart("scan-chart", state.lastScan?.groups || []);
  });
  el("locate-node").addEventListener("click", () => locateNodeById());
  el("node-search-id").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      locateNodeById();
    }
  });
  el("node-data-show").addEventListener("click", () => showNodeDataById());
  el("node-data-locate").addEventListener("click", () => locateNodeById(el("node-data-id").value));
  el("node-data-id").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      showNodeDataById();
    }
  });
  el("tree-canvas").addEventListener("click", handleTreeClick);
  el("tree-canvas").addEventListener("wheel", handleTreeWheel, { passive: false });
  el("tree-canvas").addEventListener("pointerdown", handleTreePointerDown);
  el("tree-canvas").addEventListener("pointermove", handleTreePointerMove);
  el("tree-canvas").addEventListener("pointerup", handleTreePointerUp);
  el("tree-canvas").addEventListener("pointerleave", handleTreePointerUp);
  el("tree-canvas").addEventListener("dblclick", resetTreeView);
  el("tree-reset-view").addEventListener("click", resetTreeView);
  window.addEventListener("resize", () => {
    if (state.lastSample) {
      drawTree(state.lastSample);
      renderCharts(state.lastSample);
      drawSimulation(state.lastSimulation);
      drawLineChart("scan-chart", state.lastScan?.groups || []);
    }
  });
  applyLanguage("en");
  generateSample({ recordHistory: false });
}

init();
