// ############################################################
// #                ACELOGIC PLATFORM v4                      #
// ############################################################
// # Module        : EVALUATOR
// # Environment   : Development
// # Version       : 4.1.0
// # Updated       : 2026-05-15
// #
// # Purpose:
// # Deterministic admission evaluation engine for
// # ACELOGIC™ runtime governance.
//
// # Responsibilities:
// # - identity verification
// # - namespace projection validation
// # - purpose hash enforcement
// # - continuity-safe admission control
// # - deterministic fingerprint validation
// # - lease governance enforcement
// # - duplicate-runtime prevention
// #
// ############################################################

import crypto from 'crypto';

import {
  canonicalize,
  computeFingerprint
} from '../../identity-compiler/src/index.js';

// ------------------------------------------------------------------
// SHA3-256 Utility
// ------------------------------------------------------------------

function sha3_256Hex(input) {

  return crypto
    .createHash('sha3-256')
    .update(input)
    .digest('hex');
}

// ------------------------------------------------------------------
// Lease Expiration Validation
// ------------------------------------------------------------------

function isExpired(isoTimestamp) {

  if (!isoTimestamp) {
    return true;
  }

  return (
    Date.now() >=
    new Date(isoTimestamp).getTime()
  );
}

// ------------------------------------------------------------------
// Grammar License Enforcement
// ------------------------------------------------------------------

function prefixAllowed(
  symbolicNamespace,
  grammarLicense
) {

  // Non-symbolic namespaces bypass enforcement.

  if (!symbolicNamespace?.startsWith('#us#.')) {
    return true;
  }

  // Grammar enforcement required.

  if (!grammarLicense?.enabled) {
    return false;
  }

  // Full symbolic access.

  if (grammarLicense.level === 'FULL') {
    return true;
  }

  // Restricted symbolic access.

  if (grammarLicense.level === 'RESTRICTED') {

    return (
      grammarLicense.allowedPrefixes || []
    ).some((prefix) =>
      symbolicNamespace.startsWith(prefix)
    );
  }

  return false;
}

// ------------------------------------------------------------------
// Deterministic Admission Evaluation
// ------------------------------------------------------------------

/**
 * Evaluates Kubernetes workloads against
 * deterministic ACELOGIC™ identity policy.
 */
export function evaluatePodAgainstPolicy({
  pod,
  policy
}) {

  // ----------------------------------------------------------------
  // Policy existence validation
  // ----------------------------------------------------------------

  if (!policy) {

    return {
      allowed: false,
      reason: 'ACELOGIC_MISSING_POLICY'
    };
  }

  const labels =
    pod.metadata?.labels || {};

  const annotations =
    pod.metadata?.annotations || {};

  const spec =
    policy.spec;

  // ----------------------------------------------------------------
  // 1. Agent identity validation
  // ----------------------------------------------------------------

  if (
    labels['acelogic.ai/agent-id'] !==
    spec.agentId
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_AGENT_ID_MISMATCH'
    };
  }

  // ----------------------------------------------------------------
  // 2. Symbolic namespace validation
  // ----------------------------------------------------------------

  if (
    annotations['acelogic.ai/symbolic-namespace'] !==
    spec.symbolicNamespace
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_SYMBOLIC_NAMESPACE_MISMATCH'
    };
  }

  // ----------------------------------------------------------------
  // 3. Kubernetes namespace projection validation
  // ----------------------------------------------------------------

  if (
    pod.metadata.namespace !==
    spec.k8sNamespace
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_K8S_NAMESPACE_MISMATCH'
    };
  }

  // ----------------------------------------------------------------
  // 4. Deterministic purpose hash validation
  // ----------------------------------------------------------------

  const suppliedPurposeHash =
    annotations['acelogic.ai/purpose-hash'];

  const canonicalMission =
    spec.mission.trim();

  const computedPurposeHash =
    sha3_256Hex(canonicalMission);

  if (
    suppliedPurposeHash !== spec.purposeHash ||
    suppliedPurposeHash !== computedPurposeHash
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_PURPOSE_HASH_MISMATCH'
    };
  }

  // ----------------------------------------------------------------
  // 5. Grammar license governance
  // ----------------------------------------------------------------

  if (
    !prefixAllowed(
      spec.symbolicNamespace,
      spec.grammarLicense
    )
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_GRAMMAR_LICENSE_DENIED'
    };
  }

  // ----------------------------------------------------------------
  // 6. Continuity governance rules
  // ----------------------------------------------------------------

  if (
    spec.licenseTier === 'TIER_5' &&
    !spec.continuityHash
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_TIER5_REQUIRES_CONTINUITY_HASH'
    };
  }

  if (
    spec.licenseTier !== 'TIER_5' &&
    spec.continuityHash
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_CONTINUITY_HASH_NOT_ALLOWED_BELOW_TIER5'
    };
  }

  // ----------------------------------------------------------------
  // 7. Deterministic fingerprint recomputation
  // ----------------------------------------------------------------

  const identityMetadataForFingerprint = {
    agentId: spec.agentId,

    agentClass: spec.agentClass,

    licenseTier: spec.licenseTier,

    symbolicNamespace:
      spec.symbolicNamespace,

    k8sNamespace:
      spec.k8sNamespace,

    mission:
      canonicalMission,

    owner:
      spec.owner,

    purposeHash:
      spec.purposeHash,

    fingerprintVersion:
      spec.fingerprintVersion
  };

  const recomputedFingerprint =
    computeFingerprint(
      canonicalize(
        identityMetadataForFingerprint
      )
    );

  if (
    recomputedFingerprint !==
    spec.fingerprint
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_FINGERPRINT_MISMATCH_INTERNAL'
    };
  }

  // ----------------------------------------------------------------
  // 8. Runtime state governance
  // ----------------------------------------------------------------

  if (spec.state !== 'ACTIVE') {

    return {
      allowed: false,
      reason: `ACELOGIC_STATE_${spec.state}`
    };
  }

  // ----------------------------------------------------------------
  // 9. Lease expiration validation
  // ----------------------------------------------------------------

  if (
    !spec.lease?.expiresAt ||
    isExpired(spec.lease.expiresAt)
  ) {

    return {
      allowed: false,
      reason: 'ACELOGIC_LEASE_EXPIRED'
    };
  }

  // ----------------------------------------------------------------
  // Admission approved
  // ----------------------------------------------------------------

  return {
    allowed: true,
    reason: 'ACELOGIC_APPROVED'
  };
}

// ############################################################
// # End of File: evaluator.js
// # Do not modify without code review
// ############################################################