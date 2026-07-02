{ pkgs, packages }:
with packages;
{
  dev = [
    git
    infisical
    pls
    skopeo
  ];

  lint = [
    actionlint
    gitlint
    go-task
    infralint
    pre-commit
    sg
    shellcheck
    treefmt
  ];

  main = [
    bun
  ];

  releaser = [
    git
    go
    goreleaser
    sg
  ];

  system = [
    atomiutils
    infrautils
  ];
}
