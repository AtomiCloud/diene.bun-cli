{
  formatter,
  packages,
  pre-commit-lib,
}:
pre-commit-lib.run {
  src = ./.;

  hooks = {
    a-enforce-exec = {
      enable = true;
      entry = "${packages.atomiutils}/bin/chmod +x";
      files = ".*sh$";
      name = "Enforce Shell Script executable";
      pass_filenames = true;
      language = "system";
    };

    a-biome = {
      enable = true;
      description = "Lint TypeScript/JavaScript with Biome";
      entry = "./node_modules/.bin/biome lint --no-errors-on-unmatched";
      files = "\\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$";
      name = "Biome Lint";
      pass_filenames = true;
      language = "system";
    };

    a-deadcode = {
      enable = true;
      description = "Detect repo dead code with Knip (conservative, high-confidence)";
      entry = "./node_modules/.bin/knip --config knip.json";
      files = "(^package\\.json$|^tsconfig\\.json$|^knip\\.json$|\\.(ts|tsx)$)";
      name = "Knip Repo Deadcode";
      pass_filenames = false;
      language = "system";
    };

    a-deadcode-production = {
      enable = true;
      description = "Detect production dead code with Knip (runtime surface)";
      entry = "./node_modules/.bin/knip --config knip.production.json";
      files = "(^package\\.json$|^tsconfig\\.json$|^knip\\.production\\.json$|\\.(ts|tsx)$)";
      name = "Knip Production Deadcode";
      pass_filenames = false;
      language = "system";
    };

    a-enforce-gitlint = {
      enable = true;
      description = "Enforce atomi_releaser conforms to gitlint";
      entry = "${packages.sg}/bin/sg gitlint -c atomi_release.yaml";
      files = "(atomi_release\\.yaml|\\.gitlint)";
      name = "Enforce gitlint";
      pass_filenames = false;
      language = "system";
    };

    a-gitlint = {
      enable = true;
      description = "Lints git commit message";
      entry = "${packages.gitlint}/bin/gitlint --staged --msg-filename";
      name = "Gitlint";
      pass_filenames = true;
      stages = [
        "commit-msg"
      ];
      language = "system";
    };

    a-infisical = {
      enable = true;
      description = "Scan for possible secrets";
      entry = "${packages.infisical}/bin/infisical scan . -v";
      name = "Secrets Scanning";
      pass_filenames = false;
      language = "system";
    };

    a-infisical-staged = {
      enable = true;
      description = "Scan for possible secrets in staged files";
      entry = "${packages.infisical}/bin/infisical scan git-changes --staged -v";
      name = "Secrets Scanning (Staged files)";
      pass_filenames = false;
      language = "system";
    };

    a-shellcheck = {
      enable = true;
      entry = "${packages.shellcheck}/bin/shellcheck";
      files = ".*sh$";
      name = "Shell Check";
      pass_filenames = true;
      language = "system";
    };

    treefmt = {
      enable = true;
      excludes = [
        ".*(Changelog|README|CommitConventions).+(MD|md)"
        ".*node_modules.*"
        ".*dist/.*"
        ".*coverage/.*"
        ".*\\.lock"
      ];
      package = formatter;
    };
  };
}
