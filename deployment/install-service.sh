#!/bin/bash
# Install the new categorization service

set -e

echo "🚀 Installing YNAB Categorization Service..."

# Copy service file
sudo cp categorization-service.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable categorization-service

echo "✅ Service installed successfully!"
echo ""
echo "Usage:"
echo "  sudo systemctl start categorization-service    # Run once"
echo "  sudo systemctl status categorization-service   # Check status"
echo "  journalctl -u categorization-service -f        # View logs"
echo ""
echo "The service is configured to run via cron. Update your crontab:"
echo "  # Daily at 6 AM"
echo "  0 6 * * * /bin/systemctl start categorization-service"
echo ""
echo "Or test it now:"
echo "  sudo systemctl start categorization-service"