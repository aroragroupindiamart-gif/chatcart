#!/bin/bash
# Threshold for container CPU usage (in percent)
THRESHOLD=90
LOG_FILE="/var/log/chatcart-cpu-monitor.log"

# Get CPU usage of all containers
stats=$(sudo docker stats --no-stream --format "{{.Name}} {{.CPUPerc}}")

echo "$(date): Running CPU check..." >> "$LOG_FILE"

echo "$stats" | while read -r name cpu; do
  # Remove '%' sign and get integer value of CPU
  cpu_val=$(echo "$cpu" | sed 's/%//' | cut -d. -f1)
  
  if [ -n "$cpu_val" ] && [ "$cpu_val" -gt "$THRESHOLD" ]; then
    echo "$(date): Container $name is at $cpu%, waiting 60 seconds to re-verify..." >> "$LOG_FILE"
    sleep 60
    
    # Re-check CPU
    new_cpu=$(sudo docker stats --no-stream "$name" --format "{{.CPUPerc}}" | sed 's/%//' | cut -d. -f1)
    
    if [ -n "$new_cpu" ] && [ "$new_cpu" -gt "$THRESHOLD" ]; then
      echo "$(date): WARNING: Container $name is still at $new_cpu%. Triggering auto-restart..." >> "$LOG_FILE"
      sudo docker restart "$name"
      echo "$(date): Container $name restarted successfully." >> "$LOG_FILE"
    else
      echo "$(date): Container $name CPU dropped to $new_cpu%. No action needed." >> "$LOG_FILE"
    fi
  fi
done
