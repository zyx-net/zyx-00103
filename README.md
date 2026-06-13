# 稿件更正与发布审批工作台

一个本地可启动的稿件更正与发布审批 Web 工作台，采用「记者→编辑→法务→管理员」的审批链路。

## 功能特性

- 角色权限管理：记者、值班编辑、法务、管理员
- 稿件管理：创建、编辑、发布稿件
- 更正单管理：创建更正单、填写类型/证据/截止时间/影响范围
- 审批工作流：记者提交 → 编辑复核 → 法务确认 → 管理员发布
- 退回重提：被退回后可修改再提交
- 历史记录：所有操作完整记录
- 数据导出：支持 JSON 和 CSV 格式
- 持久化存储：重启后数据不丢失

## 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端同时运行）
npm run dev
```

访问 http://localhost:5173

## 账号说明

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 记者 | journalist | journalist123 |
| 值班编辑 | editor | editor123 |
| 法务 | legal | legal123 |
| 管理员 | admin | admin123 |

## 验证步骤

### 1. 基础登录验证
- [ ] 打开 http://localhost:5173
- [ ] 登录页面显示4个角色选择卡片
- [ ] 点击"记者"卡片，选中后高亮
- [ ] 点击"登录"按钮，成功进入工作台
- [ ] 侧边栏显示：工作台、稿件管理、更正单、历史记录
- [ ] 右上角显示当前角色和用户名

### 2. 稿件管理验证
- [ ] 进入"稿件管理"页面
- [ ] 看到3篇示例稿件（某市GDP突破万亿大关、新能源汽车销量创新高、科技创新大会圆满落幕）
- [ ] 稿件状态正确显示（已发布/草稿）
- [ ] 记者可创建新稿件

### 3. 更正单创建验证（需要记者账号）
- [ ] 进入"更正单"页面
- [ ] 点击"创建更正单"按钮
- [ ] 选择已发布稿件作为关联稿件
- [ ] 选择更正类型（如"事实错误"）
- [ ] 填写证据说明（必填）
- [ ] 设置截止时间（必填）
- [ ] 填写影响范围（必填）
- [ ] 勾选"涉及来源争议"（可选）
- [ ] 点击"保存并提交"

### 4. 必填验证测试
- [ ] 创建更正单时，不填写证据说明，提交时显示"请填写证据说明"
- [ ] 不填写截止时间，提交时显示"请填写截止时间"
- [ ] 不填写影响范围，提交时显示"请填写影响范围"
- [ ] 错误提示出现后，状态不变更

### 5. 权限验证测试
- [ ] 以记者身份登录，无法看到"编辑复核"按钮
- [ ] 以记者身份登录，无法执行发布操作
- [ ] 以编辑身份登录，无法创建更正单
- [ ] 越权操作显示"XXX无权执行此操作"，状态不变更

### 6. 审批流程验证（完整流程）
1. **记者提交**
   - [ ] 以记者身份创建更正单并提交
   - [ ] 状态变为"待编辑复核"
   - [ ] 历史记录显示"提交更正单"

2. **编辑复核**
   - [ ] 以编辑身份登录
   - [ ] 待办事项显示待复核更正单
   - [ ] 点击"复核通过"，填写说明
   - [ ] 状态变为"待法务确认"
   - [ ] 点击"退回修改"，填写原因
   - [ ] 状态变为"已退回"

3. **法务确认**
   - [ ] 以法务身份登录
   - [ ] 待办事项显示待确认更正单
   - [ ] 点击"确认通过"，填写说明
   - [ ] 状态变为"待发布"
   - [ ] 如有来源争议，必须经过法务确认才能发布

4. **管理员发布**
   - [ ] 以管理员身份登录
   - [ ] 待办事项显示待发布更正单
   - [ ] 点击"发布更正"
   - [ ] 状态变为"已发布"
   - [ ] 已发布的更正可"撤销"

### 7. 退回重提验证
- [ ] 被退回的更正单状态显示"已退回"
- [ ] 记者可修改更正单内容
- [ ] 修改后重新提交，流程从头开始

### 8. 来源争议验证
- [ ] 创建更正单时勾选"涉及来源争议"
- [ ] 即使状态到达"待发布"，未经过法务确认也无法发布
- [ ] 法务确认后，来源争议标记被消除，可正常发布
- [ ] 提示"来源争议必须经过法务确认"

### 9. 重复发布验证
- [ ] 某稿件已发布更正后，无法再次发布更正
- [ ] 提示"该稿件已发布更正，不可重复发布"

### 10. 数据持久化验证
- [ ] 关闭服务器后重启
- [ ] 所有稿件、更正单、历史记录仍存在
- [ ] 筛选配置仍存在

### 11. 导出功能验证（需要管理员账号）

#### 11.1 用户界面验证
- [ ] 以管理员身份登录
- [ ] 进入"配置管理"页面
- [ ] 看到筛选条件区域（稿件选择、开始日期、结束日期）
- [ ] 选择稿件"新能源汽车销量创新高"
- [ ] 点击"导出 JSON"按钮
- [ ] 下载的 JSON 文件只包含该稿件的更正单
- [ ] 点击"导出 CSV"按钮
- [ ] 下载的 CSV 文件只包含该稿件的更正单
- [ ] 清除筛选后导出，包含所有数据

#### 11.2 API 接口验证（curl 命令）

**Linux/macOS (bash):**
```bash
# 设置管理员 Token（用户ID）
TOKEN="4"

# 1. 无筛选导出 - 导出全部数据
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json" -o all_data.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv" -o all_data.csv

# 2. 按稿件筛选导出 - manuscriptId=2（新能源汽车销量创新高）
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json?manuscriptId=2" -o manuscript_2.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv?manuscriptId=2" -o manuscript_2.csv

# 3. 按日期范围筛选导出
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json?dateFrom=2024-01-16&dateTo=2024-01-17" -o date_range.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv?dateFrom=2024-01-16&dateTo=2024-01-17" -o date_range.csv
```

**Windows (PowerShell):**
```powershell
# 设置管理员 Token
$headers = @{ "Authorization" = "Bearer 4" }

# 1. 无筛选导出 - 导出全部数据
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File all_data.json
Invoke-RestMethod -Uri "http://localhost:5173/api/export/csv" -Headers $headers | Out-File all_data.csv

# 2. 按稿件筛选导出 - manuscriptId=2
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json?manuscriptId=2" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File manuscript_2.json

# 3. 按日期范围筛选导出
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json?dateFrom=2024-01-16&dateTo=2024-01-17" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File date_range.json
```

**验证结果：**
- all_data.json 应包含 2 条更正单、3 篇稿件
- manuscript_2.json 应只包含稿件ID=2 的更正单（1条）
- date_range.json 应只包含指定日期范围内的更正单

#### 11.3 自动化测试脚本
```bash
# 运行导出功能验证脚本
python tests/test_export.py

# 测试覆盖：
# - manuscriptId=2 筛选导出
# - 日期范围筛选导出
# - 无筛选导出
# - JSON 和 CSV 字段一致性
```

### 12. 历史记录验证
- [ ] 进入"历史记录"页面
- [ ] 显示所有操作的时间线
- [ ] 按日期分组显示
- [ ] 点击可展开查看详情（操作人角色、时间戳）

## 审批流程图

```
记者提交 ──► 编辑复核 ──► 法务确认 ──► 管理员发布
    │            │            │            │
    ▼            ▼            ▼            ▼
  [可退回]   [可退回]    [可退回]    [可撤销]
    │            │            │            │
    ▼            ▼            ▼            ▼
  草稿/退回   退回修改    退回修改    已发布
```

## 技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS
- 后端：Express.js + TypeScript
- 状态管理：Zustand
- 数据存储：JSON 文件
- 路由：React Router

## 项目结构

```
├── src/                    # 前端代码
│   ├── components/         # 组件
│   ├── pages/              # 页面
│   ├── services/           # API 服务
│   └── stores/             # 状态管理
├── api/                    # 后端代码
│   ├── routes/             # 路由
│   ├── services/           # 业务逻辑
│   ├── middleware/          # 中间件
│   └── data/               # JSON 数据文件
└── ...
```
