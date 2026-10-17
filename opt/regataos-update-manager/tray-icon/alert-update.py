#!/usr/bin/python3.13

import os
import sys
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QSystemTrayIcon

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tray_common import setup_tray_menu, get_text

class SystemTrayIcon(QSystemTrayIcon):
    def __init__(self, icon, parent=None):
        super(SystemTrayIcon, self).__init__(icon, parent)

        self.menu = setup_tray_menu(parent)
        self.setContextMenu(self.menu)
        self.activated.connect(self.onTrayIconActivated)

    def onTrayIconActivated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "up_icontray_functions")
            os.system(f'/bin/bash "{script_path}" -show-hide-up')

def main():
    app = QApplication(sys.argv)

    icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alert-update.png")
    icon = QIcon(icon_path)
    tray_icon = SystemTrayIcon(icon)
    title = get_text("-available-up-title", "Atualizações disponíveis!")
    tray_icon.setToolTip(title)
    tray_icon.show()

    sys.exit(app.exec())

if __name__ == "__main__":
    main()
