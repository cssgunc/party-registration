FROM python:3.12-slim AS backend

# Set workdir for backend
WORKDIR /app/backend

# Install backend dependencies
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# Copy backend source
COPY backend/ ./

# ---
FROM node:22-slim AS frontend

# Set workdir for frontend
WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# ---
# Final stage: run both servers

FROM python:3.12-slim

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
        locales \
        postgresql-client \
        sudo \
        tzdata \
        wget \
        zsh \
    && rm -rf /var/lib/apt/lists/*

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
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set code to default git commit editor
RUN git config --system core.editor "code --wait"

# Set safe directory
RUN git config --system safe.directory '/workspace'

# Set git to automatically set upstream on push
RUN git config --system push.autoSetupRemote true

# Configure zsh
USER $USERNAME
ENV HOME=/home/$USERNAME

# Add zsh theme with niceties
RUN curl https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | bash - \
    && sed -i 's/robbyrussell/kennethreitz/g' ~/.zshrc \
    && echo 'source <(ng completion script)' >>~/.zshrc \
    && echo 'export PATH=$PATH:$HOME/.local/bin' >>~/.zshrc

# Set Locale for Functional Autocompletion in zsh
RUN sudo locale-gen en_US.UTF-8



# Set up backend
WORKDIR /app/backend
COPY --from=backend /app/backend /app/backend

# Set up frontend
WORKDIR /app/frontend
COPY --from=frontend /app/frontend /app/frontend

# Expose ports
EXPOSE 8000 3000

# Start both servers using a process manager
WORKDIR /app

# Keep the container running
CMD ["tail", "-f", "/dev/null"]
