#!/bin/sh
# Tinline installer for Linux x86-64.
#
#   curl -fsSL https://tinline.osvauld.com/install.sh | sh
#
# Downloads the release tarball from GitHub, checks its SHA-256 against the
# release's published checksum, and installs into ~/.local (no root needed).
#
#   TINLINE_VERSION=0.1.3   install that release instead of the latest
#   TINLINE_PREFIX=/opt/x   install somewhere other than ~/.local
#
# Pass --uninstall to remove what this script installed.

set -eu

REPO="osvauld/tinline"

say() { printf 'tinline: %s\n' "$*"; }
die() { printf 'tinline: error: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but was not found"; }

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | cut -d' ' -f1
  else die "need sha256sum or shasum to verify the download"
  fi
}

main() {
  prefix="${TINLINE_PREFIX:-$HOME/.local}"
  bin="$prefix/bin/tinline"
  desktop="$prefix/share/applications/tinline.desktop"
  icon="$prefix/share/icons/hicolor/512x512/apps/tinline.png"

  if [ "${1:-}" = "--uninstall" ]; then
    rm -f "$bin" "$desktop" "$icon"
    say "removed Tinline from $prefix (your accounts and data are kept)"
    return
  fi

  [ "$(uname -s)" = "Linux" ] || die "only Linux is supported by this installer; Android builds are on https://github.com/$REPO/releases"
  case "$(uname -m)" in
    x86_64|amd64) ;;
    *) die "only x86-64 Linux builds are published (this machine is $(uname -m))" ;;
  esac
  need curl
  need tar

  version="${TINLINE_VERSION:-}"
  if [ -z "$version" ]; then
    # /releases/latest redirects to /releases/tag/vX.Y.Z
    latest=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest") \
      || die "could not reach GitHub to find the latest release"
    version="${latest##*/}"
  fi
  version="${version#v}"
  case "$version" in
    [0-9]*.[0-9]*.[0-9]*) ;;
    *) die "could not determine a release version (got '$version')" ;;
  esac

  name="tinline-v$version-x86_64-linux.tar.gz"
  url="https://github.com/$REPO/releases/download/v$version/$name"

  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT INT TERM

  say "downloading Tinline $version"
  curl -fL# --proto '=https' --tlsv1.2 -o "$tmp/$name" "$url" || die "download failed: $url"
  curl -fsSL --proto '=https' --tlsv1.2 -o "$tmp/$name.sha256" "$url.sha256" || die "checksum download failed: $url.sha256"

  expected=$(cut -d' ' -f1 "$tmp/$name.sha256")
  actual=$(sha256 "$tmp/$name")
  [ -n "$expected" ] && [ "$expected" = "$actual" ] || die "checksum mismatch for $name (expected $expected, got $actual)"
  say "checksum verified"

  tar -xzf "$tmp/$name" -C "$tmp"
  src="$tmp/tinline-$version-x86_64-linux"
  [ -x "$src/bin/tinline" ] || die "unexpected archive layout in $name"

  mkdir -p "$(dirname "$bin")" "$(dirname "$desktop")" "$(dirname "$icon")"
  # Install via a temporary name so a running copy is replaced, not overwritten in place.
  cp "$src/bin/tinline" "$bin.new" && chmod 755 "$bin.new" && mv -f "$bin.new" "$bin"
  cp "$src/share/icons/hicolor/512x512/apps/tinline.png" "$icon"
  # Point the launcher at the installed binary so it works even when $prefix/bin is not on PATH.
  sed "s|^Exec=tinline|Exec=$bin|" "$src/share/applications/tinline.desktop" > "$desktop"

  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$(dirname "$desktop")" >/dev/null 2>&1 || true

  say "installed Tinline $version to $bin"
  case ":$PATH:" in
    *":$prefix/bin:"*) say "run 'tinline' or open it from your app launcher" ;;
    *) say "$prefix/bin is not on your PATH; open Tinline from your app launcher or run $bin" ;;
  esac
}

# Everything runs inside main, so a truncated download never executes a partial script.
main "$@"
