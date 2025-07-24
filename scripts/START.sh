#!/bin/bash
echo "Starting Martingale Optimizer v5.3..."
echo
echo "Starting data save server..."
node src/server/data-save-server.js &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"
echo
echo "Waiting for server to start..."
sleep 3
echo
echo "Opening mobile dashboard..."
if command -v xdg-open > /dev/null; then
    xdg-open src/ui/mobile-dashboard.html
elif command -v open > /dev/null; then
    open src/ui/mobile-dashboard.html
else
    echo "Please open src/ui/mobile-dashboard.html in your browser"
fi
echo
echo "System started successfully!"
echo "Press Ctrl+C to stop the server..."
wait $SERVER_PID
