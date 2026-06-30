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
    dpkg
    gh
    git
    go
    goreleaser
    rpm
    sg
  ];

  system = [
    atomiutils
    infrautils
  ];
}
