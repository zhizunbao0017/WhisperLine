#!/bin/bash
# Script to download HanziPenTC-Regular.ttf font file

FONT_DIR="assets/fonts"
FONT_FILE="HanziPenTC-Regular.ttf"
FONT_URL="https://github.com/google/fonts/raw/main/ofl/hanzipentc/HanziPenTC-Regular.ttf"

echo "Attempting to download HanziPenTC-Regular.ttf..."

# Try multiple methods to download the font
# Method 1: Direct curl with proper headers
if curl -L -H "Accept: application/octet-stream" \
   -H "User-Agent: Mozilla/5.0" \
   "$FONT_URL" \
   -o "$FONT_DIR/$FONT_FILE.tmp" 2>/dev/null; then
    if file "$FONT_DIR/$FONT_FILE.tmp" | grep -q "TrueType\|OpenType\|Font"; then
        mv "$FONT_DIR/$FONT_FILE.tmp" "$FONT_DIR/$FONT_FILE"
        echo "✓ Successfully downloaded font file"
        exit 0
    else
        echo "✗ Downloaded file is not a valid font file"
        rm -f "$FONT_DIR/$FONT_FILE.tmp"
    fi
fi

echo ""
echo "Automatic download failed. Please manually download the font:"
echo ""
echo "1. Visit: https://fonts.google.com/specimen/HanziPen+TC"
echo "2. Click 'Download family'"
echo "3. Extract the ZIP file"
echo "4. Copy 'HanziPenTC-Regular.ttf' to: $FONT_DIR/"
echo ""
echo "Or use this direct link (if available):"
echo "$FONT_URL"
echo ""
echo "After downloading, verify the file with:"
echo "  file $FONT_DIR/$FONT_FILE"
echo "  (Should show 'TrueType Font' or 'OpenType Font')"

