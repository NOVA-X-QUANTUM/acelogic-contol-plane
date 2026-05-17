// ############################################################
// #                ACELOGIC PLATFORM v4                      #
// ############################################################
// # Module        : CANONICALIZE
// # Environment   : Development
// # Version       : 4.0.1
// # Updated       : 2026-05-15
// #
// # Purpose:
// # Deterministic canonical serialization for identity,
// # continuity, and governance hashing.
// #
// # Guarantees:
// # - Stable key ordering
// # - Deterministic output generation
// # - Cross-runtime consistency
// # - Hash-safe serialization
// #
// ############################################################

/**
 * Deterministically canonicalizes values into a stable string format.
 *
 * Used for:
 * - identity fingerprint generation
 * - purpose hash generation
 * - continuity verification
 * - canonical execution validation
 *
 * Rules:
 * - Object keys sorted lexicographically
 * - Undefined values removed
 * - Floats rejected
 * - Non-finite numbers rejected
 * - Arrays preserve order
 */

export function canonicalize(value) {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'string') {
    return JSON.stringify(value);
  }

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (type === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error('ACELOGIC_CANONICALIZE_FLOAT_NOT_ALLOWED');
    }

    if (!Number.isFinite(value)) {
      throw new Error('ACELOGIC_CANONICALIZE_NONFINITE_NUMBER');
    }

    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  if (type === 'object') {
    const keys = Object
      .keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();

    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
      .join(',')}}`;
  }

  throw new Error(`ACELOGIC_CANONICALIZE_UNSUPPORTED_TYPE:${type}`);
}

// ############################################################
// # End of File: canonicalize.js
// # Do not modify without code review
// ############################################################