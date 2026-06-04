#!/usr/bin/env python3
"""
Rescue Gran Prix desktop monitor widget.

Shows service health, current revision, lobby activity, and recent logs
for the local rescue-gran-prix.service running on this Pi.
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path

import customtkinter as ctk

ROOT = Path(__file__).resolve().parents[1]
LOG_FILE = ROOT / "desktop-widget" / "widget.log"
SERVICE_NAME = "rescue-gran-prix"
SERVICE_URL = "http://127.0.0.1:3040/"
LOBBY_API_URL = f"{SERVICE_URL}api/lobbies"
POLL_SECONDS = 15

C_BG = "#0d1320"
C_PANEL = "#141c2b"
C_PANEL_ALT = "#192234"
C_TEXT = "#eef2ff"
C_MUTED = "#94a3b8"
C_BLUE = "#60a5fa"
C_GREEN = "#4ade80"
C_YELLOW = "#fbbf24"
C_RED = "#f87171"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


def run_command(args: list[str], timeout: int = 4) -> tuple[bool, str]:
    try:
      result = subprocess.run(
          args,
          capture_output=True,
          text=True,
          timeout=timeout,
          check=False,
      )
    except Exception as exc:
      return False, str(exc)

    if result.returncode != 0:
      return False, (result.stderr or result.stdout or "").strip()
    return True, result.stdout.strip()


def service_info() -> dict:
    ok, output = run_command([
        "systemctl", "show", SERVICE_NAME,
        "--property=ActiveState,SubState,MainPID,ExecMainStartTimestamp,FragmentPath",
    ])
    data = {
        "active": "unknown",
        "substate": "unknown",
        "pid": "—",
        "started": "—",
        "unit": "—",
        "error": "",
    }
    if not ok:
        data["error"] = output or "systemctl unavailable"
        return data

    for line in output.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key == "ActiveState":
            data["active"] = value or "unknown"
        elif key == "SubState":
            data["substate"] = value or "unknown"
        elif key == "MainPID":
            data["pid"] = value or "—"
        elif key == "ExecMainStartTimestamp":
            data["started"] = value or "—"
        elif key == "FragmentPath":
            data["unit"] = value or "—"
    return data


def revision_info() -> dict:
    info = {"branch": "—", "revision": "—", "dirty": False}
    ok, branch = run_command(["git", "-C", str(ROOT), "rev-parse", "--abbrev-ref", "HEAD"])
    if ok:
        info["branch"] = branch
    ok, rev = run_command(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"])
    if ok:
        info["revision"] = rev
    ok, status = run_command(["git", "-C", str(ROOT), "status", "--porcelain"])
    if ok:
        info["dirty"] = bool(status.strip())
    return info


def fetch_lobbies() -> dict:
    result = {
        "available": False,
        "count": 0,
        "players": 0,
        "codes": [],
        "lobbies": {},
        "error": "",
    }
    try:
        with urllib.request.urlopen(LOBBY_API_URL, timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        result["error"] = str(exc.reason)
        return result
    except Exception as exc:
        result["error"] = str(exc)
        return result

    lobbies = payload.get("lobbies") or {}
    if not isinstance(lobbies, dict):
        result["error"] = "invalid API payload"
        return result

    items = list(lobbies.values())
    result["available"] = True
    result["count"] = len(items)
    result["players"] = sum(len(item.get("players") or []) for item in items)
    result["codes"] = [str(item.get("code") or "—") for item in items[:4]]
    result["lobbies"] = lobbies
    return result


def api_request(url: str, method: str = "GET", payload: dict | None = None) -> tuple[bool, dict | str]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            if not response.readable():
                return True, {}
            body = response.read().decode("utf-8")
            return True, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            detail = str(exc)
        return False, detail
    except Exception as exc:
        return False, str(exc)


def service_action(action: str) -> tuple[bool, str]:
    return run_command(["systemctl", action, SERVICE_NAME], timeout=10)


def recent_logs() -> str:
    ok, output = run_command([
        "journalctl", "-u", SERVICE_NAME, "-n", "8", "--no-pager"
    ], timeout=6)
    if ok:
        return output or "No recent logs."
    return output or "Logs unavailable."


def format_started(value: str) -> str:
    if not value or value == "—":
        return value
    return value


class MonitorWidget(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Rescue Gran Prix Monitor")
        self.geometry("430x560")
        self.minsize(430, 560)
        self.configure(fg_color=C_BG)
        self.attributes("-topmost", True)

        self._countdown = POLL_SECONDS
        self._lobbies: dict[str, dict] = {}
        self._build_ui()
        self._refresh()
        self._tick()

    def _build_ui(self) -> None:
        header = ctk.CTkFrame(self, fg_color=C_PANEL, corner_radius=0, height=76)
        header.pack(fill="x")
        header.pack_propagate(False)

        ctk.CTkLabel(
            header,
            text="Rescue Gran Prix Monitor",
            text_color=C_TEXT,
            font=ctk.CTkFont(size=24, weight="bold"),
        ).pack(anchor="w", padx=16, pady=(14, 0))
        self.subtitle = ctk.CTkLabel(
            header,
            text="Watching rescue-gran-prix.service",
            text_color=C_MUTED,
            font=ctk.CTkFont(size=12),
        )
        self.subtitle.pack(anchor="w", padx=16, pady=(4, 12))

        self.status_row = ctk.CTkFrame(self, fg_color="transparent")
        self.status_row.pack(fill="x", padx=12, pady=(10, 0))

        self.service_badge = self._badge(self.status_row, "Service", "…", C_BLUE)
        self.lobby_badge = self._badge(self.status_row, "Lobbies", "…", C_BLUE)
        self.players_badge = self._badge(self.status_row, "Players", "…", C_BLUE)

        self.info_grid = ctk.CTkFrame(self, fg_color="transparent")
        self.info_grid.pack(fill="x", padx=12, pady=(10, 0))

        self.rev_card = self._card(self.info_grid, "Revision")
        self.unit_card = self._card(self.info_grid, "Unit")
        self.started_card = self._card(self.info_grid, "Started")
        self.active_card = self._card(self.info_grid, "Lobby Activity")

        controls = ctk.CTkFrame(self, fg_color="transparent")
        controls.pack(fill="x", padx=12, pady=(12, 0))

        ctk.CTkButton(
            controls,
            text="Refresh",
            command=self._refresh,
            fg_color=C_BLUE,
            hover_color="#3b82f6",
            text_color="#08111f",
            width=100,
        ).pack(side="left")
        ctk.CTkButton(
            controls,
            text="Open Game",
            command=lambda: webbrowser.open(SERVICE_URL),
            fg_color=C_PANEL_ALT,
            hover_color="#22304a",
            text_color=C_TEXT,
            width=110,
        ).pack(side="left", padx=8)
        self.countdown_label = ctk.CTkLabel(
            controls,
            text="",
            text_color=C_MUTED,
            font=ctk.CTkFont(size=12),
        )
        self.countdown_label.pack(side="right")

        tools = ctk.CTkFrame(self, fg_color=C_PANEL, corner_radius=10)
        tools.pack(fill="x", padx=12, pady=(12, 0))

        ctk.CTkLabel(
            tools,
            text="Admin Tools",
            text_color=C_TEXT,
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(anchor="w", padx=12, pady=(10, 4))

        self.lobby_var = ctk.StringVar(value="No active races")
        self.player_var = ctk.StringVar(value="No player selected")

        self.lobby_menu = ctk.CTkOptionMenu(
            tools,
            variable=self.lobby_var,
            values=["No active races"],
            command=lambda _choice: self._refresh_player_menu(),
        )
        self.lobby_menu.pack(fill="x", padx=12, pady=(0, 8))

        self.player_menu = ctk.CTkOptionMenu(
            tools,
            variable=self.player_var,
            values=["No player selected"],
        )
        self.player_menu.pack(fill="x", padx=12, pady=(0, 8))

        tool_buttons = ctk.CTkFrame(tools, fg_color="transparent")
        tool_buttons.pack(fill="x", padx=12, pady=(0, 8))

        ctk.CTkButton(
            tool_buttons,
            text="Restart Server",
            command=lambda: self._run_service_action("restart"),
            fg_color=C_YELLOW,
            hover_color="#f59e0b",
            text_color="#111827",
        ).pack(side="left", padx=(0, 6))
        ctk.CTkButton(
            tool_buttons,
            text="Delete Race",
            command=self._delete_selected_race,
            fg_color=C_RED,
            hover_color="#ef4444",
            text_color="#fff",
        ).pack(side="left", padx=(0, 6))
        ctk.CTkButton(
            tool_buttons,
            text="Kick Player",
            command=self._kick_selected_player,
            fg_color=C_PANEL_ALT,
            hover_color="#22304a",
            text_color=C_TEXT,
        ).pack(side="left")

        ctk.CTkButton(
            tools,
            text="Clear Stuck Race State",
            command=self._clear_selected_race_state,
            fg_color=C_PANEL_ALT,
            hover_color="#22304a",
            text_color=C_TEXT,
        ).pack(fill="x", padx=12, pady=(0, 10))

        self.admin_status = ctk.CTkLabel(
            tools,
            text="",
            text_color=C_MUTED,
            justify="left",
            anchor="w",
            wraplength=390,
        )
        self.admin_status.pack(fill="x", padx=12, pady=(0, 12))

        ctk.CTkLabel(
            self,
            text="Recent Service Activity",
            text_color=C_MUTED,
            font=ctk.CTkFont(size=12, weight="bold"),
        ).pack(anchor="w", padx=14, pady=(14, 6))

        self.log_box = ctk.CTkTextbox(
            self,
            fg_color=C_PANEL,
            text_color=C_TEXT,
            border_width=1,
            border_color="#243145",
            wrap="word",
        )
        self.log_box.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        self.log_box.configure(state="disabled")

    def _badge(self, parent: ctk.CTkFrame, title: str, value: str, color: str) -> ctk.CTkLabel:
        box = ctk.CTkFrame(parent, fg_color=C_PANEL_ALT)
        box.pack(side="left", expand=True, fill="x", padx=4)
        ctk.CTkLabel(
            box,
            text=title,
            text_color=C_MUTED,
            font=ctk.CTkFont(size=11),
        ).pack(pady=(8, 0))
        label = ctk.CTkLabel(
            box,
            text=value,
            text_color=color,
            font=ctk.CTkFont(size=24, weight="bold"),
        )
        label.pack(pady=(2, 10))
        return label

    def _card(self, parent: ctk.CTkFrame, title: str) -> ctk.CTkLabel:
        box = ctk.CTkFrame(parent, fg_color=C_PANEL)
        box.pack(fill="x", pady=5)
        ctk.CTkLabel(
            box,
            text=title,
            text_color=C_MUTED,
            font=ctk.CTkFont(size=11, weight="bold"),
        ).pack(anchor="w", padx=12, pady=(10, 0))
        label = ctk.CTkLabel(
            box,
            text="—",
            text_color=C_TEXT,
            justify="left",
            anchor="w",
            font=ctk.CTkFont(size=15),
        )
        label.pack(anchor="w", fill="x", padx=12, pady=(2, 10))
        return label

    def _refresh(self) -> None:
        svc = service_info()
        rev = revision_info()
        lobbies = fetch_lobbies()
        logs = recent_logs()
        self._lobbies = lobbies.get("lobbies") or {}

        service_color = C_GREEN if svc["active"] == "active" else C_RED
        lobby_color = C_BLUE if lobbies["available"] else C_YELLOW
        players_color = C_BLUE if lobbies["players"] else C_MUTED

        self.service_badge.configure(text=svc["active"].upper(), text_color=service_color)
        self.lobby_badge.configure(text=str(lobbies["count"]), text_color=lobby_color)
        self.players_badge.configure(text=str(lobbies["players"]), text_color=players_color)

        dirty = " + local edits" if rev["dirty"] else ""
        self.rev_card.configure(text=f"{rev['branch']} @ {rev['revision']}{dirty}")
        self.unit_card.configure(text=f"{svc['unit']}\nPID {svc['pid']} | {svc['active']} / {svc['substate']}")
        started = format_started(svc["started"])
        if svc["error"]:
            started = f"{started}\n{svc['error']}"
        self.started_card.configure(text=started)

        if lobbies["available"]:
            codes = ", ".join(lobbies["codes"]) if lobbies["codes"] else "No live codes"
            self.active_card.configure(text=f"{lobbies['count']} race(s), {lobbies['players']} player(s)\n{codes}")
            self.subtitle.configure(text=f"Last update {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            detail = lobbies["error"] or "API unavailable"
            self.active_card.configure(text=f"Lobby API unavailable\n{detail}")
            self.subtitle.configure(text=f"Service monitor only | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.insert("1.0", logs)
        self.log_box.configure(state="disabled")

        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        LOG_FILE.write_text(
            f"[{datetime.now().isoformat(sep=' ', timespec='seconds')}] "
            f"service={svc['active']} lobbies={lobbies['count']} players={lobbies['players']}\n",
            encoding="utf-8",
        )

        self._refresh_lobby_menu()
        self._countdown = POLL_SECONDS

    def _tick(self) -> None:
        self.countdown_label.configure(text=f"Refresh in {self._countdown}s")
        self._countdown -= 1
        if self._countdown < 0:
            self._refresh()
        self.after(1000, self._tick)

    def _refresh_lobby_menu(self) -> None:
        codes = sorted(self._lobbies.keys()) or ["No active races"]
        current = self.lobby_var.get()
        self.lobby_menu.configure(values=codes)
        self.lobby_var.set(current if current in codes else codes[0])
        self._refresh_player_menu()

    def _refresh_player_menu(self) -> None:
        lobby = self._selected_lobby()
        players = [player.get("name") or "Driver" for player in (lobby or {}).get("players", [])]
        values = players or ["No player selected"]
        current = self.player_var.get()
        self.player_menu.configure(values=values)
        self.player_var.set(current if current in values else values[0])

    def _selected_lobby(self) -> dict | None:
        code = self.lobby_var.get()
        return self._lobbies.get(code)

    def _set_admin_status(self, text: str, color: str = C_MUTED) -> None:
        self.admin_status.configure(text=text, text_color=color)

    def _run_service_action(self, action: str) -> None:
        ok, output = service_action(action)
        if ok:
            self._set_admin_status(f"Service {action} requested.", C_GREEN)
        else:
            self._set_admin_status(f"Service {action} failed: {output}", C_RED)
        self._refresh()

    def _delete_selected_race(self) -> None:
        lobby = self._selected_lobby()
        if not lobby:
            self._set_admin_status("No race selected.", C_YELLOW)
            return
        ok, payload = api_request(f"{LOBBY_API_URL}/{lobby['code']}", method="DELETE")
        if ok:
            self._set_admin_status(f"Deleted race {lobby['code']}.", C_GREEN)
        else:
            self._set_admin_status(f"Delete failed: {payload}", C_RED)
        self._refresh()

    def _kick_selected_player(self) -> None:
        lobby = self._selected_lobby()
        if not lobby:
            self._set_admin_status("No race selected.", C_YELLOW)
            return
        player_name = self.player_var.get()
        players = [player for player in lobby.get("players", []) if (player.get("name") or "") != player_name]
        if len(players) == len(lobby.get("players", [])):
            self._set_admin_status("No player selected to kick.", C_YELLOW)
            return
        updated = dict(lobby)
        updated["players"] = players
        ok, payload = api_request(f"{LOBBY_API_URL}/{lobby['code']}", method="PUT", payload=updated)
        if ok:
            self._set_admin_status(f"Removed {player_name} from race {lobby['code']}.", C_GREEN)
        else:
            self._set_admin_status(f"Kick failed: {payload}", C_RED)
        self._refresh()

    def _clear_selected_race_state(self) -> None:
        lobby = self._selected_lobby()
        if not lobby:
            self._set_admin_status("No race selected.", C_YELLOW)
            return
        updated = dict(lobby)
        updated.pop("game", None)
        updated["activityLog"] = []
        ok, payload = api_request(f"{LOBBY_API_URL}/{lobby['code']}", method="PUT", payload=updated)
        if ok:
            self._set_admin_status(f"Cleared stuck race state for {lobby['code']}.", C_GREEN)
        else:
            self._set_admin_status(f"Clear failed: {payload}", C_RED)
        self._refresh()


def main() -> int:
    app = MonitorWidget()
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
