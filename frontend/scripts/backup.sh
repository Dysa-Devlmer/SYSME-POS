#!/bin/bash

# =====================================================
# SYSME POS - Database Backup Script
# =====================================================
# Creates timestamped backups of the database
#
# Usage:
#   ./backup.sh                 # Local backup only
#   ./backup.sh --cloud         # Also upload to cloud (S3)
#   ./backup.sh --cleanup       # Also cleanup old backups
#
# @author SYSME POS Team
# @date 2025-11-20
# =====================================================

set -e

# Configuration
BACKUP_DIR="./backups"
DATABASE_FILE="${DATABASE_URL:-./database.sqlite}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sqlite"
CLOUD_UPLOAD=false
CLEANUP=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
for arg in "$@"; do
  case $arg in
    --cloud)
      CLOUD_UPLOAD=true
      ;;
    --cleanup)
      CLEANUP=true
      ;;
  esac
done

echo -e "${GREEN}🔄 SYSME POS - Database Backup${NC}"
echo "========================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DATABASE_FILE" ]; then
  echo -e "${RED}❌ Error: Database file not found: $DATABASE_FILE${NC}"
  exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
cp "$DATABASE_FILE" "$BACKUP_FILE"

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE ($SIZE)${NC}"

# Compress backup
echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
gzip -f "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo -e "${GREEN}✅ Compressed: $COMPRESSED_FILE ($COMPRESSED_SIZE)${NC}"

# Upload to cloud if requested
if [ "$CLOUD_UPLOAD" = true ]; then
  echo -e "${YELLOW}☁️  Uploading to cloud...${NC}"

  if [ -z "$AWS_S3_BUCKET" ]; then
    echo -e "${RED}⚠️  Warning: AWS_S3_BUCKET not set. Skipping cloud upload.${NC}"
  else
    # Upload to S3 (requires AWS CLI configured)
    aws s3 cp "$COMPRESSED_FILE" "s3://${AWS_S3_BUCKET}/backups/" && \
      echo -e "${GREEN}✅ Uploaded to S3: s3://${AWS_S3_BUCKET}/backups/$(basename $COMPRESSED_FILE)${NC}" || \
      echo -e "${RED}❌ Failed to upload to S3${NC}"
  fi
fi

# Cleanup old backups if requested
if [ "$CLEANUP" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"

  DELETED_COUNT=0
  while IFS= read -r file; do
    rm -f "$file"
    ((DELETED_COUNT++))
    echo -e "   Deleted: $(basename $file)"
  done < <(find "$BACKUP_DIR" -name "backup_*.sqlite.gz" -type f -mtime +$RETENTION_DAYS)

  if [ $DELETED_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No old backups to delete${NC}"
  else
    echo -e "${GREEN}✅ Deleted $DELETED_COUNT old backup(s)${NC}"
  fi
fi

# Summary
echo ""
echo "========================================"
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo ""
echo "Backup details:"
echo "  • File: $(basename $COMPRESSED_FILE)"
echo "  • Size: $COMPRESSED_SIZE"
echo "  • Location: $BACKUP_DIR"
[ "$CLOUD_UPLOAD" = true ] && echo "  • Cloud: Uploaded to S3"
[ "$CLEANUP" = true ] && echo "  • Cleanup: $DELETED_COUNT old backups removed"
echo ""

exit 0
