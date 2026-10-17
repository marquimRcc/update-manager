#!/usr/bin/python3
# -*- coding: utf-8 -*-

import os
import sys
import time
from PyQt6.QtCore import Qt, QRectF, QThread, pyqtSignal
from PyQt6.QtGui import QPixmap, QPainter, QColor, QPen
from PyQt6.QtWidgets import (QMenu, QDialog, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QProgressBar, QApplication)

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

def draw_style3_icon(dark=True, state="confirm"):
    pix = QPixmap(48, 48)
    pix.fill(Qt.GlobalColor.transparent)
    p = QPainter(pix)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)

    if state == "cancelling":
        circle_bg = QColor(255, 170, 0, 35) if dark else QColor(230, 140, 0, 25)
        pen_color = QColor(255, 180, 50, 230) if dark else QColor(215, 120, 0, 230)
    else:
        circle_bg = QColor(0, 95, 184, 45) if dark else QColor(0, 95, 184, 25)
        pen_color = QColor(0, 150, 255, 230) if dark else QColor(0, 95, 184, 230)

    p.setBrush(circle_bg)
    p.setPen(QPen(pen_color, 2))
    p.drawEllipse(QRectF(4, 4, 40, 40))

    p.setPen(QPen(pen_color, 2.5))
    if state == "cancelling":
        p.drawLine(18, 18, 30, 30)
        p.drawLine(30, 18, 18, 30)
    else:
        p.drawLine(24, 13, 24, 25)
        p.drawLine(18, 20, 24, 25)
        p.drawLine(30, 20, 24, 25)
        p.drawLine(15, 31, 33, 31)

    p.end()
    return pix

class CancelWorker(QThread):
    finished_cancelling = pyqtSignal()

    def run(self):
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
        os.system(f'/bin/bash "{script_path}" -force-close-app')
        self.finished_cancelling.emit()

class ConfirmCloseDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.confirmed_quit = False
        self.dark = is_dark_theme()

        self.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        self.bg = "#181a1f" if self.dark else "#ffffff"
        self.fg = "#e6edf3" if self.dark else "#1f2328"
        self.fg_muted = "#8b949e" if self.dark else "#57606a"
        self.border = "#30363d" if self.dark else "#d0d7de"

        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(10, 10, 10, 10)

        self.card = QWidget(self)
        self.card.setObjectName("card3")
        self.card.setFixedSize(460, 215)
        self.card.setStyleSheet(f"""
            #card3 {{
                background-color: {self.bg};
                border: 1px solid {self.border};
                border-radius: 14px;
                font-family: {base_font};
            }}
        """)

        self.layout = QVBoxLayout(self.card)
        self.layout.setContentsMargins(22, 20, 22, 18)
        self.layout.setSpacing(12)

        # Header
        self.header = QHBoxLayout()
        self.header.setSpacing(12)

        self.icon_label = QLabel()
        self.icon_label.setPixmap(draw_style3_icon(self.dark, "confirm"))
        self.icon_label.setStyleSheet("border: none; background: transparent;")
        self.header.addWidget(self.icon_label)

        self.h_text = QVBoxLayout()
        self.h_text.setSpacing(2)
        title_text = get_text("-confirm-close-title", "Regata OS Update")
        self.t = QLabel(title_text)
        self.t.setStyleSheet(f"font-size: 15px; font-weight: 700; color: {self.fg}; border: none; background: transparent;")
        sub_text = get_text("-confirm-close-text", "As atualizações continuam em execução.")
        self.m = QLabel(sub_text)
        self.m.setStyleSheet(f"font-size: 12px; color: {'#58a6ff' if self.dark else '#005fb8'}; font-weight: 600; border: none; background: transparent;")
        self.h_text.addWidget(self.t)
        self.h_text.addWidget(self.m)
        self.header.addLayout(self.h_text)
        self.header.addStretch()
        self.layout.addLayout(self.header)

        # Description
        desc_text = get_text("-confirm-close-desc", "Se você fechar agora, o processo será abortado e arquivos temporários serão limpos. Deseja realmente cancelar as atualizações e fechar?")
        self.desc = QLabel(desc_text)
        self.desc.setStyleSheet(f"font-size: 13px; color: {self.fg_muted}; line-height: 1.35; border: none; background: transparent;")
        self.desc.setWordWrap(True)
        self.layout.addWidget(self.desc)

        # Progress bar (para o estado de cancelando)
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.setFixedHeight(4)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setStyleSheet(f"""
            QProgressBar {{
                background-color: {'#2a2e33' if self.dark else '#e1e4e8'};
                border: none;
                border-radius: 2px;
            }}
            QProgressBar::chunk {{
                background-color: {'#ffaa00' if self.dark else '#d97706'};
                border-radius: 2px;
            }}
        """)
        self.progress_bar.hide()
        self.layout.addWidget(self.progress_bar)

        self.layout.addStretch()

        # Buttons
        self.btn_layout = QHBoxLayout()
        self.btn_layout.setSpacing(12)

        btn_quit_label = get_text("-confirm-close-btn-quit", "Encerrar")
        self.btn_quit = QPushButton(btn_quit_label)
        self.btn_quit.setStyleSheet(f"""
            color: #ff6b6b;
            background-color: transparent;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            font-family: {base_font};
        """)
        self.btn_quit.clicked.connect(self.on_quit_clicked)

        btn_continue_label = get_text("-confirm-close-btn-continue", "Continuar atualizando")
        self.btn_continue = QPushButton(btn_continue_label)
        self.btn_continue.setStyleSheet(f"""
            color: #ffffff;
            background-color: #005fb8;
            border: 1px solid #005fb8;
            border-radius: 10px;
            padding: 9px 22px;
            font-size: 13px;
            font-weight: 700;
            font-family: {base_font};
        """)
        self.btn_continue.clicked.connect(self.reject)

        self.btn_layout.addStretch()
        self.btn_layout.addWidget(self.btn_quit)
        self.btn_layout.addWidget(self.btn_continue)
        self.layout.addLayout(self.btn_layout)

        outer_layout.addWidget(self.card)

    def on_quit_clicked(self):
        # 1. Muda os textos e layout da janela para o estado Cancelando...
        cancel_title = get_text("-cancelling-title", "Cancelando atualizações...")
        cancel_sub = get_text("-cancelling-text", "Finalizando processos com segurança...")
        cancel_desc = get_text("-cancelling-desc", "Aguarde um momento enquanto os arquivos temporários são limpos e os processos são encerrados.")

        self.icon_label.setPixmap(draw_style3_icon(self.dark, "cancelling"))
        self.t.setText(cancel_title)
        self.m.setText(cancel_sub)
        self.m.setStyleSheet(f"font-size: 12px; color: {'#ffaa00' if self.dark else '#d97706'}; font-weight: 600; border: none; background: transparent;")
        self.desc.setText(cancel_desc)

        # 2. Oculta os botões e exibe a barra de progresso suave
        self.btn_quit.hide()
        self.btn_continue.hide()
        self.progress_bar.show()

        # 3. Dispara a thread de encerramento em segundo plano
        self.worker = CancelWorker()
        self.worker.finished_cancelling.connect(self.on_cancelling_finished)
        self.worker.start()

    def on_cancelling_finished(self):
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
