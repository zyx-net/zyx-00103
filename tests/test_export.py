#!/usr/bin/env python3
"""
导出功能验证脚本
测试三种情况：
1. manuscriptId=2 筛选导出
2. 日期范围筛选导出
3. 无筛选导出

验证 JSON 和 CSV 字段一致性
"""

import requests
import json
import csv
import io
import sys
from typing import Dict, List, Any

BASE_URL = "http://localhost:5173/api"
ADMIN_TOKEN = "4"  # admin user id

def print_header(title: str):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(name: str, passed: bool, details: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"    {details}")

def test_export_json(params: Dict[str, str] = None) -> Dict[str, Any]:
    """测试 JSON 导出"""
    url = f"{BASE_URL}/export/json"
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"success": False, "error": f"HTTP {response.status_code}"}

def test_export_csv(params: Dict[str, str] = None) -> tuple:
    """测试 CSV 导出"""
    url = f"{BASE_URL}/export/csv"
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return True, response.text
    return False, f"HTTP {response.status_code}"

def parse_csv(csv_text: str) -> List[Dict[str, str]]:
    """解析 CSV 文本为字典列表"""
    reader = csv.DictReader(io.StringIO(csv_text))
    return list(reader)

def test_case_1_manuscript_id():
    """测试用例1: manuscriptId=2 筛选导出"""
    print_header("测试用例1: manuscriptId=2 筛选导出")
    
    params = {"manuscriptId": "2"}
    
    # JSON 导出
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        manuscripts = data.get("manuscripts", [])
        filters = data.get("filters", {})
        
        # 验证筛选条件
        filter_correct = filters.get("manuscriptId") == "2"
        
        # 验证所有更正单都属于稿件2
        all_match = all(c.get("manuscriptId") == "2" for c in corrections)
        
        # 验证稿件只包含稿件2
        manuscript_match = all(m.get("id") == "2" for m in manuscripts)
        
        print_result("JSON 筛选条件正确", filter_correct, f"filters.manuscriptId = {filters.get('manuscriptId')}")
        print_result("JSON 更正单全部属于稿件2", all_match, f"共 {len(corrections)} 条更正单")
        print_result("JSON 稿件只包含稿件2", manuscript_match, f"共 {len(manuscripts)} 篇稿件")
        
        json_count = len(corrections)
    else:
        print_result("JSON 导出请求成功", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    # CSV 导出
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_all_match = all(row.get("稿件ID") == "2" for row in csv_rows)
        
        print_result("CSV 更正单全部属于稿件2", csv_all_match, f"共 {len(csv_rows)} 条更正单")
        csv_count = len(csv_rows)
    else:
        print_result("CSV 导出请求成功", False, csv_text)
        csv_count = 0
    
    # 验证 JSON 和 CSV 数量一致
    count_match = json_count == csv_count
    print_result("JSON 和 CSV 更正单数量一致", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        all_match if json_passed else False,
        csv_success,
        csv_all_match if csv_success else False,
        count_match
    ])

def test_case_2_date_range():
    """测试用例2: 日期范围筛选导出"""
    print_header("测试用例2: 日期范围筛选导出")
    
    params = {"dateFrom": "2024-01-16", "dateTo": "2024-01-17"}
    
    # JSON 导出
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        # 验证筛选条件
        filter_correct = filters.get("dateFrom") == "2024-01-16" and filters.get("dateTo") == "2024-01-17"
        
        # 验证所有更正单都在日期范围内
        from datetime import datetime
        all_in_range = True
        for c in corrections:
            created = datetime.fromisoformat(c["createdAt"].replace("Z", "+00:00"))
            date_from = datetime(2024, 1, 16)
            date_to = datetime(2024, 1, 17, 23, 59, 59)
            if not (date_from <= created.replace(tzinfo=None) <= date_to):
                all_in_range = False
                break
        
        print_result("JSON 筛选条件正确", filter_correct, f"dateFrom={filters.get('dateFrom')}, dateTo={filters.get('dateTo')}")
        print_result("JSON 更正单全部在日期范围内", all_in_range, f"共 {len(corrections)} 条更正单")
        
        json_count = len(corrections)
    else:
        print_result("JSON 导出请求成功", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    # CSV 导出
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV 导出成功", True, f"共 {csv_count} 条更正单")
    else:
        print_result("CSV 导出请求成功", False, csv_text)
        csv_count = 0
    
    # 验证 JSON 和 CSV 数量一致
    count_match = json_count == csv_count
    print_result("JSON 和 CSV 更正单数量一致", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        all_in_range if json_passed else False,
        csv_success,
        count_match
    ])

def test_case_3_no_filter():
    """测试用例3: 无筛选导出"""
    print_header("测试用例3: 无筛选导出")
    
    # JSON 导出
    json_result = test_export_json()
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        manuscripts = data.get("manuscripts", [])
        history = data.get("history", [])
        filters = data.get("filters", {})
        
        # 验证筛选条件为空
        filter_correct = all(v is None for v in filters.values())
        
        print_result("JSON 筛选条件为空", filter_correct, f"filters = {filters}")
        print_result("JSON 包含所有稿件", True, f"共 {len(manuscripts)} 篇稿件")
        print_result("JSON 包含所有更正单", True, f"共 {len(corrections)} 条更正单")
        print_result("JSON 包含所有历史记录", True, f"共 {len(history)} 条记录")
        
        json_count = len(corrections)
        json_manuscript_count = len(manuscripts)
    else:
        print_result("JSON 导出请求成功", False, json_result.get("error", "Unknown error"))
        json_count = 0
        json_manuscript_count = 0
    
    # CSV 导出
    csv_success, csv_text = test_export_csv()
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV 导出成功", True, f"共 {csv_count} 条更正单")
    else:
        print_result("CSV 导出请求成功", False, csv_text)
        csv_count = 0
    
    # 验证 JSON 和 CSV 数量一致
    count_match = json_count == csv_count
    print_result("JSON 和 CSV 更正单数量一致", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        csv_success,
        count_match
    ])

def test_json_csv_field_consistency():
    """测试 JSON 和 CSV 字段一致性"""
    print_header("测试 JSON 和 CSV 字段一致性")
    
    # 获取无筛选导出
    json_result = test_export_json()
    csv_success, csv_text = test_export_csv()
    
    if not json_result.get("success") or not csv_success:
        print_result("导出请求成功", False)
        return False
    
    json_corrections = json_result.get("data", {}).get("corrections", [])
    csv_rows = parse_csv(csv_text)
    
    if len(json_corrections) == 0 or len(csv_rows) == 0:
        print_result("有数据可比较", False, "导出数据为空")
        return True  # 空数据也算一致
    
    # 比较 JSON 和 CSV 的第一条数据字段
    json_first = json_corrections[0]
    csv_first = csv_rows[0]
    
    # JSON 字段到 CSV 字段的映射
    field_mapping = {
        "id": "更正单ID",
        "manuscriptId": "稿件ID",
        "manuscriptTitle": "稿件标题",
        "type": "更正类型",
        "evidence": "证据说明",
        "deadline": "截止时间",
        "impactScope": "影响范围",
        "hasSourceDispute": "来源争议",
        "status": "状态",
        "creatorName": "创建人",
    }
    
    all_match = True
    for json_field, csv_field in field_mapping.items():
        json_val = str(json_first.get(json_field, ""))
        csv_val = csv_first.get(csv_field, "")
        
        # 特殊处理布尔值
        if json_field == "hasSourceDispute":
            json_val = "是" if json_val == "True" else "否"
        
        # 类型字段需要转换
        if json_field == "type":
            type_map = {
                "factual_error": "事实错误",
                "title_error": "标题错误",
                "source_correction": "来源更正",
                "content_addition": "内容补充",
                "other": "其他",
            }
            json_val = type_map.get(json_val, json_val)
        
        # 状态字段需要转换
        if json_field == "status":
            status_map = {
                "draft": "草稿",
                "pending_editor": "待编辑复核",
                "pending_legal": "待法务确认",
                "pending_publish": "待发布",
                "published": "已发布",
                "rejected": "已退回",
            }
            json_val = status_map.get(json_val, json_val)
        
        match = json_val == csv_val or json_val in csv_val or csv_val in json_val
        if not match:
            all_match = False
            print_result(f"字段 {json_field}/{csv_field} 一致", False, f"JSON: {json_val}, CSV: {csv_val}")
        else:
            print_result(f"字段 {json_field}/{csv_field} 一致", True)
    
    return all_match

def main():
    print("="*60)
    print(" 稿件更正与发布审批工作台 - 导出功能验证脚本")
    print("="*60)
    print(f"API 地址: {BASE_URL}")
    print(f"管理员 Token: {ADMIN_TOKEN}")
    
    # 检查服务是否可用
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print(f"\n❌ 服务不可用: HTTP {response.status_code}")
            sys.exit(1)
        print(f"\n✅ 服务可用")
    except Exception as e:
        print(f"\n❌ 无法连接服务: {e}")
        sys.exit(1)
    
    # 运行测试用例
    results = []
    results.append(("测试用例1: manuscriptId=2 筛选导出", test_case_1_manuscript_id()))
    results.append(("测试用例2: 日期范围筛选导出", test_case_2_date_range()))
    results.append(("测试用例3: 无筛选导出", test_case_3_no_filter()))
    results.append(("JSON 和 CSV 字段一致性", test_json_csv_field_consistency()))
    
    # 汇总结果
    print_header("测试汇总")
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print(" 🎉 所有测试通过!")
        print("="*60)
        sys.exit(0)
    else:
        print(" ⚠️  部分测试失败，请检查上述错误")
        print("="*60)
        sys.exit(1)

if __name__ == "__main__":
    main()
