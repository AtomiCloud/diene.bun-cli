# CLI-binary image: a distroless runtime whose entrypoint IS the standalone CLI (FR7).
# The glibc Bun binary is cross-compiled per target arch and dropped onto a distroless glibc
# base, so the image is the CLI with no Bun/Node runtime layer.
# glibc Bun image so the compiled binary links glibc (matches the distroless/cc runtime).
FROM oven/bun:1.3.13 AS build
ARG TARGETARCH
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY bin ./bin
COPY src ./src
# Pick the glibc target matching the image arch (baseline x64 for max CPU compatibility).
RUN target="$([ "${TARGETARCH}" = "arm64" ] && echo bun-linux-arm64 || echo bun-linux-x64-baseline)" && \
  bun build ./bin/bun-cli.ts --compile --target="${target}" --outfile /bun-cli

# distroless/cc ships glibc + libgcc + libstdc++, which the Bun binary links against
# (base-debian12 lacks libstdc++, so the binary would fail to exec there).
FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=build /bun-cli /usr/bin/bun-cli
ENTRYPOINT ["/usr/bin/bun-cli"]
