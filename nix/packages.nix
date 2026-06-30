{
  atomi,
  pkgs,
  pkgs-2605,
  pkgs-unstable,
}:
let
  all = rec {
    atomipkgs = (
      with atomi;
      {
        inherit
          atomiutils
          infralint
          infrautils
          pls
          sg
          ;
      }
    );

    nix-2605 = (
      with pkgs-2605;
      {
        inherit
          actionlint
          bun
          dpkg
          gh
          git
          gitlint
          go
          go-task
          goreleaser
          infisical
          pre-commit
          rpm
          shellcheck
          skopeo
          treefmt
          ;
      }
    );

    nix-unstable = (
      with pkgs-unstable;
      {
      }
    );

    # In-repo CLI package output: `nix build .#bun-cli` produces the standalone Bun binary
    # (FR7). Dependencies are vendored through a fixed-output derivation so the compile step
    # runs offline and reproducibly. No atomipkgs push.
    cli =
      let
        bunPkg = pkgs-2605.bun;
        package = builtins.fromJSON (builtins.readFile ../package.json);
        src = pkgs.lib.cleanSourceWith {
          src = ../.;
          filter =
            path: _type:
            let
              base = baseNameOf path;
            in
            !(builtins.elem base [
              "node_modules"
              "dist"
              "prebuilt"
              "coverage"
              ".direnv"
              "result"
            ]);
        };
        deps = pkgs.stdenv.mkDerivation {
          pname = "bun-cli-deps";
          version = package.version;
          inherit src;
          nativeBuildInputs = [ bunPkg ];
          dontConfigure = true;
          buildPhase = ''
            export HOME="$TMPDIR"
            bun install --frozen-lockfile --no-progress
          '';
          installPhase = ''
            mkdir -p "$out"
            cp -r node_modules "$out/node_modules"
          '';
          dontFixup = true;
          outputHashMode = "recursive";
          outputHashAlgo = "sha256";
          outputHash = "sha256-SpnLtJvmEIfnzXhU8odLN4Mj/2ap/TgxiX3VSOuDNnQ=";
        };
      in
      {
        bun-cli = pkgs.stdenv.mkDerivation {
          pname = "bun-cli";
          version = package.version;
          inherit src;
          nativeBuildInputs = [ bunPkg ];
          dontConfigure = true;
          buildPhase = ''
            export HOME="$TMPDIR"
            cp -r ${deps}/node_modules ./node_modules
            chmod -R u+w node_modules
            bun build ./bin/bun-cli.ts --compile --outfile bun-cli
          '';
          installPhase = ''
            mkdir -p "$out/bin"
            cp bun-cli "$out/bin/bun-cli"
          '';
          dontFixup = true;
        };
      };
  };
in
with all;
atomipkgs // nix-2605 // nix-unstable // cli
