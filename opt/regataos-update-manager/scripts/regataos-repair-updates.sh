#!/bin/bash
# ==============================================================================
# Regata OS Update Manager - Reparador e Diagnóstico Autônomo
# Executa auto-recuperação completa de repositórios, locks, caches e dependências.
# ==============================================================================

if [ "$EUID" -ne 0 ]; then
    echo "Executando com privilégios de superusuário (sudo)..."
    exec sudo "$0" "$@"
fi

source "/opt/regataos-update-manager/scripts/regataos-update-healing.sh"

echo "======================================================"
echo " Regata OS Update - Diagnóstico e Auto-Cura de Pacotes"
echo "======================================================"

full_system_repair
exit $?
