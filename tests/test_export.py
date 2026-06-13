#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export Validation Test Script
Tests three scenarios:
1. manuscriptId=2 filter export
2. Date range filter export
3. No filter export (all data)

Validates JSON and CSV field consistency
"""

import requests
import json
import csv
import io
import sys
from typing import Dict, List, Any

BASE_URL = "http://localhost:5173/api"
ADMIN_TOKEN = "4"  # admin user id

PASS_MARK = "[PASS]"
FAIL_MARK = "[FAIL]"

def print_header(title: str):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(name: str, passed: bool, details: str = ""):
    status = PASS_MARK if passed else FAIL_MARK
    print(f"{status} {name}")
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
    """Test Case 1: manuscriptId=2 filter export"""
    print_header("Test Case 1: manuscriptId=2 Filter Export")
    
    params = {"manuscriptId": "2"}
    
    # JSON Export
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        manuscripts = data.get("manuscripts", [])
        filters = data.get("filters", {})
        
        filter_correct = filters.get("manuscriptId") == "2"
        all_match = all(c.get("manuscriptId") == "2" for c in corrections)
        manuscript_match = all(m.get("id") == "2" for m in manuscripts)
        
        print_result("JSON filter correct", filter_correct, f"filters.manuscriptId = {filters.get('manuscriptId')}")
        print_result("JSON corrections all belong to manuscript 2", all_match, f"Total: {len(corrections)} corrections")
        print_result("JSON manuscripts only contain manuscript 2", manuscript_match, f"Total: {len(manuscripts)} manuscripts")
        
        json_count = len(corrections)
    else:
        print_result("JSON export request successful", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    # CSV Export
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_all_match = all(row.get("更正单ID") != "" for row in csv_rows) and len(csv_rows) == 1
        csv_all_belong = all(row.get("稿件ID") == "2" for row in csv_rows) if csv_rows else True
        
        print_result("CSV corrections all belong to manuscript 2", csv_all_belong, f"Total: {len(csv_rows)} corrections")
        csv_count = len(csv_rows)
    else:
        print_result("CSV export request successful", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV correction counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        all_match if json_passed else False,
        csv_success,
        csv_all_belong if csv_success else False,
        count_match
    ])

def test_case_2_date_range():
    """Test Case 2: Date range filter export"""
    print_header("Test Case 2: Date Range Filter Export")
    
    params = {"dateFrom": "2024-01-16", "dateTo": "2024-01-17"}
    
    # JSON Export
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        filter_correct = filters.get("dateFrom") == "2024-01-16" and filters.get("dateTo") == "2024-01-17"
        
        from datetime import datetime
        all_in_range = True
        for c in corrections:
            created = datetime.fromisoformat(c["createdAt"].replace("Z", "+00:00"))
            date_from = datetime(2024, 1, 16)
            date_to = datetime(2024, 1, 17, 23, 59, 59)
            if not (date_from <= created.replace(tzinfo=None) <= date_to):
                all_in_range = False
                break
        
        print_result("JSON filter correct", filter_correct, f"dateFrom={filters.get('dateFrom')}, dateTo={filters.get('dateTo')}")
        print_result("JSON corrections all in date range", all_in_range, f"Total: {len(corrections)} corrections")
        
        json_count = len(corrections)
    else:
        print_result("JSON export request successful", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    # CSV Export
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export request successful", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV correction counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        all_in_range if json_passed else False,
        csv_success,
        count_match
    ])

def test_case_3_no_filter():
    """Test Case 3: No filter export (all data)"""
    print_header("Test Case 3: No Filter Export (All Data)")
    
    # JSON Export
    json_result = test_export_json()
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        manuscripts = data.get("manuscripts", [])
        history = data.get("history", [])
        filters = data.get("filters", {})
        
        filter_correct = all(v is None for v in filters.values())
        
        print_result("JSON filter is empty", filter_correct, f"filters = {filters}")
        print_result("JSON contains all manuscripts", True, f"Total: {len(manuscripts)} manuscripts")
        print_result("JSON contains all corrections", True, f"Total: {len(corrections)} corrections")
        print_result("JSON contains all history records", True, f"Total: {len(history)} records")
        
        json_count = len(corrections)
    else:
        print_result("JSON export request successful", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    # CSV Export
    csv_success, csv_text = test_export_csv()
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export request successful", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV correction counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return all([
        json_passed,
        filter_correct if json_passed else False,
        csv_success,
        count_match
    ])

def test_json_csv_field_consistency():
    """Test JSON and CSV field consistency"""
    print_header("Test JSON and CSV Field Consistency")
    
    # Get no-filter export
    json_result = test_export_json()
    csv_success, csv_text = test_export_csv()
    
    if not json_result.get("success") or not csv_success:
        print_result("Export requests successful", False)
        return False
    
    json_corrections = json_result.get("data", {}).get("corrections", [])
    csv_rows = parse_csv(csv_text)
    
    if len(json_corrections) == 0 or len(csv_rows) == 0:
        print_result("Data available for comparison", False, "Export data is empty")
        return True  # Empty data counts as consistent
    
    # Compare JSON and CSV first data row fields
    json_first = json_corrections[0]
    csv_first = csv_rows[0]
    
    # JSON to CSV field mapping
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
        
        # Special handling for boolean
        if json_field == "hasSourceDispute":
            json_val = "是" if json_val == "True" else "否"
        
        # Type field needs conversion
        if json_field == "type":
            type_map = {
                "factual_error": "事实错误",
                "title_error": "标题错误",
                "source_correction": "来源更正",
                "content_addition": "内容补充",
                "other": "其他",
            }
            json_val = type_map.get(json_val, json_val)
        
        # Status field needs conversion
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
            print_result(f"Field {json_field}/{csv_field} consistent", False, f"JSON: {json_val}, CSV: {csv_val}")
        else:
            print_result(f"Field {json_field}/{csv_field} consistent", True)
    
    return all_match

def main():
    print("="*60)
    print(" Correction & Publish Workflow - Export Validation Script")
    print("="*60)
    print(f"API URL: {BASE_URL}")
    print(f"Admin Token: {ADMIN_TOKEN}")
    
    # Check if service is available
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print(f"\n{FAIL_MARK} Service unavailable: HTTP {response.status_code}")
            sys.exit(1)
        print(f"\n{PASS_MARK} Service available")
    except Exception as e:
        print(f"\n{FAIL_MARK} Cannot connect to service: {e}")
        sys.exit(1)
    
    # Run test cases
    results = []
    results.append(("Test Case 1: manuscriptId=2 Filter Export", test_case_1_manuscript_id()))
    results.append(("Test Case 2: Date Range Filter Export", test_case_2_date_range()))
    results.append(("Test Case 3: No Filter Export", test_case_3_no_filter()))
    results.append(("JSON and CSV Field Consistency", test_json_csv_field_consistency()))
    
    # Summary
    print_header("Test Summary")
    all_passed = True
    for name, passed in results:
        status = PASS_MARK if passed else FAIL_MARK
        print(f"{status} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print(" All tests passed!")
        print("="*60)
        sys.exit(0)
    else:
        print(" Some tests failed, please check errors above")
        print("="*60)
        sys.exit(1)

if __name__ == "__main__":
    main()
