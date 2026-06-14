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
- [ ] 看到筛选条件区域（稿件选择、开始日期、结束日期、状态多选、类型多选）
- [ ] 选择稿件"新能源汽车销量创新高"
- [ ] 选择状态"待编辑复核"、"待法务确认"
- [ ] 选择类型"事实错误"、"标题错误"
- [ ] 点击"导出 JSON"按钮
- [ ] 下载的 JSON 文件只包含指定稿件、状态、类型的更正单
- [ ] 点击"导出 CSV"按钮
- [ ] 下载的 CSV 文件只包含指定稿件、状态、类型的更正单
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

# 4. 按状态筛选导出 - status 支持多值逗号分隔
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json?status=pending_editor,pending_legal" -o pending_status.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv?status=published" -o published.csv

# 5. 按类型筛选导出 - type 支持多值逗号分隔
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json?type=factual_error,title_error" -o fact_errors.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv?type=source_correction" -o source_corrections.csv

# 6. 组合筛选 - 同时指定多个筛选条件
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/json?status=published&type=factual_error" -o combined.json
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/export/csv?manuscriptId=1&status=pending_editor,pending_legal" -o combined.csv
```

**Windows (PowerShell):**
```powershell
# Set admin token
$headers = @{ "Authorization" = "Bearer 4" }

# 1. No filter export - all data
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File all_data.json
Invoke-RestMethod -Uri "http://localhost:5173/api/export/csv" -Headers $headers | Out-File all_data.csv

# 2. Filter by manuscriptId=2
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json?manuscriptId=2" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File manuscript_2.json
Invoke-RestMethod -Uri "http://localhost:5173/api/export/csv?manuscriptId=2" -Headers $headers | Out-File manuscript_2.csv

# 3. Filter by date range
Invoke-RestMethod -Uri "http://localhost:5173/api/export/json?dateFrom=2024-01-16&dateTo=2024-01-17" -Headers $headers | ConvertTo-Json -Depth 10 | Out-File date_range.json
Invoke-RestMethod -Uri "http://localhost:5173/api/export/csv?dateFrom=2024-01-16&dateTo=2024-01-17" -Headers $headers | Out-File date_range.csv
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

# 运行状态和类型筛选导出验证脚本
python tests/test_export_filter.py

# 测试覆盖：
# - 状态筛选导出
# - 类型筛选导出
# - 组合状态和类型筛选
# - 多状态筛选（逗号分隔）
# - 带筛选的配置预设保存和导出
# - JSON 和 CSV 字段一致性
```

### 12. 筛选配置预设验证（需要管理员账号）

#### 12.1 用户界面验证
- [ ] 以管理员身份登录
- [ ] 进入"配置管理"页面
- [ ] 设置筛选条件（选择稿件、日期范围、状态）
- [ ] 点击"保存当前筛选为预设"按钮
- [ ] 输入预设名称，点击保存
- [ ] 看到成功提示"配置"xxx"创建成功"
- [ ] 预设列表显示新创建的预设及其筛选条件预览
- [ ] 点击预设的"播放"按钮，筛选条件自动填充到导出区域
- [ ] 使用填充的筛选条件导出，确认导出结果正确

#### 12.2 覆盖同名配置验证
- [ ] 设置筛选条件并保存为预设"我的预设"
- [ ] 修改筛选条件（更改稿件、日期等）
- [ ] 再次保存为"我的预设"
- [ ] 看到成功提示"配置"我的预设"已覆盖更新"
- [ ] 确认预设列表中只有一个"我的预设"
- [ ] 确认"我的预设"的筛选条件已更新为最新设置

#### 12.3 删除预设验证
- [ ] 点击预设的"删除"按钮
- [ ] 看到确认按钮（绿色勾选和红色X）
- [ ] 点击绿色勾选确认删除
- [ ] 看到成功提示"配置"xxx"已删除"
- [ ] 预设列表中该预设已消失
- [ ] 点击红色X取消删除，预设保持不变

#### 12.4 权限验证
- [ ] 以记者身份登录，无法访问"配置管理"页面
- [ ] 以编辑身份登录，无法访问"配置管理"页面
- [ ] 以法务身份登录，无法访问"配置管理"页面
- [ ] 以管理员身份登录，可以正常访问"配置管理"页面

#### 12.5 数据持久化验证
- [ ] 创建几个预设
- [ ] 重启服务器
- [ ] 刷新页面，预设列表中预设仍然存在
- [ ] 预设的筛选条件与重启前完全一致

#### 12.6 API 接口验证

**创建/更新配置：**
```bash
# 创建带筛选条件的配置
curl -X POST "http://localhost:5173/api/configs" \
  -H "Authorization: Bearer 4" \
  -H "Content-Type: application/json" \
  -d '{"name": "待处理更正单", "filters": {"status": ["pending_editor", "pending_legal"]}}'

# 响应示例
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "待处理更正单",
    "filters": {"status": ["pending_editor", "pending_legal"]},
    "createdBy": "4",
    "createdAt": "2024-01-10T00:00:00.000Z"
  },
  "message": "配置创建成功",
  "action": "created"
}
```

**同名配置覆盖：**
```bash
# 再次创建同名配置（会自动覆盖）
curl -X POST "http://localhost:5173/api/configs" \
  -H "Authorization: Bearer 4" \
  -H "Content-Type: application/json" \
  -d '{"name": "待处理更正单", "filters": {"status": ["published"]}}'

# 响应示例
{
  "success": true,
  "data": {
    "id": "原ID",
    "name": "待处理更正单",
    "filters": {"status": ["published"]},
    "updatedAt": "2024-01-10T00:00:00.000Z"
  },
  "message": "配置已覆盖更新",
  "action": "updated"
}
```

**列出所有配置：**
```bash
curl "http://localhost:5173/api/configs" \
  -H "Authorization: Bearer 4"
```

**删除配置：**
```bash
curl -X DELETE "http://localhost:5173/api/configs/{id}" \
  -H "Authorization: Bearer 4"
```

#### 12.7 自动化测试脚本
```bash
# 运行配置预设验证脚本
python tests/test_config_preset.py

# 测试覆盖：
# - 管理员和非管理员权限验证
# - 保存带筛选条件的配置
# - 覆盖同名配置
# - 空名称校验
# - 应用预设导出一致性
# - 删除自己创建的配置
# - 跨重启数据持久化
```

### 13. 批量操作验证

#### 13.1 编辑批量复核验证
- [ ] 以编辑身份登录
- [ ] 进入"更正单"页面
- [ ] 勾选多个"待编辑复核"状态的更正单
- [ ] 点击"全选"按钮选中所有可选更正单
- [ ] 看到"批量复核通过"和"批量退回"按钮
- [ ] 点击"批量复核通过"，确认弹窗预览选中项
- [ ] 确认执行后，结果弹窗显示成功数量
- [ ] 更正单状态变为"待法务确认"
- [ ] 尝试勾选已发布/已退回的更正单，看到警告提示

#### 13.2 编辑批量退回验证
- [ ] 以编辑身份登录
- [ ] 勾选待复核的更正单
- [ ] 点击"批量退回"，确认弹窗显示备注输入框（必填）
- [ ] 不填备注点击确认，显示验证错误
- [ ] 填写备注后确认，结果弹窗显示成功数量
- [ ] 更正单状态变为"已退回"

#### 13.3 法务批量确认验证
- [ ] 以法务身份登录
- [ ] 勾选多个"待法务确认"状态的更正单
- [ ] 看到"批量确认通过"和"批量退回"按钮
- [ ] 点击"批量确认通过"，执行后状态变为"待发布"
- [ ] 点击"批量退回"（需填写备注），状态变为"已退回"

#### 13.4 管理员批量发布验证
- [ ] 以管理员身份登录
- [ ] 勾选多个"待发布"状态的更正单
- [ ] 看到"批量发布"按钮
- [ ] 点击"批量发布"，确认后状态变为"已发布"
- [ ] 历史记录显示"批量发布更正"

#### 13.5 管理员批量撤销验证
- [ ] 以管理员身份登录
- [ ] 勾选多个"已发布"状态的更正单
- [ ] 看到"批量撤销"按钮
- [ ] 点击"批量撤销"，确认后状态变为"待发布"

#### 13.6 权限验证
- [ ] 以记者身份登录，看不到任何批量操作按钮
- [ ] 以编辑身份登录，看不到"批量发布"和"批量撤销"按钮
- [ ] 以法务身份登录，看不到"批量复核"和"批量发布"按钮
- [ ] 以非管理员身份尝试调用批量发布API，返回权限拒绝

#### 13.7 部分失败验证
- [ ] 同时勾选"待编辑复核"和"待法务确认"的更正单
- [ ] 编辑执行批量复核，待复核的成功，待法务确认的被跳过
- [ ] 结果弹窗逐条显示每条更正单的操作结果（成功/跳过/失败及原因）

#### 13.8 已发布/已退回过滤验证
- [ ] 尝试勾选已发布的更正单，复选框禁用或显示跳过标记
- [ ] 尝试勾选已退回的更正单，复选框禁用或显示跳过标记
- [ ] 如果误选，操作按钮禁用并显示警告提示

### 14. 历史记录验证
- [ ] 进入"历史记录"页面
- [ ] 显示所有操作的时间线
- [ ] 按日期分组显示
- [ ] 点击可展开查看详情（操作人角色、时间戳）
- [ ] 批量操作记录显示"批量"相关动作（如"批量复核通过"）

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
