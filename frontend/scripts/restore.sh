#!/bin/bash

# =====================================================
# SYSME POS - Database Restore Script
# =====================================================
# Restores database from backup
#
# Usage:
#   ./restore.sh                       # Interactive mode
#   ./restore.sh backup_20251120.sqlite.gz  # Restore specific backup
#
# @author SYSME POS Team
# @date 2025-11-20
# =====================================================

set -e

# Configuration
BACKUP_DIR="./backups"
DATABASE_FILE="${DATABASE_URL:-./database.sqlite}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 SYSME POS - Database Restore${NC}"
echo "========================================"
echo ""

# Function to list available backups
list_backups() {
  echo -e "${YELLOW}📂 Available backups:${NC}"
  echo ""

  BACKUPS=($(ls -t "$BACKUP_DIR"/backup_*.sqlite.gz 2>/dev/null))

  if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No backups found in $BACKUP_DIR${NC}"
    exit 1
  fi

  for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${BACKUPS[$i]}" 2>/dev/null || stat -c "%y" "${BACKUPS[$i]}" 2>/dev/null | cut -d'.' -f1)
    echo -e "  ${GREEN}[$i]${NC} $(basename ${BACKUPS[$i]}) - $SIZE - $DATE"
  done

  echo ""
}

# Check if backup file provided as argument
if [ -n "$1" ]; then
  BACKUP_FILE="$1"

  # If not a full path, check in backup directory
  if [ ! -f "$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$1"
  fi

  if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $1${NC}"
    exit 1
  fi
else
  # Interactive mode
  list_backups

  echo -e "${YELLOW}Enter backup number to restore (or 'q' to quit):${NC}"
  read -r SELECTION

  if [ "$SELECTION" = "q" ]; then
    echo "Cancelled."
    exit 0
  fi

  BACKUPS=($(ls -t "$BACKUP_DIR"/backup_*.sqlite.gz))

  if [ "$SELECTION" -ge 0 ] && [ "$SELECTION" -lt ${#BACKUPS[@]} ]; then
    BACKUP_FILE="${BACKUPS[$SELECTION]}"
  else
    echo -e "${RED}❌ Invalid selection${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will replace the current database!${NC}"
echo -e "${YELLOW}⚠️  Current database will be backed up before restore.${NC}"
echo ""
echo -e "Selected backup: ${GREEN}$(basename $BACKUP_FILE)${NC}"
echo ""
echo -e "${YELLOW}Continue? (yes/no):${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Create safety backup of current database
if [ -f "$DATABASE_FILE" ]; then
  echo -e "${YELLOW}📦 Creating safety backup of current database...${NC}"
  SAFETY_BACKUP="${DATABASE_FILE}.before-restore.$(date +%Y%m%d_%H%M%S)"
  cp "$DATABASE_FILE" "$SAFETY_BACKUP"
  echo -e "${GREEN}✅ Safety backup created: $SAFETY_BACKUP${NC}"
fi

# Decompress and restore
echo -e "${YELLOW}🗜️  Decompressing backup...${NC}"
TEMP_FILE=$(mktemp)
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

echo -e "${YELLOW}🔄 Restoring database...${NC}"
cp "$TEMP_FILE" "$DATABASE_FILE"
rm -f "$TEMP_FILE"

# Verify restore
if [ -f "$DATABASE_FILE" ]; then
  SIZE=$(du -h "$DATABASE_FILE" | cut -f1)
  echo -e "${GREEN}✅ Database restored successfully! ($SIZE)${NC}"
else
  echo -e "${RED}❌ Error: Restore failed${NC}"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Restore completed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your application"
echo "  2. Verify data integrity"
echo "  3. Test critical functionality"
echo ""
echo "Safety backup location:"
echo "  $SAFETY_BACKUP"
echo ""

exit 0
