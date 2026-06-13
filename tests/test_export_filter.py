#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export and Filter Validation Test Script
Tests for status and type filtering in export:
1. Status filter export
2. Type filter export
3. Combined status and type filter export
4. JSON and CSV field consistency
5. Config preset save and apply with status/type filters
"""

import requests
import json
import csv
import io
import sys
from typing import Dict, List, Any, Tuple

BASE_URL = "http://localhost:5173/api"
ADMIN_TOKEN = "4"

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
    """Test JSON export"""
    url = f"{BASE_URL}/export/json"
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"success": False, "error": f"HTTP {response.status_code}"}

def test_export_csv(params: Dict[str, str] = None) -> Tuple[bool, str]:
    """Test CSV export"""
    url = f"{BASE_URL}/export/csv"
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return True, response.text
    return False, f"HTTP {response.status_code}"

def parse_csv(csv_text: str) -> List[Dict[str, str]]:
    """Parse CSV text to list of dicts"""
    reader = csv.DictReader(io.StringIO(csv_text))
    return list(reader)

def test_case_status_filter():
    """Test Case: Status filter export"""
    print_header("Test Case: Status Filter Export")
    
    params = {"status": "pending_editor"}
    
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        filter_correct = filters.get("status") == ["pending_editor"]
        
        all_status_match = all(c.get("status") == "pending_editor" for c in corrections)
        
        print_result("JSON export successful", json_passed)
        print_result("Status filter in response", filter_correct, f"filters.status = {filters.get('status')}")
        print_result("All corrections have pending_editor status", all_status_match, f"Total: {len(corrections)} corrections")
        
        json_count = len(corrections)
    else:
        print_result("JSON export failed", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export failed", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return json_passed and filter_correct and all_status_match and count_match

def test_case_type_filter():
    """Test Case: Type filter export"""
    print_header("Test Case: Type Filter Export")
    
    params = {"type": "factual_error"}
    
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        filter_correct = filters.get("type") == ["factual_error"]
        
        all_type_match = all(c.get("type") == "factual_error" for c in corrections)
        
        print_result("JSON export successful", json_passed)
        print_result("Type filter in response", filter_correct, f"filters.type = {filters.get('type')}")
        print_result("All corrections have factual_error type", all_type_match, f"Total: {len(corrections)} corrections")
        
        json_count = len(corrections)
    else:
        print_result("JSON export failed", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export failed", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return json_passed and filter_correct and all_type_match and count_match

def test_case_combined_filters():
    """Test Case: Combined status and type filter"""
    print_header("Test Case: Combined Status and Type Filters")
    
    params = {"status": "published", "type": "factual_error"}
    
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        status_correct = filters.get("status") == ["published"]
        type_correct = filters.get("type") == ["factual_error"]
        
        all_match = all(
            c.get("status") == "published" and c.get("type") == "factual_error" 
            for c in corrections
        )
        
        print_result("JSON export successful", json_passed)
        print_result("Status filter correct", status_correct)
        print_result("Type filter correct", type_correct)
        print_result("All corrections match both filters", all_match, f"Total: {len(corrections)} corrections")
        
        json_count = len(corrections)
    else:
        print_result("JSON export failed", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export failed", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return json_passed and status_correct and type_correct and all_match and count_match

def test_case_multiple_status():
    """Test Case: Multiple status filter"""
    print_header("Test Case: Multiple Status Filter")
    
    params = {"status": "pending_editor,pending_legal"}
    
    json_result = test_export_json(params)
    json_passed = json_result.get("success", False)
    
    if json_passed:
        data = json_result.get("data", {})
        corrections = data.get("corrections", [])
        filters = data.get("filters", {})
        
        filter_correct = set(filters.get("status", [])) == {"pending_editor", "pending_legal"}
        
        all_match = all(
            c.get("status") in ["pending_editor", "pending_legal"] 
            for c in corrections
        )
        
        print_result("JSON export successful", json_passed)
        print_result("Multiple status filter correct", filter_correct)
        print_result("All corrections in status list", all_match, f"Total: {len(corrections)} corrections")
        
        json_count = len(corrections)
    else:
        print_result("JSON export failed", False, json_result.get("error", "Unknown error"))
        json_count = 0
    
    csv_success, csv_text = test_export_csv(params)
    if csv_success:
        csv_rows = parse_csv(csv_text)
        csv_count = len(csv_rows)
        print_result("CSV export successful", True, f"Total: {csv_count} corrections")
    else:
        print_result("CSV export failed", False, csv_text)
        csv_count = 0
    
    count_match = json_count == csv_count
    print_result("JSON and CSV counts match", count_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    return json_passed and filter_correct and all_match and count_match

def test_case_config_preset_with_status():
    """Test Case: Config preset with status filter"""
    print_header("Test Case: Config Preset with Status Filter")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    preset_config = {
        "name": f"状态筛选测试_{int(sys.time())}",
        "filters": {
            "status": ["pending_editor", "pending_legal"]
        }
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=preset_config)
    if response.status_code not in [200, 201]:
        print_result("Preset creation failed", False)
        return False
    
    config_data = response.json().get("data", {})
    config_id = config_data.get("id")
    
    filters_saved = config_data.get("filters", {})
    status_saved = filters_saved.get("status", [])
    
    print_result("Preset created with status filter", True, f"ID: {config_id}")
    print_result("Status filter saved correctly", status_saved == ["pending_editor", "pending_legal"], f"Status: {status_saved}")
    
    export_params = {
        "status": "pending_editor,pending_legal"
    }
    
    json_result = test_export_json(export_params)
    json_count = len(json_result.get("data", {}).get("corrections", [])) if json_result.get("success") else 0
    
    csv_success, csv_text = test_export_csv(export_params)
    csv_count = len(parse_csv(csv_text)) if csv_success else 0
    
    counts_match = json_count == csv_count
    print_result("Export with status filter works", json_count > 0 or counts_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
    
    return status_saved == ["pending_editor", "pending_legal"] and counts_match

def test_case_config_preset_with_type():
    """Test Case: Config preset with type filter"""
    print_header("Test Case: Config Preset with Type Filter")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    preset_config = {
        "name": f"类型筛选测试_{int(sys.time())}",
        "filters": {
            "type": ["factual_error", "title_error"]
        }
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=preset_config)
    if response.status_code not in [200, 201]:
        print_result("Preset creation failed", False)
        return False
    
    config_data = response.json().get("data", {})
    config_id = config_data.get("id")
    
    filters_saved = config_data.get("filters", {})
    type_saved = filters_saved.get("type", [])
    
    print_result("Preset created with type filter", True, f"ID: {config_id}")
    print_result("Type filter saved correctly", set(type_saved) == {"factual_error", "title_error"}, f"Type: {type_saved}")
    
    export_params = {
        "type": "factual_error,title_error"
    }
    
    json_result = test_export_json(export_params)
    json_count = len(json_result.get("data", {}).get("corrections", [])) if json_result.get("success") else 0
    
    csv_success, csv_text = test_export_csv(export_params)
    csv_count = len(parse_csv(csv_text)) if csv_success else 0
    
    counts_match = json_count == csv_count
    print_result("Export with type filter works", json_count > 0 or counts_match, f"JSON: {json_count}, CSV: {csv_count}")
    
    requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
    
    return set(type_saved) == {"factual_error", "title_error"} and counts_match

def test_json_csv_field_consistency():
    """Test JSON and CSV field consistency"""
    print_header("Test JSON and CSV Field Consistency")
    
    params = {"status": "published"}
    
    json_result = test_export_json(params)
    csv_success, csv_text = test_export_csv(params)
    
    if not json_result.get("success") or not csv_success:
        print_result("Export requests successful", False)
        return False
    
    json_corrections = json_result.get("data", {}).get("corrections", [])
    csv_rows = parse_csv(csv_text)
    
    if len(json_corrections) == 0 and len(csv_rows) == 0:
        print_result("Data consistency (empty data)", True)
        return True
    
    if len(json_corrections) == 0 or len(csv_rows) == 0:
        print_result("Data consistency", False, "One export is empty")
        return False
    
    json_first = json_corrections[0]
    csv_first = csv_rows[0]
    
    field_mapping = {
        "id": "更正单ID",
        "manuscriptId": "稿件ID",
        "manuscriptTitle": "稿件标题",
        "type": "更正类型",
        "status": "状态",
    }
    
    all_match = True
    for json_field, csv_field in field_mapping.items():
        json_val = str(json_first.get(json_field, ""))
        csv_val = csv_first.get(csv_field, "")
        
        if json_field == "type":
            type_map = {
                "factual_error": "事实错误",
                "title_error": "标题错误",
                "source_correction": "来源更正",
                "content_addition": "内容补充",
                "other": "其他",
            }
            json_val = type_map.get(json_val, json_val)
        
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
        
        match = json_val == csv_val
        print_result(f"Field {json_field}/{csv_field}", match, f"JSON: {json_val}, CSV: {csv_val}")
        if not match:
            all_match = False
    
    return all_match

def cleanup_test_configs():
    """Clean up test configurations"""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    test_prefixes = ["状态筛选测试", "类型筛选测试"]
    
    try:
        response = requests.get(f"{BASE_URL}/configs", headers=headers)
        if response.status_code == 200:
            configs = response.json().get("data", [])
            for config in configs:
                name = config.get("name", "")
                if any(prefix in name for prefix in test_prefixes):
                    requests.delete(f"{BASE_URL}/configs/{config['id']}", headers=headers)
    except:
        pass

def main():
    import time
    sys.time = time
    
    print("="*60)
    print(" Export Filter Validation Script (Status & Type)")
    print("="*60)
    print(f"API URL: {BASE_URL}")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print(f"\n{FAIL_MARK} Service unavailable: HTTP {response.status_code}")
            sys.exit(1)
        print(f"\n{PASS_MARK} Service available")
    except Exception as e:
        print(f"\n{FAIL_MARK} Cannot connect to service: {e}")
        sys.exit(1)
    
    results = []
    
    results.append(("Status Filter Export", test_case_status_filter()))
    cleanup_test_configs()
    
    results.append(("Type Filter Export", test_case_type_filter()))
    cleanup_test_configs()
    
    results.append(("Combined Status and Type Filters", test_case_combined_filters()))
    
    results.append(("Multiple Status Filter", test_case_multiple_status()))
    
    results.append(("Config Preset with Status", test_case_config_preset_with_status()))
    cleanup_test_configs()
    
    results.append(("Config Preset with Type", test_case_config_preset_with_type()))
    cleanup_test_configs()
    
    results.append(("JSON and CSV Field Consistency", test_json_csv_field_consistency()))
    
    print_header("Test Summary")
    all_passed = True
    for name, passed in results:
        status = PASS_MARK if passed else FAIL_MARK
        print(f"{status} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print(" All export filter tests passed!")
        print("="*60)
        sys.exit(0)
    else:
        print(" Some tests failed, please check errors above")
        print("="*60)
        sys.exit(1)

if __name__ == "__main__":
    main()
