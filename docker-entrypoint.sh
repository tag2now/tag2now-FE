#!/bin/sh
# Generate runtime config from environment variables
cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  API_BASE: "${API_BASE:-/api}",
}
EOF

exec nginx -g 'daemon off;'
