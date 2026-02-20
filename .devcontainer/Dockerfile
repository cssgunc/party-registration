FROM python:3.12-slim

# Setup workspace directory
RUN mkdir /workspace
WORKDIR /workspace

# Set Python path
ENV PYTHONPATH=/workspace/backend

# Install useful system utilities
ENV TZ=America/New_York
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install --yes \
        apt-transport-https \
        ca-certificates \
        curl \
        debian-keyring \
        debian-archive-keyring \
        git \
        gnupg \
        libicu-dev \
        locales \
        unixodbc \
        unixodbc-dev \
        sudo \
        tzdata \
        wget \
        zsh \
        net-tools \
        procps \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver 18 and SQL Server tools
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" | tee /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools18 \
    && rm -rf /var/lib/apt/lists/*

ENV PATH=$PATH:/opt/mssql-tools18/bin

# Install Node.js 22 from https://github.com/nodesource
ENV NODE_MAJOR=22
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install nodejs -y \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*

# Use a non-root user per https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Add non-root user and add to sudoers
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /usr/bin/zsh \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && chown -R $USERNAME:$USERNAME /workspace

# Git configuration
RUN git config --system core.editor "code --wait" \
    && git config --system safe.directory '/workspace' \
    && git config --system push.autoSetupRemote true \
    && git config --system pull.autoSetupRemote true \
    && git config --system init.defaultBranch main \
    && git config --system core.autocrlf input \
    && git config --system color.ui auto

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json /workspace/frontend/
RUN cd /workspace/frontend && npm ci

# Install python dev dependencies
RUN pip install --upgrade pip
COPY pyproject.toml /workspace/pyproject.toml
RUN pip install -e ".[dev]"

# Install Backend Dependencies
COPY backend/pyproject.toml /workspace/backend/pyproject.toml
RUN pip install -e /workspace/backend

# Configure zsh
USER $USERNAME
ENV HOME=/home/$USERNAME

# Add zsh theme with niceties
RUN curl https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | bash - \
    && sed -i 's/robbyrussell/kennethreitz/g' ~/.zshrc \
    && echo 'export PATH=$PATH:$HOME/.local/bin:/workspace/frontend/node_modules/.bin' >>~/.zshrc

# Set Locale for Functional Autocompletion in zsh
RUN sudo locale-gen en_US.UTF-8

# Expose application ports
EXPOSE 8000 3000

# Keep the container running
CMD ["tail", "-f", "/dev/null"]
