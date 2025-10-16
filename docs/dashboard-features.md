# Routex 控制面板 - 前后端交互功能说明

## ✅ 已实现的功能（只读操作）

当前控制面板已实现以下前后端交互：

### 1. 数据读取（GET 请求）
```javascript
// 获取系统状态
const statusRes = await fetch(`${API_BASE}/api`);
const status = await statusRes.json();

// 获取渠道列表
const channelsRes = await fetch(`${API_BASE}/api/channels`);
const channelsData = await channelsRes.json();
```

### 2. 实时数据展示
- 系统状态：版本、运行时间、负载均衡策略
- 渠道统计：总数、启用数、路由规则
- 缓存统计：大小、容量、利用率
- 渠道列表：详细信息和状态

### 3. 自动刷新
- 每30秒自动刷新数据
- 手动刷新按钮

## 🔧 可以添加的管理功能（写操作）

### 渠道管理

#### 1. 创建渠道
```javascript
async function createChannel(channelData) {
    const res = await fetch(`${API_BASE}/api/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: channelData.name,
            type: channelData.type,
            apiKey: channelData.apiKey,
            baseUrl: channelData.baseUrl,
            models: channelData.models,
            priority: channelData.priority || 1,
            weight: channelData.weight || 1
        })
    });
    return await res.json();
}
```

#### 2. 编辑渠道
```javascript
async function updateChannel(id, updates) {
    const res = await fetch(`${API_BASE}/api/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return await res.json();
}
```

#### 3. 删除渠道
```javascript
async function deleteChannel(id) {
    const res = await fetch(`${API_BASE}/api/channels/${id}`, {
        method: 'DELETE'
    });
    return await res.json();
}
```

### 负载均衡策略管理

#### 切换策略
```javascript
async function changeStrategy(strategy) {
    // strategy: 'priority' | 'round_robin' | 'weighted' | 'least_used'
    const res = await fetch(`${API_BASE}/api/load-balancer/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy })
    });
    return await res.json();
}
```

### 路由规则管理

#### 1. 获取路由规则
```javascript
async function getRoutingRules() {
    const res = await fetch(`${API_BASE}/api/routing/rules`);
    return await res.json();
}
```

#### 2. 创建路由规则
```javascript
async function createRoutingRule(ruleData) {
    const res = await fetch(`${API_BASE}/api/routing/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: ruleData.name,
            type: ruleData.type,
            condition: ruleData.condition,
            targetChannel: ruleData.targetChannel,
            priority: ruleData.priority || 100
        })
    });
    return await res.json();
}
```

#### 3. 删除路由规则
```javascript
async function deleteRoutingRule(id) {
    const res = await fetch(`${API_BASE}/api/routing/rules/${id}`, {
        method: 'DELETE'
    });
    return await res.json();
}
```

## 📋 UI 组件建议

### 1. 添加渠道的表单
```html
<div class="modal">
    <h3>添加新渠道</h3>
    <form id="addChannelForm">
        <input type="text" name="name" placeholder="渠道名称" required>
        <select name="type" required>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
        </select>
        <input type="text" name="apiKey" placeholder="API Key" required>
        <input type="text" name="baseUrl" placeholder="Base URL (可选)">
        <input type="text" name="models" placeholder="模型列表 (逗号分隔)" required>
        <input type="number" name="priority" placeholder="优先级" value="1">
        <input type="number" name="weight" placeholder="权重" value="1">
        <button type="submit">创建</button>
    </form>
</div>
```

### 2. 渠道操作按钮
```html
<div class="channel-actions">
    <button onclick="editChannel('${channel.id}')">✏️ 编辑</button>
    <button onclick="toggleChannel('${channel.id}')">
        ${channel.status === 'enabled' ? '⏸️ 禁用' : '▶️ 启用'}
    </button>
    <button onclick="deleteChannel('${channel.id}')">🗑️ 删除</button>
</div>
```

### 3. 负载均衡策略选择器
```html
<div class="strategy-selector">
    <label>负载均衡策略：</label>
    <select id="strategySelect" onchange="changeStrategy(this.value)">
        <option value="priority">优先级</option>
        <option value="round_robin">轮询</option>
        <option value="weighted">加权随机</option>
        <option value="least_used">最少使用</option>
    </select>
</div>
```

### 4. 消息提示组件
```javascript
function showMessage(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
```

## 🎨 增强版控制面板功能列表

如果需要完整的管理功能，我可以创建一个增强版控制面板，包含：

### 核心功能
- ✅ 实时数据监控（已实现）
- ⚡ 渠道 CRUD 操作
- 🔄 负载均衡策略切换
- 🧠 路由规则管理
- 📊 实时请求日志查看
- 📈 Analytics 图表展示

### UI/UX
- 🎨 模态对话框（弹窗）
- 📢 Toast 消息提示
- ⚠️ 确认对话框
- 🔍 搜索和过滤
- 📱 响应式设计
- 🌙 深色模式（可选）

### 技术特性
- 🚀 无需构建，单文件部署
- 💾 LocalStorage 保存偏好设置
- 🔐 API 错误处理
- ⏱️ 请求加载状态
- ✅ 表单验证
- 🎭 优雅的动画效果

## 💡 下一步

您希望我：

1. **创建完整的增强版控制面板** - 包含所有管理功能的单页面应用
2. **只添加特定功能** - 比如只添加渠道管理或策略切换
3. **保持简单** - 当前版本足够（只读监控）

请告诉我您的需求，我将为您实现最合适的方案！
