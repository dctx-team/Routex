#!/usr/bin/env bash

#
# Routex Diagnostic Script
# Routex 诊断脚本
#
# This script checks the health and configuration of your Routex instance
# 此脚本检查 Routex 实例的健康状态和配置
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ROUTEX_URL=${ROUTEX_URL:-"http://localhost:8080"}
TIMEOUT=5

# Print formatted output
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Make HTTP request with error handling
http_get() {
    local url="$1"
    local response
    local http_code

    if command_exists curl; then
        response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null)
        http_code=$(echo "$response" | tail -n 1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "$body"
            return 0
        else
            return 1
        fi
    else
        print_error "curl is not installed. Please install curl to run diagnostics."
        exit 1
    fi
}

# Check system requirements
check_system_requirements() {
    print_header "System Requirements"

    # Check Bun
    if command_exists bun; then
        BUN_VERSION=$(bun --version)
        print_success "Bun is installed (version: $BUN_VERSION)"
    else
        print_error "Bun is not installed"
        print_info "Install Bun: curl -fsSL https://bun.sh/install | bash"
    fi

    # Check Node.js (alternative runtime)
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_info "Node.js is available (version: $NODE_VERSION)"
    fi

    # Check curl
    if command_exists curl; then
        print_success "curl is installed"
    else
        print_error "curl is not installed (required for testing)"
    fi

    # Check jq (for JSON parsing)
    if command_exists jq; then
        print_success "jq is installed (JSON parsing available)"
    else
        print_warning "jq is not installed (pretty JSON printing unavailable)"
    fi
}

# Check if Routex is running
check_routex_running() {
    print_header "Routex Service Status"

    print_info "Checking $ROUTEX_URL..."

    if response=$(http_get "$ROUTEX_URL/health"); then
        print_success "Routex is running"

        if command_exists jq; then
            echo "$response" | jq '.'
        else
            echo "$response"
        fi
    else
        print_error "Routex is not responding"
        print_info "Make sure Routex is running: bun run dev or bun run start"
        exit 1
    fi
}

# Check detailed health
check_detailed_health() {
    print_header "Detailed Health Check"

    if response=$(http_get "$ROUTEX_URL/health/detailed"); then
        if command_exists jq; then
            # Parse and display key information
            status=$(echo "$response" | jq -r '.status')
            uptime=$(echo "$response" | jq -r '.uptime')
            total_channels=$(echo "$response" | jq -r '.channels.total')
            enabled_channels=$(echo "$response" | jq -r '.channels.enabled')
            disabled_channels=$(echo "$response" | jq -r '.channels.disabled')
            memory_used=$(echo "$response" | jq -r '.system.memory.heapUsed')

            if [ "$status" = "healthy" ]; then
                print_success "Health Status: $status"
            else
                print_warning "Health Status: $status"
            fi

            echo ""
            print_info "Uptime: $(printf '%.2f' "$uptime") seconds"
            print_info "Memory Used: $memory_used"
            echo ""
            print_info "Channels: $total_channels total ($enabled_channels enabled, $disabled_channels disabled)"

            # Check for issues
            issues=$(echo "$response" | jq -r '.issues // empty | .[]' 2>/dev/null)
            if [ -n "$issues" ]; then
                echo ""
                print_warning "Issues detected:"
                echo "$issues" | while read -r issue; do
                    echo "  - $issue"
                done
            fi

            echo ""
            print_info "Full response:"
            echo "$response" | jq '.'
        else
            echo "$response"
        fi
    else
        print_error "Failed to get detailed health information"
    fi
}

# Check channels configuration
check_channels() {
    print_header "Channels Configuration"

    if response=$(http_get "$ROUTEX_URL/api/channels"); then
        if command_exists jq; then
            channel_count=$(echo "$response" | jq '.data | length')

            if [ "$channel_count" -eq 0 ]; then
                print_warning "No channels configured"
                print_info "Add channels via: POST $ROUTEX_URL/api/channels"
            else
                print_success "$channel_count channel(s) configured"
                echo ""

                echo "$response" | jq -r '.data[] | "\(.name) - \(.type) - \(.status)"' | while read -r line; do
                    name=$(echo "$line" | cut -d'-' -f1 | xargs)
                    type=$(echo "$line" | cut -d'-' -f2 | xargs)
                    status=$(echo "$line" | cut -d'-' -f3 | xargs)

                    if [ "$status" = "enabled" ]; then
                        print_success "[$type] $name ($status)"
                    else
                        print_warning "[$type] $name ($status)"
                    fi
                done
            fi
        else
            echo "$response"
        fi
    else
        print_error "Failed to get channels information"
    fi
}

# Check load balancer configuration
check_load_balancer() {
    print_header "Load Balancer Configuration"

    if response=$(http_get "$ROUTEX_URL/api/strategy"); then
        if command_exists jq; then
            strategy=$(echo "$response" | jq -r '.data.strategy')
            print_success "Current strategy: $strategy"

            case "$strategy" in
                priority)
                    print_info "Channels are selected by priority order"
                    ;;
                round_robin)
                    print_info "Channels are selected in rotation"
                    ;;
                weighted)
                    print_info "Channels are selected based on weights"
                    ;;
                least_used)
                    print_info "Least recently used channel is selected"
                    ;;
            esac
        else
            echo "$response"
        fi
    else
        print_error "Failed to get load balancer information"
    fi
}

# Test channel connectivity
test_channels() {
    print_header "Channel Connectivity Test"

    print_info "Testing all channels..."
    echo ""

    if response=$(curl -s -X POST --connect-timeout 30 "$ROUTEX_URL/api/channels/test/all" 2>/dev/null); then
        if command_exists jq; then
            summary=$(echo "$response" | jq '.data.summary')
            total=$(echo "$summary" | jq -r '.total')
            passed=$(echo "$summary" | jq -r '.passed')
            failed=$(echo "$summary" | jq -r '.failed')
            avg_latency=$(echo "$summary" | jq -r '.averageLatency')
            success_rate=$(echo "$summary" | jq -r '.successRate')

            print_info "Test Summary:"
            echo "  Total: $total"
            echo "  Passed: $passed"
            echo "  Failed: $failed"
            echo "  Average Latency: ${avg_latency}ms"
            echo "  Success Rate: ${success_rate}%"
            echo ""

            if [ "$failed" -gt 0 ]; then
                print_warning "Some channels failed connectivity test"
                echo ""
                echo "$response" | jq -r '.data.results[] | select(.success == false) | "\(.channelName): \(.error)"' | while read -r line; do
                    print_error "$line"
                done
            else
                print_success "All channels passed connectivity test"
            fi
        else
            echo "$response"
        fi
    else
        print_error "Failed to test channels"
        print_info "This might be expected if channels require valid API keys"
    fi
}

# Check configuration file
check_config_file() {
    print_header "Configuration Files"

    if [ -f "routex.json" ]; then
        print_success "routex.json found"

        if command_exists jq; then
            if jq empty routex.json 2>/dev/null; then
                print_success "routex.json is valid JSON"
            else
                print_error "routex.json contains invalid JSON"
            fi
        fi
    else
        print_warning "routex.json not found"
        print_info "Create configuration: cp routex.example.json routex.json"
    fi

    if [ -f ".env" ]; then
        print_success ".env file found"
    else
        print_info ".env file not found (optional)"
    fi
}

# Check network connectivity
check_network() {
    print_header "Network Connectivity"

    # Check if port 8080 is in use
    if command_exists lsof; then
        if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "Port 8080 is in use (Routex is listening)"
        else
            print_warning "Port 8080 is not in use"
        fi
    elif command_exists netstat; then
        if netstat -tuln | grep -q ":8080 "; then
            print_success "Port 8080 is in use (Routex is listening)"
        else
            print_warning "Port 8080 is not in use"
        fi
    else
        print_info "Cannot check port status (lsof/netstat not available)"
    fi
}

# Generate diagnostic report
generate_report() {
    print_header "Diagnostic Report"

    print_info "Generating diagnostic report..."
    echo ""

    REPORT_FILE="routex-diagnostic-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Routex Diagnostic Report"
        echo "Generated: $(date)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        echo "System Information:"
        echo "  OS: $(uname -s)"
        echo "  Kernel: $(uname -r)"
        echo "  Architecture: $(uname -m)"
        echo ""

        if command_exists bun; then
            echo "  Bun: $(bun --version)"
        fi

        if command_exists node; then
            echo "  Node.js: $(node --version)"
        fi
        echo ""

        echo "Routex Health:"
        http_get "$ROUTEX_URL/health/detailed" 2>/dev/null || echo "  Failed to get health information"
        echo ""

        echo "Channels:"
        http_get "$ROUTEX_URL/api/channels" 2>/dev/null || echo "  Failed to get channels"
        echo ""

    } > "$REPORT_FILE"

    print_success "Report saved to: $REPORT_FILE"
}

# Main execution
main() {
    echo -e "${BLUE}"
    cat << "EOF"
   ____              __
  / __ \____  __  __/ /____  _  __
 / /_/ / __ \/ / / / __/ _ \| |/_/
/ _, _/ /_/ / /_/ / /_/  __/>  <
/_/ |_|\____/\__,_/\__/\___/_/|_|

    Diagnostic Script v1.0
EOF
    echo -e "${NC}"

    print_info "Routex URL: $ROUTEX_URL"
    print_info "Timeout: ${TIMEOUT}s"
    echo ""

    # Run all checks
    check_system_requirements
    check_config_file
    check_network
    check_routex_running
    check_detailed_health
    check_channels
    check_load_balancer

    # Optional: Test channels (can be slow)
    if [ "${RUN_CHANNEL_TEST:-false}" = "true" ]; then
        test_channels
    else
        echo ""
        print_info "Skipping channel connectivity test (set RUN_CHANNEL_TEST=true to enable)"
    fi

    # Optional: Generate report
    if [ "${GENERATE_REPORT:-false}" = "true" ]; then
        generate_report
    fi

    # Final summary
    print_header "Diagnostic Complete"
    print_success "All checks completed"
    echo ""
    print_info "For more information, visit: https://github.com/dctx-team/Routex"
    echo ""
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            ROUTEX_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --test-channels)
            RUN_CHANNEL_TEST=true
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --url URL           Routex URL (default: http://localhost:8080)"
            echo "  --timeout SECONDS   Request timeout (default: 5)"
            echo "  --test-channels     Run channel connectivity test"
            echo "  --report            Generate diagnostic report file"
            echo "  --help              Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
