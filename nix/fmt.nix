{ pkgs, treefmt-nix, ... }:
let
  fmt = {
    projectRootFile = "flake.nix";

    settings.global.excludes = [
      "*.lock"
      "bun.lock"
      "node_modules/*"
      "dist/*"
      "coverage/*"
      "infra/root_chart/*"
    ];

    programs = {
      actionlint.enable = true;
      nixfmt.enable = true;
      prettier.enable = true;
      shfmt.enable = true;
    };
  };
in
(treefmt-nix.lib.evalModule pkgs fmt).config.build.wrapper
