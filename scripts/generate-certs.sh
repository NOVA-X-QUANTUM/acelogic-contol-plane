#!/bin/bash

############################################################
# ACELOGIC PLATFORM v4
############################################################
# Module        : GENERATE-CERTS
# Environment   : Development
# Version       : 4.1.0
# Updated       : 2026-05-15
#
# Purpose:
# Generates local development TLS certificates for the
# ACELOGIC™ Kubernetes admission webhook.
#
# Responsibilities:
# - create local certificate authority
# - generate webhook TLS keypair
# - configure Kubernetes service SANs
# - provision admission webhook TLS assets
#
############################################################

set -euo pipefail

# ----------------------------------------------------------
# Runtime Paths
# ----------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TLS_DIR="${ROOT_DIR}/local-policy-evaluator/tls"

mkdir -p "${TLS_DIR}"

cd "${TLS_DIR}"

echo ""
echo "============================================================"
echo "ACELOGIC™ TLS Certificate Generation"
echo "============================================================"
echo ""

# ----------------------------------------------------------
# Cleanup Existing Certificates
# ----------------------------------------------------------

rm -f \
  ca.key \
  ca.crt \
  ca.srl \
  tls.key \
  tls.crt \
  webhook.csr \
  webhook.ext

# ----------------------------------------------------------
# Generate Certificate Authority
# ----------------------------------------------------------

echo "Generating ACELOGIC™ Certificate Authority..."

openssl genrsa \
  -out ca.key \
  4096

openssl req \
  -x509 \
  -new \
  -nodes \
  -key ca.key \
  -sha256 \
  -days 3650 \
  -out ca.crt \
  -subj "/CN=ACELOGIC-CA"

# ----------------------------------------------------------
# Generate Webhook Private Key
# ----------------------------------------------------------

echo "Generating webhook TLS private key..."

openssl genrsa \
  -out tls.key \
  4096

# ----------------------------------------------------------
# Generate Webhook CSR
# ----------------------------------------------------------

echo "Generating webhook certificate signing request..."

openssl req \
  -new \
  -key tls.key \
  -out webhook.csr \
  -subj "/CN=acelogic-evaluator.acelogic-system.svc"

# ----------------------------------------------------------
# Subject Alternative Names
# ----------------------------------------------------------

cat > webhook.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth

subjectAltName=@alt_names

[alt_names]
DNS.1=acelogic-evaluator
DNS.2=acelogic-evaluator.acelogic-system
DNS.3=acelogic-evaluator.acelogic-system.svc
DNS.4=acelogic-evaluator.acelogic-system.svc.cluster.local
EOF

# ----------------------------------------------------------
# Sign Webhook Certificate
# ----------------------------------------------------------

echo "Signing webhook certificate..."

openssl x509 \
  -req \
  -in webhook.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out tls.crt \
  -days 3650 \
  -sha256 \
  -extfile webhook.ext

# ----------------------------------------------------------
# Permissions
# ----------------------------------------------------------

chmod 600 tls.key
chmod 644 tls.crt
chmod 644 ca.crt

# ----------------------------------------------------------
# Output Summary
# ----------------------------------------------------------

echo ""
echo "============================================================"
echo "ACELOGIC™ TLS Assets Generated"
echo "============================================================"
echo "CA Certificate:        ${TLS_DIR}/ca.crt"
echo "Webhook Certificate:   ${TLS_DIR}/tls.crt"
echo "Webhook Private Key:   ${TLS_DIR}/tls.key"
echo "============================================================"
echo ""

############################################################
# End of File: generate-certs.sh
# Do not modify without code review
############################################################