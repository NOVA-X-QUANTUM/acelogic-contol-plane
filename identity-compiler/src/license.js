// ############################################################
// #                ACELOGIC PLATFORM v4                      #
// ############################################################
// # Module        : LICENSE
// # Environment   : Development
// # Version       : 4.0.1
// # Updated       : 2026-05-15
// #
// # Purpose:
// # Governance, grammar licensing, and execution-tier
// # validation utilities for ACELOGIC™ deterministic
// # runtime enforcement.
//
// # Responsibilities:
// # - license tier validation
// # - symbolic grammar governance
// # - namespace access enforcement
// # - continuity-tier restrictions
// # - deterministic governance validation
// #
// ############################################################

// ------------------------------------------------------------------
// License Tiers
// ------------------------------------------------------------------

export const LICENSE_TIERS = new Set([
  'TIER_0',
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'TIER_4',
  'TIER_5'
]);

// ------------------------------------------------------------------
// Grammar License Levels
// ------------------------------------------------------------------

export const GRAMMAR_LEVELS = new Set([
  'NONE',
  'RESTRICTED',
  'FULL'
]);

// ------------------------------------------------------------------
// Tier Normalization
// ------------------------------------------------------------------

/**
 * Converts license tier strings into numeric values.
 */
export function tierNumber(tier) {

  if (!LICENSE_TIERS.has(tier)) {
    throw new Error(
      'ACELOGIC_INVALID_LICENSE_TIER'
    );
  }

  return Number(
    tier.replace('TIER_', '')
  );
}

// ------------------------------------------------------------------
// Grammar License Normalization
// ------------------------------------------------------------------

/**
 * Normalizes grammar licensing configuration.
 */
export function normalizeGrammarLicense(
  grammarLicense = {}
) {

  const enabled =
    grammarLicense.enabled === true;

  const level =
    grammarLicense.level ||
    (enabled ? 'RESTRICTED' : 'NONE');

  if (!GRAMMAR_LEVELS.has(level)) {
    throw new Error(
      'ACELOGIC_INVALID_GRAMMAR_LEVEL'
    );
  }

  const allowedPrefixes =
    Array.isArray(grammarLicense.allowedPrefixes)
      ? grammarLicense.allowedPrefixes
      : [];

  if (
    level === 'RESTRICTED' &&
    allowedPrefixes.length === 0
  ) {
    throw new Error(
      'ACELOGIC_RESTRICTED_GRAMMAR_REQUIRES_ALLOWED_PREFIXES'
    );
  }

  if (!enabled && level !== 'NONE') {
    throw new Error(
      'ACELOGIC_GRAMMAR_DISABLED_LEVEL_MISMATCH'
    );
  }

  return {
    enabled,
    level,
    allowedPrefixes
  };
}

// ------------------------------------------------------------------
// Symbolic Namespace Governance
// ------------------------------------------------------------------

/**
 * Validates symbolic namespace access against
 * grammar licensing constraints.
 */
export function validateGrammarAccess(
  symbolicNamespace,
  grammarLicense
) {

  // Non-symbolic namespaces bypass grammar enforcement.

  if (!symbolicNamespace?.startsWith('#us#.')) {
    return true;
  }

  const gl =
    normalizeGrammarLicense(grammarLicense);

  if (!gl.enabled) {
    throw new Error(
      'ACELOGIC_UNLICENSED_GRAMMAR_USE'
    );
  }

  // Full access permits all symbolic namespaces.

  if (gl.level === 'FULL') {
    return true;
  }

  // Restricted access validates allowed prefixes.

  if (gl.level === 'RESTRICTED') {

    const allowed =
      gl.allowedPrefixes.some((prefix) =>
        symbolicNamespace.startsWith(prefix)
      );

    if (!allowed) {
      throw new Error(
        'ACELOGIC_GRAMMAR_PREFIX_DENIED'
      );
    }

    return true;
  }

  throw new Error(
    'ACELOGIC_UNLICENSED_GRAMMAR_USE'
  );
}

// ------------------------------------------------------------------
// Continuity Governance Validation
// ------------------------------------------------------------------

/**
 * Validates continuity governance rules
 * across execution license tiers.
 */
export function validateCovenantRules({
  licenseTier,
  continuityHash
}) {

  const tier =
    tierNumber(licenseTier);

  // Tier 5 requires continuity governance.

  if (
    tier === 5 &&
    !continuityHash
  ) {
    throw new Error(
      'ACELOGIC_TIER5_REQUIRES_CONTINUITY_HASH'
    );
  }

  // Lower tiers cannot specify continuity governance.

  if (
    tier < 5 &&
    continuityHash
  ) {
    throw new Error(
      'ACELOGIC_CONTINUITY_HASH_NOT_ALLOWED_BELOW_TIER5'
    );
  }

  return true;
}

// ############################################################
// # End of File: license.js
// # Do not modify without code review
// ############################################################