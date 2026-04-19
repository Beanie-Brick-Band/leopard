FROM e2bdev/base:latest

USER root

RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends zip unzip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/opt/bun
RUN curl -fsSL https://bun.com/install | bash \
    && chmod -R a+rx /opt/bun

RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --method=standalone --prefix=/opt/code-server

ENV PATH="/opt/bun/bin:/opt/code-server/bin:${PATH}"

RUN mkdir -p /opt/code-server-extensions \
    && /opt/code-server/bin/code-server --extensions-dir /opt/code-server-extensions --install-extension mathematic.vscode-pdf

COPY vscode-extension.vsix /opt/vscode-extension.vsix
RUN /opt/code-server/bin/code-server --extensions-dir /opt/code-server-extensions --install-extension /opt/vscode-extension.vsix

COPY settings.json /opt/settings.json

RUN mkdir -p /opt/auth-proxy \
    && cd /opt/auth-proxy \
    && /opt/bun/bin/bun init -y \
    && /opt/bun/bin/bun add http-proxy@^1.18.1
COPY auth-proxy.mjs /opt/auth-proxy/auth-proxy.mjs

RUN mkdir -p /home/user/workspace \
    && chown -R user:user /home/user

USER user
WORKDIR /home/user
