FROM ubuntu:22.04 AS base

FROM base AS builder

RUN set -eux; \
        apt update; \
		apt install -y --no-install-recommends curl ca-certificates gcc libc6-dev pkg-config libssl-dev; \
        curl --location --fail \
            "https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init" \
            --output rustup-init; \
        chmod +x rustup-init; \
        ./rustup-init -y --no-modify-path --default-toolchain stable; \
        rm rustup-init;

ENV PATH=${PATH}:/root/.cargo/bin
RUN set -eux; \
		rustup --version;

WORKDIR /app

ARG DATABASE_URL 

COPY src src
COPY static static
COPY Cargo.toml Cargo.lock ./
RUN set -eux; \
    cargo build --release;\
    objcopy --compress-debug-sections ./target/release/um-device-tracker ./um-device-tracker

FROM base AS APP

SHELL ["/bin/bash", "-c"]

RUN set -eux; \
		apt update; \
		apt install -y --no-install-recommends \
			ca-certificates \
			; \
		apt clean autoclean; \
		apt autoremove --yes; \
		rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app
COPY --from=builder /app/um-device-tracker .
COPY static static
COPY .env .

CMD ["/app/um-device-tracker"]
