# Routex
## ✅ 

### 1. GET 
```javascript
// 
const statusRes = await fetch(`${API_BASE}/api`);
const status = await statusRes.json;

// 
const channelsRes = await fetch(`${API_BASE}/api/channels`);
const channelsData = await channelsRes.json;
```

### 2.
### 3. 
- 30
## 🔧 

### 

#### 1. 
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
    return await res.json;
}
```

#### 2. 
```javascript
async function updateChannel(id, updates) {
    const res = await fetch(`${API_BASE}/api/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return await res.json;
}
```

#### 3. 
```javascript
async function deleteChannel(id) {
    const res = await fetch(`${API_BASE}/api/channels/${id}`, {
        method: 'DELETE'
    });
    return await res.json;
}
```

### 

#### 
```javascript
async function changeStrategy(strategy) {
    // strategy: 'priority' | 'round_robin' | 'weighted' | 'least_used'
    const res = await fetch(`${API_BASE}/api/load-balancer/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy })
    });
    return await res.json;
}
```

### 

#### 1. 
```javascript
async function getRoutingRules {
    const res = await fetch(`${API_BASE}/api/routing/rules`);
    return await res.json;
}
```

#### 2. 
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
    return await res.json;
}
```

#### 3. 
```javascript
async function deleteRoutingRule(id) {
    const res = await fetch(`${API_BASE}/api/routing/rules/${id}`, {
        method: 'DELETE'
    });
    return await res.json;
}
```

## 📋 UI 

### 1. 
```html
<div class=modal>
    <h3></h3>
    <form id=addChannelForm>
        <input type=text name=name placeholder= required>
        <select name=type required>
            <option value=anthropic>Anthropic</option>
            <option value=openai>OpenAI</option>
        </select>
        <input type=text name=apiKey placeholder=API Key required>
        <input type=text name=baseUrl placeholder=Base URL >
        <input type=text name=models placeholder=  required>
        <input type=number name=priority placeholder= value=1>
        <input type=number name=weight placeholder= value=1>
        <button type=submit></button>
    </form>
</div>
```

### 2. 
```html
<div class=channel-actions>
    <button onclick=editChannel('${channel.id}')>✏️ </button>
    <button onclick=toggleChannel('${channel.id}')>
        ${channel.status === 'enabled' ? '⏸️ ' : '▶️ '}
    </button>
    <button onclick=deleteChannel('${channel.id}')>🗑️ </button>
</div>
```

### 3. 
```html
<div class=strategy-selector>
    <label></label>
    <select id=strategySelect onchange=changeStrategy(this.value)>
        <option value=priority></option>
        <option value=round_robin></option>
        <option value=weighted></option>
        <option value=least_used></option>
    </select>
</div>
```

### 4. 
```javascript
function showMessage(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout( => {
        toast.classList.add('show');
    }, 100);

    setTimeout( => {
        toast.classList.remove('show');
        setTimeout( => toast.remove, 300);
    }, 3000);
}
```

## 🎨 

### 
- ✅ 
- ⚡  CRUD 
- 🔄 
- 🧠 
- 📊 
- 📈 Analytics 

### UI/UX
- 🎨 
- 📢 Toast 
- ⚠️ 
- 🔍 
- 📱 
- 🌙 

### 
- 🚀 
- 💾 LocalStorage 
- 🔐 API 
- ⏱️ 
- ✅ 
- 🎭 

## 💡 

1. ****
2. ****
3. ****