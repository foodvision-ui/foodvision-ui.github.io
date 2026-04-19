#!/bin/bash
# Start the FoodVision AI Jac Backend
# Usage: ./start.sh [port]
#
# The backend serves:
#   POST /user/register          - Create account
#   POST /user/login             - Login (returns JWT)
#   POST /function/health        - Health check
#   POST /function/analyze_meal  - Qwen3-VL proxy (no auth needed)
#   POST /function/get_profile   - Get profile (auth required)
#   POST /function/update_profile- Update profile (auth required)
#   POST /function/save_meal     - Save meal (auth required)
#   POST /function/get_meals     - Get meal history (auth required)

PORT=${1:-8000}
cd "$(dirname "$0")"
echo "Starting FoodVision AI Backend on port $PORT..."
echo "API docs: http://localhost:$PORT/"
echo ""
jac start main.jac --no_client -p "$PORT"
