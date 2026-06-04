#!/bin/bash
export DISPLAY=${DISPLAY:-:0}
export XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
exec /usr/bin/python3 /home/joe/rescue_gran_prix/desktop-widget/widget.py
