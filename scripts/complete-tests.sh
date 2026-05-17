#!/bin/bash

############################################################
# ACELOGIC PLATFORM v4
############################################################
# Module        : COMPLETE-TESTS
# Environment   : Development
# Version       : 4.1.0
# Updated       : 2026-05-15
#
# Purpose:
# Deterministic validation suite for the
# ACELOGIC™ Local Policy Evaluator.
#
# Responsibilities:
# - identity validation testing
# - continuity enforcement testing
# - lease governance testing
# - duplicate-runtime prevention testing
# - deterministic admission validation
# - fail-closed enforcement validation
#
############################################################

set -euo pipefail

# ----------------------------------------------------------
# Runtime Configuration
# ----------------------------------------------------------

NAMESPACE="us-enterprise-partner-ai"

AGENT_ID="EA-482991"

POLICY_NAME="ea-482991"

DEPLOY_NAMESPACE="acelogic-system"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

# ----------------------------------------------------------
# Console Helpers
# ----------------------------------------------------------

print_header() {

  echo ""
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

pass() {
  echo "✅ $1"
}

fail() {
  echo "❌ $1"
  exit 1
}

# ----------------------------------------------------------
# Admission Assertions
# ----------------------------------------------------------

expect_deny() {

  local output

  output=$(kubectl apply -f - 2>&1 || true)

  if echo "$output" | grep -qi "denied"; then
    pass "Denied as expected"
  else
    echo "$output"
    fail "Expected DENY but admission succeeded"
  fi
}

expect_allow() {

  local manifest="$1"

  local output

  output=$(echo "$manifest" | kubectl apply -f - 2>&1 || true)

  if echo "$output" | grep -qiE "created|configured"; then

    pass "Allowed as expected"

    echo "$manifest" | kubectl delete -f - \
      --ignore-not-found >/dev/null 2>&1

  else
    echo "$output"
    fail "Expected ALLOW but admission failed"
  fi
}

# ----------------------------------------------------------
# Fetch Deterministic Purpose Hash
# ----------------------------------------------------------

PURPOSE_HASH=$(
  kubectl get agentidentitypolicy \
    "$POLICY_NAME" \
    -n "$DEPLOY_NAMESPACE" \
    -o jsonpath='{.spec.purposeHash}'
)

# ----------------------------------------------------------
# Test Suite Start
# ----------------------------------------------------------

print_header "ACELOGIC™ Deterministic Admission Tests"

# ----------------------------------------------------------
# 1. Valid Canonical Identity
# ----------------------------------------------------------

print_header "1. Valid Canonical Identity → ALLOW"

VALID_MANIFEST=$(cat <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-valid
  namespace: ${NAMESPACE}
  labels:
    acelogic.ai/agent-id: "${AGENT_ID}"
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "${PURPOSE_HASH}"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF
)

expect_allow "$VALID_MANIFEST"

# ----------------------------------------------------------
# 2. Missing Agent Identity
# ----------------------------------------------------------

print_header "2. Missing Agent Identity → DENY"

cat <<EOF | expect_deny
apiVersion: v1
kind: Pod
metadata:
  name: test-missing-agent-id
  namespace: ${NAMESPACE}
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "${PURPOSE_HASH}"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF

# ----------------------------------------------------------
# 3. Invalid Purpose Hash
# ----------------------------------------------------------

print_header "3. Invalid Purpose Hash → DENY"

cat <<EOF | expect_deny
apiVersion: v1
kind: Pod
metadata:
  name: test-invalid-purpose
  namespace: ${NAMESPACE}
  labels:
    acelogic.ai/agent-id: "${AGENT_ID}"
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "0000000000000000000000000000000000000000000000000000000000000000"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF

# ----------------------------------------------------------
# 4. Namespace Projection Mismatch
# ----------------------------------------------------------

print_header "4. Namespace Projection Mismatch → DENY"

cat <<EOF | expect_deny
apiVersion: v1
kind: Pod
metadata:
  name: test-namespace-mismatch
  namespace: default
  labels:
    acelogic.ai/agent-id: "${AGENT_ID}"
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "${PURPOSE_HASH}"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF

# ----------------------------------------------------------
# 5. Expired Lease
# ----------------------------------------------------------

print_header "5. Expired Lease → DENY"

kubectl patch agentidentitypolicy \
  "$POLICY_NAME" \
  -n "$DEPLOY_NAMESPACE" \
  --type merge \
  -p '{"spec":{"lease":{"expiresAt":"2000-01-01T00:00:00Z"}}}'

sleep 3

cat <<EOF | expect_deny
apiVersion: v1
kind: Pod
metadata:
  name: test-expired-lease
  namespace: ${NAMESPACE}
  labels:
    acelogic.ai/agent-id: "${AGENT_ID}"
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "${PURPOSE_HASH}"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF

# Restore lease

kubectl patch agentidentitypolicy \
  "$POLICY_NAME" \
  -n "$DEPLOY_NAMESPACE" \
  --type merge \
  -p '{"spec":{"lease":{"expiresAt":"2026-12-31T23:59:59Z"}}}'

sleep 3

# ----------------------------------------------------------
# 6. Duplicate Runtime Validation
# ----------------------------------------------------------

print_header "6. Duplicate Runtime → DENY"

kubectl apply -f tests/pod-valid-enterprise.yaml \
  >/dev/null 2>&1

sleep 3

cat <<EOF | expect_deny
apiVersion: v1
kind: Pod
metadata:
  name: test-duplicate-runtime
  namespace: ${NAMESPACE}
  labels:
    acelogic.ai/agent-id: "${AGENT_ID}"
  annotations:
    acelogic.ai/symbolic-namespace: "#us#.enterprise.partner.ai"
    acelogic.ai/purpose-hash: "${PURPOSE_HASH}"
spec:
  containers:
    - name: agent
      image: nginx:stable
EOF

kubectl delete pod enterprise-agent \
  -n "$NAMESPACE" \
  --ignore-not-found \
  >/dev/null 2>&1

# ----------------------------------------------------------
# 7. DELETE Operations
# ----------------------------------------------------------

print_header "7. DELETE Operations → ALLOW"

kubectl run test-delete \
  --image=nginx:stable \
  -n "$NAMESPACE"

kubectl delete pod test-delete \
  -n "$NAMESPACE"

pass "DELETE operation allowed"

# ----------------------------------------------------------
# Test Suite Complete
# ----------------------------------------------------------

print_header "ACELOGIC™ Test Suite Complete"

echo "All deterministic admission tests passed."

############################################################
# End of File: complete-tests.sh
# Do not modify without code review
############################################################