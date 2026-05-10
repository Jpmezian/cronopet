#!/bin/bash
# ─── CronoPet — iOS Run Helper ─────────────────────────────────
# Executa o app no simulador iOS com todas as variáveis de ambiente
# necessárias para Ruby 3.3 (Homebrew user-space) + CocoaPods.
#
# Uso:  ./ios-run.sh
# ───────────────────────────────────────────────────────────────

set -e

CELLAR="$HOME/homebrew/Cellar/ruby@3.3/3.3.11"
ARCHLIB="$CELLAR/lib/ruby/3.3.0/arm64-darwin25"
STDLIB="$CELLAR/lib/ruby/3.3.0"
GEM_HOME="$HOME/.gem/ruby/3.3.0"
CERT="$HOME/homebrew/etc/openssl@3/cert.pem"

export RUBYLIB="$ARCHLIB:$STDLIB"
export GEM_HOME
export GEM_PATH="$GEM_HOME"
export SSL_CERT_FILE="$CERT"
export LANG="en_US.UTF-8"
export PATH="/usr/local/bin:$GEM_HOME/bin:$CELLAR/bin:/usr/bin:/bin:$PATH"

echo "🐾 CronoPet — iniciando no simulador iOS..."
cd "$(dirname "$0")"
npx expo run:ios "$@"
