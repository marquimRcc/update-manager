#!/usr/bin/python3
# -*- coding: utf-8 -*-

import os
import sys
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QMenu, QMessageBox, QApplication

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
                content = f.read()
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
            return True

    ret = os.system("pgrep -f 'zypper|regataos-up.sh|regataos-up-all.sh|regataos-check-up.sh' >/dev/null 2>&1")
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
        title = get_text("-confirm-close-title", "Regata OS Update")
        text = get_text("-confirm-close-text", "As atualizações ainda estão em andamento.")
        info = get_text("-confirm-close-info", "Interromper a atualização agora não é recomendado e pode comprometer a instalação de pacotes no sistema.\n\nDeseja realmente cancelar as atualizações e fechar o aplicativo?")
        btn_continue_text = get_text("-confirm-close-btn-continue", "Continuar atualizando")
        btn_quit_text = get_text("-confirm-close-btn-quit", "Encerrar e fechar")

        msg_box = QMessageBox()
        msg_box.setWindowTitle(title)
        msg_box.setIcon(QMessageBox.Icon.Warning)
        msg_box.setText(f"<b>{text}</b>")
        msg_box.setInformativeText(info)
        msg_box.setWindowFlags(msg_box.windowFlags() | Qt.WindowType.WindowStaysOnTopHint)

        btn_continue = msg_box.addButton(btn_continue_text, QMessageBox.ButtonRole.RejectRole)
        btn_quit = msg_box.addButton(btn_quit_text, QMessageBox.ButtonRole.DestructiveRole)

        msg_box.setDefaultButton(btn_continue)
        msg_box.exec()

        if msg_box.clickedButton() == btn_quit:
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
            os.system(f'/bin/bash "{script_path}" -force-close-app')
            QApplication.quit()
    else:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
        os.system(f'/bin/bash "{script_path}" -close-app')
        QApplication.quit()

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
