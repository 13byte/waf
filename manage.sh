#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

show_usage() {
    echo "WAF Test Platform - Unified Management (React + FastAPI)"
    echo "Usage: $0 {start|stop|restart|status|logs|clean|build|dev}"
    echo ""
    echo "Commands:"
    echo "  start    - Start all services (nginx-waf → database → backend → frontend)"
    echo "  stop     - Stop all services"  
    echo "  restart  - Restart all services"
    echo "  status   - Check service status"
    echo "  logs     - View service logs"
    echo "  clean    - Clean containers, volumes, and build cache"
    echo "  build    - Build/rebuild all services"
    echo "  dev      - Start development environment (React dev server)"
}

start_services() {
    echo "🚀 Starting WAF Test Platform (React Frontend)..."
    
    cd "$PROJECT_DIR"
    
    echo "🔧 Building services..."
    docker-compose -f "$COMPOSE_FILE" build
    
    echo "📊 Starting database..."
    docker-compose -f "$COMPOSE_FILE" up -d database
    
    echo "⏳ Waiting for database initialization..."
    sleep 15
    
    echo "🔧 Starting backend..."
    docker-compose -f "$COMPOSE_FILE" up -d backend
    
    echo "⏳ Waiting for backend startup..."
    sleep 10
    
    echo "⚛️ Starting React frontend..."
    docker-compose -f "$COMPOSE_FILE" up -d frontend
    
    echo "⏳ Waiting for React frontend startup..."
    sleep 8
    
    echo "🛡️ Starting nginx + ModSecurity WAF..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx-waf
    
    echo "⏳ Waiting for WAF initialization..."
    sleep 5
    
    echo "✅ All services started!"
    echo "📍 WAF Frontend: http://localhost"
    echo "📍 Direct API: http://localhost/api/"
    echo "📍 Health Check: http://localhost/health"
    echo ""
    echo "🔍 Frontend Technology: React 18 + TypeScript + TailwindCSS"
    echo "🔧 Backend Technology: FastAPI + Python 3.12"
    echo "🛡️ WAF Technology: OWASP ModSecurity CRS"
}

start_dev_environment() {
    echo "🚀 Starting Development Environment..."
    
    cd "$PROJECT_DIR"
    
    echo "📊 Starting database..."
    docker-compose -f "$COMPOSE_FILE" up -d database
    
    echo "⏳ Waiting for database initialization..."
    sleep 10
    
    echo "🔧 Starting backend..."
    docker-compose -f "$COMPOSE_FILE" up -d backend
    
    echo "⏳ Waiting for backend startup..."
    sleep 8
    
    echo "⚛️ Starting React development server..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing React dependencies..."
        npm install
    fi
    
    echo "🔥 Starting React dev server on http://localhost:5173"
    echo "🔗 API Proxy: http://localhost:8000/api"
    echo ""
    echo "Press Ctrl+C to stop the development server"
    npm run dev
}

stop_services() {
    echo "🛑 Stopping WAF Test Platform..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    
    echo "✅ All services stopped!"
}

restart_services() {
    echo "🔄 Restarting WAF Test Platform..."
    stop_services
    sleep 3
    start_services
}

check_status() {
    echo "📋 WAF Test Platform Status (React + FastAPI)"
    echo "=============================================="
    
    cd "$PROJECT_DIR"
    
    echo "🐳 Container Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    echo "🛡️ WAF Status:"
    waf_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
    if [ "$waf_response" = "200" ]; then
        echo "   ✅ nginx + ModSecurity: Running (HTTP $waf_response)"
    else
        echo "   ❌ nginx + ModSecurity: Failed (HTTP $waf_response)"
    fi
    
    echo ""
    echo "⚛️ React Frontend Status:"
    frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
    if [ "$frontend_response" = "200" ]; then
        echo "   ✅ React App: Running (HTTP $frontend_response)"
    else
        echo "   ❌ React App: Failed (HTTP $frontend_response)"
    fi
    
    echo ""
    echo "🔧 Backend Status:"
    backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null)
    if [ "$backend_response" = "200" ]; then
        echo "   ✅ FastAPI: Running (HTTP $backend_response)"
    else
        echo "   ❌ FastAPI: Failed (HTTP $backend_response)"
    fi
    
    echo ""
    echo "📊 Database Status:"
    db_status=$(docker-compose -f "$COMPOSE_FILE" ps database --format "table" | grep "Up" | wc -l)
    if [ "$db_status" -gt "0" ]; then
        echo "   ✅ MySQL: Running"
    else
        echo "   ❌ MySQL: Stopped"
    fi
    
    echo ""
    echo "📈 Quick Test URLs:"
    echo "   🏠 Home: http://localhost/"
    echo "   🔐 Login: http://localhost/login"
    echo "   📝 Register: http://localhost/register"
    echo "   🐛 Vulnerability Tests: http://localhost/vulnerable"
    echo "   🔧 API Health: http://localhost/health"
}

view_logs() {
    echo "📋 Service Logs"
    echo "==============="
    
    cd "$PROJECT_DIR"
    
    if [ -n "$2" ]; then
        echo "🔍 Viewing logs for: $2"
        docker-compose -f "$COMPOSE_FILE" logs -f "$2"
    else
        echo "🔍 Viewing all service logs..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

clean_environment() {
    echo "🧹 Cleaning WAF Test Platform..."
    
    cd "$PROJECT_DIR"
    
    echo "🛑 Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
    
    echo "🐳 Removing project containers..."
    docker container prune -f
    
    echo "🗂️ Removing project images..."
    docker images "waf_test*" -q | xargs -r docker rmi -f
    docker image prune -f
    
    echo "💾 Removing all volumes..."
    docker volume prune -f
    docker volume ls -q --filter name=waf_test | xargs -r docker volume rm
    
    echo "🌐 Removing networks..."
    docker network prune -f
    
    echo "📦 Cleaning buildkit cache..."
    docker builder prune -af
    
    echo "🔥 Removing Buildx builder instance (if it exists)..."
    docker buildx rm multiarch-builder0 &>/dev/null || true
    
    echo "🔧 Complete system cleanup..."
    docker system prune -af --volumes
    
    echo "🗑️ Cleaning React build artifacts..."
    if [ -d "frontend/dist" ]; then
        rm -rf frontend/dist
        echo "   ✅ Removed frontend/dist"
    fi
    
    if [ -d "frontend/node_modules" ]; then
        rm -rf frontend/node_modules
        echo "   ✅ Removed frontend/node_modules"
    fi
    
    echo "✅ All Docker resources and build artifacts cleaned!"
}

build_services() {
    echo "🔨 Building WAF Test Platform (React + FastAPI)..."
    
    cd "$PROJECT_DIR"
    
    echo "⚛️ Installing React dependencies..."
    cd frontend
    if [ -f "package.json" ]; then
        npm install
        echo "   ✅ React dependencies installed"
    fi
    cd ..
    
    echo "🐳 Building all Docker services..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    echo "✅ Build completed!"
    echo "💡 Run './manage.sh start' to start all services"
    echo "💡 Run './manage.sh dev' for development environment"
}

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs "$@"
        ;;
    clean)
        clean_environment
        ;;
    build)
        build_services
        ;;
    dev)
        start_dev_environment
        ;;
    *)
        show_usage
        exit 1
        ;;
esac