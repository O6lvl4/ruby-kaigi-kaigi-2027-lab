#!/usr/bin/env sh
set -eu
mkdir -p evidence .test-data
TEST_DATA_DIR="$(pwd)/.test-data/run-$(date +%s)-$$"
export TEST_DATA_DIR
node tests/release-runtime.mjs
node tests/summary-node.mjs > evidence/summary-node.log 2>&1
node tests/integration.mjs write > evidence/integration-write.log 2>&1
node tests/integration.mjs reopen > evidence/integration-reopen.log 2>&1
cat evidence/summary-node.log evidence/integration-write.log evidence/integration-reopen.log
