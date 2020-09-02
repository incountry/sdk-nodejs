#!/usr/bin/env bash

if [[ "${TRAVIS_BUILD_SCRIPT_DEBUG_ENABLED:-false}" == 'true' ]]; then
  set -x
fi

set -e
set -o pipefail

RED="\033[31;1m"
GREEN="\033[32;1m"
RESET="\033[0m"

log_info() {
  echo -e "${GREEN}$1${RESET}"
}
log_error() {
  echo -e "${RED}$1${RESET}"
}

# Return true if branch matches the grep regexp pattern specified and false otherwise
branch_matches() {
  if grep -qE "$1" <(echo "$TRAVIS_BRANCH"); then return 0; else return 1; fi
}

# Install deps. There is an npm cache in Travis out-the-box
npm install

# DY SNYK is switched off because on this concrete project SNYK fails to monitor with error "Cannot create property 'path' on string '���n� �߅�J���[�f76kֽ"
# This is a SNYK monitor error, snyk test works fine. I.e. this is the issue in SNYK when pushing the successfull validation results to SNYK cloud.
# Example error can be viewed at: https://travis-ci.com/github/incountry/sdk-nodejs/jobs/380065723
#
# SNYK dependency scan - runs for master and RC branches, but not for PRs
#if [[ "$TRAVIS_PULL_REQUEST" == 'false' ]] && branch_matches "^master$|^develop$|^SB_*|^RC_*"; then
#  npm install -g snyk
#  snyk monitor --org=incountry --prune-repeated-subdependencies --remote-repo-url="${APP_NAME}" --project-name="${APP_NAME}:${TRAVIS_BRANCH}"
#else
  log_info "Snyk dependency scan skipped"
#fi

# Run linters, and integration tests
npm run validate-eslint
# Run Unit tests
npm run test

# Sonar Quality gate. If it fails, it fails the build due to 'sonar.qualitygate.wait=true' (but you could temporarily override this via Travis envvar)
sonar-scanner -Dsonar.qualitygate.wait=${SONAR_QUALITY_GATE_FAILS_BUILD:-true}
