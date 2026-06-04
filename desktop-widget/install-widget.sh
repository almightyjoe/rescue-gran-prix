#!/bin/bash
set -eu

ROOT="/home/joe/rescue_gran_prix/desktop-widget"
DESKTOP_DIR="$HOME/Desktop"
AUTOSTART_DIR="$HOME/.config/autostart"

mkdir -p "$DESKTOP_DIR" "$AUTOSTART_DIR"
chmod 755 "$ROOT/launch.sh"
install -m 644 "$ROOT/rescue-gran-prix-widget.desktop" "$DESKTOP_DIR/rescue-gran-prix-widget.desktop"
install -m 644 "$ROOT/rescue-gran-prix-widget.desktop" "$AUTOSTART_DIR/rescue-gran-prix-widget.desktop"

echo "Installed desktop launcher to:"
echo "  $DESKTOP_DIR/rescue-gran-prix-widget.desktop"
echo "Installed autostart entry to:"
echo "  $AUTOSTART_DIR/rescue-gran-prix-widget.desktop"
