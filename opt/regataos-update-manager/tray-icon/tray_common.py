#!/usr/bin/python3
# -*- coding: utf-8 -*-

import os
import sys
from PyQt6.QtCore import Qt, QRectF
from PyQt6.QtGui import QPixmap, QPainter, QColor, QPen
from PyQt6.QtWidgets import (QMenu, QDialog, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QApplication)

base_font = "Oxygen, Cantarell, Noto Sans, Ubuntu, sans-serif"

def is_dark_theme():
    try:
        user = os.environ.get('USER', 'marcos')
        kdeglobals = f'/home/{user}/.config/kdeglobals'
        if os.path.exists(kdeglobals):
            with open(kdeglobals, 'r') as f:
                content = f.read()
            for line in content.splitlines():
                if line.startswith('BackgroundNormal='):
                    parts = line.split('=')[1].split(',')
                    if len(parts) >= 3:
                        r, g, b = int(parts[0]), int(parts[1]), int(parts[2])
                        return (0.299 * r + 0.587 * g + 0.114 * b) < 128
    except Exception:
        pass
    return False

def draw_style3_icon(dark=True):
    pix = QPixmap(48, 48)
    pix.fill(Qt.GlobalColor.transparent)
    p = QPainter(pix)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)

    circle_bg = QColor(0, 95, 184, 45) if dark else QColor(0, 95, 184, 25)
    pen_color = QColor(0, 150, 255, 230) if dark else QColor(0, 95, 184, 230)

    p.setBrush(circle_bg)
    p.setPen(QPen(pen_color, 2))
    p.drawEllipse(QRectF(4, 4, 40, 40))

    p.setPen(QPen(pen_color, 2.5))
    p.drawLine(24, 13, 24, 25)
    p.drawLine(18, 20, 24, 25)
    p.drawLine(30, 20, 24, 25)
    p.drawLine(15, 31, 33, 31)

    p.end()
    return pix

class ConfirmCloseDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.confirmed_quit = False
        dark = is_dark_theme()

        self.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        bg = "#181a1f" if dark else "#ffffff"
        fg = "#e6edf3" if dark else "#1f2328"
        fg_muted = "#8b949e" if dark else "#57606a"
        border = "#30363d" if dark else "#d0d7de"

        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(10, 10, 10, 10)

        card = QWidget(self)
        card.setObjectName("card3")
        card.setFixedSize(460, 215)
        card.setStyleSheet(f"""
            #card3 {{
                background-color: {bg};
                border: 1px solid {border};
                border-radius: 14px;
                font-family: {base_font};
            }}
        """)

        layout = QVBoxLayout(card)
        layout.setContentsMargins(22, 20, 22, 18)
        layout.setSpacing(12)

        # Header
        header = QHBoxLayout()
        header.setSpacing(12)

        icon_label = QLabel()
        icon_label.setPixmap(draw_style3_icon(dark))
        icon_label.setStyleSheet("border: none; background: transparent;")
        header.addWidget(icon_label)

        h_text = QVBoxLayout()
        h_text.setSpacing(2)
        title_text = get_text("-confirm-close-title", "Regata OS Update")
        t = QLabel(title_text)
        t.setStyleSheet(f"font-size: 15px; font-weight: 700; color: {fg}; border: none; background: transparent;")
        sub_text = get_text("-confirm-close-text", "As atualizações continuam em execução.")
        m = QLabel(sub_text)
        m.setStyleSheet(f"font-size: 12px; color: {'#58a6ff' if dark else '#005fb8'}; font-weight: 600; border: none; background: transparent;")
        h_text.addWidget(t)
        h_text.addWidget(m)
        header.addLayout(h_text)
        header.addStretch()
        layout.addLayout(header)

        # Description
        desc_text = get_text("-confirm-close-desc", "Se você fechar agora, o processo será abortado e arquivos temporários serão limpos. Deseja realmente cancelar as atualizações e fechar?")
        desc = QLabel(desc_text)
        desc.setStyleSheet(f"font-size: 13px; color: {fg_muted}; line-height: 1.35; border: none; background: transparent;")
        desc.setWordWrap(True)
        layout.addWidget(desc)

        layout.addStretch()

        # Buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(12)

        btn_quit_label = get_text("-confirm-close-btn-quit", "Encerrar")
        btn_quit = QPushButton(btn_quit_label)
        btn_quit.setStyleSheet(f"""
            color: #ff6b6b;
            background-color: transparent;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            font-family: {base_font};
        """)
        btn_quit.clicked.connect(self.on_quit_clicked)

        btn_continue_label = get_text("-confirm-close-btn-continue", "Continuar atualizando")
        btn_continue = QPushButton(btn_continue_label)
        btn_continue.setStyleSheet(f"""
            color: #ffffff;
            background-color: #005fb8;
            border: 1px solid #005fb8;
            border-radius: 10px;
            padding: 9px 22px;
            font-size: 13px;
            font-weight: 700;
            font-family: {base_font};
        """)
        btn_continue.clicked.connect(self.reject)

        btn_layout.addStretch()
        btn_layout.addWidget(btn_quit)
        btn_layout.addWidget(btn_continue)
        layout.addLayout(btn_layout)

        outer_layout.addWidget(card)

    def on_quit_clicked(self):
        self.confirmed_quit = True
        self.accept()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.MouseButton.LeftButton and hasattr(self, '_drag_pos'):
            self.move(event.globalPosition().toPoint() - self._drag_pos)
            event.accept()

def get_text(option, default=""):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        script = os.path.join(base_dir, "set_language_icontray")
        val = os.popen(f'/bin/bash "{script}" {option}').read().rstrip('\n')
        return val if val else default
    except Exception:
        return default

def is_update_in_progress():
    status_file = "/tmp/regataos-update/status.txt"
    if os.path.exists(status_file):
        try:
            with open(status_file, "r") as f:
                content = f.read().strip()
                if "installing-updates" in content or "check-updates" in content:
                    return True
        except Exception:
            pass

    progress_files = [
        "/tmp/regataos-update/other-updates-in-progress.txt",
        "/tmp/regataos-update/update-specific-in-progress.txt",
        "/tmp/regataos-update/downloading-system-update.txt",
        "/tmp/regataos-update/installing-system-update.txt"
    ]
    for p in progress_files:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    if len(f.read().strip()) > 0:
                        return True
            except Exception:
                pass

    ret = os.system("pgrep -x 'zypper' >/dev/null 2>&1 || pgrep -f 'regataos-up\\.sh|regataos-up-all\\.sh|regataos-up-specific\\.sh|regataos-other-up\\.sh' >/dev/null 2>&1")
    if ret == 0:
        return True

    return False

def open_app():
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
    os.system(f'/bin/bash "{script_path}" -show-up-app')

def install_all():
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
    os.system(f'/bin/bash "{script_path}" -install-updates')

def close_app():
    if is_update_in_progress():
        dialog = ConfirmCloseDialog()
        dialog.exec()

        if dialog.confirmed_quit:
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
            os.system(f'/bin/bash "{script_path}" -force-close-app')
            QApplication.quit()
            sys.exit(0)
    else:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
        os.system(f'/bin/bash "{script_path}" -close-app')
        QApplication.quit()
        sys.exit(0)

def setup_tray_menu(parent):
    menu = QMenu(parent)

    open_text = get_text("-open-up-mg", "Abrir o gerenciador de atualizações")
    open_action = menu.addAction(open_text)
    open_action.triggered.connect(open_app)

    install_text = get_text("-install-all", "Instalar tudo")
    install_action = menu.addAction(install_text)
    install_action.triggered.connect(install_all)

    menu.addSeparator()

    close_text = get_text("-close-app", "Fechar")
    close_action = menu.addAction(close_text)
    close_action.triggered.connect(close_app)

    return menu
