FROM codercom/enterprise-base:ubuntu

USER root

# Install zip (needed by submission sidecar) and clean up in one layer
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends zip unzip curl \
    && rm -rf /var/lib/apt/lists/*

# Install bun to /opt/bun (not /home/coder, which gets mounted over by PVC)
ENV BUN_INSTALL=/opt/bun
RUN curl -fsSL https://bun.com/install | bash \
    && chmod -R a+rx /opt/bun

# Install code-server to /opt/code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --method=standalone --prefix=/opt/code-server

# Add tools to PATH
ENV PATH="/opt/bun/bin:/opt/code-server/bin:${PATH}"

USER coder
