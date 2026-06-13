#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configuration Preset Validation Test Script
Tests for configuration management:
1. Admin and non-admin permission validation
2. Save configuration with filter conditions
3. Overwrite same-name configuration
4. Apply preset (export filter consistency)
5. Delete configuration
6. Cross-restart data persistence
7. JSON/CSV export consistency
"""

import requests
import json
import csv
import io
import sys
import time
from typing import Dict, List, Any, Optional

BASE_URL = "http://localhost:5173/api"
ADMIN_TOKEN = "4"
JOURNALIST_TOKEN = "1"
EDITOR_TOKEN = "2"
LEGAL_TOKEN = "3"

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

def test_admin_permission():
    """Test admin permission for config management"""
    print_header("Test Admin Permission")
    
    headers_admin = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    headers_journalist = {"Authorization": f"Bearer {JOURNALIST_TOKEN}"}
    
    response_list = requests.get(f"{BASE_URL}/configs", headers=headers_admin)
    admin_can_list = response_list.status_code == 200
    print_result("Admin can list configs", admin_can_list, f"Status: {response_list.status_code}")
    
    response_list_nonaut = requests.get(f"{BASE_URL}/configs", headers=headers_journalist)
    nonadmin_cannot_list = response_list_nonaut.status_code in [401, 403]
    print_result("Non-admin cannot list configs", nonadmin_cannot_list, f"Status: {response_list_nonaut.status_code}")
    
    test_config = {
        "name": "权限测试配置",
        "filters": {"status": ["draft"]}
    }
    response_create = requests.post(f"{BASE_URL}/configs", headers=headers_admin, json=test_config)
    admin_can_create = response_create.status_code in [200, 201]
    print_result("Admin can create config", admin_can_create, f"Status: {response_create.status_code}")
    
    if admin_can_create:
        config_id = response_create.json().get("data", {}).get("id")
        response_delete_nonaut = requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers_journalist)
        nonadmin_cannot_delete = response_delete_nonaut.status_code in [401, 403]
        print_result("Non-admin cannot delete config", nonadmin_cannot_delete, f"Status: {response_delete_nonaut.status_code}")
        
        requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers_admin)
    
    return admin_can_list and nonadmin_cannot_list and admin_can_create

def test_save_config_with_filters():
    """Test saving configuration with filter conditions"""
    print_header("Test Save Config With Filters")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    test_config = {
        "name": "测试筛选配置",
        "filters": {
            "manuscriptId": "1",
            "dateRange": {
                "start": "2024-01-01",
                "end": "2024-01-31"
            },
            "status": ["pending_editor", "pending_legal"]
        }
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=test_config)
    success = response.status_code in [200, 201]
    
    if success:
        data = response.json().get("data", {})
        filters_saved = data.get("filters", {})
        
        filters_match = (
            filters_saved.get("manuscriptId") == "1" and
            filters_saved.get("dateRange", {}).get("start") == "2024-01-01" and
            filters_saved.get("dateRange", {}).get("end") == "2024-01-31" and
            filters_saved.get("status") == ["pending_editor", "pending_legal"]
        )
        
        print_result("Config created successfully", success, f"ID: {data.get('id')}")
        print_result("Filters saved correctly", filters_match, f"Filters: {filters_saved}")
        
        requests.delete(f"{BASE_URL}/configs/{data.get('id')}", headers=headers)
        return success and filters_match
    
    print_result("Config creation failed", False, f"Status: {response.status_code}")
    return False

def test_overwrite_same_name():
    """Test overwriting configuration with same name"""
    print_header("Test Overwrite Same Name Configuration")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    original_config = {
        "name": "覆盖测试配置",
        "filters": {"status": ["draft"]}
    }
    
    response1 = requests.post(f"{BASE_URL}/configs", headers=headers, json=original_config)
    if response1.status_code not in [200, 201]:
        print_result("Initial config creation failed", False)
        return False
    
    config_id = response1.json().get("data", {}).get("id")
    original_created_at = response1.json().get("data", {}).get("createdAt")
    
    updated_config = {
        "name": "覆盖测试配置",
        "filters": {"status": ["published"], "manuscriptId": "2"}
    }
    
    response2 = requests.post(f"{BASE_URL}/configs", headers=headers, json=updated_config)
    success = response2.status_code == 200
    action = response2.json().get("action")
    is_overwrite = action == "updated"
    
    print_result("Overwrite returns 200", success, f"Status: {response2.status_code}")
    print_result("Action is 'updated'", is_overwrite, f"Action: {action}")
    
    updated_filters = response2.json().get("data", {}).get("filters", {})
    filters_updated = (
        updated_filters.get("status") == ["published"] and
        updated_filters.get("manuscriptId") == "2"
    )
    print_result("Filters updated correctly", filters_updated, f"Filters: {updated_filters}")
    
    configs_response = requests.get(f"{BASE_URL}/configs", headers=headers)
    configs = configs_response.json().get("data", [])
    overwrite_config = next((c for c in configs if c["name"] == "覆盖测试配置"), None)
    
    only_one_config = overwrite_config is not None
    if overwrite_config:
        same_id = overwrite_config["id"] == config_id
        print_result("Same config ID after overwrite", same_id, f"ID: {overwrite_config['id']}")
    
    requests.delete(f"{BASE_URL}/configs/{overwrite_config['id']}", headers=headers)
    return success and is_overwrite and filters_updated

def test_empty_name_validation():
    """Test validation for empty config name"""
    print_header("Test Empty Name Validation")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    empty_name_config = {
        "name": "   ",
        "filters": {}
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=empty_name_config)
    rejected = response.status_code == 400
    error_message = response.json().get("error", {}).get("message", "")
    
    print_result("Empty name rejected", rejected, f"Status: {response.status_code}")
    print_result("Error message correct", "不能为空" in error_message, f"Message: {error_message}")
    
    return rejected and "不能为空" in error_message

def test_apply_preset_export():
    """Test applying preset and exporting with correct filters"""
    print_header("Test Apply Preset and Export Consistency")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    preset_config = {
        "name": "导出一致性测试",
        "filters": {
            "manuscriptId": "2",
            "dateRange": {
                "start": "2024-01-16",
                "end": "2024-01-17"
            }
        }
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=preset_config)
    if response.status_code not in [200, 201]:
        print_result("Preset creation failed", False)
        return False
    
    config_id = response.json().get("data", {}).get("id")
    
    json_export = requests.get(
        f"{BASE_URL}/export/json",
        params={"manuscriptId": "2", "dateFrom": "2024-01-16", "dateTo": "2024-01-17"},
        headers=headers
    )
    
    csv_export = requests.get(
        f"{BASE_URL}/export/csv",
        params={"manuscriptId": "2", "dateFrom": "2024-01-16", "dateTo": "2024-01-17"},
        headers=headers
    )
    
    json_success = json_export.status_code == 200
    csv_success = csv_export.status_code == 200
    
    print_result("JSON export successful", json_success)
    print_result("CSV export successful", csv_success)
    
    if json_success and csv_success:
        json_data = json_export.json().get("data", {})
        json_corrections = json_data.get("corrections", [])
        
        csv_reader = csv.DictReader(io.StringIO(csv_export.text))
        csv_rows = list(csv_reader)
        
        json_count = len(json_corrections)
        csv_count = len(csv_rows)
        
        counts_match = json_count == csv_count
        print_result("JSON and CSV correction counts match", counts_match, f"JSON: {json_count}, CSV: {csv_count}")
        
        all_belong_manuscript = all(c.get("manuscriptId") == "2" for c in json_corrections)
        print_result("All corrections belong to manuscript 2", all_belong_manuscript)
        
        requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
        return json_success and csv_success and counts_match
    
    requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
    return False

def test_delete_own_config():
    """Test deleting own configuration"""
    print_header("Test Delete Own Configuration")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    test_config = {
        "name": "删除测试配置",
        "filters": {}
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=test_config)
    if response.status_code not in [200, 201]:
        print_result("Config creation failed", False)
        return False
    
    config_id = response.json().get("data", {}).get("id")
    
    delete_response = requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
    deleted = delete_response.status_code == 200
    message = delete_response.json().get("message", "")
    
    print_result("Delete successful", deleted, f"Status: {delete_response.status_code}")
    print_result("Success message returned", "已删除" in message, f"Message: {message}")
    
    configs_response = requests.get(f"{BASE_URL}/configs", headers=headers)
    configs = configs_response.json().get("data", [])
    config_deleted = not any(c.get("id") == config_id for c in configs)
    print_result("Config removed from list", config_deleted)
    
    return deleted and config_deleted

def test_persistence_across_restart():
    """Test configuration persistence"""
    print_header("Test Configuration Persistence")
    
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    unique_name = f"持久化测试_{int(time.time())}"
    test_config = {
        "name": unique_name,
        "filters": {
            "status": ["published"],
            "manuscriptId": "1"
        }
    }
    
    response = requests.post(f"{BASE_URL}/configs", headers=headers, json=test_config)
    if response.status_code not in [200, 201]:
        print_result("Config creation failed", False)
        return False
    
    created_config = response.json().get("data", {})
    config_id = created_config.get("id")
    
    print_result("Config created for persistence test", True, f"ID: {config_id}")
    print_result("Filters stored correctly", created_config.get("filters", {}).get("manuscriptId") == "1")
    
    configs_response = requests.get(f"{BASE_URL}/configs", headers=headers)
    configs = configs_response.json().get("data", [])
    found_config = next((c for c in configs if c.get("id") == config_id), None)
    
    config_persisted = found_config is not None
    print_result("Config persisted in configs.json", config_persisted)
    
    if found_config:
        requests.delete(f"{BASE_URL}/configs/{config_id}", headers=headers)
    
    return config_persisted

def cleanup_test_configs():
    """Clean up test configurations"""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    test_prefixes = ["测试", "权限测试", "覆盖测试", "导出一致性测试", "删除测试", "持久化测试"]
    
    try:
        response = requests.get(f"{BASE_URL}/configs", headers=headers)
        if response.status_code == 200:
            configs = response.json().get("data", [])
            for config in configs:
                if any(prefix in config.get("name", "") for prefix in test_prefixes):
                    requests.delete(f"{BASE_URL}/configs/{config['id']}", headers=headers)
    except:
        pass

def main():
    print("="*60)
    print(" Configuration Preset Validation Script")
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
    
    results.append(("Admin Permission Test", test_admin_permission()))
    cleanup_test_configs()
    
    results.append(("Save Config With Filters", test_save_config_with_filters()))
    cleanup_test_configs()
    
    results.append(("Overwrite Same Name Config", test_overwrite_same_name()))
    cleanup_test_configs()
    
    results.append(("Empty Name Validation", test_empty_name_validation()))
    cleanup_test_configs()
    
    results.append(("Apply Preset Export Consistency", test_apply_preset_export()))
    cleanup_test_configs()
    
    results.append(("Delete Own Config", test_delete_own_config()))
    cleanup_test_configs()
    
    results.append(("Persistence Across Restart", test_persistence_across_restart()))
    cleanup_test_configs()
    
    print_header("Test Summary")
    all_passed = True
    for name, passed in results:
        status = PASS_MARK if passed else FAIL_MARK
        print(f"{status} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print(" All configuration preset tests passed!")
        print("="*60)
        sys.exit(0)
    else:
        print(" Some tests failed, please check errors above")
        print("="*60)
        sys.exit(1)

if __name__ == "__main__":
    main()
