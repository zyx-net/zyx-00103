#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Operation Validation Test Script
Tests four scenarios:
1. Permission denied - journalist cannot perform any batch operations
2. Partial failure - some corrections succeed, some fail
3. Full success - all corrections in batch operation succeed
4. Cross-role denied - editor cannot publish, legal cannot review, etc.

Also tests:
- Published/rejected corrections are excluded from batch operations
- Each operation result (success/skip/fail with reason) is displayed
"""

import requests
import json
import sys
from typing import Dict, List, Any, Optional

BASE_URL = "http://localhost:5173/api"

PASS_MARK = "[PASS]"
FAIL_MARK = "[FAIL]"

JOURNALIST_TOKEN = "1"
EDITOR_TOKEN = "2"
LEGAL_TOKEN = "3"
ADMIN_TOKEN = "4"

def print_header(title: str):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(name: str, passed: bool, details: str = ""):
    status = PASS_MARK if passed else FAIL_MARK
    print(f"{status} {name}")
    if details:
        print(f"    {details}")

def api_request(endpoint: str, method: str = "GET", token: str = "", data: dict = None) -> dict:
    """通用API请求方法"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}{endpoint}"

    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    else:
        return {"success": False, "error": f"Unsupported method: {method}"}

    try:
        return response.json()
    except:
        return {"success": False, "error": f"HTTP {response.status_code}, body: {response.text[:200]}"}

def get_corrections_by_status(token: str, status: str = "") -> List[Dict]:
    """获取指定状态的更正单"""
    result = api_request(f"/corrections?status={status}" if status else "/corrections", token=token)
    if result.get("success"):
        return result.get("data", [])
    return []

def create_test_correction(token: str) -> Optional[str]:
    """创建测试用更正单"""
    manuscripts = api_request("/manuscripts", token=token)
    if not manuscripts.get("success") or not manuscripts.get("data"):
        return None

    manuscript_id = manuscripts["data"][0]["id"]
    result = api_request("/corrections", "POST", token, {
        "manuscriptId": manuscript_id,
        "type": "factual_error",
        "evidence": "Test evidence",
        "deadline": "2025-12-31",
        "impactScope": "Test scope"
    })
    if result.get("success"):
        return result["data"]["id"]
    return None

def submit_correction(correction_id: str, token: str) -> bool:
    """提交更正单"""
    result = api_request(f"/corrections/{correction_id}/submit", "POST", token)
    return result.get("success", False)

def setup_corrections_for_review(token: str) -> List[str]:
    """设置待复核的更正单"""
    ids = []
    for _ in range(3):
        corr_id = create_test_correction(token)
        if corr_id and submit_correction(corr_id, token):
            ids.append(corr_id)
    return ids

def setup_corrections_for_legal(token: str) -> List[str]:
    """设置待法务确认的更正单"""
    ids = []
    for _ in range(3):
        corr_id = create_test_correction(JOURNALIST_TOKEN)
        if corr_id and submit_correction(corr_id, JOURNALIST_TOKEN):
            api_request(f"/corrections/{corr_id}/review", "POST", EDITOR_TOKEN, {"action": "pass"})
            ids.append(corr_id)
    return ids

def setup_corrections_for_publish(token: str) -> List[str]:
    """设置待发布的更正单"""
    ids = []
    for _ in range(3):
        corr_id = create_test_correction(JOURNALIST_TOKEN)
        if corr_id and submit_correction(corr_id, JOURNALIST_TOKEN):
            api_request(f"/corrections/{corr_id}/review", "POST", EDITOR_TOKEN, {"action": "pass"})
            api_request(f"/corrections/{corr_id}/legal", "POST", LEGAL_TOKEN, {"action": "confirm"})
            ids.append(corr_id)
    return ids

def test_journalist_cannot_batch_review():
    """Test: Journalist cannot perform batch review"""
    print_header("Test: Journalist Cannot Batch Review")

    correction_ids = get_corrections_by_status(JOURNALIST_TOKEN, "pending_editor")
    if not correction_ids:
        print_result("Get pending_editor corrections", False, "No corrections found")
        return False

    ids = [c["id"] for c in correction_ids[:2]]
    result = api_request("/corrections/batch/review", "POST", JOURNALIST_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    denied = result.get("error", {}).get("code") == "FORBIDDEN"
    print_result("Journalist batch review is denied", denied, f"Response: {result.get('error', {}).get('message', 'No error')}")

    return denied

def test_editor_cannot_batch_publish():
    """Test: Editor cannot perform batch publish"""
    print_header("Test: Editor Cannot Batch Publish")

    correction_ids = get_corrections_by_status(EDITOR_TOKEN, "pending_publish")
    if not correction_ids:
        print_result("Get pending_publish corrections", False, "No corrections found")
        return False

    ids = [c["id"] for c in correction_ids[:2]]
    result = api_request("/corrections/batch/publish", "POST", EDITOR_TOKEN, {
        "ids": ids
    })

    denied = result.get("error", {}).get("code") == "FORBIDDEN"
    print_result("Editor batch publish is denied", denied, f"Response: {result.get('error', {}).get('message', 'No error')}")

    return denied

def test_legal_cannot_batch_review():
    """Test: Legal cannot perform batch review (editor's job)"""
    print_header("Test: Legal Cannot Batch Review")

    correction_ids = get_corrections_by_status(LEGAL_TOKEN, "pending_editor")
    if not correction_ids:
        print_result("Get pending_editor corrections", False, "No corrections found")
        return False

    ids = [c["id"] for c in correction_ids[:2]]
    result = api_request("/corrections/batch/review", "POST", LEGAL_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    denied = result.get("error", {}).get("code") == "FORBIDDEN"
    print_result("Legal batch review is denied", denied, f"Response: {result.get('error', {}).get('message', 'No error')}")

    return denied

def test_editor_cannot_batch_legal_confirm():
    """Test: Editor cannot perform batch legal confirm"""
    print_header("Test: Editor Cannot Batch Legal Confirm")

    correction_ids = get_corrections_by_status(EDITOR_TOKEN, "pending_legal")
    if not correction_ids:
        print_result("Get pending_legal corrections", False, "No corrections found")
        return False

    ids = [c["id"] for c in correction_ids[:2]]
    result = api_request("/corrections/batch/legal", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "confirm"
    })

    denied = result.get("error", {}).get("code") == "FORBIDDEN"
    print_result("Editor batch legal confirm is denied", denied, f"Response: {result.get('error', {}).get('message', 'No error')}")

    return denied

def test_editor_batch_review_full_success():
    """Test: Editor batch review - full success"""
    print_header("Test: Editor Batch Review - Full Success")

    correction_ids = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")
    if len(correction_ids) < 2:
        print_result("Get pending_editor corrections", False, f"Only {len(correction_ids)} found, need at least 2")
        return False

    ids = [c["id"] for c in correction_ids[:2]]
    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    success = result.get("success", False)
    summary = result.get("summary", {})

    print_result("Batch review request successful", success, f"Response: {result}")
    if success:
        print_result("All corrections processed", summary.get("success", 0) + summary.get("failed", 0) == len(ids),
                    f"Processed: {summary.get('success', 0) + summary.get('failed', 0)}, Total: {len(ids)}")
        print_result("Success count is correct", summary.get("success", 0) == len(ids),
                    f"Success: {summary.get('success', 0)}, Expected: {len(ids)}")

        for item in result.get("data", []):
            if item["id"] in ids:
                print_result(f"Correction {item['id'][:8]}... result", item["success"],
                           f"Message: {item['message']}, Reason: {item.get('reason', 'N/A')}")

    return success

def test_editor_batch_review_partial_failure():
    """Test: Editor batch review - partial failure (mix of valid and invalid statuses)"""
    print_header("Test: Editor Batch Review - Partial Failure")

    pending_editor = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")
    pending_legal = get_corrections_by_status(ADMIN_TOKEN, "pending_legal")

    if not pending_editor or not pending_legal:
        print_result("Get corrections", False, "Not enough corrections for test")
        return False

    ids = [pending_editor[0]["id"], pending_legal[0]["id"]]
    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    success = result.get("success", False)
    summary = result.get("summary", {})

    print_result("Batch review request processed", True)
    print_result("Has both success and skip/fail", summary.get("success", 0) > 0 and (summary.get("skipped", 0) > 0 or summary.get("failed", 0) > 0),
                f"Success: {summary.get('success', 0)}, Skipped: {summary.get('skipped', 0)}, Failed: {summary.get('failed', 0)}")

    for item in result.get("data", []):
        is_pending_editor = any(c["id"] == item["id"] and c["status"] == "pending_editor" for c in pending_editor)
        expected_success = item["success"] if is_pending_editor else not item["success"]
        print_result(f"Correction {item['id'][:8]}...", expected_success,
                    f"Expected: {'success' if is_pending_editor else 'skip/fail'}, Got: {item['message']}")

    return success

def test_editor_batch_reject_requires_comment():
    """Test: Editor batch reject requires comment"""
    print_header("Test: Editor Batch Reject Requires Comment")

    correction_ids = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")
    if not correction_ids:
        print_result("Get pending_editor corrections", False, "No corrections found")
        return False

    ids = [correction_ids[0]["id"]]
    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "reject"
    })

    validation_error = result.get("error", {}).get("code") == "VALIDATION_ERROR"
    print_result("Reject without comment fails validation", validation_error,
                f"Error: {result.get('error', {}).get('message', 'No error')}")

    if validation_error:
        result_with_comment = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
            "ids": ids,
            "action": "reject",
            "comment": "Test rejection reason"
        })
        print_result("Reject with comment succeeds", result_with_comment.get("success", False))

    return validation_error

def test_published_rejected_cannot_be_batched():
    """Test: Published and rejected corrections cannot be batched"""
    print_header("Test: Published/Rejected Cannot Be Batched")

    published = get_corrections_by_status(ADMIN_TOKEN, "published")
    rejected = get_corrections_by_status(ADMIN_TOKEN, "rejected")
    pending_editor = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")

    if not published or not rejected or not pending_editor:
        print_result("Get corrections", False, "Not enough corrections for test")
        return False

    ids = [published[0]["id"], rejected[0]["id"], pending_editor[0]["id"]]
    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    has_skips = False
    for item in result.get("data", []):
        if item["id"] in [published[0]["id"], rejected[0]["id"]]:
            if item["message"] == "跳过" and "published" in item.get("reason", "") or "rejected" in item.get("reason", ""):
                has_skips = True
                print_result(f"Correction {item['id'][:8]}... skipped correctly", True,
                           f"Reason: {item.get('reason', 'N/A')}")

    return has_skips

def test_legal_batch_confirm_full_success():
    """Test: Legal batch confirm - full success"""
    print_header("Test: Legal Batch Confirm - Full Success")

    pending_legal = get_corrections_by_status(ADMIN_TOKEN, "pending_legal")
    if len(pending_legal) < 2:
        print_result("Get pending_legal corrections", False, f"Only {len(pending_legal)} found")
        return False

    ids = [c["id"] for c in pending_legal[:2]]
    result = api_request("/corrections/batch/legal", "POST", LEGAL_TOKEN, {
        "ids": ids,
        "action": "confirm"
    })

    success = result.get("success", False)
    summary = result.get("summary", {})

    print_result("Batch legal confirm request successful", success)
    if success:
        print_result("Success count is correct", summary.get("success", 0) == len(ids),
                    f"Success: {summary.get('success', 0)}, Expected: {len(ids)}")

    return success

def test_admin_batch_publish_full_success():
    """Test: Admin batch publish - full success"""
    print_header("Test: Admin Batch Publish - Full Success")

    pending_publish = get_corrections_by_status(ADMIN_TOKEN, "pending_publish")
    if len(pending_publish) < 2:
        print_result("Get pending_publish corrections", False, f"Only {len(pending_publish)} found")
        return False

    ids = [c["id"] for c in pending_publish[:2]]
    result = api_request("/corrections/batch/publish", "POST", ADMIN_TOKEN, {
        "ids": ids
    })

    success = result.get("success", False)
    summary = result.get("summary", {})

    print_result("Batch publish request successful", success)
    if success:
        print_result("Success count is correct", summary.get("success", 0) == len(ids),
                    f"Success: {summary.get('success', 0)}, Expected: {len(ids)}")

    return success

def test_admin_batch_revoke_full_success():
    """Test: Admin batch revoke - full success"""
    print_header("Test: Admin Batch Revoke - Full Success")

    published = get_corrections_by_status(ADMIN_TOKEN, "published")
    if len(published) < 2:
        print_result("Get published corrections", False, f"Only {len(published)} found")
        return False

    ids = [c["id"] for c in published[:2]]
    result = api_request("/corrections/batch/revoke", "POST", ADMIN_TOKEN, {
        "ids": ids
    })

    success = result.get("success", False)
    summary = result.get("summary", {})

    print_result("Batch revoke request successful", success)
    if success:
        print_result("Success count is correct", summary.get("success", 0) == len(ids),
                    f"Success: {summary.get('success', 0)}, Expected: {len(ids)}")

    return success

def test_batch_operation_returns_individual_results():
    """Test: Each operation result is returned individually"""
    print_header("Test: Individual Operation Results Returned")

    pending_editor = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")
    if len(pending_editor) < 3:
        print_result("Get pending_editor corrections", False, f"Only {len(pending_editor)} found")
        return False

    ids = [c["id"] for c in pending_editor[:3]]
    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": ids,
        "action": "pass"
    })

    data = result.get("data", [])
    has_individual_results = len(data) == len(ids)

    print_result("Results count matches input count", has_individual_results,
                f"Results: {len(data)}, Input: {len(ids)}")

    for item in data:
        has_message = "message" in item
        has_reason = "reason" in item
        print_result(f"Item {item['id'][:8]}... has message", has_message, f"Message: {item.get('message')}")
        if not item["success"]:
            print_result(f"Item {item['id'][:8]}... has reason", has_reason, f"Reason: {item.get('reason', 'N/A')}")

    return has_individual_results

def test_batch_history_recorded():
    """Test: Batch operations are recorded in history"""
    print_header("Test: Batch Operations Recorded in History")

    correction_ids = get_corrections_by_status(ADMIN_TOKEN, "pending_editor")
    if not correction_ids:
        print_result("Get corrections for history check", False, "No corrections found")
        return False

    corr_id = correction_ids[0]["id"]

    before_history = api_request(f"/corrections/{corr_id}", token=ADMIN_TOKEN)
    before_count = len(before_history.get("data", {}).get("history", []))

    result = api_request("/corrections/batch/review", "POST", EDITOR_TOKEN, {
        "ids": [corr_id],
        "action": "pass",
        "comment": "Batch test comment"
    })

    after_history = api_request(f"/corrections/{corr_id}", token=ADMIN_TOKEN)
    after_count = len(after_history.get("data", {}).get("history", []))

    history_added = after_count > before_count
    print_result("History record added after batch operation", history_added,
                f"Before: {before_count}, After: {after_count}")

    if history_added:
        latest_history = after_history["data"]["history"][-1]
        print_result("History has correct action", "review_pass" in latest_history.get("action", ""),
                    f"Action: {latest_history.get('action')}")
        print_result("History has operator info", latest_history.get("operatorRole") == "editor",
                    f"Operator: {latest_history.get('operatorName')} ({latest_history.get('operatorRole')})")
        print_result("History has comment", latest_history.get("comment") == "Batch test comment",
                    f"Comment: {latest_history.get('comment')}")

    return history_added

def main():
    print("="*60)
    print(" Correction & Publish Workflow - Batch Operation Test")
    print("="*60)
    print(f"API URL: {BASE_URL}")

    print("\nToken Roles:")
    print(f"  Journalist (1): {JOURNALIST_TOKEN}")
    print(f"  Editor (2): {EDITOR_TOKEN}")
    print(f"  Legal (3): {LEGAL_TOKEN}")
    print(f"  Admin (4): {ADMIN_TOKEN}")

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

    print_header("1. Permission Denied Tests")
    results.append(("Journalist cannot batch review", test_journalist_cannot_batch_review()))
    results.append(("Editor cannot batch publish", test_editor_cannot_batch_publish()))
    results.append(("Legal cannot batch review", test_legal_cannot_batch_review()))
    results.append(("Editor cannot batch legal confirm", test_editor_cannot_batch_legal_confirm()))

    print_header("2. Full Success Tests")
    results.append(("Editor batch review full success", test_editor_batch_review_full_success()))
    results.append(("Legal batch confirm full success", test_legal_batch_confirm_full_success()))
    results.append(("Admin batch publish full success", test_admin_batch_publish_full_success()))
    results.append(("Admin batch revoke full success", test_admin_batch_revoke_full_success()))

    print_header("3. Partial Failure Tests")
    results.append(("Editor batch review partial failure", test_editor_batch_review_partial_failure()))

    print_header("4. Validation Tests")
    results.append(("Batch reject requires comment", test_editor_batch_reject_requires_comment()))
    results.append(("Published/rejected excluded from batch", test_published_rejected_cannot_be_batched()))

    print_header("5. Result Display Tests")
    results.append(("Individual operation results returned", test_batch_operation_returns_individual_results()))
    results.append(("Batch operations recorded in history", test_batch_history_recorded()))

    print_header("Test Summary")
    all_passed = True
    for name, passed in results:
        status = PASS_MARK if passed else FAIL_MARK
        print(f"{status} {name}")
        if not passed:
            all_passed = False

    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)

    print("\n" + "="*60)
    print(f"Results: {passed_count}/{total_count} tests passed")
    print("="*60)

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
