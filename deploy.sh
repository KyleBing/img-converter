#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# 部署目标，可通过环境变量覆盖
DEPLOY_HOST="${DEPLOY_HOST:-kylebing.cn}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/html/tools/img-converter}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DIST_DIR="dist"

section() {
  echo
  echo "── $1 ──"
}

section "build"
if [[ "${SKIP_BUILD}" == "1" ]]; then
  echo "  skip build (SKIP_BUILD=1)"
else
  npm run build
fi

# 构建结果校验，避免上传空目录
if [[ ! -d "${DIST_DIR}" ]] || [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "error: ${DIST_DIR}/ is missing, run build first" >&2
  exit 1
fi

DEST="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

# 远端目录不存在时先建好
section "mkdir"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '${DEPLOY_PATH}'"

# rsync 上传，--delete 保证线上内容与本地构建完全一致
section "upload"
echo "  → ${DEST}"
rsync -avz --delete \
  --exclude '.DS_Store' \
  --exclude '.git' \
  "${DIST_DIR}/" "${DEST}"

section "done"
echo "  https://${DEPLOY_HOST}/tools/img-converter/"
